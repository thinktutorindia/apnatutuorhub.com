/**
 * lib/whatsapp-bot/engine.ts
 * Central state machine & AI router.
 * Receives current session + incoming message → returns reply + quickReplies + next state.
 */

import {
  MSG,
  SPECIAL_COMMANDS,
  HELP_COMMANDS,
  CANCEL_COMMANDS,
} from "./messages";
import { type BotSession } from "./session";
import { handleTutorStep } from "./flows/tutor";
import { handleParentStep } from "./flows/parent";
import { askGeminiChatbot } from "./ai-agent";
import {
  getChatbotMatchingLeads,
  formatTutorLeadsAndPlansMessage,
  formatCoinPlansMessage,
  formatParentDemoMessage,
} from "./leads-helper";
import {
  registerTutorFromWhatsapp,
  registerParentFromWhatsapp,
} from "./auto-register";
import { prisma } from "@/lib/prisma";
import {
  getSubjectClassSuggestions,
  validateSubjectClassCompatibility,
} from "./subject-rules";

// Admin WhatsApp numbers — these get lead forwarding + full control
const ADMIN_PHONES = ["919311459543", "917559563565"];

const MAX_RETRIES = 3;

function isValidName(v: string): boolean {
  const clean = v.trim();
  if (clean.length < 2 || clean.length > 50) return false;
  if (/^(hi|hello|hey|namaste|yes|no|ok|done|skip)$/i.test(clean)) return false;
  if (/\d/.test(clean)) return false;
  return /^[a-zA-Z\s.'-]+$/.test(clean);
}

function formatHumanTeachingContext(
  subs: string[],
  cls: string | undefined,
  area: string | undefined
): {
  cleanSubs: string[];
  cleanClass: string;
  humanSubjectLabel: string;
  humanAreaPrompt: string;
  humanEmailSummary: string;
} {
  const cleanClass = (cls || "").trim();
  let cleanSubs = [...subs];

  const gradeMatch = cleanClass.match(/\b([1-9]|1[0-2])\b/);
  const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : null;
  const isPrimary = (grade !== null && grade <= 5) || /primary|kg|nursery|1\s*[-–to]\s*5/i.test(cleanClass);

  const hasPhysics = cleanSubs.some((s) => /physic/i.test(s));
  const hasChemistry = cleanSubs.some((s) => /chem/i.test(s));
  const hasBiology = cleanSubs.some((s) => /bio/i.test(s));

  if (isPrimary && (hasPhysics || hasChemistry || hasBiology)) {
    // In Class 1-5, physics/chem/bio do NOT exist as standalone subjects in school curricula.
    // They are taught as Science / EVS / All Subjects.
    cleanSubs = cleanSubs.filter((s) => !/physic|chem|bio/i.test(s));
    if (!cleanSubs.some((s) => /science/i.test(s))) cleanSubs.push("Science");
    if (!cleanSubs.some((s) => /all\s*subject/i.test(s))) {
      cleanSubs.push("All Subjects", "All Subjects (Class 1-8)");
    }
  }

  let humanSubjectLabel = "";
  if (isPrimary && (hasPhysics || hasChemistry || hasBiology)) {
    humanSubjectLabel = `${cleanClass || "Class 1-5"} (Science & All Subjects)`;
  } else if (cleanClass && cleanSubs.length > 0) {
    const sStr = cleanSubs.filter((s) => !/all subjects \(class 1-8\)/i.test(s)).join(", ");
    humanSubjectLabel = `${cleanClass} (${sStr})`;
  } else if (cleanSubs.length > 0) {
    humanSubjectLabel = cleanSubs.join(", ");
  } else {
    humanSubjectLabel = cleanClass || "All Classes";
  }

  let humanAreaPrompt = "";
  if (isPrimary && (hasPhysics || hasChemistry || hasBiology)) {
    humanAreaPrompt = `Badhiya! ${cleanClass || "Class 1-5"} Science ke liye Delhi mein aapka teaching area kaunsa hai? 📍`;
  } else if (cleanClass && cleanSubs.length > 0) {
    const mainSub = cleanSubs.filter((s) => !/all subjects \(class 1-8\)/i.test(s))[0] || cleanSubs[0];
    humanAreaPrompt = `Badhiya! ${cleanClass} ${mainSub} ke liye Delhi mein aapka teaching area kaunsa hai? 📍`;
  } else if (cleanClass) {
    humanAreaPrompt = `Badhiya! ${cleanClass} ke liye Delhi mein aapka teaching area kaunsa hai? 📍`;
  } else {
    humanAreaPrompt = `Delhi NCR mein aapka teaching area kaunsa hai? 📍`;
  }

  const cleanArea = area || "Delhi";
  const humanEmailSummary = `Details note ho gayi! 📚 ${cleanArea} — ${humanSubjectLabel}`;

  return {
    cleanSubs,
    cleanClass,
    humanSubjectLabel,
    humanAreaPrompt,
    humanEmailSummary,
  };
}

export type EngineResult = {
  reply: string;
  nextStep: string;
  updatedData: Record<string, unknown>;
  userType?: string | null;
  retries: number;
  quickReplies?: string[];
};

export type ProcessMessageOptions = {
  useAi?: boolean;
};

export async function processMessage(
  session: BotSession,
  rawMessage: string,
  options?: ProcessMessageOptions
): Promise<EngineResult> {
  const msg = rawMessage.trim().toUpperCase();
  const { step, data, retries } = session;
  const useAi = options?.useAi !== false;

  // ── 1. Global commands — always honoured regardless of step ───────────────

  if (CANCEL_COMMANDS.includes(msg)) {
    return {
      reply: MSG.CANCEL,
      nextStep: "WELCOME",
      updatedData: {},
      userType: null,
      retries: 0,
      quickReplies: ["MENU", "1 - Tutor", "2 - Parent"],
    };
  }

  if (HELP_COMMANDS.includes(msg) || /^call$/i.test(msg.trim()) || /support/i.test(msg)) {
    return {
      reply: `📞 Hamare coordinator se seedha baat karein:\n\nWhatsApp: +91 87997 07960\nTime: 9am – 7pm (Mon–Sat)\n\nUnhe batayein aapka naam aur issue.`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["MENU", "View Leads", "Buy Coins"],
    };
  }

  // ── Staff Escalation: complaint / issue / problem ─────────────────────────
  if (/\b(problem|issue|complaint|cheated|fraud|refund|not working|call me)\b/i.test(rawMessage)) {
    return {
      reply: `Samajh gaya. Seedha humse baat karo:\n\n📞 WhatsApp: +91 87997 07960\nTime: 9am–7pm (Mon–Sat)\n\nUnhe aapka naam aur issue batao.`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["MENU", "View Leads", "Buy Coins"],
    };
  }

  // ── Profile View ──────────────────────────────────────────────────────────
  if (/^(my profile|profile|mera profile|meri profile)$/i.test(rawMessage.trim())) {
    const name = (data.name as string) || "Not set";
    const email = (data.email as string) || "Not set";
    const area = (data.area as string) || "Not set";
    const city = (data.city as string) || "";
    const subjects = Array.isArray(data.subjects) && data.subjects.length > 0 ? (data.subjects as string[]).join(", ") : "Not set";
    const location = city ? `${area}, ${city}` : area;
    const profileText = `👤 *Aapka Profile:*\n\nNaam: ${name}\nEmail: ${email}\nLocation: ${location}\nSubjects: ${subjects}\nPhone: +91-${session.phone}\n\nKuch update karna hai? Type karo: UPDATE NAME / UPDATE EMAIL / UPDATE SUBJECTS`;
    return {
      reply: profileText,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["Update Name", "Update Email", "Update Subjects"],
    };
  }

  // ── Profile Update Commands ───────────────────────────────────────────────
  if (/^update name$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya naam type karo:", nextStep: "UPDATE_NAME", updatedData: data, retries: 0 };
  }
  if (/^update email$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya email ID type karo:", nextStep: "UPDATE_EMAIL", updatedData: data, retries: 0 };
  }
  if (/^update subjects$/i.test(rawMessage.trim())) {
    return { reply: "Kaunse subjects padhate ho? (comma separated):", nextStep: "UPDATE_SUBJECTS", updatedData: data, retries: 0 };
  }
  if (/^update area$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya area / locality type karo:", nextStep: "UPDATE_AREA", updatedData: data, retries: 0 };
  }
  if (/^update phone$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya phone number type karo (10 digits):", nextStep: "UPDATE_PHONE", updatedData: data, retries: 0 };
  }

  // Handle update step responses
  if (step === "UPDATE_NAME") {
    return { reply: `Naam update ho gaya: *${rawMessage.trim()}*`, nextStep: "DONE", updatedData: { ...data, name: rawMessage.trim() }, retries: 0, quickReplies: ["My Profile", "View Leads", "MENU"] };
  }
  if (step === "UPDATE_EMAIL") {
    return { reply: `Email update ho gaya: *${rawMessage.trim()}*`, nextStep: "DONE", updatedData: { ...data, email: rawMessage.trim().toLowerCase() }, retries: 0, quickReplies: ["My Profile", "View Leads", "MENU"] };
  }
  if (step === "UPDATE_SUBJECTS") {
    const subs = rawMessage.split(/,|and/i).map((s) => s.trim()).filter(Boolean);
    return { reply: `Subjects update ho gaye: *${subs.join(", ")}*`, nextStep: "DONE", updatedData: { ...data, subjects: subs }, retries: 0, quickReplies: ["My Profile", "View Leads", "MENU"] };
  }
  if (step === "UPDATE_AREA") {
    return { reply: `Area update ho gaya: *${rawMessage.trim()}*`, nextStep: "DONE", updatedData: { ...data, area: rawMessage.trim() }, retries: 0, quickReplies: ["My Profile", "View Leads", "MENU"] };
  }
  if (step === "UPDATE_PHONE") {
    const phoneMatch = rawMessage.match(/([6-9]\d{9})/);
    const newPhone = phoneMatch ? phoneMatch[1] : rawMessage.trim();
    return { reply: `Phone update ho gaya: *${newPhone}*`, nextStep: "DONE", updatedData: { ...data, phone: newPhone }, retries: 0, quickReplies: ["My Profile", "View Leads", "MENU"] };
  }

  // ── Global Leads & Plans shortcuts ──────────────────────────────────────────
  if (/plan|coin|pack|pricing|membership|buy coins|recharge|wallet/i.test(msg)) {
    return {
      reply: formatCoinPlansMessage(),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Recharge Wallet 💳", "View All Leads 📋", "Talk to Support 📞"],
    };
  }

  if (/^(?:show\s+leads?|view\s+leads?|leads?|my\s+leads?|matching\s+leads?|unlock\s+leads?|explore\s+leads?)$/i.test(msg.trim()) || /show lead|view lead|matching lead|my lead|unlock lead|explore lead/i.test(msg)) {
    const leads = await getChatbotMatchingLeads(
      (data.area as string) || "Delhi",
      (data.city as string) || "Delhi",
      data.classLevel as string,
      data.subjects as string[]
    );
    return {
      reply: formatTutorLeadsAndPlansMessage((data.name as string) || "Teacher", (data.area as string) || "Delhi", leads),
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: [
        leads.length > 0 ? `🔥 Unlock Lead #${leads[0].inquiryNumber}` : "🔥 View All Leads",
        "💰 View Coin Plans",
        "🌐 Leads Dashboard",
      ],
    };
  }

  if (SPECIAL_COMMANDS.includes(msg)) {
    const reply = step === "WELCOME" ? MSG.WELCOME : MSG.RE_WELCOME;
    return {
      reply,
      nextStep: "WELCOME",
      updatedData: {},
      userType: null,
      retries: 0,
      quickReplies: ["1 - Tutor (I want to teach)", "2 - Parent (I need a tutor)"],
    };
  }

  // ── 2. AI Mode Active: Let Gemini AI intelligently manage conversation ────

  // CRITICAL: If step is DONE or _registered is true, user is already registered.
  // Let AI handle their query naturally — do NOT re-trigger registration.
  if (step === "DONE" || data._registered === true) {
    if (useAi) {
      try {
        const ai = await askGeminiChatbot(rawMessage, session);
        if (ai && ai.reply) {
          return {
            reply: ai.reply,
            nextStep: "DONE",
            updatedData: data,
            userType: session.userType,
            retries: 0,
            quickReplies: ai.quickReplies && ai.quickReplies.length > 0
              ? ai.quickReplies
              : ["View Leads", "Plans", "My Profile"],
          };
        }
      } catch (err) {
        console.warn("[engine] AI call failed in DONE state:", err);
      }
    }
    // Fallback if AI fails in DONE state
    return {
      reply: `Kuch aur jaanna hai? Type karo:\n\n*LEADS* — leads dekhein\n*PLANS* — plan ki info\n*PROFILE* — apni profile dekhein\n*HELP* — support se baat karein`,
      nextStep: "DONE",
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["View Leads", "Plans", "My Profile", "Help"],
    };
  }

  if (useAi) {
    try {
      const ai = await askGeminiChatbot(rawMessage, session);
      if (ai && ai.reply) {
        // Clean and merge extracted data
        const mergedData = { ...data };
        if (ai.extractedData) {
          for (const [k, v] of Object.entries(ai.extractedData)) {
            if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
              mergedData[k] = v;
            }
          }
        }

        // Additional Regex extractors for Email & Phone Number
        const emailMatch = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !mergedData.email) {
          mergedData.email = emailMatch[0].toLowerCase();
        }

        const phoneMatch = rawMessage.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
        if (phoneMatch && !mergedData.phone) {
          mergedData.phone = phoneMatch[1];
        }

        // Password extractor (explicit password: ... or input in T_PASSWORD step)
        const pwdMatch = rawMessage.match(/(?:password|pass|pwd)[:\s=]+([^\s\n,]+)/i);
        if (pwdMatch && !mergedData.password) {
          mergedData.password = pwdMatch[1].trim();
        }

        // Additional entity extractors from message text
        const areaMatch = rawMessage.match(/\b(dwarka|rohini|janakpuri|uttam nagar|vikaspuri|paschim vihar|pitampura|shalimar bagh|model town|ashok vihar|civil lines|connaught place|cp|south ex|south extension|saket|hauz khas|malviya nagar|green park|greater kailash|gk|cr park|kalkaji|nehru place|lajpat nagar|defence colony|vasant kunj|vasant vihar|munirka|rk puram|mayur vihar|laxmi nagar|preet vihar|nirman vihar|shahdara|dilshad garden|karol bagh|patel nagar|rajouri garden|tagore garden|subhash nagar|tilak nagar|najafgarh|narela|bawana|burari|sant nagar|sangam vihar|badarpur|sarita vihar|okhla|jasola|noida|greater noida|gurgaon|gurugram|ghaziabad|faridabad|indirapuram|vaishali|kaushambi)\b/i);
        if (areaMatch && (!mergedData.area || String(mergedData.area).toLowerCase() === "delhi ncr")) {
          mergedData.area = areaMatch[0].charAt(0).toUpperCase() + areaMatch[0].slice(1).toLowerCase();
        }

        const subMatches = rawMessage.match(/\b(maths?|mathematics|science|physics|chemistry|biology|english|hindi|social studies|sst|history|geography|civics|economics|commerce|accounts|accountancy|business studies|computer science|cs|coding|python|all subjects)\b/gi);
        if (subMatches && (!mergedData.subjects || (Array.isArray(mergedData.subjects) && mergedData.subjects.length === 0))) {
          mergedData.subjects = Array.from(new Set(subMatches.map((s) => s.trim())));
        }

        const isInitialWelcomeChoice = session.step === "WELCOME" && /^[12]$/.test(rawMessage.trim());

        const classMatch =
          rawMessage.match(/(?:class|grade)\s*(\d{1,2}(?:\s*(?:to|-|and)\s*\d{1,2})?|\b[1-9]\b|\b1[0-2]\b|primary|middle|senior|nursery|kg|jee|neet|all)/i) ||
          rawMessage.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:to|-|and)\s*\d{1,2}(?:st|nd|rd|th)?)\b/i) ||
          rawMessage.match(/\b(primary|middle school|senior secondary|11th and 12th|9th and 10th|1st to 5th|6th to 8th|9th to 12th|all classes)\b/i) ||
          (!isInitialWelcomeChoice ? rawMessage.match(/^([1-9]|1[0-2])(?:st|nd|rd|th)?$/i) : null);
        if (classMatch && !mergedData.classLevel && !isInitialWelcomeChoice) {
          const rawCl = classMatch[0].trim();
          const cl = /^\d+$/.test(rawCl) ? `Class ${rawCl}` : rawCl;
          mergedData.classLevel = cl;
          mergedData.classLevels = [cl];
        }

        // State-specific step input helpers
        if (session.step === "T_AREA" && !mergedData.area && rawMessage.trim().length >= 2 && !/^(menu|help|cancel)$/i.test(rawMessage.trim())) {
          mergedData.area = rawMessage.trim();
        }
        if ((session.step === "T_CLASS" || session.step === "P_CLASS" || session.step === "P_CONVO") && !mergedData.classLevel && rawMessage.trim().length >= 1 && !/^(menu|help|cancel)$/i.test(rawMessage.trim()) && !isInitialWelcomeChoice) {
          const rawCl = rawMessage.trim();
          const cl = /^\d+$/.test(rawCl) ? `Class ${rawCl}` : rawCl;
          mergedData.classLevel = cl;
          mergedData.classLevels = [cl];
        }
        if (session.step === "T_SUBJECTS" && (!mergedData.subjects || (Array.isArray(mergedData.subjects) && mergedData.subjects.length === 0)) && rawMessage.trim().length >= 2 && !/^(menu|help|cancel)$/i.test(rawMessage.trim())) {
          const splitSubs = rawMessage.split(/,|and|&/i).map((s) => s.trim()).filter(Boolean);
          mergedData.subjects = splitSubs.length > 0 ? splitSubs : [rawMessage.trim()];
        }

        // Taxonomy & Till 8th grade handling
        if (/all\s*subjects?|combo/i.test(rawMessage)) {
          if (!mergedData.subjects || (Array.isArray(mergedData.subjects) && mergedData.subjects.length === 0)) {
            mergedData.subjects = ["All Subjects", "All Subjects (Class 1-8)"];
          } else if (!mergedData.subjects.some((s: string) => /all\s*subjects?/i.test(s))) {
            mergedData.subjects.push("All Subjects", "All Subjects (Class 1-8)");
          }
        }
        if (/1\s*[-–to]\s*8|class\s*1-8|primary|middle|till\s*8/i.test(rawMessage)) {
          if (!mergedData.classLevel) {
            mergedData.classLevel = "Class 1-8";
            mergedData.classLevels = ["Class 1-8"];
          }
          if (!mergedData.subjects || (Array.isArray(mergedData.subjects) && mergedData.subjects.length === 0)) {
            mergedData.subjects = ["All Subjects", "All Subjects (Class 1-8)"];
          }
        }

        // Robust role detection
        let role: "TUTOR" | "PARENT" | null = null;
        const candidateRole = (ai.detectedRole || session.userType || "").toUpperCase();
        if (candidateRole.includes("TUTOR") || candidateRole.includes("TEACH")) {
          role = "TUTOR";
        } else if (candidateRole.includes("PARENT") || candidateRole.includes("STUDENT")) {
          role = "PARENT";
        } else if (session.step.startsWith("T_")) {
          role = "TUTOR";
        } else if (session.step.startsWith("P_")) {
          role = "PARENT";
        } else if (rawMessage.trim() === "1") {
          role = "TUTOR";
        } else if (rawMessage.trim() === "2") {
          role = "PARENT";
        }

        // Fresh Start Check: If user merely selects 1 or 2 from WELCOME without details yet
        const isBareChoice =
          rawMessage.trim() === "1" ||
          rawMessage.trim() === "2" ||
          /^(1|2|tutor|parent|i am a tutor|i need a tutor)$/i.test(rawMessage.trim());

        const subsArray = Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0
          ? (mergedData.subjects as string[])
          : [];
        const hasSubjects = subsArray.length > 0;

        // Ensure classLevel is not mistakenly holding a subject name
        if (mergedData.classLevel && subsArray.some((s) => s.toLowerCase() === String(mergedData.classLevel).toLowerCase())) {
          mergedData.classLevel = undefined;
          mergedData.classLevels = undefined;
        }

        const classLevelsArray = Array.isArray(mergedData.classLevels) && mergedData.classLevels.length > 0
          ? (mergedData.classLevels as string[])
          : mergedData.classLevel
          ? [String(mergedData.classLevel)]
          : [];
        const hasClass = classLevelsArray.length > 0;

        const rawArea = typeof mergedData.area === "string" ? mergedData.area.trim() : (typeof data.area === "string" ? (data.area as string).trim() : "");
        const hasArea = Boolean(
          rawArea &&
          rawArea.toLowerCase() !== "delhi ncr" &&
          rawArea.length >= 2
        );

        const isFirstChoice = session.step === "WELCOME" && isBareChoice && !hasSubjects && !hasClass && !hasArea;
        if (isFirstChoice) {
          const isTutor = role === "TUTOR" || rawMessage.trim() === "1";
          return {
            reply: isTutor
              ? `Badhiya! Kaunse subject, kaunsi class aur kahan se ho? 📚`
              : `Acha! Bachche ke liye kaunsi class, subject aur area mein tutor chahiye? 🎓📍`,
            nextStep: isTutor ? "T_CONVO" : "P_CONVO",
            updatedData: {},
            userType: isTutor ? "TUTOR" : "PARENT",
            retries: 0,
            quickReplies: isTutor
              ? ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Physics, Class 11-12, Rohini"]
              : ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
          };
        }

        // ── TUTOR Onboarding ──────────────────────────────────────────────────
        if (role === "TUTOR") {
          // SECURITY: Block registration with admin phone numbers
          if (ADMIN_PHONES.includes(session.phone)) {
            return {
              reply: ai.reply,
              nextStep: "T_CONVO",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ai.quickReplies && ai.quickReplies.length > 0 ? ai.quickReplies : ["View Leads", "Plans"],
            };
          }

          // Case A: Missing all teaching details
          if (!hasSubjects && !hasClass && !hasArea) {
            return {
              reply: `Badhiya! Kaunse subject aur kaunsi class ko padhate ho? 📚`,
              nextStep: "T_CONVO",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
            };
          }

          // Case B: Has subjects, but missing class and area (e.g. user only typed "physics" or "maths")
          if (hasSubjects && !hasClass && !hasArea) {
            const sFirst = subsArray[0] || "Subjects";
            const suggestions = getSubjectClassSuggestions(sFirst);
            return {
              reply: suggestions.prompt,
              nextStep: "T_CLASS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: suggestions.quickReplies,
            };
          }

          // Case C: Has subjects and area, but missing class (e.g. "Sangam Vihar" then "Maths & Science")
          if (hasSubjects && hasArea && !hasClass) {
            const subsText = subsArray.filter((s) => !/all subjects \(class 1-8\)/i.test(s)).join(", ");
            const suggestions = getSubjectClassSuggestions(subsArray[0] || "Subjects");
            return {
              reply: `${rawArea} mein *${subsText}* kaunsi classes ko padhate ho? 🎓`,
              nextStep: "T_CLASS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: suggestions.quickReplies,
            };
          }

          // Common-Sense Subject-Grade Compatibility Validation:
          if (hasSubjects && hasClass) {
            const rawCls = classLevelsArray[0] || (mergedData.classLevel as string) || "";
            const validation = validateSubjectClassCompatibility(subsArray, rawCls, "TUTOR");

            if (!validation.isValid) {
              // Illogical combination (e.g. Physics for Class 5)
              mergedData.classLevel = undefined;
              mergedData.classLevels = undefined;
              return {
                reply: validation.reason!,
                nextStep: "T_CLASS",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: validation.suggestedReplies || ["Class 11-12", "Class 9-10 (Science)"],
              };
            }

            if (validation.switchedSubject) {
              mergedData.subjects = validation.switchedSubject;
              subsArray.length = 0;
              subsArray.push(...validation.switchedSubject);
            }
            if (validation.switchedClass) {
              mergedData.classLevel = validation.switchedClass;
              mergedData.classLevels = [validation.switchedClass];
              classLevelsArray.length = 0;
              classLevelsArray.push(validation.switchedClass);
            }
          }

          // Case D: Has subjects and class, but missing area (e.g. "Physics" then "Class 5")
          if (hasSubjects && hasClass && !hasArea) {
            const ctx = formatHumanTeachingContext(subsArray, classLevelsArray[0] || (mergedData.classLevel as string), rawArea);
            mergedData.subjects = ctx.cleanSubs;
            return {
              reply: ctx.humanAreaPrompt,
              nextStep: "T_AREA",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
            };
          }

          // Case E1: Has area only, but missing subjects and class (e.g. user typed "sangam vihar")
          if (hasArea && !hasSubjects && !hasClass) {
            return {
              reply: `*${rawArea}* mein kaunse subjects aur classes padhate ho? 📚`,
              nextStep: "T_CONVO",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
            };
          }

          // Case E2: Has class only, but missing subjects and area
          if (hasClass && !hasSubjects && !hasArea) {
            const clsText = classLevelsArray[0] || (mergedData.classLevel as string) || "Classes";
            return {
              reply: `*${clsText}* ke liye kaunse subjects padhate ho? 📚`,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects", "Maths", "Science", "Maths & Science"],
            };
          }

          // Case E3: Has class and area, but missing subjects
          if (hasClass && hasArea && !hasSubjects) {
            const clsText = classLevelsArray[0] || (mergedData.classLevel as string) || "Classes";
            return {
              reply: `${rawArea} mein *${clsText}* ke kaunse subjects padhate hain? 📚`,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects", "Maths", "Science", "Maths & Science"],
            };
          }

          // Case E4: Missing subjects
          if (!hasSubjects) {
            return {
              reply: `Kaunse subjects padhate hain? 📚`,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths", "Science", "Maths & Science"],
            };
          }

          // Case E5: Missing class
          if (!hasClass) {
            return {
              reply: `Kaunsi class tak padhate ho? 🎓`,
              nextStep: "T_CLASS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Class 1-8 (All Subjects)", "Class 9-10", "Class 11-12", "All Classes (1 to 12)"],
            };
          }

          // Case E6: Missing area
          if (!hasArea) {
            return {
              reply: `Aapka teaching area / location kya hai? 📍`,
              nextStep: "T_AREA",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
            };
          }

          // Case F: ALL 3 TEACHING CRITERIA ARE PRESENT! Proceed to mandatory Email
          const ctx = formatHumanTeachingContext(subsArray, classLevelsArray[0] || (mergedData.classLevel as string), rawArea);
          mergedData.subjects = ctx.cleanSubs;
          const areaName = rawArea;
          const cityName = (mergedData.city as string) || "Delhi";
          const tutorName = (mergedData.name as string) || "";

          // Validate email candidate
          const emailRegexMatch = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const emailCandidate = emailRegexMatch ? emailRegexMatch[0].toLowerCase() : (typeof mergedData.email === "string" ? mergedData.email.trim().toLowerCase() : "");
          const hasValidEmail = Boolean(emailCandidate && emailCandidate.includes("@") && emailCandidate.includes("."));

          // 1. Email is STRICTLY MANDATORY — NO SKIP ALLOWED
          if (!hasValidEmail && session.step !== "T_PASSWORD") {
            if (session.step === "T_EMAIL") {
              return {
                reply: `⚠️ Email ID zaroori hai! Student lead alerts aur profile account ke liye valid email chahiye.\n\n📧 Kripya apna Email ID bhejiye (jaise: yourname@gmail.com):`,
                nextStep: "T_EMAIL",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: [],
              };
            }

            return {
              reply: `Details note ho gayi! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\nStudent lead alerts aur login ke liye apna Email ID share karein: 📧`,
              nextStep: "T_EMAIL",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: [],
            };
          }

          // Save valid email
          mergedData.email = emailCandidate;

          // 2. Password Setup
          const pwdCandidate = (typeof mergedData.password === "string" ? mergedData.password.trim() : "");
          if (!pwdCandidate && session.step !== "T_PASSWORD") {
            // Check if email already registered in DB
            let isExisting = false;
            try {
              const existingUser = await prisma.user.findFirst({
                where: { email: emailCandidate },
                select: { id: true, name: true, role: true },
              });
              if (existingUser) {
                isExisting = true;
                mergedData._existingAccount = true;
              }
            } catch {}

            if (isExisting) {
              return {
                reply: `Email note ho gaya: *${emailCandidate}* ✅\n_(Yeh email pehle se registered hai)_\n\n🔐 Account login karne ke liye password enter karein (ya type karein *default*):`,
                nextStep: "T_PASSWORD",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Default Password", "12345678"],
              };
            }

            return {
              reply: `Email note ho gaya: *${emailCandidate}* ✅\n\n🔐 Account login ke liye koi password rakhna chahte hain? (min 6 characters) ya reply karein *default*:`,
              nextStep: "T_PASSWORD",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Default Password", "12345678"],
            };
          }

          // If in T_PASSWORD step, handle user input
          if (session.step === "T_PASSWORD") {
            const rawTrim = rawMessage.trim();
            const isDefaultChoice = /default|skip|12345678|nahi|no|set 12345678/i.test(rawTrim);
            if (isDefaultChoice) {
              mergedData.password = "12345678";
              mergedData._usedDefaultPassword = true;
            } else if (rawTrim.length >= 6) {
              mergedData.password = rawTrim;
            } else {
              return {
                reply: `⚠️ Password minimum 6 characters ka hona chahiye.\n\n🔐 Phir se enter karein ya type karein *default*:`,
                nextStep: "T_PASSWORD",
                updatedData: { ...mergedData, password: undefined },
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Default Password", "12345678"],
              };
            }
          }

          const pwdStr = (mergedData.password as string) || "12345678";

          // 3. Register Tutor in database!
          const phoneToUse = (mergedData.phone as string) || session.phone;
          const emailToUse = emailCandidate;

          const leads = await getChatbotMatchingLeads(
            areaName,
            cityName,
            mergedData.classLevel as string,
            subsArray
          );

          try {
            await registerTutorFromWhatsapp(session.phone, {
              name: tutorName || "Tutor",
              email: emailToUse,
              phone: phoneToUse,
              password: pwdStr,
              city: cityName,
              area: areaName,
              subjects: subsArray.length > 0 ? subsArray : ["All Subjects"],
              classLevels: classLevelsArray.length > 0 ? classLevelsArray : ["Class 1 to 10"],
              experience: typeof mergedData.experience === "number" ? mergedData.experience : 2,
            });
          } catch (regErr) {
            console.error("[engine] auto-register tutor failed:", regErr);
          }

          const usedDefault = mergedData._usedDefaultPassword === true;
          mergedData._registered = true;
          const richReply = formatTutorLeadsAndPlansMessage(tutorName, areaName, leads, {
            email: emailToUse,
            phone: phoneToUse,
            hasPassword: true,
          }) + (usedDefault ? `\n\n🔑 Default password *12345678* set kiya hai. Website par login karke change kar sakte hain: https://apnatutorhub.com/login` : "");

          return {
            reply: richReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "TUTOR",
            retries: 0,
            quickReplies: [
              "View Leads",
              "₹999 Plan",
              "My Profile",
            ],
          };
        }

        // ── PARENT Onboarding ─────────────────────────────────────────────────
        if (role === "PARENT") {
          const parentSubs = Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0
            ? (mergedData.subjects as string[])
            : [];
          const parentHasSubs = parentSubs.length > 0;

          const parentClass = (mergedData.classLevel as string) || (Array.isArray(mergedData.classLevels) && (mergedData.classLevels as string[])[0]) || "";
          const parentHasClass = Boolean(parentClass && parentClass.toString().trim() !== "");

          const parentArea = typeof mergedData.area === "string" ? mergedData.area.trim() : (typeof data.area === "string" ? (data.area as string).trim() : "");
          const parentHasArea = Boolean(parentArea && parentArea.toLowerCase() !== "delhi ncr" && parentArea.length >= 2);

          if (!parentHasSubs && !parentHasClass && !parentHasArea) {
            return {
              reply: `Bachche ke liye kaunsi class, subject aur area mein tutor chahiye? 🎓📍`,
              nextStep: "P_CONVO",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
            };
          }

          if (parentHasSubs && !parentHasClass && !parentHasArea) {
            const sFirst = parentSubs[0] || "Subjects";
            const suggestions = getSubjectClassSuggestions(sFirst);
            return {
              reply: `Bachcha kaunsi class mein hai? 🎓`,
              nextStep: "P_CONVO",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: suggestions.quickReplies,
            };
          }

          // Common-Sense Subject-Grade Compatibility Validation for Parents:
          if (parentHasSubs && parentHasClass) {
            const parentValidation = validateSubjectClassCompatibility(parentSubs, String(parentClass), "PARENT");
            if (!parentValidation.isValid) {
              mergedData.classLevel = undefined;
              mergedData.classLevels = undefined;
              return {
                reply: parentValidation.reason!,
                nextStep: "P_CONVO",
                updatedData: mergedData,
                userType: "PARENT",
                retries: 0,
                quickReplies: parentValidation.suggestedReplies || ["Class 1-5 All Subjects", "Class 9-10"],
              };
            }

            if (parentValidation.switchedSubject) {
              mergedData.subjects = parentValidation.switchedSubject;
              parentSubs.length = 0;
              parentSubs.push(...parentValidation.switchedSubject);
            }
            if (parentValidation.switchedClass) {
              mergedData.classLevel = parentValidation.switchedClass;
              mergedData.classLevels = [parentValidation.switchedClass];
            }
          }

          if (parentHasSubs && parentHasClass && !parentHasArea) {
            return {
              reply: `*${parentSubs.join(", ")} (${parentClass})* ke liye Delhi mein aapka area kaunsa hai? 📍`,
              nextStep: "P_AREA",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Dwarka", "Rohini", "South Delhi", "Noida / Gurgaon"],
            };
          }

          if (!parentHasSubs && (parentHasClass || parentHasArea)) {
            return {
              reply: `Kaunse subjects ke liye tutor chahiye? 📚`,
              nextStep: "P_CONVO",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Maths & Science", "All Subjects", "English", "Physics / Chemistry"],
            };
          }

          // All 3 criteria present!
          const areaName = parentArea;
          const classLevelName = String(parentClass);

          try {
            await registerParentFromWhatsapp(session.phone, {
              studentName: (mergedData.studentName as string) || (mergedData.name as string) || "Student",
              parentName: (mergedData.parentName as string) || (mergedData.name as string) || "Parent",
              email: (mergedData.email as string) || undefined,
              phone: (mergedData.phone as string) || session.phone,
              city: (mergedData.city as string) || "Delhi",
              area: areaName,
              classLevel: classLevelName,
              subjects: parentSubs,
              timing: (mergedData.timing as string) || undefined,
            });
          } catch (regErr) {
            console.error("[engine] auto-register parent failed:", regErr);
          }

          const richReply = formatParentDemoMessage(
            areaName,
            classLevelName,
            parentSubs,
            {
              email: (mergedData.email as string) || undefined,
              phone: (mergedData.phone as string) || undefined,
              name: (mergedData.name as string) || (mergedData.parentName as string) || undefined,
            }
          );

          mergedData._registered = true;

          return {
            reply: richReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "PARENT",
            retries: 0,
            quickReplies: ["Book Free Demo", "Fee Structure", "Call Coordinator"],
          };
        }

        const nextStep =
          role === "TUTOR"
            ? "T_CONVO"
            : role === "PARENT"
            ? "P_CONVO"
            : session.step === "WELCOME"
            ? "WELCOME"
            : session.step;

        return {
          reply: ai.reply,
          nextStep,
          updatedData: mergedData,
          userType: role,
          retries: 0,
          quickReplies: ai.quickReplies && ai.quickReplies.length > 0
            ? ai.quickReplies
            : role === "TUTOR"
            ? ["Sangam Vihar, Delhi", "Dwarka, Delhi", "Noida / Gurgaon"]
            : role === "PARENT"
            ? ["Class 9-10 Maths/Sci", "Class 1-5 All", "Class 11-12"]
            : ["1️⃣ TUTOR", "2️⃣ PARENT"],
        };
      }
    } catch (err) {
      console.warn("[engine] AI call failed, falling back to rule-based state machine:", err);
    }
  }

  // ── 3. Rule-Based Fallback (when AI is off or temporarily unavailable) ─────

  if (step === "WELCOME") {
    const normalized = rawMessage.trim();
    if (normalized === "1" || /tutor|teach|instructor/i.test(normalized)) {
      return {
        reply: `Badhiya! Kaunse subject, kaunsi class aur kahan se ho? 📚`,
        nextStep: "T_CONVO",
        updatedData: {},
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Physics, Class 11-12, Rohini"],
      };
    }
    if (normalized === "2" || /parent|student|child|hire/i.test(normalized)) {
      return {
        reply: `Acha! Bachche ke liye kaunsi class, subject aur area mein tutor chahiye? 🎓📍`,
        nextStep: "P_CONVO",
        updatedData: {},
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
      };
    }

    // If user provided an area or natural greeting directly
    const isLocality = /vihar|nagar|road|enclave|colony|delhi|noida|gurgaon|sector|pur|ext|bengaluru|mumbai|saket|kalkaji/i.test(normalized);
    if (isLocality || normalized.length >= 3) {
      return {
        reply: `Swagat hai! *ApnaTutorHub* pe. 🙏\n\nAap kaun hain — tutor ya parent?\n\n1 — *Tutor* (teaching chahiye)\n2 — *Parent* (tutor chahiye)`,
        nextStep: "WELCOME",
        updatedData: { area: normalized, city: "Delhi" },
        userType: null,
        retries: 0,
        quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent"],
      };
    }

    return handleInvalid(session, MSG.WELCOME, ["1️⃣ TUTOR", "2️⃣ PARENT"]);
  }

  // TUTOR conversational fallback: Require subject, class, area, email, and password before registering
  if (step === "T_CONVO" || step === "T_SUBJECTS" || step === "T_CLASS" || step === "T_AREA" || step === "T_EMAIL" || step === "T_PASSWORD" || step === "DONE") {
    const trimmed = rawMessage.trim();
    const updated = { ...data };

    const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !updated.email) updated.email = emailMatch[0].toLowerCase();

    const phoneMatch = trimmed.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    if (phoneMatch && !updated.phone) updated.phone = phoneMatch[1];

    const pwdMatch = trimmed.match(/(?:password|pass|pwd)[:\s=]+([^\s\n,]+)/i);
    if (pwdMatch) {
      updated.password = pwdMatch[1].trim();
    } else if (step === "T_PASSWORD" && !updated.password && !/^(menu|help|cancel)$/i.test(trimmed)) {
      updated.password = trimmed;
    }

    const classMatch =
      trimmed.match(/(?:class|grade)\s*(\d{1,2}(?:\s*(?:to|-|and)\s*\d{1,2})?|\b[1-9]\b|\b1[0-2]\b|primary|middle|senior|nursery|kg|jee|neet|all)/i) ||
      trimmed.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:to|-|and)\s*\d{1,2}(?:st|nd|rd|th)?)\b/i) ||
      trimmed.match(/\b(primary|middle school|senior secondary|11th and 12th|9th and 10th|1st to 5th|6th to 8th|9th to 12th|all classes|class 1-8|till 8th)\b/i);
    if (classMatch && !/^[12]$/.test(trimmed)) {
      const cl = classMatch[0].trim();
      updated.classLevel = cl;
      updated.classLevels = [cl];
    } else if (step === "T_CLASS" && !/^(menu|help|cancel)$/i.test(trimmed)) {
      updated.classLevel = trimmed;
      updated.classLevels = [trimmed];
    }

    const isAreaKeyword = /vihar|nagar|road|enclave|colony|delhi|noida|gurgaon|sector|pur|ext|saket|kalkaji|dwarka|rohini|janakpuri|uttam|vikaspuri|paschim|pitampura|shalimar|model town|ashok|south ex|malviya|green park|greater kailash|gk|cr park|nehru|lajpat|defence|vasant|mayur|laxmi|preet|nirman|shahdara|dilshad|karol bagh|patel|rajouri|najafgarh|narela|bawana|burari|sant nagar|sangam vihar|badarpur|sarita|okhla/i.test(trimmed);
    if (isAreaKeyword) {
      updated.area = trimmed;
      updated.city = (updated.city as string) || "Delhi";
    } else if (step === "T_AREA" && !/^(menu|help|cancel)$/i.test(trimmed)) {
      updated.area = trimmed;
      updated.city = (updated.city as string) || "Delhi";
    }

    const subMatches = trimmed.match(/\b(maths?|mathematics|science|physics|chemistry|biology|english|hindi|social studies|sst|history|geography|civics|economics|commerce|accounts|accountancy|business studies|computer science|cs|coding|python|all subjects)\b/gi);
    if (subMatches) {
      updated.subjects = Array.from(new Set(subMatches.map((s) => s.trim())));
    } else if (step === "T_SUBJECTS" && !/^(menu|help|cancel)$/i.test(trimmed)) {
      const splitSubs = trimmed.split(/,|and|&/i).map((s) => s.trim()).filter(Boolean);
      updated.subjects = splitSubs.length > 0 ? splitSubs : [trimmed];
    } else if (!updated.subjects && !isAreaKeyword && !classMatch && !emailMatch && !phoneMatch && !pwdMatch) {
      updated.subjects = [trimmed];
    }

    if (/all\s*subjects?|combo/i.test(trimmed)) {
      if (!updated.subjects || (Array.isArray(updated.subjects) && updated.subjects.length === 0)) {
        updated.subjects = ["All Subjects", "All Subjects (Class 1-8)"];
      } else if (!updated.subjects.some((s: string) => /all\s*subjects?/i.test(s))) {
        updated.subjects.push("All Subjects", "All Subjects (Class 1-8)");
      }
    }
    if (/1\s*[-–to]\s*8|class\s*1-8|till\s*8/i.test(trimmed)) {
      if (!updated.classLevel) {
        updated.classLevel = "Class 1-8";
        updated.classLevels = ["Class 1-8"];
      }
      if (!updated.subjects || (Array.isArray(updated.subjects) && updated.subjects.length === 0)) {
        updated.subjects = ["All Subjects", "All Subjects (Class 1-8)"];
      }
    }

    const subsArr = Array.isArray(updated.subjects) && updated.subjects.length > 0 ? (updated.subjects as string[]) : [];
    const hasSubs = subsArr.length > 0;
    const classArr = Array.isArray(updated.classLevels) && updated.classLevels.length > 0
      ? (updated.classLevels as string[])
      : updated.classLevel ? [String(updated.classLevel)] : [];
    const hasCls = classArr.length > 0;
    const areaStr = typeof updated.area === "string" ? updated.area.trim() : "";
    const hasAr = Boolean(areaStr && areaStr.toLowerCase() !== "delhi ncr" && areaStr.length >= 2);

    // Enforce 3 Teaching Criteria FIRST!
    if (!hasSubs && !hasCls && !hasAr) {
      return {
        reply: `Badhiya! Kaunse subject, kaunsi class aur kahan se ho? 📚`,
        nextStep: "T_CONVO",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Physics, Class 11-12, Rohini"],
      };
    }

    if (hasSubs && !hasCls && !hasAr) {
      const sFirst = subsArr[0] || "Subjects";
      const suggestions = getSubjectClassSuggestions(sFirst);
      return {
        reply: suggestions.prompt,
        nextStep: "T_CLASS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: suggestions.quickReplies,
      };
    }

    if (hasAr && hasSubs && !hasCls) {
      const subsStr = subsArr.filter((s) => !/all subjects \(class 1-8\)/i.test(s)).join(", ");
      const suggestions = getSubjectClassSuggestions(subsArr[0] || "Subjects");
      return {
        reply: `${areaStr} mein *${subsStr}* kaunsi classes ko padhate ho? 🎓`,
        nextStep: "T_CLASS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: suggestions.quickReplies,
      };
    }

    // Common-Sense Subject-Grade Compatibility Validation:
    if (hasSubs && hasCls) {
      const validation = validateSubjectClassCompatibility(subsArr, classArr[0] || "", "TUTOR");
      if (!validation.isValid) {
        updated.classLevel = undefined;
        updated.classLevels = undefined;
        return {
          reply: validation.reason!,
          nextStep: "T_CLASS",
          updatedData: updated,
          userType: "TUTOR",
          retries: 0,
          quickReplies: validation.suggestedReplies || ["Class 11-12", "Class 9-10 (Science)"],
        };
      }
      if (validation.switchedSubject) {
        updated.subjects = validation.switchedSubject;
        subsArr.length = 0;
        subsArr.push(...validation.switchedSubject);
      }
      if (validation.switchedClass) {
        updated.classLevel = validation.switchedClass;
        updated.classLevels = [validation.switchedClass];
        classArr.length = 0;
        classArr.push(validation.switchedClass);
      }
    }

    if (hasSubs && hasCls && !hasAr) {
      const ctx = formatHumanTeachingContext(subsArr, classArr[0] || "", areaStr);
      updated.subjects = ctx.cleanSubs;
      return {
        reply: ctx.humanAreaPrompt,
        nextStep: "T_AREA",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
      };
    }

    if (hasAr && !hasSubs && !hasCls) {
      return {
        reply: `*${areaStr}* mein kaunse subjects aur classes padhate ho? 📚`,
        nextStep: "T_CONVO",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
      };
    }

    if (!hasSubs) {
      return {
        reply: `Kaunse subjects padhate hain? 📚`,
        nextStep: "T_SUBJECTS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects (Class 1-8)", "Maths", "Science", "Maths & Science"],
      };
    }

    if (!hasCls) {
      return {
        reply: `Kaunsi class tak padhate ho? 🎓`,
        nextStep: "T_CLASS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Class 1-8 (All Subjects)", "Class 9-10", "Class 11-12", "All Classes (1 to 12)"],
      };
    }

    if (!hasAr) {
      return {
        reply: `Aapka teaching area / location kya hai? 📍`,
        nextStep: "T_AREA",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
      };
    }

    const ctx = formatHumanTeachingContext(subsArr, classArr[0] || "", areaStr);
    updated.subjects = ctx.cleanSubs;
    const areaName = areaStr || "Delhi";
    const emailStr = typeof updated.email === "string" ? updated.email.trim().toLowerCase() : "";
    const hasValidEmail = Boolean(emailStr && emailStr.includes("@") && emailStr.includes("."));

    // 1. Check Email (MANDATORY — NO SKIP)
    if (!hasValidEmail && step !== "T_PASSWORD") {
      return {
        reply: `Details note ho gayi! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\nStudent lead alerts aur login ke liye apna Email ID share karein: 📧`,
        nextStep: "T_EMAIL",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: [],
      };
    }

    // 2. Check Password
    const pwdStr = typeof updated.password === "string" ? updated.password.trim() : "";
    if (!pwdStr && step !== "T_PASSWORD") {
      return {
        reply: `Email note ho gaya: *${emailStr}* ✅\n\n🔐 Account login ke liye koi password rakhna chahte hain? (min 6 characters) ya reply karein *default*:`,
        nextStep: "T_PASSWORD",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Default Password", "12345678"],
      };
    }

    if (step === "T_PASSWORD") {
      if (/default|skip|12345678|nahi|no/i.test(pwdStr)) {
        updated.password = "12345678";
        updated._usedDefaultPassword = true;
      } else if (pwdStr.length < 6) {
        return {
          reply: `⚠️ Password minimum 6 characters ka hona chahiye.\n\n🔐 Phir se enter karein ya type karein *default*:`,
          nextStep: "T_PASSWORD",
          updatedData: { ...updated, password: undefined },
          userType: "TUTOR",
          retries: 0,
          quickReplies: ["Default Password", "12345678"],
        };
      }
    }

    // 3. Register Tutor
    const phoneToUse = (updated.phone as string) || session.phone;
    const emailToUse = hasValidEmail ? emailStr : undefined;

    const leads = await getChatbotMatchingLeads(
      areaName,
      (updated.city as string) || "Delhi",
      updated.classLevel as string,
      updated.subjects as string[]
    );

    try {
      await registerTutorFromWhatsapp(session.phone, {
        name: tutorName || "Tutor",
        email: emailToUse,
        phone: phoneToUse,
        password: pwdStr,
        city: (updated.city as string) || "Delhi",
        area: areaName,
        subjects: Array.isArray(updated.subjects) && updated.subjects.length > 0 ? (updated.subjects as string[]) : ["All Subjects"],
        classLevels: Array.isArray(updated.classLevels) && updated.classLevels.length > 0
          ? (updated.classLevels as string[])
          : updated.classLevel ? [String(updated.classLevel)] : ["Class 1 to 10"],
      });
    } catch (regErr) {
      console.error("[engine] fallback auto-register tutor failed:", regErr);
    }

    const usedDefault = updated._usedDefaultPassword === true;
    updated._registered = true;
    const richReply = formatTutorLeadsAndPlansMessage(tutorName, areaName, leads, {
      email: emailToUse,
      phone: phoneToUse,
      hasPassword: true,
    }) + (usedDefault ? `\n\n🔑 Default password *12345678* set kiya hai. Website par login karke change kar sakte hain: https://apnatutorhub.com/login` : "");

    return {
      reply: richReply,
      nextStep: "DONE",
      updatedData: updated,
      userType: "TUTOR",
      retries: 0,
      quickReplies: [
        leads.length > 0 ? `🔥 Unlock Lead #${leads[0].inquiryNumber}` : "🔥 View All Leads",
        "💰 View Coin Plans",
        "🌐 Leads Dashboard",
      ],
    };
  }

  // PARENT conversational fallback: Instantly deliver tutors & demo link!
  if (step === "P_CONVO") {
    const trimmed = rawMessage.trim();
    const updated = { ...data };

    if (!updated.area && /vihar|nagar|road|enclave|colony|delhi|noida|gurgaon|sector|pur|ext|saket/i.test(trimmed)) {
      updated.area = trimmed;
      updated.city = (updated.city as string) || "Delhi";
    } else if (!updated.classLevel) {
      updated.classLevel = trimmed;
    }

    const areaName = (updated.area as string) || "Delhi NCR";

    // Auto-register Parent in database (User + ParentProfile + StudentProfile + Lead)
    try {
      await registerParentFromWhatsapp(session.phone, {
        studentName: (updated.studentName as string) || (updated.name as string) || "Student",
        parentName: (updated.parentName as string) || (updated.name as string) || "Parent",
        email: (updated.email as string) || undefined,
        phone: (updated.phone as string) || session.phone,
        city: (updated.city as string) || "Delhi",
        area: areaName,
        classLevel: (updated.classLevel as string) || "Class 10",
        subjects: Array.isArray(updated.subjects) && updated.subjects.length > 0 ? (updated.subjects as string[]) : ["All Subjects"],
      });
    } catch (regErr) {
      console.error("[engine] fallback auto-register parent failed:", regErr);
    }

    const richReply = formatParentDemoMessage(
      areaName,
      updated.classLevel as string,
      updated.subjects as string[]
    );

    return {
      reply: richReply,
      nextStep: "DONE",
      updatedData: updated,
      userType: "PARENT",
      retries: 0,
      quickReplies: ["✨ Book Free Demo", "💰 Fee Structure", "📞 Call Coordinator"],
    };
  }

  // TUTOR steps (Rule-based standard flow)
  if (step.startsWith("T_")) {
    const result = await handleTutorStep(step, rawMessage, data, session.phone);
    if (!result) return handleInvalid(session, null);
    return {
      ...result,
      userType: "TUTOR",
      retries: 0,
      quickReplies: getStepQuickReplies(result.nextStep),
    };
  }

  // PARENT steps (Rule-based standard flow)
  if (step.startsWith("P_")) {
    const result = await handleParentStep(step, rawMessage, data, session.phone);
    if (!result) return handleInvalid(session, null);
    return {
      ...result,
      userType: "PARENT",
      retries: 0,
      quickReplies: getStepQuickReplies(result.nextStep),
    };
  }

  // Fallback
  return {
    reply: MSG.WELCOME,
    nextStep: "WELCOME",
    updatedData: {},
    userType: null,
    retries: 0,
    quickReplies: ["1️⃣ TUTOR", "2️⃣ PARENT"],
  };
}

// ── Quick Reply Helper for Standard Steps ──────────────────────────────────────

function getStepQuickReplies(nextStep: string): string[] | undefined {
  switch (nextStep) {
    case "T_CLASSES":
      return ["1 (Class 1-5)", "2 (Class 6-8)", "3 (Class 9-10)", "4 (Class 11-12)", "6 (All)"];
    case "T_MODE":
    case "P_MODE":
      return ["1 (Home visit)", "2 (Online only)", "3 (Both)"];
    case "P_CLASS":
      return ["1 (Class 1-5)", "2 (Class 6-8)", "3 (Class 9-10)", "4 (Class 11-12)"];
    case "P_BUDGET":
      return ["1 (₹3k–₹5k/mo)", "2 (₹5k–₹8k/mo)", "3 (₹8k–₹12k/mo)", "4 (₹12k+/mo)"];
    case "WELCOME":
      return ["1️⃣ TUTOR", "2️⃣ PARENT"];
    default:
      return undefined;
  }
}

// ── Helper: invalid reply handler ─────────────────────────────────────────────

function handleInvalid(
  session: BotSession,
  contextHint: string | null,
  quickReplies?: string[]
): EngineResult {
  const nextRetries = session.retries + 1;

  if (nextRetries >= MAX_RETRIES) {
    return {
      reply: MSG.TOO_MANY_RETRIES,
      nextStep: "WELCOME",
      updatedData: {},
      userType: null,
      retries: 0,
      quickReplies: ["MENU", "HELP"],
    };
  }

  const base = MSG.UNKNOWN;
  return {
    reply: contextHint ? `${base}\n\n${contextHint}` : base,
    nextStep: session.step,
    updatedData: session.data,
    retries: nextRetries,
    quickReplies: quickReplies || ["MENU", "HELP"],
  };
}
