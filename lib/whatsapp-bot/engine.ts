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

const MAX_RETRIES = 3;

function isValidName(v: string): boolean {
  const clean = v.trim();
  if (clean.length < 2 || clean.length > 50) return false;
  if (/^(hi|hello|hey|namaste|yes|no|ok|done|skip)$/i.test(clean)) return false;
  if (/\d/.test(clean)) return false;
  return /^[a-zA-Z\s.'-]+$/.test(clean);
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

  if (/show lead|view lead|matching lead|my lead|unlock lead|explore lead/i.test(msg)) {
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
        } else if (session.step === "T_PASSWORD" && !mergedData.password) {
          const candidate = rawMessage.trim();
          if (/^skip$/i.test(candidate)) {
            // User skipped password — use default 12345678
            mergedData.password = "12345678";
            mergedData._usedDefaultPassword = true;
          } else if (!/^(menu|help|cancel)$/i.test(candidate)) {
            mergedData.password = candidate;
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
        const hasDetails = Boolean(mergedData.area || mergedData.phone || mergedData.classLevel || (Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0));
        const isFirstChoice = session.step === "WELCOME" && isBareChoice && !hasDetails;
        if (isFirstChoice) {
          const isTutor = role === "TUTOR" || rawMessage.trim() === "1";
          return {
            reply: isTutor
              ? `Acha! Kaunsa subject padhate hain aur kahan se hain? 📚\n\nJaise: "Maths & Science, Dwarka Delhi"`
              : `Acha! Aapke bachche ke liye kaunsa subject chahiye aur class kya hai? 🎓\n\nJaise: "Class 10, Maths & Science, Rohini Delhi"`,
            nextStep: isTutor ? "T_CONVO" : "P_CONVO",
            updatedData: {},
            userType: isTutor ? "TUTOR" : "PARENT",
            retries: 0,
            quickReplies: isTutor
              ? ["Sangam Vihar, Delhi", "Dwarka, Delhi", "Skip Email", "Noida / Gurgaon"]
              : ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
          };
        }

        // TUTOR Onboarding: Require teaching details, then ask for Email and Password before creating account
        if (role === "TUTOR") {
          const hasTutorDetails = Boolean(
            mergedData.area ||
            mergedData.classLevel ||
            (Array.isArray(mergedData.classLevels) && mergedData.classLevels.length > 0) ||
            (Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0) ||
            (mergedData.name && !isBareChoice)
          );

          if (hasTutorDetails) {
            const tutorName = (mergedData.name as string) || (data.name as string) || "";
            const areaName = (mergedData.area as string) || (data.area as string) || "Delhi NCR";
            const cityName = (mergedData.city as string) || "Delhi";
            const subsArray = Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0 ? (mergedData.subjects as string[]) : [];
            const subsText = subsArray.length > 0 ? subsArray.join(", ") : "All Subjects";
            const classText = (mergedData.classLevel as string) || (Array.isArray(mergedData.classLevels) && mergedData.classLevels.length > 0 ? (mergedData.classLevels as string[]).join(", ") : "");
            const greeting = tutorName ? `Namaste *${tutorName}* ji! 🙏` : `Namaste! 🙏`;

            const emailStr = typeof mergedData.email === "string" ? mergedData.email.trim().toLowerCase() : "";
            const hasValidEmail = Boolean(emailStr && emailStr.includes("@") && emailStr.includes("."));
            const skippedEmail = /skip\s*email|^skip$/i.test(rawMessage.trim());

            // 1. Check Email: If missing, ask tutor for Email ID
            if (!hasValidEmail && !skippedEmail && session.step !== "T_PASSWORD") {
              return {
                reply: `${greeting}\nWe've noted your teaching details: 📚 *${subsText}*${classText ? ` (${classText})` : ""} at 📍 *${areaName}*.\n\n📧 To set up your verified tutor account and send instant student leads to your inbox, please reply with your *Email ID*:\n_(e.g. yourname@gmail.com)_`,
                nextStep: "T_EMAIL",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Skip Email", "Noida / Gurgaon", "Delhi NCR"],
              };
            }

            // 2. Check Password: If missing, ask tutor to set a password
            const pwdStr = typeof mergedData.password === "string" ? mergedData.password.trim() : "";
            if (!pwdStr) {
              const emailNotice = hasValidEmail ? `\n📧 *Email ID:* ${emailStr}` : "";
              return {
                reply: `Almost there! ✨${emailNotice}\n\n🔐 Please reply with the *Password* (minimum 6 characters) you want to create for your ApnaTutorHub account:\n_(You will use your email & this password to log in at https://apnatutorhub.com/login)_`,
                nextStep: "T_PASSWORD",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["123456", "Pass@123", "Help & Info"],
              };
            }

            // 3. Validate Password Length
            if (pwdStr.length < 6 && pwdStr !== "12345678") {
              return {
                reply: `Password 6 characters se kam hai.\n\n🔐 Phir se try karo (min 6 chars):`,
                nextStep: "T_PASSWORD",
                updatedData: { ...mergedData, password: undefined },
                userType: "TUTOR",
                retries: 0,
              };
            }

            // 4. All details ready! Register Tutor in database (User with passwordHash + TutorProfile + Wallet)
            const phoneToUse = (mergedData.phone as string) || session.phone;
            const emailToUse = hasValidEmail ? emailStr : undefined;

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
                classLevels: Array.isArray(mergedData.classLevels) && mergedData.classLevels.length > 0
                  ? (mergedData.classLevels as string[])
                  : mergedData.classLevel ? [String(mergedData.classLevel)] : ["Class 1 to 10"],
                experience: typeof mergedData.experience === "number" ? mergedData.experience : 2,
              });
            } catch (regErr) {
              console.error("[engine] auto-register tutor failed:", regErr);
            }

            const usedDefault = mergedData._usedDefaultPassword === true;
            const richReply = formatTutorLeadsAndPlansMessage(tutorName, areaName, leads, {
              email: emailToUse,
              phone: phoneToUse,
              hasPassword: true,
            }) + (usedDefault ? `\n\n⚠️ *Note:* Aapka default password *12345678* set kiya gaya hai. Login karke please change kar lena: https://apnatutorhub.com/login` : "");

            return {
              reply: richReply,
              nextStep: "DONE",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: [
                leads.length > 0 ? `🔥 Unlock Lead #${leads[0].inquiryNumber}` : "🔥 View All Leads",
                "💰 View Coin Plans",
                "🌐 Leads Dashboard",
              ],
            };
          }
        }

        // Fast Onboarding: If parent provided area or class/subject, IMMEDIATELY return verified tutors & demo!
        if (role === "PARENT" && (ai.isComplete || mergedData.area || mergedData.classLevel)) {
          const areaName = (mergedData.area as string) || (data.area as string) || "Delhi NCR";

          // Auto-register Parent in database (User + ParentProfile + StudentProfile + Lead)
          try {
            await registerParentFromWhatsapp(session.phone, {
              studentName: (mergedData.studentName as string) || (mergedData.name as string) || "Student",
              parentName: (mergedData.parentName as string) || (mergedData.name as string) || "Parent",
              email: (mergedData.email as string) || undefined,
              phone: (mergedData.phone as string) || session.phone,
              city: (mergedData.city as string) || "Delhi",
              area: areaName,
              classLevel: (mergedData.classLevel as string) || "Class 10",
              subjects: Array.isArray(mergedData.subjects) && mergedData.subjects.length > 0 ? (mergedData.subjects as string[]) : ["All Subjects"],
              timing: (mergedData.timing as string) || undefined,
            });
          } catch (regErr) {
            console.error("[engine] auto-register parent failed:", regErr);
          }

          const richReply = formatParentDemoMessage(
            areaName,
            mergedData.classLevel as string,
            mergedData.subjects as string[],
            {
              email: (mergedData.email as string) || undefined,
              phone: (mergedData.phone as string) || undefined,
              name: (mergedData.name as string) || (mergedData.parentName as string) || undefined,
            }
          );

          return {
            reply: richReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "PARENT",
            retries: 0,
            quickReplies: ["✨ Book Free Demo", "💰 Fee Structure", "📞 Call Coordinator"],
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
        reply: `Acha! Kaunsa subject padhate hain aur kahan se hain? 📚\n\nJaise: "Maths & Science, Dwarka Delhi"`,
        nextStep: "T_CONVO",
        updatedData: {},
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Sangam Vihar, Delhi", "Dwarka, Delhi", "Noida"],
      };
    }
    if (normalized === "2" || /parent|student|child|hire/i.test(normalized)) {
      return {
        reply: `Acha! Aapke bachche ke liye kaunsi class aur subject chahiye? 🎓\n\nJaise: "Class 10, Maths & Science, Rohini Delhi"`,
        nextStep: "P_CONVO",
        updatedData: {},
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Class 9-10 Maths & Sci", "Class 1-5 All", "Class 11-12"],
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

  // TUTOR conversational fallback: Require email and password before registering
  if (step === "T_CONVO" || step === "T_EMAIL" || step === "T_PASSWORD" || step === "DONE") {
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

    if (!updated.area && /vihar|nagar|road|enclave|colony|delhi|noida|gurgaon|sector|pur|ext|saket|kalkaji/i.test(trimmed)) {
      updated.area = trimmed;
      updated.city = (updated.city as string) || "Delhi";
    } else if (!updated.name && isValidName(trimmed) && !trimmed.includes(",") && !trimmed.includes("@")) {
      updated.name = trimmed;
    } else if (!updated.subjects) {
      updated.subjects = [trimmed];
    }

    const areaName = (updated.area as string) || "Delhi NCR";
    const tutorName = (updated.name as string) || "";
    const emailStr = typeof updated.email === "string" ? updated.email.trim().toLowerCase() : "";
    const hasValidEmail = Boolean(emailStr && emailStr.includes("@") && emailStr.includes("."));
    const skippedEmail = /skip\s*email|^skip$/i.test(trimmed);

    // 1. Check Email
    if (!hasValidEmail && !skippedEmail && step !== "T_PASSWORD") {
      return {
        reply: `Namaste${tutorName ? ` *${tutorName}* ji` : ""}! 🙏\n\n📧 Please reply with your *Email ID* (e.g. yourname@gmail.com) so we can create your tutor dashboard account and send you student lead alerts:`,
        nextStep: "T_EMAIL",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Skip Email", "Dwarka, Delhi", "Noida / Gurgaon"],
      };
    }

    // 2. Check Password
    const pwdStr = typeof updated.password === "string" ? updated.password.trim() : "";
    if (!pwdStr) {
      const emailNotice = hasValidEmail ? `\n📧 *Email ID:* ${emailStr}` : "";
      return {
        reply: `Almost there! ✨${emailNotice}\n\n🔐 Please reply with the *Password* (minimum 6 characters) you want to set for your ApnaTutorHub login account:\n_(Login URL: https://apnatutorhub.com/login)_`,
        nextStep: "T_PASSWORD",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["123456", "Pass@123", "Help & Info"],
      };
    }

    if (pwdStr.length < 6) {
      return {
        reply: `⚠️ Password must be at least 6 characters long.\n\n🔐 Please reply with a password of 6 or more characters:`,
        nextStep: "T_PASSWORD",
        updatedData: { ...updated, password: undefined },
        userType: "TUTOR",
        retries: 0,
      };
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

    const richReply = formatTutorLeadsAndPlansMessage(tutorName, areaName, leads, {
      email: emailToUse,
      phone: phoneToUse,
      hasPassword: true,
    });

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
