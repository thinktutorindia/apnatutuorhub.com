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
  formatSingleLeadInquiry,
} from "./leads-helper";
import {
  registerTutorFromWhatsapp,
  registerParentFromWhatsapp,
} from "./auto-register";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import {
  getSubjectClassSuggestions,
  validateSubjectClassCompatibility,
  parseGrade,
  validateAndCleanLocality,
  validateAndAlignSubjects,
  KNOWN_INDIAN_CITIES,
  PLACE_INDICATORS,
} from "./subject-rules";

// Admin WhatsApp numbers — these get lead forwarding + full control
const ADMIN_PHONES = ["919311459543", "917559563565"];

const MAX_RETRIES = 3;

export const DELHI_NCR_LOCALITIES = [
  "dwarka", "rohini", "janakpuri", "uttam nagar", "vikaspuri", "paschim vihar",
  "pitampura", "shalimar bagh", "model town", "ashok vihar", "civil lines",
  "connaught place", "cp", "south ex", "south extension", "saket", "hauz khas",
  "malviya nagar", "green park", "greater kailash", "gk", "cr park", "kalkaji",
  "nehru place", "lajpat nagar", "defence colony", "vasant kunj", "vasant vihar",
  "munirka", "rk puram", "mayur vihar", "laxmi nagar", "preet vihar", "nirman vihar",
  "shahdara", "dilshad garden", "karol bagh", "patel nagar", "rajouri garden",
  "tagore garden", "subhash nagar", "tilak nagar", "najafgarh", "narela", "bawana",
  "burari", "sant nagar", "sangam vihar", "badarpur", "sarita vihar", "okhla",
  "jasola", "noida", "greater noida", "gurgaon", "gurugram", "ghaziabad",
  "faridabad", "indirapuram", "vaishali", "kaushambi", "mukundpur", "mukherjee nagar",
  "azadpur", "neb sarai", "sainik farm", "devli", "khanpur", "tigri", "madangir",
  "alaknanda", "govindpuri", "pul prahladpur", "chhatarpur", "mehrauli", "safdarjung",
  "kalyan vihar", "panchsheel park", "shastri nagar", "seelampur", "yamuna vihar",
  "bhajanpura", "karawal nagar", "mustafabad", "geeta colony", "anand vihar", "ip extension",
  "patparganj", "keshav puram", "gtb nagar", "kingsway camp", "timarpur", "punjabi bagh"
];

export function cleanExtractedArea(raw: unknown, defaultCity = "Delhi"): string {
  const res = validateAndCleanLocality(raw, defaultCity);
  return res.isValid ? res.area : "";
}

export function isValidEmailDomain(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const user = parts[0].trim();
  const domain = parts[1].toLowerCase().trim();

  // Local-part username must be non-empty and valid
  if (!user || user.length === 0 || !/^[a-zA-Z0-9._%+-]+$/.test(user)) return false;

  // Reject common domain typos
  if (/^(gmai|gmal|gamil|gmaill|gmial)\./i.test(domain)) return false;
  if (/^(yaho|yahooo|yhoo)\./i.test(domain)) return false;
  if (/^(hotmial|hotmai)\./i.test(domain)) return false;
  if (/\.(gom|con|cpm|coom|comm|cm)$/i.test(domain)) return false;

  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(domain);
}

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

  const grade = parseGrade(cleanClass);
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

  const isSenior = (grade !== null && grade >= 11) || /11|12|senior/i.test(cleanClass);
  if (isSenior) {
    // In Class 11-12, 'All Subjects' does not exist in school curricula.
    cleanSubs = cleanSubs.filter((s) => !/all\s*subjects?|combo/i.test(s));
    if (cleanSubs.length === 0) cleanSubs.push("Mathematics");
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
    humanAreaPrompt = `Ji bilkul! ${cleanClass || "Class 1-5"} Science ke liye Delhi NCR mein aapka teaching area kaunsa hai? 📍`;
  } else if (cleanClass && cleanSubs.length > 0) {
    const mainSub = cleanSubs.filter((s) => !/all subjects \(class 1-8\)/i.test(s))[0] || cleanSubs[0];
    humanAreaPrompt = `Ji bilkul! ${cleanClass} ${mainSub} ke liye Delhi NCR mein aapka teaching area kaunsa hai? 📍`;
  } else if (cleanClass) {
    humanAreaPrompt = `Ji bilkul! ${cleanClass} ke liye Delhi NCR mein aapka teaching area kaunsa hai? 📍`;
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

/**
 * Synchronize user credentials (password, email, name, subjects, area)
 * directly in PostgreSQL across User and TutorProfile tables.
 */
export async function syncUserCredentialsInDb(params: {
  phone: string;
  email?: string;
  password?: string;
  name?: string;
  subjects?: string[];
  area?: string;
  city?: string;
}): Promise<{ ok: boolean; updatedFields: string[]; error?: string }> {
  const updatedFields: string[] = [];
  try {
    const rawTargetPhone = params.phone.replace(/\D/g, "");
    const normalizedPhone = normalizeIndiaWhatsApp(params.phone) ?? rawTargetPhone;
    const last10Phone = rawTargetPhone.slice(-10);

    // Build exact phone OR filters covering all stored formats
    const phoneFilters: Array<{ phone: string }> = [];
    if (normalizedPhone) phoneFilters.push({ phone: normalizedPhone });
    if (last10Phone) phoneFilters.push({ phone: last10Phone });
    if (rawTargetPhone.length > 10) {
      phoneFilters.push({ phone: rawTargetPhone });
    }
    // Also include 91XXXXXXXXXX variant explicitly
    if (last10Phone && !rawTargetPhone.startsWith("91")) {
      phoneFilters.push({ phone: `91${last10Phone}` });
    }

    // Fallback: also match by wa_ generated email (used when phone-based register happened)
    const waEmail = `wa_${last10Phone}@apnatutorhub.com`;

    // 1. Password update — find the specific user first (prioritize tutor), then update by ID
    let passwordHash: string | undefined;
    if (params.password && params.password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(params.password.trim(), 10);

      // Try phone-based lookup first
      let targetUser = await prisma.user.findFirst({
        where: { OR: phoneFilters },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      // Fallback: look up by wa_ email
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({
          where: { email: waEmail },
          select: { id: true },
        });
      }

      if (targetUser) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { passwordHash },
        });
        updatedFields.push("password");
        console.info(`[syncUserCredentialsInDb] Password updated for user ${targetUser.id}`);
      } else {
        console.warn(`[syncUserCredentialsInDb] No user found for phone ${params.phone} — password NOT updated`);
      }
    }

    // 2. Email update
    if (params.email && isValidEmailDomain(params.email)) {
      const cleanEmail = params.email.trim().toLowerCase();
      // Find the user to update — try phone first, then wa_ email fallback
      let user = await prisma.user.findFirst({
        where: { OR: phoneFilters },
        orderBy: { createdAt: "desc" },
      });
      if (!user) {
        user = await prisma.user.findFirst({ where: { email: waEmail } });
      }

      if (user) {
        // Check if another distinct user owns this email
        const existingEmailUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!existingEmailUser || existingEmailUser.id === user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              email: cleanEmail,
              ...(params.name ? { name: params.name.trim() } : {}),
              ...(passwordHash ? { passwordHash } : {}),
            },
          });
          updatedFields.push("email");
          console.info(`[syncUserCredentialsInDb] Email updated to ${cleanEmail} for user ${user.id}`);
        } else {
          console.warn(`[syncUserCredentialsInDb] Email ${cleanEmail} is already taken by user ${existingEmailUser.id}`);
        }
      } else {
        console.warn(`[syncUserCredentialsInDb] No user found for phone ${params.phone} — email NOT updated`);
      }
    }

    // 3. Name update
    if (params.name && isValidName(params.name)) {
      const cleanName = params.name.trim();
      let nameUser = await prisma.user.findFirst({
        where: { OR: phoneFilters },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!nameUser) {
        nameUser = await prisma.user.findFirst({ where: { email: waEmail }, select: { id: true } });
      }
      if (nameUser) {
        await prisma.user.update({ where: { id: nameUser.id }, data: { name: cleanName } });
        updatedFields.push("name");
      }
    }

    // 4. Tutor profile update (subjects, area, city)
    const tutorUser = await prisma.user.findFirst({
      where: { OR: phoneFilters, tutorProfile: { isNot: null } },
      include: { tutorProfile: true },
    });

    if (tutorUser && tutorUser.tutorProfile) {
      const profileUpdates: any = {};
      if (params.area) {
        profileUpdates.address = params.area;
      }
      if (params.city) {
        profileUpdates.city = params.city;
      }
      if (params.subjects && params.subjects.length > 0) {
        profileUpdates.subjects = params.subjects;
      }
      if (Object.keys(profileUpdates).length > 0) {
        await prisma.tutorProfile.update({
          where: { id: tutorUser.tutorProfile.id },
          data: profileUpdates,
        });
        if (params.area || params.city) updatedFields.push("area");
        if (params.subjects) updatedFields.push("subjects");
      }
    }

    // 5. Also update whatsappSession.data if session exists
    try {
      const existingSession = await prisma.whatsappSession.findFirst({
        where: { OR: phoneFilters },
      });
      if (existingSession) {
        const curData = (existingSession.data as Record<string, any>) || {};
        const merged = { ...curData };
        if (params.email) merged.email = params.email.trim().toLowerCase();
        if (params.password) merged.password = params.password.trim();
        if (params.name) merged.name = params.name.trim();
        if (params.area) merged.area = params.area.trim();
        if (params.city) merged.city = params.city.trim();
        if (params.subjects) merged.subjects = params.subjects;

        await prisma.whatsappSession.update({
          where: { id: existingSession.id },
          data: { data: merged },
        });
      }
    } catch (sessionErr) {
      console.warn("[syncUserCredentialsInDb] Session sync warning:", sessionErr);
    }

    return { ok: true, updatedFields };
  } catch (err: any) {
    console.error("[syncUserCredentialsInDb] Error syncing credentials:", err);
    return { ok: false, updatedFields, error: err?.message || String(err) };
  }
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

  // ── Unsubscribe / Stop Commands (AquaSMS chat log pattern) ─────────────────
  if (/\b(?:unsubscribe|unsub|stop\s*messages?|stop\s*messaging|dont\s*message|don't\s*message|mat\s*bhejo|msg\s*mat\s*karo)\b|^stop$/i.test(rawMessage.trim())) {
    return {
      reply: `Aapko notifications se unsubscribe kar diya gaya hai. Hamari taraf se ab aapko automated alerts nahi aayenge. 🙏\n\nAgar future mein dobara tuition alerts chahiye hon, toh bas *START* likh kar bhej dein.\n\nApnaTutorHub.com`,
      nextStep: "WELCOME",
      updatedData: { ...data, unsubscribed: true },
      userType: session.userType,
      retries: 0,
      quickReplies: ["START", "MENU"],
    };
  }

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
      reply: `📞 Hamare coordinator se seedha baat karein:\n\nWhatsApp: +91 93191 93109\nTime: 9am – 7pm (Mon–Sat)\n\nUnhe batayein aapka naam aur issue.`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["MENU", "View Leads", "Buy Coins"],
    };
  }

  // ── Staff Escalation: complaint / issue / problem / scam ─────────────────
  if (/\b(problem|issue|complaint|cheated|fraud|refund|not working|call me|fake|chor|scam|dhokha|loot|police|court)\b/i.test(rawMessage)) {
    return {
      reply: `Samajh gaya. Seedha humse baat karo:\n\n📞 WhatsApp: +91 93191 93109\nTime: 9am–7pm (Mon–Sat)\n\nUnhe aapka naam aur issue batao.`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["MENU", "View Leads", "Buy Coins"],
    };
  }

  // ── Free Leads / Bargaining / Pehle Demo Baad Mein Payment ────────────────
  if (
    /(?:bina\s*(?:paise|reg|payment)|free\s*(?:lead|enquiry|tuition|demo)|pehle\s*demo\s*(?:fir|phir|baad)|payment\s*baad|ek\s*(?:lead|enquiry)\s*(?:free|dedo))/i.test(rawMessage)
  ) {
    return {
      reply: `Sir hum samajhte hain, par parents ke direct verified phone number aur address access ke liye membership zaroori hoti hai taaki genuine teachers hi connect karein. 🙏\n\nAap ₹99 starter offer ya ₹999 plan se shuru kar sakte hain jisme 100% fees aapki rehti hai (0% commission)!\n\n👉 Plan dekhein: https://apnatutorhub.com/tutor/plans\n👉 All Leads: https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Plans 💰", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  // If user previously unsubscribed and hasn't sent a restart keyword, acknowledge gently
  if (data.unsubscribed === true && !SPECIAL_COMMANDS.includes(msg)) {
    return {
      reply: `Aapne pehle tuition alerts unsubscribe kiye the. Dobara shuru karne ke liye *START* likhein. 🙏`,
      nextStep: "WELCOME",
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["START", "MENU"],
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
    const profileText = `👤 *Aapka Profile:*\n\nNaam: ${name}\nEmail: ${email}\nLocation: ${location}\nSubjects: ${subjects}\nPhone: +91-${session.phone}\nPassword: Set (encrypted 🔒)\n\nKuch update karna hai? Type karein:\n*UPDATE PASSWORD <naya password>*\n*UPDATE EMAIL <naya email>*\n*UPDATE NAME / UPDATE SUBJECTS*`;
    return {
      reply: profileText,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["Update Password", "Update Email", "Update Subjects", "View Leads 📋"],
    };
  }

  // ── Password Query (e.g. "mera account ka password kya hai", "password kya hai", "forgot password") ──
  if (
    /(?:mera|apna|account|login)?\s*(?:ka\s*)?password\s*(?:kya\s*hai|batao|bhool\s*gaya|bataiye|dikhao|reset)|what\s*(?:is\s*)?(?:my\s*)?password|forgot\s*password|reset\s*password/i.test(
      rawMessage.trim()
    )
  ) {
    const email = (data.email as string) || "N/A";
    return {
      reply: `Aapka password security reasons ki wajah se hamare system mein encrypted rehta hai. 🔐\n\n👤 *Aapke Login Details:*\n📱 Mobile: +91-${session.phone}\n📧 Email: ${email}\n\nNaya password set karne ke liye type karein:\n*UPDATE PASSWORD <naya password>*\n(Jaise: UPDATE PASSWORD MyPass@123)`,
      nextStep: step === "WELCOME" ? "DONE" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Update Password", "My Profile 👤", "View Leads 📋"],
    };
  }

  // ── Combined Email & Password Update Command ──
  // Examples:
  // "update my gmail and password coderrohit2927@gmail.com"
  // "update email and password test@gmail.com Rohit@2927"
  // "update my email and password"
  const emailAndPassMatch =
    rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)\s+and\s+password(?:\s+(.+))?$/i) ||
    rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?password\s+and\s+(?:email|gmail)(?:\s+(.+))?$/i);

  if (emailAndPassMatch) {
    const rest = (emailAndPassMatch[1] || "").trim();
    const emailMatch = rest.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const remainingTokens = rest.replace(emailMatch[0], "").trim().split(/\s+/).filter(Boolean);
      const possiblePass = remainingTokens.length > 0 ? remainingTokens[0] : null;

      if (possiblePass && possiblePass.length >= 6) {
        await syncUserCredentialsInDb({
          phone: session.phone,
          email,
          password: possiblePass,
        });
        const updated = { ...data, email, password: possiblePass };
        return {
          reply: `Email (*${email}*) aur Password (*${possiblePass}*) dono successfully update ho gaye hain! 🔒\n\nAap login kar sakte hain:\nhttps://apnatutorhub.com/login`,
          nextStep: "DONE",
          updatedData: updated,
          retries: 0,
          quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
        };
      } else {
        await syncUserCredentialsInDb({
          phone: session.phone,
          email,
        });
        const updated = { ...data, email };
        return {
          reply: `Email *${email}* update ho gaya hai! ✅\n\nAb account login ke liye apna naya password type karein (min 6 characters): 🔑`,
          nextStep: "UPDATE_PASSWORD",
          updatedData: updated,
          retries: 0,
          quickReplies: ["12345678", "Cancel"],
        };
      }
    } else {
      return {
        reply: "Apna naya email ID type karein: 📧",
        nextStep: "UPDATE_EMAIL",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
  }

  // ── Single-shot Password Update ──
  // Examples: "update my password Rohit@2927", "update password Rohit@2927", "change password Rohit@2927", "set password Rohit@2927"
  const directPassMatch = rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?password\s+(.+)$/i);
  if (directPassMatch) {
    const newPass = directPassMatch[1].trim();
    if (newPass.length < 6) {
      return {
        reply: "Password kam se kam 6 characters ka hona chahiye. Kripya naya password type karein: 🔑",
        nextStep: "UPDATE_PASSWORD",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
    await syncUserCredentialsInDb({
      phone: session.phone,
      password: newPass,
    });
    const updated = { ...data, password: newPass };
    const userEmail = (data.email as string) || "aapka email";
    return {
      reply: `Password successfully update ho gaya hai: *${newPass}* 🔒\n\nAap is password aur apne email (*${userEmail}*) ya mobile (+91-${session.phone}) se login kar sakte hain:\nhttps://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: updated,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  // Matches "update password", "change password", "set password", "update my password"
  if (/^(?:update|change|set)\s*(?:my\s*)?password$/i.test(rawMessage.trim())) {
    return {
      reply: "Apna naya password type karein (min 6 characters): 🔑",
      nextStep: "UPDATE_PASSWORD",
      updatedData: data,
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }

  // ── Single-shot Email Update ──
  // Examples: "update my email coderrohit2927@gmail.com", "update gmail coderrohit2927@gmail.com"
  const directEmailMatch = rawMessage.trim().match(
    /^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/i
  );
  if (directEmailMatch) {
    const newEmail = directEmailMatch[1].trim().toLowerCase();
    if (!isValidEmailDomain(newEmail)) {
      return {
        reply: "Kripya sahi email address enter karein (jaise: yourname@gmail.com): 📧",
        nextStep: "UPDATE_EMAIL",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
    await syncUserCredentialsInDb({
      phone: session.phone,
      email: newEmail,
    });
    const updated = { ...data, email: newEmail };
    return {
      reply: `Email successfully update ho gaya hai: *${newEmail}* ✅\n\nAap is email se portal par login kar sakte hain:\nhttps://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: updated,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  // Matches "update email", "change email", "update gmail", "update my email", "update my gmail"
  if (/^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)$/i.test(rawMessage.trim())) {
    return {
      reply: "Apna naya email ID type karein: 📧",
      nextStep: "UPDATE_EMAIL",
      updatedData: data,
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }

  // ── Single-shot Name ──
  const directNameMatch = rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?name\s+(.+)$/i);
  if (directNameMatch) {
    const newName = directNameMatch[1].trim();
    if (isValidName(newName)) {
      await syncUserCredentialsInDb({ phone: session.phone, name: newName });
      return {
        reply: `Naam successfully update ho gaya: *${newName}* ✅`,
        nextStep: "DONE",
        updatedData: { ...data, name: newName },
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }
  if (/^(?:update|change|set)\s*(?:my\s*)?name$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya naam type karo:", nextStep: "UPDATE_NAME", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  // ── Single-shot Area ──
  const directAreaMatch = rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?area\s+(.+)$/i);
  if (directAreaMatch) {
    const newArea = directAreaMatch[1].trim();
    const cleanArea = cleanExtractedArea(newArea) || newArea;
    await syncUserCredentialsInDb({ phone: session.phone, area: cleanArea });
    return {
      reply: `Area successfully update ho gaya: *${cleanArea}* 📍`,
      nextStep: "DONE",
      updatedData: { ...data, area: cleanArea },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }
  if (/^(?:update|change|set)\s*(?:my\s*)?area$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya area / locality type karo:", nextStep: "UPDATE_AREA", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?subjects?$/i.test(rawMessage.trim())) {
    return { reply: "Kaunse subjects padhate ho? (comma separated):", nextStep: "UPDATE_SUBJECTS", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?phone$/i.test(rawMessage.trim())) {
    return { reply: "Apna naya phone number type karo (10 digits):", nextStep: "UPDATE_PHONE", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  // ── Handle active update steps ──
  if (step.startsWith("UPDATE_") && /^(cancel|back|wapas|nahi)$/i.test(rawMessage.trim())) {
    return {
      reply: "Update cancel kar diya gaya. Aap login ya matching leads dekh sakte hain.",
      nextStep: "DONE",
      updatedData: data,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_NAME") {
    const newName = rawMessage.trim();
    if (!isValidName(newName)) {
      return {
        reply: "Kripya sahi naam enter karein (sirf letters, min 2 characters):",
        nextStep: "UPDATE_NAME",
        updatedData: data,
        retries: 0,
      };
    }
    await syncUserCredentialsInDb({ phone: session.phone, name: newName });
    return {
      reply: `Naam update ho gaya: *${newName}* ✅`,
      nextStep: "DONE",
      updatedData: { ...data, name: newName },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_EMAIL") {
    const rawEmail = rawMessage.trim().toLowerCase();
    const emailMatch = rawEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const newEmail = emailMatch ? emailMatch[0] : rawEmail;
    if (!isValidEmailDomain(newEmail)) {
      return {
        reply: "Kripya sahi email ID enter karein (jaise: yourname@gmail.com):",
        nextStep: "UPDATE_EMAIL",
        updatedData: data,
        retries: 0,
      };
    }
    await syncUserCredentialsInDb({ phone: session.phone, email: newEmail });
    return {
      reply: `Email update ho gaya: *${newEmail}* ✅\n\nAap is email se login kar sakte hain: https://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: { ...data, email: newEmail },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_PASSWORD") {
    const newPass = rawMessage.trim();
    if (newPass.length < 6) {
      return {
        reply: "Password kam se kam 6 characters ka hona chahiye. Kripya naya password type karein: 🔑",
        nextStep: "UPDATE_PASSWORD",
        updatedData: data,
        retries: 0,
      };
    }
    await syncUserCredentialsInDb({ phone: session.phone, password: newPass });
    const userEmail = (data.email as string) || "aapka email";
    return {
      reply: `Password successfully update ho gaya hai: *${newPass}* 🔒\n\nAap is email (*${userEmail}*) aur naye password se portal par login kar sakte hain:\nhttps://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: { ...data, password: newPass },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_SUBJECTS") {
    const subs = rawMessage.split(/,|and/i).map((s) => s.trim()).filter(Boolean);
    await syncUserCredentialsInDb({ phone: session.phone, subjects: subs });
    return {
      reply: `Subjects update ho gaye: *${subs.join(", ")}* ✅`,
      nextStep: "DONE",
      updatedData: { ...data, subjects: subs },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_AREA") {
    const cleanArea = cleanExtractedArea(rawMessage.trim()) || rawMessage.trim();
    await syncUserCredentialsInDb({ phone: session.phone, area: cleanArea });
    return {
      reply: `Area update ho gaya: *${cleanArea}* 📍`,
      nextStep: "DONE",
      updatedData: { ...data, area: cleanArea },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (step === "UPDATE_PHONE") {
    const phoneMatch = rawMessage.match(/([6-9]\d{9})/);
    const newPhone = phoneMatch ? phoneMatch[1] : rawMessage.trim();
    return {
      reply: `Phone update request note ho gayi: *${newPhone}* 📱\n\nSecurity ke liye WhatsApp number verify karna hota hai. Agar aapka number change hua hai, toh kripya naye number se WhatsApp karein.`,
      nextStep: "DONE",
      updatedData: { ...data, phone: newPhone },
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  // ── Single Inquiry / Lead Unlock Shortcut (e.g. "#32042", "Unlock Lead #32042", "32042") ──
  // STRICT GUARD: Never intercept numbers during active registration steps (e.g. password "123456", budget "5000", pincode "110062")
  const isRegistrationStep =
    step.startsWith("T_") ||
    step.startsWith("P_") ||
    step === "LANG_SELECT" ||
    step === "WELCOME";

  const hasExplicitLeadPrefix =
    /^(?:(?:unlock|view|show|check|open|lead)\s*(?:lead\s*)?)(?:#|ath[- ]?)?(\d{4,7})$/i.test(rawMessage.trim()) ||
    /^#(?:ath[- ]?)?(\d{4,7})$/i.test(rawMessage.trim()) ||
    /(?:(?:unlock|view|show|check|open)\s+lead\s+)#?(\d{4,7})\b/i.test(rawMessage.trim());

  const isBareNumberInDone =
    (step === "DONE" || data._registered === true) &&
    /^\d{4,7}$/.test(rawMessage.trim());

  if (!isRegistrationStep && (hasExplicitLeadPrefix || isBareNumberInDone)) {
    const inquiryMatch =
      rawMessage.trim().match(/^(?:(?:unlock|view|show|check|open|lead)\s*(?:lead\s*)?)?(?:#|ath[- ]?)?(\d{4,7})$/i) ||
      rawMessage.trim().match(/(?:(?:unlock|view|show|check|open)\s*(?:lead)?\s*)#?(\d{4,7})\b/i);

    if (inquiryMatch) {
      const inqNum = parseInt(inquiryMatch[1], 10);
      const result = await formatSingleLeadInquiry(inqNum, session.phone);
      return {
        reply: result.reply,
        nextStep: "DONE",
        updatedData: data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: result.quickReplies,
      };
    }
  }

  // ── High-Intent Real Chat Scenarios (Identified from Aqua SMS logs) ─────────

  // 1. Demanding Parent Contact Number directly in chat
  if (
    /(?:\b(?:parent|parents|student|party)\b.*\b(?:contact|number|phone|mobile|no)\b|\b(?:contact|number|phone|mobile|no)\b.*\b(?:parent|parents|student|party)\b)/i.test(rawMessage) ||
    /contact\s*no\s*(?:do|bhejo|dedo|de\s*do)/i.test(rawMessage)
  ) {
    return {
      reply: `Sir, student aur parent ka direct verified mobile number aur address dekhne ke liye lead ko website par unlock karna hota hai:\n\n1️⃣ Website open karein: https://apnatutorhub.com/tutor/leads\n2️⃣ Lead select karke *Unlock Lead* par click karein.\n3️⃣ Parent ka direct call number & WhatsApp turant display ho jayega!\n\n💡 *ApnaTutorHub Benefit:* Hum monthly tuition fees mein se 0% commission lete hain — parent jo bhi fees denge, 100% aapki hogi!\n\nDirect Support WhatsApp: +91 93191 93109`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Buy Coins / Plans 💰", "Help 📞"],
    };
  }

  // 2. Online Class Preference (e.g. tutors outside Delhi or preferring remote)
  if (
    /(?:\bonline\b.*?\b(?:class|classes|tuition|tutor|available|teach|padhana|student|work)\b|\b(?:class|classes|tuition|tutor|teach|padhana)\b.*?\bonline\b|^online\s*(?:only)?$)/i.test(rawMessage)
  ) {
    return {
      reply: `Ji bilkul! Hamare platform par All-India Online Home Tuitions bhi available hain. 💻\n\nAap pure India ke students ko ghar baithe online classes (Google Meet / Zoom) de sakte hain:\n\n👉 *Online Leads dekhein:*\nhttps://apnatutorhub.com/tutor/leads?mode=ONLINE\n\n👉 *0% Commission Plans:*\nhttps://apnatutorhub.com/tutor/plans\n\nAap kaunse subjects aur classes online padhana chahte hain? Humein reply karein taaki hum aapke liye matching online leads bhej sakein!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, mode: "ONLINE" },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Online Leads 💻", "Buy Plans 💰", "Update Subjects 📚"],
    };
  }

  // 3. Distance Too Far / Location Mismatch
  if (
    /\b(?:distance\s*(?:is\s*)?(?:too\s*|so\s*|very\s*)?far|too\s*far|so\s*far|very\s*far|bahut\s*door|kafi\s*door|dur\s*hai|door\s*hai|location\s*is\s*far|not\s*in\s*delhi|mere\s*ghar\s*se\s*door|travel\s*nahi\s*kar\s*sakta)\b/i.test(rawMessage)
  ) {
    return {
      reply: `Samajh gaya sir! Agar ye location aapse door hai toh koi pareshani nahi:\n\n1️⃣ *Apne Area Ke Leads Filter Karein:*\nWebsite par jaakar aap apne exact locality ya city ke according leads dekh sakte hain:\nhttps://apnatutorhub.com/tutor/leads\n\n2️⃣ *Online Classes:*\nAap Online tuitions bhi le sakte hain jisme koi travel distance nahi hota:\nhttps://apnatutorhub.com/tutor/leads?mode=ONLINE\n\nApna exact locality aur city batayein (jaise: 'Bandra Mumbai' ya 'Rohini Delhi'), hum aapko aapke area ke tuitions dikhayenge! 📍`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Filter Leads 📍", "View Online Leads 💻", "Update Area 🏠"],
    };
  }

  // 4. Mobile App Download / PWA Instructions
  if (
    /(?:mobile\s*app|application\s*kya\s*hai|name\s*of\s*your\s*mobile\s*app|app\s*download|play\s*store\s*app|download\s*app|app\s*ka\s*naam|konsa\s*app|kon\s*sa\s*app|kaha\s*se\s*download)/i.test(rawMessage)
  ) {
    return {
      reply: `Apna Tutor Hub ek ultra-fast Web-App (PWA) hai jo bina kisi Play Store download ke aapke phone par 1-click me install ho jaati hai! 📱\n\n*Mobile App install karne ka aasan tarika:*\n1️⃣ Chrome browser mein open karein: https://apnatutorhub.com\n2️⃣ Browser ke top-right corner mein 3 dots (⋮) par click karein.\n3️⃣ *"Install App"* ya *"Add to Home Screen"* select karein.\n\nAapke phone screen par Apna Tutor Hub ka official app icon aa jayega aur aapko instant lead alerts milenge!`,
      nextStep: step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Open Website 🌐", "View Leads 📋", "Help 📞"],
    };
  }

  // 5. "Saari toh booked bta rha hai" / Max Capacity Query
  if (
    /(?:saari\s*toh\s*booked|sab\s*(?:hi\s*)?booked|all\s*leads?\s*(?:are\s*)?booked|booked\s*bata\s*raha|full\s*ho\s*gaya|lead\s*full\s*hai|koi\s*bhi\s*open\s*nahi|already\s*booked)/i.test(rawMessage)
  ) {
    return {
      reply: `Sir hamara strict quality rule hai ki ek tuition lead par maximum 3 verified teachers hi unlock kar sakte hain. Isse parents ko spam calls nahi jaate aur aapke final selection ke chances 90%+ rehte hain! 🎯\n\nAgar koi lead "Booked" dikha rahi hai, iska matlab uske 3 slots book ho chuke hain.\n\n👉 *Fresh & Active Leads (jisme slots khali hain):*\nhttps://apnatutorhub.com/tutor/leads?status=ACTIVE\n\nHar 15-30 minute mein naye parents requirement post karte hain, isliye notification aate hi turant unlock karein!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Fresh Leads ⚡", "Recharge Wallet 💳", "Coordinator Support 📞"],
    };
  }

  // 6. Demo Class Rules & Expectations
  if (
    /(?:demo\s*class\s*kaise|demo\s*ka\s*rule|demo\s*ke\s*baad|trial\s*class|how\s*does\s*demo\s*work|first\s*class\s*free|pehle\s*demo)/i.test(rawMessage)
  ) {
    return {
      reply: `*Demo Class Rule & Process:* 🎓\n\n1️⃣ *Tutors ke liye:*\nLead unlock karne ke baad parent se call karke convenient time par 30-45 minutes ki trial/demo class schedule karein. Demo pasand aane par parent aapse monthly fees aur schedule final karenge.\n\n2️⃣ *Zero Commission:*\nApna Tutor Hub monthly tuition fees mein se 0% commission leta hai — parent ki poori fees seedha aapke paas rehti hai!\n\n3️⃣ *Parents ke liye:*\nAap verified home tutor se 1 free trial demo le sakte hain. Jab student aur aap fully satisfied hon, tabhi classes continue karein.`,
      nextStep: step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Buy Coins 💰", "Help 📞"],
    };
  }

  // 7. Hiring / Job banter / "Mere pass job kr lo"
  if (
    /(?:mere\s*pa?ss\s*job|kuch\s*kaam\s*hai|job\s*chahiye|teaching\s*job|salary\s*kitni\s*milegi|interview\s*kab\s*hoga)/i.test(rawMessage)
  ) {
    return {
      reply: `Apna Tutor Hub par hazaron verified home tuitions aur teaching opportunities available hain! 📚\n\nAap student leads unlock karke direct parents se connect kar sakte hain aur apni manchahi fees le sakte hain (0% Commission).\n\n👉 Available Tuitions dekhein: https://apnatutorhub.com/tutor/leads\nAap kaunse subjects aur classes padhate hain? Humein batayein!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "0% Commission Plans 💰", "Help 📞"],
    };
  }

  // 8. Tutors replying "Interested" to broadcast alerts without an inquiry ID
  if (
    /^(?:interested|yes\s*interested|i\s*am\s*interested|sir\s*i\s*am\s*interested|interested\s*sir|interested\s*for\s*home\s*tuition|interested\s*for\s*tuition|want\s*this\s*lead|i\s*want\s*this\s*lead|mujhe\s*chahiye|apply\s*karna\s*hai|apply\s*kaise\s*kare|kaise\s*apply\s*kare|i\s*want\s*to\s*teach|interested\s*in\s*this|intrested|im\s*interested)\b/i.test(rawMessage.trim()) &&
    !/#\d{4,7}/.test(rawMessage)
  ) {
    return {
      reply: `Bahut badhiya! 🎉 Hamare platform par 100% genuine verified tuitions available hain aur hum teachers se *0% Commission* lete hain (poori monthly fees aapki)!\n\n👉 *Leads dekhein aur unlock karein:*\nhttps://apnatutorhub.com/tutor/leads\n\n👉 *0% Commission Plans / Coins:*\nhttps://apnatutorhub.com/tutor/plans\n\nAgar aapne kisi specific tuition alert ka message dekha hai, toh uska *Lead ID* (jaise: *#32042*) yahan reply karein!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "View Coin Plans 💰", "Talk to Coordinator 📞"],
    };
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

  if (
    /^(?:show\s+leads?|view\s+leads?|leads?|my\s+leads?|matching\s+leads?|unlock\s+leads?|explore\s+leads?)$/i.test(msg.trim()) ||
    (/\b(?:show|view|matching|my|explore)\s+lead/i.test(msg) && !/\d{4,7}/.test(msg))
  ) {
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

  // ── Admin Direct Lead Fast-Track (WhatsApp Admin entry) ───────────────────
  const cleanSessionPhone = (session.phone || "").replace(/\D/g, "");
  const isAdmin = ADMIN_PHONES.some((p) => {
    const pDigits = p.replace(/\D/g, "");
    return cleanSessionPhone.endsWith(pDigits.slice(-10));
  });

  if (isAdmin) {
    const adminPhoneMatch = rawMessage.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    const hasLeadIndicators = /\b(tutor|class|math|science|subject|student|need|chahiye|budget|offline|online)\b/i.test(rawMessage);
    if (adminPhoneMatch && (rawMessage.includes("\n") || hasLeadIndicators)) {
      const pNum = adminPhoneMatch[1];
      const lines = rawMessage.split("\n").map((l) => l.trim()).filter((l) => l && !l.includes(pNum));
      let sName = lines[0] || "Student Lead";
      let sClass = "All Classes";
      let sArea = "Delhi NCR";

      const classMatch = rawMessage.match(/\b(class\s*\d{1,2}|nursery|kg|jee|neet|\d{1,2}(?:th|st|nd|rd)?(?:\s*class)?)\b/i);
      if (classMatch) sClass = classMatch[0].trim();

      const localityPattern = new RegExp(`\\b(${DELHI_NCR_LOCALITIES.join("|")})\\b`, "i");
      const areaMatch = rawMessage.match(localityPattern);
      if (areaMatch) {
        sArea = areaMatch[0].charAt(0).toUpperCase() + areaMatch[0].slice(1).toLowerCase();
      } else if (lines.length >= 2) {
        sArea = lines[lines.length - 1];
      }

      try {
        const nextInq = ((await prisma.lead.count().catch(() => 500)) as number) + 32150;
        let adminParent = await prisma.user.findFirst({
          where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] } },
          include: { parentProfile: true },
        }).catch(() => null);

        let parentProfileId = adminParent?.parentProfile?.id;
        if (!parentProfileId && adminParent) {
          const createdPp = await prisma.parentProfile.create({
            data: { userId: adminParent.id, city: "Delhi" },
          }).catch(() => null);
          parentProfileId = createdPp?.id;
        }

        const newLead = parentProfileId
          ? await prisma.lead.create({
              data: {
                inquiryNumber: nextInq,
                parentProfileId,
                subjects: ["All Subjects"],
                classLevel: sClass,
                mode: "OFFLINE",
                area: sArea,
                city: "Delhi",
                status: "ACTIVE",
                notes: `Direct Admin Entry: ${sName}, Phone: +91-${pNum}`,
              },
            }).catch(() => ({ inquiryNumber: nextInq }))
          : { inquiryNumber: nextInq };

        return {
          reply: `✅ *Lead Successfully Created via WhatsApp!*\n\n📋 Ref: *#ATH-${newLead.inquiryNumber}*\n👤 Student: *${sName}*\n📱 Phone: *+91 ${pNum}*\n🎓 Class: *${sClass}*\n📍 Area: *${sArea}*\n\nMatching tutors will now receive instant alerts.`,
          nextStep: "DONE",
          updatedData: data,
          userType: "ADMIN",
          retries: 0,
          quickReplies: ["View Leads", "Dashboard"],
        };
      } catch (adminErr) {
        console.error("[engine] Admin fast-track lead creation error:", adminErr);
      }
    }
  }

  // ── Language Selection & Switch Commands ────────────────────────────────────
  if (/^(lang|language|bhasha)$/i.test(msg)) {
    return {
      reply: MSG.LANG_PROMPT,
      nextStep: "LANG_SELECT",
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["1 - English", "2 - हिंदी"],
    };
  }

  if (step === "LANG_SELECT") {
    if (/^(1|en|english)$/i.test(rawMessage.trim())) {
      const nextData = { ...data, lang: "en" };
      return {
        reply: MSG.WELCOME_EN,
        nextStep: "WELCOME",
        updatedData: nextData,
        userType: null,
        retries: 0,
        quickReplies: ["1 - Tutor", "2 - Parent"],
      };
    }
    if (/^(2|hi|hindi|हिंदी)$/i.test(rawMessage.trim())) {
      const nextData = { ...data, lang: "hi" };
      return {
        reply: MSG.WELCOME_HI,
        nextStep: "WELCOME",
        updatedData: nextData,
        userType: null,
        retries: 0,
        quickReplies: ["1 - ट्यूटर", "2 - पेरेंट"],
      };
    }
    return {
      reply: MSG.LANG_PROMPT,
      nextStep: "LANG_SELECT",
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["1 - English", "2 - हिंदी"],
    };
  }

  // Skip SPECIAL_COMMANDS intercept for active mid-flow steps where "hi"/"hello" is a wrong input,
  // UNLESS the session was idle (>15 mins), in which case "hi" is a returning greeting to start fresh.
  const MID_FLOW_STEPS = new Set([
    "T_NAME", "T_CITY", "T_AREA", "T_SUBJECTS", "T_CLASSES", "T_CLASS",
    "T_TIMING", "T_EXPERIENCE", "T_CONFIRM", "T_EMAIL", "T_PASSWORD",
    "P_STUDENT_NAME", "P_CLASS", "P_SUBJECTS", "P_CITY", "P_AREA",
    "P_MODE", "P_BUDGET", "P_PHONE", "P_EMAIL",
    "UPDATE_NAME", "UPDATE_EMAIL", "UPDATE_PASSWORD", "UPDATE_SUBJECTS", "UPDATE_AREA", "UPDATE_PHONE",
  ]);
  const isMidFlow = !session.isIdle && MID_FLOW_STEPS.has(step);
  if (SPECIAL_COMMANDS.includes(msg) && !isMidFlow) {

    const cleanData = session.isIdle ? {} : { ...data };
    if (cleanData.unsubscribed) {
      delete cleanData.unsubscribed;
    }
    if (!cleanData.lang) {
      return {
        reply: MSG.LANG_PROMPT,
        nextStep: "LANG_SELECT",
        updatedData: cleanData,
        userType: null,
        retries: 0,
        quickReplies: ["1 - English", "2 - हिंदी"],
      };
    }
    const isHi = cleanData.lang === "hi";
    const reply = isHi ? MSG.WELCOME_HI : MSG.WELCOME_EN;
    return {
      reply,
      nextStep: "WELCOME",
      updatedData: cleanData,
      userType: null,
      retries: 0,
      quickReplies: isHi ? ["1 - ट्यूटर", "2 - पेरेंट"] : ["1 - Tutor", "2 - Parent"],
    };
  }

  // ── 2. AI Mode Active: Let Gemini AI intelligently manage conversation ────

  // CRITICAL: If step is DONE or _registered is true, user is already registered.
  if (step === "DONE" || data._registered === true) {
    const isParent = session.userType === "PARENT" || data.userType === "PARENT" || Boolean(data.studentName || data.parentProfileId);

    // Parent in DONE state — Never show LEADS/PLANS/PROFILE admin menus
    if (isParent) {
      if (useAi) {
        try {
          const ai = await askGeminiChatbot(rawMessage, session);
          if (ai && ai.reply) {
            return {
              reply: ai.reply,
              nextStep: "DONE",
              updatedData: data,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Fee Info", "Trial Demo Status", "Talk to Coordinator 📞"],
            };
          }
        } catch (err) {}
      }
      return {
        reply: `Namaste! Aapki tuition enquiry hamare coordinators ke paas note hai. 🙏\n\nKoi bhi update, fee details ya demo schedule ke liye aap seedha hamare team se connect kar sakte hain:\n\n📞 WhatsApp Coordinator: +91 93191 93109\nTiming: 9:00 AM – 7:00 PM (Mon–Sat)`,
        nextStep: "DONE",
        updatedData: data,
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Fee Info", "Demo Status", "Talk to Coordinator 📞"],
      };
    }

    // Tutor in DONE state:
    // Conversational fallbacks for tutors asking about free leads, bargaining, or delayed payment:
    if (/bina\s*reg|free\s*lead|paise\s*nahi|payment\s*baad|ek\s*enquiry|enquiry\s*dedo|pehle\s*demo|yaar\b/i.test(rawMessage)) {
      return {
        reply: `Sir hum samajhte hain, par parents ke direct contact details aur address access ke liye membership zaroori hoti hai taaki genuine teachers hi connect karein. 🙏\n\nAap ₹99 starter offer ya ₹999 plan se shuru kar sakte hain jisme 100% fees aapki rehti hai (0% commission)!\n\n👉 Plan dekhein: https://apnatutorhub.com/tutor/plans\n👉 All Leads: https://apnatutorhub.com/tutor/leads`,
        nextStep: "DONE",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["View Plans 💰", "View Leads 📋", "Talk to Support 📞"],
      };
    }

    const rawTrimmed = rawMessage.trim();

    // Direct single email in DONE state
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(rawTrimmed) && isValidEmailDomain(rawTrimmed)) {
      const newEmail = rawTrimmed.toLowerCase();
      await syncUserCredentialsInDb({ phone: session.phone, email: newEmail });
      return {
        reply: `Email successfully update ho gaya hai: *${newEmail}* ✅\n\nAap is email se portal par login kar sakte hain:\nhttps://apnatutorhub.com/login`,
        nextStep: "DONE",
        updatedData: { ...data, email: newEmail },
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }

    // Direct password pattern in DONE state (e.g. "Rohit@2927")
    if (/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s])\S{6,30}$/.test(rawTrimmed)) {
      await syncUserCredentialsInDb({ phone: session.phone, password: rawTrimmed });
      const userEmail = (data.email as string) || "aapka email";
      return {
        reply: `Password successfully update ho gaya hai: *${rawTrimmed}* 🔒\n\nAap is password aur apne email (*${userEmail}*) ya mobile (+91-${session.phone}) se login kar sakte hain:\nhttps://apnatutorhub.com/login`,
        nextStep: "DONE",
        updatedData: { ...data, password: rawTrimmed },
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }

    if (/^(hi|hello|hey|namaste|ha|haan|theek|thik|ok|okay|yes|done)$/i.test(rawTrimmed)) {
      return {
        reply: `Ji batayein, hum aapki kya madad kar sakte hain? Aap matching student leads dekhna chahte hain ya plans ki jankari chahiye? 😊`,
        nextStep: "DONE",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["View Leads 📋", "View Plans 💰", "Talk to Support 📞"],
      };
    }

    if (useAi) {
      try {
        const ai = await askGeminiChatbot(rawMessage, session);
        if (ai && ai.reply) {
          const mergedData: Record<string, any> = { ...data };
          let credentialsChanged = false;

          // Check if AI or message extracted email
          const rawEmailMatch = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const extractedEmail = (ai.extractedData?.email as string) || (rawEmailMatch ? rawEmailMatch[0] : undefined);
          const extractedPassword = (ai.extractedData?.password as string);

          if (extractedEmail && isValidEmailDomain(extractedEmail) && extractedEmail.toLowerCase() !== data.email) {
            mergedData.email = extractedEmail.toLowerCase();
            credentialsChanged = true;
          }

          if (extractedPassword && extractedPassword.length >= 6) {
            mergedData.password = extractedPassword;
            credentialsChanged = true;
          }

          if (credentialsChanged) {
            await syncUserCredentialsInDb({
              phone: session.phone,
              email: mergedData.email,
              password: mergedData.password,
            });
          }

          return {
            reply: ai.reply,
            nextStep: "DONE",
            updatedData: mergedData,
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

    // Friendly fallback if AI fails in DONE state
    return {
      reply: `Ji batayein, hum aapki kya madad kar sakte hain? Aap matching leads dekhna chahte hain ya plans ki info chahiye? 📚\n\nDirect support ke liye WhatsApp karein: +91 93191 93109`,
      nextStep: "DONE",
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "My Profile 👤", "Help 📞"],
    };
  }

  if (useAi) {
    try {
      const ai = await askGeminiChatbot(rawMessage, session);
      if (ai && ai.reply) {
        // Clean and merge extracted data
        const mergedData: Record<string, any> = { ...data };
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

        // Additional entity extractors from message text — Universal Indian Locality Validation
        const shouldCheckRawForArea = Boolean(mergedData.area) || session.step === "T_AREA" || session.step === "P_AREA" || PLACE_INDICATORS.test(rawMessage);
        if (shouldCheckRawForArea) {
          const rawAreaCandidate = mergedData.area || rawMessage;
          const locRes = validateAndCleanLocality(rawAreaCandidate, (mergedData.city || data.city || "Delhi") as string);
          if (locRes.isValid) {
            mergedData.area = locRes.area;
            mergedData.city = locRes.city;
          } else if (mergedData.area) {
            delete mergedData.area;
          }
        }

        const isInitialWelcomeChoice = (session.step === "WELCOME" || session.step === "LANG_SELECT") && /^[12]$/.test(rawMessage.trim());

        const classMatch =
          rawMessage.match(/(?:class|grade)\s*(\d{1,2}(?:\s*(?:to|-|and)\s*\d{1,2})?|\b[1-9]\b|\b1[0-2]\b|primary|middle|senior|nursery|kg|jee|neet|all)/i) ||
          rawMessage.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:to|-|and)\s*\d{1,2}(?:st|nd|rd|th)?)\b/i) ||
          rawMessage.match(/\b(primary|middle school|senior secondary|11th and 12th|9th and 10th|1st to 5th|6th to 8th|9th to 12th|all classes)\b/i) ||
          (!isInitialWelcomeChoice && !/^[12]$/.test(rawMessage.trim()) ? rawMessage.match(/^([1-9]|1[0-2])(?:st|nd|rd|th)?$/i) : null);
        if (classMatch && !mergedData.classLevel && !isInitialWelcomeChoice && !/^[12]$/.test(rawMessage.trim())) {
          const rawCl = classMatch[0].trim();
          const cl = /^\d+$/.test(rawCl) ? `Class ${rawCl}` : rawCl;
          mergedData.classLevel = cl;
          mergedData.classLevels = [cl];
        }

        // Align subjects to canonical taxonomy, strictly filtering out unsupported subjects & Class 1-8 senior science
        const targetCls = (mergedData.classLevel as string) || (data.classLevel as string) || undefined;
        const shouldCheckRawForSubs = Boolean(mergedData.subjects) || session.step === "T_SUBJECTS" || session.step === "P_SUBJECTS";
        if (shouldCheckRawForSubs) {
          const rawSubsCandidate = mergedData.subjects || rawMessage;
          const subAlign = validateAndAlignSubjects(rawSubsCandidate, targetCls);
          if (subAlign.isValid && subAlign.subjects.length > 0) {
            mergedData.subjects = subAlign.subjects;
          } else if (mergedData.subjects && Array.isArray(mergedData.subjects)) {
            delete mergedData.subjects;
          }
        }

        // State-specific step input helpers
        if (session.step === "T_AREA" && !mergedData.area && rawMessage.trim().length >= 2 && !/^(menu|help|cancel)$/i.test(rawMessage.trim())) {
          const stepLoc = validateAndCleanLocality(rawMessage.trim(), (mergedData.city || data.city || "Delhi") as string);
          if (stepLoc.isValid) {
            mergedData.area = stepLoc.area;
            mergedData.city = stepLoc.city;
          }
        }
        if ((session.step === "T_CLASS" || session.step === "P_CLASS" || session.step === "P_CONVO") && !mergedData.classLevel && rawMessage.trim().length >= 1 && !/^(menu|help|cancel)$/i.test(rawMessage.trim()) && !isInitialWelcomeChoice) {
          const rawCl = rawMessage.trim();
          const cl = /^\d+$/.test(rawCl) ? `Class ${rawCl}` : rawCl;
          mergedData.classLevel = cl;
          mergedData.classLevels = [cl];
        }
        if (session.step === "T_SUBJECTS" && (!mergedData.subjects || (Array.isArray(mergedData.subjects) && mergedData.subjects.length === 0)) && rawMessage.trim().length >= 2 && !/^(menu|help|cancel)$/i.test(rawMessage.trim())) {
          const stepSub = validateAndAlignSubjects(rawMessage.trim(), targetCls);
          if (stepSub.isValid) {
            mergedData.subjects = stepSub.subjects;
          }
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

        const locResult = validateAndCleanLocality(mergedData.area || data.area, (mergedData.city || data.city || "Delhi") as string);
        const rawArea = locResult.isValid ? locResult.area : "";
        if (locResult.isValid) {
          mergedData.area = locResult.area;
          mergedData.city = locResult.city;
        } else if (mergedData.area) {
          delete mergedData.area;
        }
        const hasArea = Boolean(
          rawArea &&
          rawArea.toLowerCase() !== "delhi ncr" &&
          rawArea.length >= 2
        );

        const isFirstChoice = session.step === "WELCOME" && isBareChoice && !hasSubjects && !hasClass && !hasArea;
        if (isFirstChoice) {
          const isTutor = role === "TUTOR" || rawMessage.trim() === "1";
          const isHi = data.lang === "hi";
          return {
            reply: isTutor
              ? (isHi ? `बढ़िया! कौन से subject, कौन सी class और दिल्ली NCR में कहाँ से हो? 📚` : `Great! Which subjects, which class, and which area in Delhi NCR do you teach? 📚`)
              : (isHi ? `नमस्ते! बच्चे के लिए कौन सी class, subject और किस area में ट्यूटर चाहिए? 🎓📍` : `Welcome! For which class, subjects, and locality do you need a tutor? 🎓📍`),
            nextStep: isTutor ? "T_CONVO" : "P_CONVO",
            updatedData: { ...data, ...(isTutor ? { userType: "TUTOR" } : { userType: "PARENT" }) },
            userType: isTutor ? "TUTOR" : "PARENT",
            retries: 0,
            quickReplies: isTutor
              ? ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Physics, Class 11-12, Rohini"]
              : ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
          };
        }

        // ── TUTOR Onboarding ──────────────────────────────────────────────────
        if (role === "TUTOR") {
          // Case A: Missing all teaching details
          if (!hasSubjects && !hasClass && !hasArea) {
            // Check if user typed something that failed subject validation (hobby/unknown word)
            const caseASubCheck = validateAndAlignSubjects(rawMessage.trim(), undefined);
            if (!caseASubCheck.isValid && caseASubCheck.errorPrompt && rawMessage.trim().length > 2) {
              return {
                reply: caseASubCheck.errorPrompt,
                nextStep: "T_CONVO",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Maths, Science", "Physics, Chemistry", "English, Hindi", "All Subjects"],
              };
            }
            return {
              reply: `Ji zaroor! Kaunse subject aur kaunsi class ko padhate hain aap? 📚`,
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

          // Case D: Has subjects and class, but missing area (e.g. "Physics" then "Class 11")
          if (hasSubjects && hasClass && !hasArea) {
            if (session.step === "T_AREA" && rawMessage.trim().length >= 2) {
              const locCheck = validateAndCleanLocality(rawMessage.trim(), (mergedData.city || data.city || "Delhi") as string);
              if (!locCheck.isValid) {
                return {
                  reply: locCheck.errorPrompt || "Kripya apna area / locality batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍",
                  nextStep: "T_AREA",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: 0,
                  quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
                };
              }
            }
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
            const e4SubCheck = validateAndAlignSubjects(rawMessage.trim(), mergedData.classLevel as string | undefined);
            const e4ErrorPrompt = !e4SubCheck.isValid && e4SubCheck.errorPrompt && rawMessage.trim().length > 2
              ? e4SubCheck.errorPrompt
              : `📚 Kaunse subjects padhate hain? Jaise: *Maths, Science*, *Physics*, *All Subjects*`;
            return {
              reply: e4ErrorPrompt,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Maths, Science", "Physics, Chemistry", "English, Hindi", "All Subjects"],
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

          // Case F: ALL 3 TEACHING CRITERIA ARE PRESENT!
          // Safety verification: Re-validate subject-grade compatibility before proceeding to email
          const rawCls = classLevelsArray[0] || (mergedData.classLevel as string) || "";
          const compatibilityCheck = validateSubjectClassCompatibility(subsArray, rawCls, "TUTOR");
          if (!compatibilityCheck.isValid) {
            mergedData.classLevel = undefined;
            mergedData.classLevels = undefined;
            return {
              reply: compatibilityCheck.reason!,
              nextStep: "T_CLASS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: compatibilityCheck.suggestedReplies || ["Class 11-12", "Class 9-10 (Science)"],
            };
          }

          const ctx = formatHumanTeachingContext(subsArray, rawCls, rawArea);
          mergedData.subjects = ctx.cleanSubs;
          const areaName = rawArea;
          const cityName = (mergedData.city as string) || "Delhi";
          const tutorName = (mergedData.name as string) || "";

          // 0. Name is mandatory — Ask for it before email if missing
          const hasValidName =
            tutorName.trim().length >= 2 &&
            tutorName.trim().length <= 50 &&
            !/^(hi|hello|hey|namaste|yes|no|ok|okay|done|skip|haan|theek|thik|nahi|ji|ha|acha|achha|sir|madam|mam|bhai)$/i.test(tutorName.trim()) &&
            !/\d/.test(tutorName.trim()) &&
            /^[a-zA-Z\s.'\-]+$/.test(tutorName.trim());

          if (!hasValidName && session.step !== "T_NAME" && session.step !== "T_EMAIL" && session.step !== "T_PASSWORD") {
            return {
              reply: `${ctx.humanEmailSummary}\n\n👤 Apna poora naam batayein (jaise: Priya Sharma, Rahul Gupta):`,
              nextStep: "T_NAME",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: [],
            };
          }

          // If we are at T_NAME step, accept the name from the current message
          if (session.step === "T_NAME") {
            const nameCandidate = rawMessage.trim();
            const isNameOk =
              nameCandidate.length >= 2 &&
              nameCandidate.length <= 50 &&
              !/^(hi|hello|hey|namaste|yes|no|ok|okay|done|skip|haan|theek|thik|nahi|ji|ha|acha|achha|sir|madam|mam|bhai)$/i.test(nameCandidate) &&
              !/\d/.test(nameCandidate) &&
              /^[a-zA-Z\s.'\-]+$/.test(nameCandidate);
            if (!isNameOk) {
              const typed = nameCandidate.slice(0, 25);
              const reason = /\d/.test(nameCandidate)
                ? `"*${typed}*" mein digits hain — naam mein sirf letters hone chahiye.`
                : nameCandidate.length < 2
                ? `Bahut chhota naam lag raha hai.`
                : `"*${typed}*" naam nahi lag raha.`;
              return {
                reply: `⚠️ ${reason}\n\n👤 Apna *poora naam* likhein — jaise *Priya Sharma* ya *Rahul Gupta*:`,
                nextStep: "T_NAME",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: session.retries + 1,
                quickReplies: [],
              };
            }
            mergedData.name = nameCandidate;
          }

          const resolvedTutorName = (mergedData.name as string) || "";

          // Validate email candidate
          const emailRegexMatch = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const emailCandidate = emailRegexMatch ? emailRegexMatch[0].toLowerCase() : (typeof mergedData.email === "string" ? mergedData.email.trim().toLowerCase() : "");
          const hasValidEmail = Boolean(emailCandidate && isValidEmailDomain(emailCandidate));

          // Catch email domain typos (.gom, .con, etc.) per client voice note feedback
          if (emailCandidate && !isValidEmailDomain(emailCandidate)) {
            return {
              reply: `⚠️ Email address invalid lag raha hai (".gom" ya typo nahi, valid domain jaise ".com" hona chahiye).\n\nKripya sahi email ID enter karein (jaise: yourname@gmail.com): 📧`,
              nextStep: "T_EMAIL",
              updatedData: { ...mergedData, email: undefined },
              userType: "TUTOR",
              retries: 0,
              quickReplies: [],
            };
          }

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

          // 2. Password Setup & Identity Cross-Account Conflict Guard
          const pwdCandidate = (typeof mergedData.password === "string" ? mergedData.password.trim() : "");
          if (!pwdCandidate && session.step !== "T_PASSWORD") {
            let isExisting = false;
            let existingUserPhone: string | null = null;
            try {
              const existingUser = await prisma.user.findFirst({
                where: { email: emailCandidate },
                select: { id: true, name: true, role: true, phone: true },
              });
              if (existingUser) {
                isExisting = true;
                existingUserPhone = existingUser.phone;
                mergedData._existingAccount = true;
              }
            } catch {}

            if (isExisting) {
              const existingPhone10 = (existingUserPhone || "").replace(/\D/g, "").slice(-10);
              const sessionPhone10 = session.phone.replace(/\D/g, "").slice(-10);

              // Cross-account conflict: Email is registered to a DIFFERENT phone number
              if (existingPhone10 && sessionPhone10 && existingPhone10 !== sessionPhone10) {
                mergedData.email = undefined;
                return {
                  reply: `⚠️ Yeh email (*${emailCandidate}*) already kisi doosre mobile number se linked hai.\n\nKripya apna alag personal email ID enter karein jo is WhatsApp number ke saath connect ho sake: 📧`,
                  nextStep: "T_EMAIL",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: 0,
                  quickReplies: [],
                };
              }

              mergedData.email = emailCandidate;
              return {
                reply: `Email note ho gaya: *${emailCandidate}* ✅\n_(Yeh email pehle se registered hai)_\n\n🔐 Account login karne ke liye password enter karein (ya type karein *default*):`,
                nextStep: "T_PASSWORD",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Default Password", "12345678"],
              };
            }

            mergedData.email = emailCandidate;
            return {
              reply: `Email note ho gaya: *${emailCandidate}* ✅\n\n🔐 Account login ke liye koi password rakhna chahte hain? (min 6 characters) ya reply karein *default*:`,
              nextStep: "T_PASSWORD",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Default Password", "12345678"],
            };
          }

          // Save valid email if at or past password step
          mergedData.email = emailCandidate;

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

          let tutorGender: string | null = (mergedData.gender as string) || null;
          if (!tutorGender && resolvedTutorName) {
            if (/rohit|rahul|amit|aman|deepak|suresh|ramesh|vikas|pankaj|mohit|sachin|abhishek|ajay|vijay|sanjay|raj|varun|arun|tushar|gaurav|manish/i.test(resolvedTutorName)) {
              tutorGender = "MALE";
            } else if (/priya|pooja|neha|anjali|sneha|arti|aarti|divya|shweta|ritika|simran|megha|swati|pallavi|tanu|mansi|aleena/i.test(resolvedTutorName)) {
              tutorGender = "FEMALE";
            }
          }


          try {
            await registerTutorFromWhatsapp(session.phone, {
              name: resolvedTutorName || "Tutor",
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

          // Simple profile-created confirmation. Leads/plans are only sent when tutor asks.
          const loginLine = `📧 ${emailToUse} | 📱 ${phoneToUse}`;
          const pwdNote = usedDefault
            ? `\n🔑 Default password *12345678* — login karke change kar lein: https://apnatutorhub.com/login`
            : ``;
          const profileReply =
            `✅ *Profile taiyaar ho gayi hai ${tutorName} ji!*\n` +
            `🔐 Login: ${loginLine}\nhttps://apnatutorhub.com/login${pwdNote}\n\n` +
            `Matching student leads dekhne ke liye reply karein *LEADS* 📋\n` +
            `Membership plans ke liye reply karein *PLANS* 💎`;

          return {
            reply: profileReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "TUTOR",
            retries: 0,
            quickReplies: [
              "View Leads 📋",
              "Membership Plans 💎",
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
            if (session.step === "P_AREA" && rawMessage.trim().length >= 2) {
              const locCheck = validateAndCleanLocality(rawMessage.trim(), (mergedData.city || data.city || "Delhi") as string);
              if (!locCheck.isValid) {
                return {
                  reply: locCheck.errorPrompt || "Kripya apna area / locality batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍",
                  nextStep: "P_AREA",
                  updatedData: mergedData,
                  userType: "PARENT",
                  retries: 0,
                  quickReplies: ["Dwarka", "Rohini", "South Delhi", "Noida / Gurgaon"],
                };
              }
            }
            return {
              reply: `*${parentSubs.join(", ")} (${parentClass})* ke liye aapka area / city kaunsa hai? 📍`,
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

          mergedData._registered = true;

          // Simple profile-created confirmation only. Tutors/demo sent only on request.
          const parentName = (mergedData.name as string) || (mergedData.parentName as string) || "";
          const parentProfileReply =
            `✅ *Aapki request register ho gayi hai${parentName ? " " + parentName + " ji" : ""}!*\n\n` +
            `📚 Class: ${classLevelName}\n` +
            `📖 Subjects: ${parentSubs.length > 0 ? parentSubs.join(", ") : "All Subjects"}\n` +
            `📍 Area: ${areaName}\n\n` +
            `Hamari team aapke liye suitable tutors match kar rahi hai. \n` +
            `Free demo class book karne ke liye reply karein *DEMO* 🎓`;

          return {
            reply: parentProfileReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "PARENT",
            retries: 0,
            quickReplies: ["Book Free Demo 🎓", "Fee Structure", "Call Coordinator 📞"],
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

  // Always ask language first (South Indian tutors may not read Hindi)
  if (step === "WELCOME" && !data.lang) {
    return {
      reply: MSG.LANG_PROMPT,
      nextStep: "LANG_SELECT",
      updatedData: data,
      userType: null,
      retries: 0,
      quickReplies: ["1 - English", "2 - हिंदी"],
    };
  }

  if (step === "WELCOME") {
    const normalized = rawMessage.trim();
    if (normalized === "1" || /tutor|teach|instructor/i.test(normalized)) {
      return {
        reply: `Ji zaroor! Kaunse subject, kaunsi class aur kahan se hain aap? 📚`,
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

    const isHi = data.lang === "hi";
    return handleInvalid(
      session,
      isHi ? MSG.WELCOME_HI : MSG.WELCOME_EN,
      isHi ? ["1 - ट्यूटर", "2 - पेरेंट"] : ["1 - Tutor", "2 - Parent"]
    );
  }

  // TUTOR conversational fallback: Require subject, class, area, email, and password before registering
  if (step === "T_CONVO" || step === "T_SUBJECTS" || step === "T_CLASS" || step === "T_AREA" || step === "T_EMAIL" || step === "T_PASSWORD" || step === "DONE") {
    const trimmed = rawMessage.trim();
    const updated: Record<string, any> = { ...data };

    const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && isValidEmailDomain(emailMatch[0]) && !updated.email) updated.email = emailMatch[0].toLowerCase();

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

    const locResFallback = validateAndCleanLocality(trimmed, (updated.city as string) || "Delhi");
    if (locResFallback.isValid) {
      updated.area = locResFallback.area;
      updated.city = locResFallback.city;
    }

    const subAlignFallback = validateAndAlignSubjects(trimmed, updated.classLevel as string);
    if (subAlignFallback.isValid && subAlignFallback.subjects.length > 0) {
      updated.subjects = subAlignFallback.subjects;
    } else if (step === "T_SUBJECTS" && !/^(menu|help|cancel)$/i.test(trimmed)) {
      const splitSubs = trimmed.split(/,|and|&/i).map((s) => s.trim()).filter(Boolean);
      const subResStep = validateAndAlignSubjects(splitSubs, updated.classLevel as string);
      if (subResStep.isValid) {
        updated.subjects = subResStep.subjects;
      }
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
        reply: `Ji zaroor! Kaunse subject, kaunsi class aur kahan se hain aap? 📚`,
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
      if (step === "T_AREA" && trimmed.length >= 2) {
        const locCheck = validateAndCleanLocality(trimmed, (updated.city as string) || "Delhi");
        if (!locCheck.isValid) {
          return {
            reply: locCheck.errorPrompt || "Kripya apna area / locality batayein (jaise: Rohini Delhi, Bandra Mumbai, ya Sector 62 Noida) 📍",
            nextStep: "T_AREA",
            updatedData: updated,
            userType: "TUTOR",
            retries: 0,
            quickReplies: ["South Delhi", "West Delhi (Dwarka)", "North Delhi (Rohini)", "Noida / Gurgaon"],
          };
        }
      }
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
      const fallbackSubCheck = validateAndAlignSubjects(rawMessage.trim(), (updated.classLevel as string) || undefined);
      const fallbackSubPrompt = !fallbackSubCheck.isValid && fallbackSubCheck.errorPrompt && rawMessage.trim().length > 2
        ? fallbackSubCheck.errorPrompt
        : `📚 Kaunse subjects padhate hain? Jaise: *Maths, Science*, *Physics*, *All Subjects*`;
      return {
        reply: fallbackSubPrompt,
        nextStep: "T_SUBJECTS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Maths, Science", "Physics, Chemistry", "English, Hindi", "All Subjects"],
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

    // 0. Name is mandatory — Ask for it before email if missing
    const fallbackTutorName = (updated.name as string) || "";
    const fallbackNameValid =
      fallbackTutorName.trim().length >= 2 &&
      fallbackTutorName.trim().length <= 50 &&
      !/^(hi|hello|hey|namaste|yes|no|ok|okay|done|skip|haan|theek|thik|nahi|ji|ha|acha|achha|sir|madam|mam|bhai)$/i.test(fallbackTutorName.trim()) &&
      !/\d/.test(fallbackTutorName.trim()) &&
      /^[a-zA-Z\s.'\\-]+$/.test(fallbackTutorName.trim());

    if (!fallbackNameValid && session.step !== "T_NAME" && step !== "T_EMAIL" && step !== "T_PASSWORD") {
      return {
        reply: `Details note ho gayi! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\n👤 Apna poora naam batayein (jaise: Priya Sharma, Rahul Gupta):`,
        nextStep: "T_NAME",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: [],
      };
    }

    // If currently at T_NAME step, validate and save the name
    if (session.step === "T_NAME") {
      const nameCandidate = rawMessage.trim();
      const isNameOk =
        nameCandidate.length >= 2 &&
        nameCandidate.length <= 50 &&
        !/^(hi|hello|hey|namaste|yes|no|ok|okay|done|skip|haan|theek|thik|nahi|ji|ha|acha|achha|sir|madam|mam|bhai)$/i.test(nameCandidate) &&
        !/\d/.test(nameCandidate) &&
        /^[a-zA-Z\s.'\\-]+$/.test(nameCandidate);
      if (!isNameOk) {
        const typed = nameCandidate.slice(0, 25);
        const reason = /\d/.test(nameCandidate)
          ? `"*${typed}*" mein digits hain — naam mein sirf letters hone chahiye.`
          : nameCandidate.length < 2
          ? `Bahut chhota naam lag raha hai.`
          : `"*${typed}*" naam nahi lag raha.`;
        return {
          reply: `⚠️ ${reason}\n\n👤 Apna *poora naam* likhein — jaise *Priya Sharma* ya *Rahul Gupta*:`,
          nextStep: "T_NAME",
          updatedData: updated,
          userType: "TUTOR",
          retries: session.retries + 1,
          quickReplies: [],
        };
      }
      updated.name = nameCandidate;
    }

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

    // 2. Check Password & Cross-Account Email Conflict
    const pwdStr = typeof updated.password === "string" ? updated.password.trim() : "";
    if (!pwdStr && step !== "T_PASSWORD") {
      let isExisting = false;
      let existingUserPhone: string | null = null;
      try {
        const existingUser = await prisma.user.findFirst({
          where: { email: emailStr },
          select: { id: true, name: true, role: true, phone: true },
        });
        if (existingUser) {
          isExisting = true;
          existingUserPhone = existingUser.phone;
          updated._existingAccount = true;
        }
      } catch {}

      if (isExisting) {
        const existingPhone10 = (existingUserPhone || "").replace(/\D/g, "").slice(-10);
        const sessionPhone10 = session.phone.replace(/\D/g, "").slice(-10);

        // Cross-account conflict: Email is registered to a DIFFERENT phone number
        if (existingPhone10 && sessionPhone10 && existingPhone10 !== sessionPhone10) {
          updated.email = undefined;
          return {
            reply: `⚠️ Yeh email (*${emailStr}*) already kisi doosre mobile number se linked hai.\n\nKripya apna alag personal email ID enter karein jo is WhatsApp number ke saath connect ho sake: 📧`,
            nextStep: "T_EMAIL",
            updatedData: updated,
            userType: "TUTOR",
            retries: 0,
            quickReplies: [],
          };
        }
      }

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
    const tutorName = (updated.name as string) || "";

    let tutorGender: string | null = (updated.gender as string) || null;
    if (!tutorGender && tutorName) {
      if (/rohit|rahul|amit|aman|deepak|suresh|ramesh|vikas|pankaj|mohit|sachin|abhishek|ajay|vijay|sanjay|raj|varun|arun|tushar|gaurav|manish/i.test(tutorName)) {
        tutorGender = "MALE";
      } else if (/priya|pooja|neha|anjali|sneha|arti|aarti|divya|shweta|ritika|simran|megha|swati|pallavi|tanu|mansi|aleena/i.test(tutorName)) {
        tutorGender = "FEMALE";
      }
    }


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

    // Simple profile-created confirmation only. Leads/plans sent only when tutor asks.
    const loginLine2 = `📧 ${emailToUse} | 📱 ${phoneToUse}`;
    const pwdNote2 = usedDefault
      ? `\n🔑 Default password *12345678* — login karke change kar lein: https://apnatutorhub.com/login`
      : ``;
    const profileReply2 =
      `✅ *Profile taiyaar ho gayi hai ${tutorName} ji!*\n` +
      `🔐 Login: ${loginLine2}\nhttps://apnatutorhub.com/login${pwdNote2}\n\n` +
      `Matching student leads dekhne ke liye reply karein *LEADS* 📋\n` +
      `Membership plans ke liye reply karein *PLANS* 💎`;

    return {
      reply: profileReply2,
      nextStep: "DONE",
      updatedData: updated,
      userType: "TUTOR",
      retries: 0,
      quickReplies: [
        "View Leads 📋",
        "Membership Plans 💎",
        "My Profile",
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

    // Simple profile-created confirmation only. Tutors/demo sent only on request.
    const pName = (updated.name as string) || (updated.parentName as string) || "";
    const parentProfileReply2 =
      `✅ *Aapki request register ho gayi hai${pName ? " " + pName + " ji" : ""}!*\n\n` +
      `📚 Class: ${(updated.classLevel as string) || ""} \n` +
      `📍 Area: ${areaName}\n\n` +
      `Hamari team aapke liye suitable tutors match kar rahi hai.\n` +
      `Free demo class book karne ke liye reply karein *DEMO* 🎓`;

    return {
      reply: parentProfileReply2,
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
    reply: MSG.LANG_PROMPT,
    nextStep: "LANG_SELECT",
    updatedData: {},
    userType: null,
    retries: 0,
    quickReplies: ["1 - English", "2 - हिंदी"],
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
    case "LANG_SELECT":
      return ["1 - English", "2 - हिंदी"];
    case "WELCOME":
      return ["1 - Tutor", "2 - Parent"];
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
      reply: `Kuch zyada confusion ho gaya. 😅 Chaliye fresh start karte hain.\n\nType *MENU* to restart.`,
      nextStep: "WELCOME",
      updatedData: {},
      userType: null,
      retries: 0,
      quickReplies: ["MENU", "HELP"],
    };
  }

  // Step-specific contextual guidance
  const step = session.step;
  let stepHint = "";
  let stepQuickReplies = quickReplies || ["MENU", "HELP"];

  if (step === "T_NAME") {
    stepHint = `👤 Apna poora naam likhein (jaise: *Priya Sharma*, *Rahul Gupta*).\nSirf letters, koi digits ya symbols nahi.`;
  } else if (step === "T_CITY") {
    stepHint = `📍 Apna city batayein — jaise *Delhi*, *Mumbai*, *Noida*, *Bangalore*, *Lucknow*.`;
  } else if (step === "T_AREA") {
    stepHint = `🏠 Apna specific *mohalla / locality* likhein.\nJaise: *Rohini*, *Dwarka*, *Sector 62 Noida*, *Andheri West*.`;
    stepQuickReplies = ["Rohini, Delhi", "Dwarka, Delhi", "Noida / Gurgaon", "South Delhi"];
  } else if (step === "T_SUBJECTS") {
    stepHint = `📚 Kaunse subjects padhate hain? Comma se alag karke likhein:\nJaise: *Maths, Science* ya *Physics, Chemistry* ya *All Subjects*.`;
    stepQuickReplies = ["Maths, Science", "Physics, Chemistry", "English, Hindi", "All Subjects"];
  } else if (step === "T_CLASSES") {
    stepHint = `🎓 Number reply karein (comma se multiple choose kar sakte hain):\n1 → Class 1–5\n2 → Class 6–8\n3 → Class 9–10\n4 → Class 11–12\n5 → JEE/NEET\n6 → All`;
    stepQuickReplies = ["1,2,3", "3,4", "4", "6 (All)"];
  } else if (step === "T_MODE") {
    stepHint = `🏡 Sirf *1*, *2*, ya *3* reply karein:\n1 → Home Visit (student ke ghar jaana)\n2 → Online Only\n3 → Both (Home + Online)`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "T_TIMING") {
    stepHint = `⏰ Apni available timing likhein, jaise:\n*Evenings 5–8pm*, ya *Weekdays 4–8pm*, ya *Mornings only*.`;
    stepQuickReplies = ["Evenings 5-8pm", "Mornings 7-10am", "Weekends only", "Flexible"];
  } else if (step === "T_EXPERIENCE") {
    stepHint = `💼 Sirf ek *number* likhein (teaching experience years mein).\nJaise: *2*, *5*, *10* — ya *0* agar abhi start kar rahe hain.`;
    stepQuickReplies = ["0", "1", "3", "5"];
  } else if (step === "T_CONFIRM") {
    stepHint = `Sirf *1*, *2*, ya *3* reply karein:\n1 → ✅ Confirm & Register\n2 → ✏️ Edit (start over)\n3 → ❌ Cancel`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "P_STUDENT_NAME") {
    stepHint = `👶 Bachche ka naam likhein (jaise: *Aarav*, *Priya*).`;
  } else if (step === "P_CLASS") {
    stepHint = `🎓 Sirf *1 se 6* ke beech ek number reply karein:\n1 → Nursery/KG/Class 1–2\n2 → Class 3–5\n3 → Class 6–8\n4 → Class 9–10\n5 → Class 11–12\n6 → JEE/NEET`;
    stepQuickReplies = ["1", "2", "3", "4", "5", "6"];
  } else if (step === "P_SUBJECTS") {
    stepHint = `📚 Kaunse subjects mein help chahiye? Jaise: *Maths, Science* ya *All Subjects*.`;
    stepQuickReplies = ["Maths & Science", "All Subjects", "English", "Physics, Chemistry"];
  } else if (step === "P_CITY") {
    stepHint = `📍 Apna city batayein — jaise *Delhi*, *Noida*, *Mumbai*, *Gurgaon*.`;
  } else if (step === "P_AREA") {
    stepHint = `🏠 Bachche ka *area / locality* batayein.\nJaise: *Rohini Delhi*, *Bandra Mumbai*, *Sector 62 Noida*.`;
    stepQuickReplies = ["Rohini Delhi", "Dwarka Delhi", "Noida / Gurgaon", "South Delhi"];
  } else if (step === "P_MODE") {
    stepHint = `🏡 Sirf *1*, *2*, ya *3* reply karein:\n1 → Home Tutor (tutor ghar aaye)\n2 → Online\n3 → Either is fine`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "P_BUDGET") {
    stepHint = `💰 Sirf *1 se 4* reply karein:\n1 → Under ₹2,000/month\n2 → ₹2,000–5,000/month\n3 → ₹5,000–10,000/month\n4 → Above ₹10,000/month`;
    stepQuickReplies = ["1", "2", "3", "4"];
  } else if (step === "LANG_SELECT") {
    stepHint = `Sirf *1* (English) ya *2* (Hindi) type karein.`;
    stepQuickReplies = ["1 - English", "2 - हिंदी"];
  } else if (step === "WELCOME") {
    stepHint = `*1* likhein agar aap Tutor hain, *2* likhein agar aap Parent hain.`;
    stepQuickReplies = ["1 - Tutor", "2 - Parent"];
  }

  const reply = contextHint
    ? `${contextHint}`
    : stepHint
    ? `Samajh nahi aaya. 🙏\n\n${stepHint}`
    : `Samajh nahi aaya. 🙏 Type *MENU* to restart.`;

  return {
    reply,
    nextStep: session.step,
    updatedData: session.data,
    retries: nextRetries,
    quickReplies: stepQuickReplies,
  };
}
