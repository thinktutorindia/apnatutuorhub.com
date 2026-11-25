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
import { askGeminiChatbot, containsHindiOrHinglishSlip, type AiBotResponse } from "./ai-agent";
import { getStoredUserProfile, type UserProfileContext } from "./user-profile-context";
import {
  getChatbotMatchingLeads,
  formatTutorLeadsAndPlansMessage,
  formatCoinPlansMessage,
  formatCoinBalanceMessage,
  getTutorCoinBalanceByPhone,
  formatParentDemoMessage,
  formatSingleLeadInquiry,
  formatOfferEnded999Message,
  formatCommissionPlanDetailMessage,
  formatGrowthPlanDetailMessage,
  formatPlanPaymentQrMessage,
} from "./leads-helper";
import {
  asksCommissionPlan,
  asksPlanPaymentOrQr,
  asksZeroCommissionPlan,
  paymentPlanHint,
  shouldIncludePaymentQr,
} from "./plan-intent";
import {
  isAckOnly,
  isBareNo,
  isOffScriptTutorTalk,
  isSubjectNegation,
  outsideNcrCity,
  refusesAdvancePayment,
  refusesRegistration,
  rejectedSubjectKeys,
  stripRejectedSubjects,
  wantsLeadsOnWhatsApp,
  wantsToPayNow,
} from "./conversation-intents";
import {
  registerTutorFromWhatsapp,
  registerParentFromWhatsapp,
} from "./auto-register";
import { prisma } from "@/lib/prisma";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import { extractPublicLocality, isTill8thClass, leadSubjectsForClass, normalizeCanonicalClassLevel } from "@/lib/lead-utils";
import { assessIntake, sealLeadEntry, type IntakeDraft } from "@/lib/whatsapp-bot/intake";
import bcrypt from "bcryptjs";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import {
  buildIndiaPhoneOrFilter,
  findPrimaryUserForWhatsApp,
  waPlaceholderEmail,
  canonicalIndiaPhone,
  indiaPhoneLast10,
} from "@/lib/india-phone";
import {
  getSubjectClassSuggestions,
  validateSubjectClassCompatibility,
  parseGrade,
  validateAndCleanLocality,
  extractLocationSegment,
  validateAndAlignSubjects,
  deduplicateAndNormalizeSubjects,
  KNOWN_INDIAN_CITIES,
  PLACE_INDICATORS,
} from "./subject-rules";
import { geocodeAddressWithGemini } from "@/lib/gemini-geocoder";
import {
  detectLooseIntent,
  looseIntentClarifyReply,
  looksLikeUnexpectedNoise,
} from "./loose-intent";
import {
  isStrictValidEmail,
  isPlaceholderEmail,
  validateStrictEmail,
  extractStrictEmail,
  extractStrictClasses,
  enforceStrictEducation,
  sanitizeEducationForDb,
} from "./strict-rules";
import { resolvePersonaPrecheck } from "./persona-understanding";

// Admin WhatsApp numbers — these get lead forwarding + full control
const ADMIN_PHONES = ["919311459543", "917559563565"];

const MAX_RETRIES = 3;

export const MID_FLOW_STEPS = new Set([
  "T_NAME", "T_CITY", "T_AREA", "T_SUBJECTS", "T_CLASSES", "T_CLASS",
  "T_TIMING", "T_EXPERIENCE", "T_CONFIRM", "T_EMAIL", "T_PASSWORD",
  "P_STUDENT_NAME", "P_CLASS", "P_SUBJECTS", "P_CITY", "P_AREA",
  "P_MODE", "P_BUDGET", "P_PHONE", "P_EMAIL",
  "UPDATE_NAME", "UPDATE_EMAIL", "UPDATE_PASSWORD", "UPDATE_SUBJECTS", "UPDATE_CLASS", "UPDATE_AREA", "UPDATE_PHONE",
]);

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
  return extractPublicLocality(res.isValid ? res.area : typeof raw === "string" ? raw : "", res.city || defaultCity) || "";
}

/**
 * A single-word city reply (e.g. "It is in gurgaon") is resolved by
 * validateAndCleanLocality(..., allowCityOnly=true) into area === city.
 * Saving that as `address` produces polluted profiles like "Gurgaon, Gurgaon"
 * and wipes a real locality (e.g. Sector 90). Treat area === city as a
 * non-locality signal everywhere we previously only rejected "Delhi, Delhi".
 */
function sameLocality(area?: string | null, city?: string | null): boolean {
  const norm = (s?: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(area);
  const c = norm(city);
  if (!a || !c) return false;
  if (a === c) return true;
  // Common city aliases that must not be treated as locality + city.
  const alias: Record<string, string> = { gurgaon: "gurugram", gurugram: "gurugram", bombay: "mumbai", mumbai: "mumbai", bengaluru: "bangalore", bangalore: "bangalore" };
  return (alias[a] || a) === (alias[c] || c);
}

export function getLocalitiesQuickReplies(city?: string): string[] {
  if (!city) {
    return ["Delhi NCR", "Mumbai", "Bangalore / Pune", "Other City"];
  }
  const cleanCity = city.trim();
  const cNorm = cleanCity.toLowerCase();
  if (cNorm.includes("delhi")) return ["South Delhi", "Dwarka", "Rohini", "Noida / Gurgaon"];
  if (cNorm.includes("mumbai")) return ["Andheri", "Bandra", "Borivali", "Navi Mumbai / Thane"];
  if (cNorm.includes("bangalore") || cNorm.includes("bengaluru")) return ["Koramangala", "Whitefield", "HSR Layout", "Indiranagar"];
  if (cNorm.includes("pune")) return ["Kothrud", "Wakad", "Hinjewadi", "Baner"];
  if (cNorm.includes("hyderabad")) return ["Madhapur", "Gachibowli", "Kukatpally", "Banjara Hills"];
  if (cNorm.includes("lucknow")) return ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar"];
  if (cNorm.includes("jaipur")) return ["Mansarovar", "Vaishali Nagar", "Malviya Nagar", "Raja Park"];
  if (cNorm.includes("kolkata")) return ["Salt Lake", "New Town", "Ballygunge", "Jadavpur"];
  if (cNorm.includes("patna")) return ["Kankarbagh", "Boring Road", "Bailey Road", "Danapur"];
  if (cNorm.includes("chandigarh")) return ["Sector 17", "Sector 35", "Mohali", "Panchkula"];
  return [`Central ${cleanCity}`, `Sector 1 ${cleanCity}`, "Main Area", "Online Only"];
}

function classSignalInMessage(rawMessage: string): boolean {
  return /\b(class|grade|std|standard|nursery|lkg|ukg|jee|neet|cuet|\d{1,2}\s*(?:st|nd|rd|th))\b/i.test(rawMessage);
}

function keepClassLevel(current: unknown, rawMessage: string, previous: unknown): string | undefined {
  if (/\b(jee|neet|mains?|advanced?)\b/i.test(rawMessage) && !/\bclass\s*([1-8])\b/i.test(rawMessage)) {
    if (/\bneet\b/i.test(rawMessage)) return "NEET";
    if (/\b(jee|mains?|advanced?)\b/i.test(rawMessage)) return "JEE";
  }
  const bareGradeMatch = rawMessage.trim().match(/^([1-9]|1[0-2])(?:\s*(?:th|st|nd|rd))?$/i);
  if (bareGradeMatch && !/^[12]$/.test(rawMessage.trim())) {
    return `Class ${bareGradeMatch[1]}`;
  }
  const fromMsg = normalizeCanonicalClassLevel(rawMessage);
  if (fromMsg) return fromMsg;
  const prev = normalizeCanonicalClassLevel(typeof previous === "string" ? previous : "");
  const next = normalizeCanonicalClassLevel(typeof current === "string" ? current : "");
  if (next && classSignalInMessage(rawMessage)) return next;
  return prev ?? undefined;
}

function keepArea(current: unknown, rawMessage: string, previous: unknown, city?: string): string | undefined {
  const trimmed = rawMessage.trim();
  // Never extract an area from passwords, defaults, emails, or bot commands
  const isIgnoredText =
    /^(default|skip|password|pwd|pass|reply\s*default|leads|plans|coins|help|menu|stop|cancel)$/i.test(trimmed) ||
    trimmed.includes("@") ||
    /\b[a-zA-Z]+[0-9]{2,}\b/i.test(trimmed) ||
    /\b(kindly|send|send this|in english|in hindi|please|call|tell|write|want to|teach|need)\b/i.test(trimmed);

  if (!isIgnoredText) {
    const locRes = validateAndCleanLocality(trimmed, city);
    if (locRes.isValid && locRes.area && locRes.area.toLowerCase() !== (city || "delhi").toLowerCase()) {
      return locRes.area;
    }
  }

  const fromMsg = isIgnoredText ? null : extractPublicLocality(rawMessage, city);
  if (fromMsg) return fromMsg;
  const next = extractPublicLocality(typeof current === "string" ? current : "", city);
  const prev = extractPublicLocality(typeof previous === "string" ? previous : "", city);
  return next || prev || undefined;
}

export function isValidEmailDomain(email: string): boolean {
  return isStrictValidEmail(email);
}

function profileNotSavedReply(): string {
  return `Your profile update could not be saved yet because no tutor account is linked to this WhatsApp number.\n\nPlease log in and update it here:\nhttps://apnatutorhub.com/tutor/profile`;
}

function isValidName(v: string): boolean {
  const clean = v.trim();
  if (clean.length < 2 || clean.length > 50) return false;
  if (looksLikeUnexpectedNoise(clean)) return false;
  if (clean.split(/\s+/).length > 4) return false;
  if (/^(hi|hello|hey|namaste|yes|no|ok|done|skip|test|testing|asdf|qwerty|abc|xyz|lol|lmao|none|null|na|unknown|tutor|teacher|parent|student|admin|help|menu)$/i.test(clean)) return false;
  if (/\b(mujhe|mujhse|mera|meri|apka|aapka|tum|aap|kisi|aur|kuch|bhi|nhi|nahi|hai|hain|h|tha|thi|the|ho|hu|hoon|aata|aati|trust|fake|fraud|scam|lead|leads|plan|plans|paisa|paise|rupees?|fee|fees|problem|issue|help|call|please|pls|plz|kyu|kyon|kya|kaise|kahan|kab|kaun|koi|liye|diya|de|do|lena|dena|karo|kardo|chahiye|chayie|chahta|chahti|teach|teaching|subject|subjects|class|classes|area|location|city|online|offline|refund|payment|pay|login|password|email|gmail|portal|app|website|sir|mam|madam)\b/i.test(clean)) {
    return false;
  }
  if (/\d/.test(clean)) return false;
  return /^[a-zA-Z\s.'-]+$/.test(clean);
}

function formatHumanTeachingContext(
  subs: string[],
  cls: string | string[] | undefined,
  area: string | undefined
): {
  cleanSubs: string[];
  cleanClass: string;
  humanSubjectLabel: string;
  humanAreaPrompt: string;
  humanEmailSummary: string;
} {
  const cleanClass = Array.isArray(cls) ? cls.join(", ").trim() : (cls || "").trim();
  const enforced = enforceStrictEducation({
    subjectsInput: subs,
    classesInput: Array.isArray(cls) && cls.length > 0 ? cls : cleanClass || undefined,
  });

  const cleanSubs =
    enforced.subjects.length > 0
      ? enforced.subjects
      : enforced.pendingBaseSubjects.length > 0
        ? enforced.pendingBaseSubjects
        : [...subs].filter((s) => !/all\s*subjects\s*\(class\s*1-8\)/i.test(s));

  const resolvedClass =
    enforced.classLevels.length > 0 ? enforced.classLevels.join(", ") : cleanClass;

  const isAllSub1to8 =
    cleanSubs.length > 0 && cleanSubs.every((s) => /^All Subjects for (?:Class \d+|Pre-Primary)/i.test(s));

  let humanSubjectLabel = "";
  if (isAllSub1to8) {
    humanSubjectLabel = `${resolvedClass || "Classes 1–8"} (All Subjects)`;
  } else if (resolvedClass && cleanSubs.length > 0) {
    humanSubjectLabel = `${resolvedClass} (${cleanSubs.slice(0, 6).join(", ")}${cleanSubs.length > 6 ? "…" : ""})`;
  } else if (cleanSubs.length > 0) {
    humanSubjectLabel = cleanSubs.join(", ");
  } else {
    humanSubjectLabel = resolvedClass || "your classes";
  }

  let humanAreaPrompt = "";
  if (isAllSub1to8) {
    humanAreaPrompt = `Got it! For *${resolvedClass || "Classes 1–8"} (All Subjects)*, which city and locality do you teach in (or Online)? 📍`;
  } else if (resolvedClass && cleanSubs.length > 0) {
    humanAreaPrompt = `Got it! For *${resolvedClass}* (${cleanSubs[0]}), which city and locality do you teach in (or Online)? 📍`;
  } else if (resolvedClass) {
    humanAreaPrompt = `Got it! For *${resolvedClass}*, which city and locality do you teach in (or Online)? 📍`;
  } else {
    humanAreaPrompt = `Which city and locality do you teach in (or Online)? 📍`;
  }

  const cleanArea = area || "Delhi";
  const humanEmailSummary = `Profile details noted! 📚 ${cleanArea} — ${humanSubjectLabel}`;

  return {
    cleanSubs,
    cleanClass: resolvedClass,
    humanSubjectLabel,
    humanAreaPrompt,
    humanEmailSummary,
  };
}

/**
 * Shared strict education normalizer for both AI and deterministic onboarding paths.
 * Enforces Class 1-8 All Subjects only, Class 9-10 board subjects only, Class 11-12
 * stream subjects only, and multi-clause mixed grade-band inputs.
 */
function applyStrictEducationToData(params: {
  rawMessage: string;
  isIdentityStep: boolean;
  isInitialWelcomeChoice: boolean;
  previousData: Record<string, any>;
  mergedData: Record<string, any>;
  aiSubjects?: unknown;
  aiClasses?: unknown;
}): {
  mergedData: Record<string, any>;
  errorReply?: { reply: string; nextStep: string; quickReplies: string[] };
} {
  const { rawMessage, isIdentityStep, isInitialWelcomeChoice, previousData, mergedData, aiSubjects, aiClasses } = params;
  const trimmed = rawMessage.trim();

  if (isIdentityStep) {
    const prevCls = Array.isArray(previousData.classLevels) && previousData.classLevels.length > 0
      ? (previousData.classLevels as string[])
      : previousData.classLevel ? [String(previousData.classLevel)] : [];
    const prevSubs = Array.isArray(previousData.subjects) ? (previousData.subjects as string[]) : [];
    const kept = enforceStrictEducation({
      subjectsInput: prevSubs.length ? prevSubs : undefined,
      classesInput: prevCls.length ? prevCls : undefined,
    });
    if (kept.classLevels.length > 0) {
      mergedData.classLevels = kept.classLevels;
      mergedData.classLevel = kept.classLevels[0];
    }
    if (kept.subjects.length > 0) {
      mergedData.subjects = kept.subjects;
    } else if (kept.pendingBaseSubjects.length > 0) {
      mergedData.subjects = kept.pendingBaseSubjects;
    }
    return { mergedData };
  }

  const offScript = isOffScriptTutorTalk(trimmed) || isInitialWelcomeChoice;
  const candidateClsFromRaw = offScript ? [] : extractStrictClasses(trimmed).labels;
  const candidateClsFromAi = Array.isArray(aiClasses)
    ? aiClasses.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const prevCls = Array.isArray(previousData.classLevels) && previousData.classLevels.length > 0
    ? (previousData.classLevels as string[])
    : previousData.classLevel ? [String(previousData.classLevel)] : [];

  const candidateCls =
    candidateClsFromRaw.length > 0
      ? candidateClsFromRaw
      : candidateClsFromAi.length > 0
        ? candidateClsFromAi
        : prevCls;

  const candidateSubsFromAi = !offScript && Array.isArray(aiSubjects)
    ? aiSubjects.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const prevSubs = Array.isArray(previousData.subjects) ? (previousData.subjects as string[]) : [];
  const candidateSubs =
    candidateSubsFromAi.length > 0
      ? candidateSubsFromAi
      : prevSubs;

  const strict = enforceStrictEducation({
    rawMessage: offScript ? undefined : trimmed,
    subjectsInput: candidateSubs.length > 0 ? candidateSubs : undefined,
    classesInput: candidateCls.length > 0 ? candidateCls : undefined,
  });

  if (strict.errorPrompt && !offScript) {
    if (strict.incompatibleSeniorOnlyForJunior) {
      delete mergedData.classLevel;
      delete mergedData.classLevels;
      mergedData.subjects = strict.pendingBaseSubjects;
      return {
        mergedData,
        errorReply: {
          reply: strict.errorPrompt,
          nextStep: "T_CLASS",
          quickReplies: ["Class 1-8 (All Subjects)", "Class 9-10 (Science)", "Class 11-12"],
        },
      };
    }
    if (strict.needsSpecificSubjectsFor9to12) {
      mergedData.classLevels = strict.classLevels;
      mergedData.classLevel = strict.classLevels[0];
      delete mergedData.subjects;
      const is1112 = strict.classLevels.some((c) => /11|12/.test(c));
      return {
        mergedData,
        errorReply: {
          reply: strict.errorPrompt,
          nextStep: "T_SUBJECTS",
          quickReplies: is1112
            ? ["Physics, Chemistry", "Maths", "Accountancy, Economics", "Biology"]
            : ["Mathematics, Science", "Social Science, English", "Hindi, Sanskrit"],
        },
      };
    }
  }

  if (strict.classLevels.length > 0) {
    mergedData.classLevels = strict.classLevels;
    mergedData.classLevel = strict.classLevels[0];
  } else {
    delete mergedData.classLevels;
    delete mergedData.classLevel;
  }

  if (strict.subjects.length > 0) {
    mergedData.subjects = strict.subjects;
  } else if (strict.pendingBaseSubjects.length > 0) {
    mergedData.subjects = strict.pendingBaseSubjects;
  } else if (offScript && prevSubs.length > 0) {
    mergedData.subjects = prevSubs;
  } else {
    delete mergedData.subjects;
  }

  return { mergedData };
}

/**
 * Synchronize user credentials (password, email, name, subjects, area)
 * directly in PostgreSQL across User and TutorProfile tables.
 */
/**
 * Extract every canonical class level mentioned in a message (e.g. "science to class 8 also",
 * "for 11 physics", "class 9 and 10", "1 to 8").
 */
export function extractAllClassLevelsFromText(text: string): string[] {
  const s = (text || "").trim();
  if (!s) return [];
  const found = new Set<string>();

  // 1. Explicit ranges first (e.g. "1 to 8", "Class 1-8", "6-8", "9-10", "11-12")
  const rangeRegex = /\b(?:class\s*)?(1[0-2]|[1-9])(?:st|nd|rd|th)?\s*(?:[-–—]|\bto\b)\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRegex.exec(s)) !== null) {
    const canon = normalizeCanonicalClassLevel(m[0]);
    if (canon) found.add(canon);
  }

  // 2. Individual classes / exams (e.g. "class 8", "for 11 physics", "11th", "till 8th", "nursery", "jee", "neet")
  const singlePatterns = [
    /\b(?:class|grade|std|standard|for|to|till|upto)\s*(1[0-2]|[1-9])(?:st|nd|rd|th)?\b(?!\s*(?:days?|hours?|hrs?|km|mins?|minutes?|years?|yrs?|months?|pm|am))/gi,
    /\b(1[0-2]|[1-9])(?:st|nd|rd|th)\b(?!\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|tarikh|tareekh|date|floor|manzil|year|saal|week|hafte|rank|prize|attempt|time|baje|pm|am|days?|hours?|hrs?|mins?|minutes?))\b/gi,
    /\b(?:nursery|lkg|ukg|playgroup|iit[\s-]*jee|jee|neet|cuet)\b/gi,
  ];
  for (const rx of singlePatterns) {
    while ((m = rx.exec(s)) !== null) {
      // Avoid matching numbers inside 6-digit pincodes or sector numbers like "Sector 62" or "sec-12"
      const prefixSlice = s.slice(Math.max(0, m.index - 10), m.index).toLowerCase();
      if (/\b(sector|sec|phase|block|pocket|plot|flat|house|lane|street|road|gali|pin|pincode)[\s-]*$/i.test(prefixSlice)) continue;
      const numMatch = m[0].match(/(1[0-2]|[1-9])/);
      const nVal = numMatch ? parseInt(numMatch[1], 10) : null;
      const candidate = numMatch ? `Class ${numMatch[1]}` : m[0];
      const canon = normalizeCanonicalClassLevel(candidate);
      if (canon && found.size === 0) {
        found.add(canon);
      } else if (canon) {
        // Don't add single grade if already covered inside an extracted range like "Class 1-8"
        const alreadyCoveredByRange =
          nVal !== null &&
          Array.from(found).some((r) => {
            const rm = r.match(/(\d+)\s*-\s*(\d+)/);
            if (!rm) return false;
            const lo = parseInt(rm[1], 10);
            const hi = parseInt(rm[2], 10);
            return nVal >= lo && nVal <= hi;
          });
        if (!alreadyCoveredByRange) found.add(canon);
      }
    }
  }

  if (found.size === 0) {
    // Only use fallback if string is not an address/sector
    if (
      !/\b(sector|sec|phase|block|pocket|plot|flat|house|lane|street|road|gali|pin|pincode)[\s-]*\d/i.test(s) &&
      !/\b(nagar|vihar|pur|ganj|bagh|colony|enclave|kunj|park|puri|extension|society|apartment)\b/i.test(s)
    ) {
      const fallback = normalizeCanonicalClassLevel(s);
      if (fallback) found.add(fallback);
    }
  }

  return Array.from(found);
}

export async function syncUserCredentialsInDb(params: {
  phone: string;
  email?: string;
  password?: string;
  name?: string;
  subjects?: string[];
  classLevels?: string[];
  mergeSubjects?: boolean;
  mergeClasses?: boolean;
  area?: string;
  city?: string;
  mode?: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
}): Promise<{
  ok: boolean;
  updatedFields: string[];
  finalSubjects?: string[];
  finalClassLevels?: string[];
  error?: string;
}> {
  const updatedFields: string[] = [];
  let finalSubjects: string[] | undefined;
  let finalClassLevels: string[] | undefined;
  try {
    const phoneFilters = buildIndiaPhoneOrFilter(params.phone);
    const waEmail = waPlaceholderEmail(params.phone);
    let primaryUser = await findPrimaryUserForWhatsApp(prisma, params.phone);

    // 1. Password update — find the specific user first (prioritize tutor), then update by ID
    let passwordHash: string | undefined;
    if (params.password && params.password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(params.password.trim(), 10);

      // Try phone-based lookup first
      const targetUser = primaryUser ?? (await prisma.user.findFirst({ where: { email: waEmail }, select: { id: true } }));

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

    // 2. Email update (strict firewall: valid domain required, zero random words/typos)
    if (params.email && isStrictValidEmail(params.email)) {
      const cleanEmail = params.email.trim().toLowerCase();
      // Find the user to update — try phone first, then wa_ email fallback
      let user = primaryUser ?? (await prisma.user.findFirst({ where: { email: waEmail } }));

      if (!user) {
        // Try finding if an existing user already has this cleanEmail
        const existingEmailUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { tutorProfile: true, parentProfile: true },
        });
        const canonPhone = normalizeIndiaWhatsApp(params.phone) || params.phone.replace(/\D/g, "");
        if (existingEmailUser) {
          // Link phone to existing user
          user = (await prisma.user.update({
            where: { id: existingEmailUser.id },
            data: { phone: canonPhone },
            include: { tutorProfile: true, parentProfile: true },
          })) as any;
          primaryUser = user as any;
          updatedFields.push("email");
          console.info(`[syncUserCredentialsInDb] Linked phone ${canonPhone} to existing user ${user?.id} (${cleanEmail})`);
        } else {
          // Create user row with this phone and email so credentials are never lost
          const createPasswordHash = passwordHash ?? (await bcrypt.hash("12345678", 10));
          user = (await prisma.user.create({
            data: {
              phone: canonPhone,
              email: cleanEmail,
              name: params.name?.trim() || "Tutor",
              role: "TUTOR",
              isActive: true,
              signupSource: "WHATSAPP",
              passwordHash: createPasswordHash,
            },
            include: { tutorProfile: true, parentProfile: true },
          })) as any;
          primaryUser = user as any;
          updatedFields.push("email");
          console.info(`[syncUserCredentialsInDb] Created new user ${user?.id} for phone ${canonPhone} (${cleanEmail})`);
        }
      } else {
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
      }
    }

    // 3. Name update
    if (params.name && isValidName(params.name)) {
      const cleanName = params.name.trim();
      const nameUser =
        primaryUser ?? (await prisma.user.findFirst({ where: { email: waEmail }, select: { id: true } }));
      if (nameUser) {
        await prisma.user.update({ where: { id: nameUser.id }, data: { name: cleanName } });
        updatedFields.push("name");
      }
    }

    // 4. Tutor / Parent profile update (subjects, class, area, city)
    const tutorUser = primaryUser
      ? await prisma.user.findUnique({
        where: { id: primaryUser.id },
        include: { tutorProfile: true, parentProfile: true },
      })
      : null;
    const tutorRow = tutorUser?.tutorProfile ? tutorUser : null;
    const wantsProfileWrite = Boolean(
      params.area || params.city || (params.subjects && params.subjects.length > 0) || (params.classLevels && params.classLevels.length > 0)
    );

    const resolveCoordsSafe = async (locQuery: string): Promise<{ lat: number; lng: number } | null> => {
      if (!locQuery) return null;
      const local = resolveLocationCoordinates(locQuery);
      if (local) return local;
      try {
        const gem = await geocodeAddressWithGemini({ address: locQuery });
        if (gem && Number.isFinite(gem.lat) && Number.isFinite(gem.lng)) {
          return { lat: gem.lat, lng: gem.lng };
        }
      } catch {
        // fallback gracefully if Gemini geocoder unavailable
      }
      return null;
    };

    if (tutorRow && tutorRow.tutorProfile) {
      const profileUpdates: {
        address?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        subjects?: string[];
        classLevels?: string[];
        teachingMode?: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
      } = {};
      if (params.mode) {
        profileUpdates.teachingMode =
          params.mode === "ONLINE"
            ? "ONLINE"
            : params.mode === "OFFLINE"
              ? "OFFLINE"
              : params.mode === "COACHING"
                ? "COACHING"
                : "EITHER";
        if (params.mode === "ONLINE" && !params.area && !tutorRow.tutorProfile.address) {
          profileUpdates.address = "Online (Pan-India)";
          profileUpdates.city = "Online";
        }
      }
      if (params.area) {
        // Enforce location availability check: never write random words to tutorProfile.address!
        const locCheck = validateAndCleanLocality(params.area, params.city || tutorRow.tutorProfile.city || "Delhi", true);
        if (locCheck.isValid && (!sameLocality(locCheck.area, locCheck.city) || locCheck.area === "Online (Pan-India)")) {
          profileUpdates.address = locCheck.area;
          if (locCheck.city && !params.city) {
            profileUpdates.city = locCheck.city;
          }
        } else {
          console.warn(`[syncUserCredentialsInDb] Blocked updating address to invalid/unavailable location: "${params.area}"`);
        }
      }
      if (params.city) {
        profileUpdates.city = params.city;
      }
      if (params.area || params.city) {
        const coords = await resolveCoordsSafe(
          `${params.area || tutorRow.tutorProfile.address || ""} ${params.city || tutorRow.tutorProfile.city || ""}`.trim()
        );
        if (coords) {
          profileUpdates.latitude = coords.lat;
          profileUpdates.longitude = coords.lng;
        }
      }
      if (params.classLevels && params.classLevels.length > 0) {
        const existingCls = tutorRow.tutorProfile.classLevels || [];
        const rawCls = params.mergeClasses
          ? [...existingCls, ...params.classLevels]
          : [...params.classLevels];
        const parsedCls = extractStrictClasses(rawCls.join(", ")).labels;
        const mergedCls = parsedCls.length > 0 ? parsedCls : Array.from(new Set(rawCls));
        profileUpdates.classLevels = mergedCls;
        finalClassLevels = mergedCls;
      } else {
        finalClassLevels = tutorRow.tutorProfile.classLevels || [];
      }
      if (params.subjects && params.subjects.length > 0) {
        const existingSubs = tutorRow.tutorProfile.subjects || [];
        const rawSubList = params.mergeSubjects ? [...existingSubs, ...params.subjects] : params.subjects;
        const sanitized = sanitizeEducationForDb(rawSubList, finalClassLevels);
        if (sanitized.classLevels.length > 0) {
          profileUpdates.classLevels = sanitized.classLevels;
          finalClassLevels = sanitized.classLevels;
        }
        profileUpdates.subjects = sanitized.subjects;
        finalSubjects = sanitized.subjects;
      } else if (finalClassLevels.length > 0) {
        // Re-clean existing subjects against updated classLevels (also fills Class 1-8 All Subjects)
        const sanitized = sanitizeEducationForDb(tutorRow.tutorProfile.subjects, finalClassLevels);
        if (sanitized.subjects.length > 0 && JSON.stringify(sanitized.subjects) !== JSON.stringify(tutorRow.tutorProfile.subjects)) {
          profileUpdates.subjects = sanitized.subjects;
          finalSubjects = sanitized.subjects;
        }
        if (sanitized.classLevels.length > 0) {
          profileUpdates.classLevels = sanitized.classLevels;
          finalClassLevels = sanitized.classLevels;
        }
      }
      if (Object.keys(profileUpdates).length > 0) {
        await prisma.tutorProfile.update({
          where: { id: tutorRow.tutorProfile.id },
          data: profileUpdates,
        });
        const canon = normalizeIndiaWhatsApp(params.phone);
        if (canon) {
          await prisma.user.update({
            where: { id: tutorRow.id },
            data: { phone: canon },
          });
        }
        if (params.area || params.city) updatedFields.push("area");
        if (profileUpdates.subjects) updatedFields.push("subjects");
        if (profileUpdates.classLevels) updatedFields.push("class");
        if (profileUpdates.teachingMode) updatedFields.push("mode");
      }
    } else if (tutorUser?.parentProfile && (params.area || params.city) && !params.subjects && !params.classLevels) {
      const locCheck = params.area ? validateAndCleanLocality(params.area, params.city || tutorUser.parentProfile.city || "Delhi", true) : null;
      const validArea = locCheck?.isValid ? locCheck.area : undefined;
      const coords = await resolveCoordsSafe(
        `${validArea || tutorUser.parentProfile.address || ""} ${params.city || tutorUser.parentProfile.city || ""}`.trim()
      );
      await prisma.parentProfile.update({
        where: { id: tutorUser.parentProfile.id },
        data: {
          ...(validArea ? { address: validArea } : {}),
          ...(params.city ? { city: params.city } : {}),
          ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
        },
      });
      if (validArea || params.city) updatedFields.push("area");
    } else if (wantsProfileWrite && tutorUser && !["SUPER_ADMIN", "SUB_ADMIN"].includes(tutorUser.role)) {
      const locCheck = params.area ? validateAndCleanLocality(params.area, params.city || "Delhi", true) : null;
      const validArea = locCheck?.isValid ? locCheck.area : null;
      const coords = await resolveCoordsSafe(
        `${validArea || ""} ${params.city || ""}`.trim()
      );
      if (tutorUser.role === "PARENT") {
        await prisma.user.update({
          where: { id: tutorUser.id },
          data: { role: "TUTOR" },
        });
      }
      const sanitizedNew = sanitizeEducationForDb(params.subjects || [], params.classLevels || []);
      finalClassLevels =
        sanitizedNew.classLevels.length > 0
          ? sanitizedNew.classLevels
          : extractStrictClasses((params.classLevels || []).join(", ")).labels;
      finalSubjects = sanitizedNew.subjects;
      await prisma.tutorProfile.create({
        data: {
          userId: tutorUser.id,
          address: validArea,
          city: params.city || "Delhi",
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          subjects: finalSubjects,
          classLevels: finalClassLevels,
        },
      });
      if (params.area || params.city) updatedFields.push("area");
      if (finalSubjects.length > 0) updatedFields.push("subjects");
      if (finalClassLevels.length > 0) updatedFields.push("class");
    }
    const profileMissing = wantsProfileWrite && !updatedFields.includes("area") && !updatedFields.includes("subjects") && !updatedFields.includes("class") && !tutorRow?.tutorProfile;

    // 5. Also update whatsappSession.data if session exists
    try {
      const existingSession = await prisma.whatsappSession.findFirst({
        where: { OR: phoneFilters },
      });
      if (existingSession) {
        const curData = (existingSession.data as Record<string, any>) || {};
        const merged = { ...curData };
        if (params.email && isStrictValidEmail(params.email)) merged.email = params.email.trim().toLowerCase();
        if (params.password) merged.password = params.password.trim();
        if (params.name) merged.name = params.name.trim();
        if (params.area) merged.area = params.area.trim();
        if (params.city) merged.city = params.city.trim();
        if (finalSubjects && finalSubjects.length > 0) merged.subjects = finalSubjects;
        if (finalClassLevels && finalClassLevels.length > 0) {
          merged.classLevels = finalClassLevels;
          if (finalClassLevels[0]) merged.classLevel = finalClassLevels[0];
        } else if (params.classLevels && params.classLevels.length > 0) {
          const validCls = extractStrictClasses(params.classLevels.join(", ")).labels;
          if (validCls.length > 0) {
            merged.classLevels = validCls;
            merged.classLevel = validCls[0];
          }
        }

        await prisma.whatsappSession.update({
          where: { id: existingSession.id },
          data: { data: merged },
        });
      }
    } catch (sessionErr) {
      console.warn("[syncUserCredentialsInDb] Session sync warning:", sessionErr);
    }

    if (profileMissing) {
      return { ok: false, updatedFields, error: "No tutor profile for this WhatsApp number" };
    }
    return { ok: true, updatedFields, finalSubjects, finalClassLevels };
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
  /** Optional image attachments to send after the text reply (e.g. payment QR). */
  imageUrls?: string[];
  imageCaption?: string;
};

/** Clean Kotak UPI QR (9311459543@kotakbank / ROHIT SHARMA) — the only QR sent in chat. */
export const PAYMENT_QR_IMAGE_URL = "https://apnatutorhub.com/images/payment/upi-qr.png";
export const PAYMENT_QR_CAPTION =
  "💳 Scan to pay ₹1,257 — Commission Based Plan (6 months validity)\n" +
  "🆔 UPI: 9311459543@kotakbank\n\n" +
  "👉 Direct Payment Link (Card/UPI/Netbanking):\n" +
  "https://apnatutorhub.com/tutor/plans\n\n" +
  "After paying, please send your 12-digit UTR number or payment screenshot here — our team will activate your plan within 15 minutes. ✅";

// Direct Razorpay 1-click link is sent in text instead of offline QR images
export function paymentQrImage(): { imageUrls?: string[]; imageCaption?: string } {
  return {};
}

async function tryLooseTutorIntent(
  session: BotSession,
  rawMessage: string,
  data: Record<string, unknown>,
  step: string,
  mode: "social" | "done"
): Promise<EngineResult | null> {
  const intent = detectLooseIntent(rawMessage);
  if (!intent) return null;

  const isTutor =
    session.userType === "TUTOR" ||
    step.startsWith("T_") ||
    (step === "DONE" && session.userType !== "PARENT");
  if (!isTutor) return null;

  if (mode === "social") {
    if (intent === "LEADS" || intent === "PLANS" || intent === "PROFILE" || intent === "HELP") return null;
  }

  if (intent === "DECLINE") {
    return {
      reply: looseIntentClarifyReply("DECLINE", true),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "Main Menu 🏠"],
    };
  }

  if (intent === "WRONG_INFO") {
    return {
      reply: looseIntentClarifyReply("WRONG_INFO", true),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Talk to Support 📞", "View Other Leads 📋", "My Coins 🪙"],
    };
  }

  if (intent === "PING") {
    return {
      reply: looseIntentClarifyReply("PING", true),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "Talk to Support 📞"],
    };
  }

  if (intent === "GREETING") {
    const tutorName = (data.name as string) || "Teacher";
    return {
      reply: `Hello ${tutorName}! 👋 I'm Priya, your ApnaTutorHub coordinator. Would you like to see matching tuition leads, or check your profile and plans?`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "View Plans 💰"],
    };
  }

  if (intent === "THANKS") {
    return {
      reply: "You're very welcome! 😊 Let me know anytime if you need help — just type *leads*, *plans*, *profile*, or *help*.",
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "Help 📞"],
    };
  }

  if (intent === "LEADS") {
    const area = (data.area as string) || "Delhi";
    const tutorClassLevels = (Array.isArray(data.classLevels) && data.classLevels.length > 0)
      ? (data.classLevels as string[])
      : (data.classLevel ? [data.classLevel as string] : undefined);
    const leads = await getChatbotMatchingLeads(
      area,
      (data.city as string) || "Delhi",
      tutorClassLevels,
      data.subjects as string[]
    );
    return {
      reply: formatTutorLeadsAndPlansMessage((data.name as string) || "Teacher", area, leads),
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies:
        leads.length > 0
          ? [`🔥 Unlock #${leads[0].inquiryNumber}`, "View Plans 💰", "Help 📞"]
          : ["View All Leads 📋", "Update Area 📍", "Help 📞"],
    };
  }

  if (intent === "PLANS") {
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    const planReply =
      bal.found && bal.balance > 0
        ? `${formatCoinBalanceMessage(bal.balance)}\n\nIf you'd like to add more coins, here is our plan:\n\n${formatCoinPlansMessage()}`
        : formatCoinPlansMessage();
    return {
      reply: planReply,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Open Wallet 💳", "Help 📞"],
      ...paymentQrImage(),
    };
  }

  if (intent === "PROFILE") {
    const name = (data.name as string) || "Not set";
    const email = (data.email as string) || "Not set";
    const area = (data.area as string) || "Not set";
    const city = (data.city as string) || "";
    const subjects =
      Array.isArray(data.subjects) && data.subjects.length > 0
        ? (data.subjects as string[]).join(", ")
        : "Not set";
    const location = city ? `${area}, ${city}` : area;
    return {
      reply: `👤 *Your Profile:*\n\nName: ${name}\nEmail: ${email}\nLocation: ${location}\nSubjects: ${subjects}\nPhone: +91-${session.phone}\n\nTo update anything, type: *UPDATE AREA*, *UPDATE SUBJECTS*, or *UPDATE PASSWORD*.`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Update Area 📍", "Help 📞"],
    };
  }

  if (intent === "HELP") {
    return {
      reply: `Hi, I'm Priya from ApnaTutorHub support. Just let me know what you need:\n• Leads — reply *View Leads* or share your area (e.g. *Rohini Delhi*)\n• Coins / Plan — reply *wallet* or *plans*\n• Profile — reply *my profile*\n\n📞 Helpline: 08062180653 (9 AM – 7 PM Mon–Sat)`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "View Plans 💰"],
    };
  }

  const clarify = looseIntentClarifyReply(intent, true);
  if (!clarify) return null;

  return {
    reply: clarify,
    nextStep: step === "WELCOME" ? "T_CONVO" : step,
    updatedData: data,
    userType: session.userType || "TUTOR",
    retries: 0,
    quickReplies: ["View Leads 📋", "My Profile 👤", "Help 📞"],
  };
}

function classAskOrBreak(
  data: Record<string, unknown>,
  prompt: string,
  quickReplies: string[]
): EngineResult {
  const last = String(data.lastBotAsk || "");
  const count = last === prompt ? Number(data.sameAskCount || 0) + 1 : 1;
  if (count >= 2) {
    const hasSubs = Array.isArray(data.subjects) && data.subjects.length > 0;
    const hasClass = Boolean(data.classLevel || (Array.isArray(data.classLevels) && data.classLevels.length > 0));

    if (hasSubs && !hasClass) {
      return {
        reply: `No worries! Which city/area (or Online) do you teach, and which classes (for example: Class 1–8, Class 9–10, or Class 11–12)? 📍`,
        nextStep: "T_CONVO",
        updatedData: {
          ...data,
          lastBotAsk: "break",
          sameAskCount: 0,
        },
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Delhi NCR", "Noida", "Gurugram", "Online Only"],
      };
    }

    return {
      reply:
        `No problem — I won't repeat the same question! 😊\n\nPlease tell me which *classes and subjects* you teach (for example: *Class 1-8 All Subjects* or *Class 11-12 Physics*).\nFor plan activation, type *PAY*, or message coordinator support: +91 93191 93109`,
      nextStep: "T_CONVO",
      updatedData: {
        ...data,
        lastBotAsk: "break",
        sameAskCount: 0,
      },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Activate Plan ⚡", "Talk to Support 📞"],
    };
  }
  return {
    reply: prompt,
    nextStep: "T_CLASS",
    updatedData: { ...data, lastBotAsk: prompt, sameAskCount: count },
    userType: "TUTOR",
    retries: 0,
    quickReplies,
  };
}

function tryTutorOffScriptReply(
  session: BotSession,
  rawMessage: string,
  data: Record<string, unknown>,
  step: string
): EngineResult | null {
  const nextStep = step === "WELCOME" ? "T_CONVO" : step;

  if (wantsToPayNow(rawMessage) || asksPlanPaymentOrQr(rawMessage)) {
    const hint =
      typeof data.interestedPlanType === "string" && data.interestedPlanType === "COMMISSION_1257"
        ? "1257"
        : "1257";
    return {
      reply: formatPlanPaymentQrMessage(hint),
      nextStep,
      updatedData: { ...data, lastBotAsk: "pay", sameAskCount: 0 },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan ₹1,257 🤝", "View Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  if (asksCommissionPlan(rawMessage)) {
    return {
      reply: formatCommissionPlanDetailMessage(),
      nextStep,
      updatedData: { ...data, interestedPlanType: "COMMISSION_1257", lastBotAsk: "commission", sameAskCount: 0 },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Activate Plan ⚡", "View Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  if (refusesRegistration(rawMessage) || wantsLeadsOnWhatsApp(rawMessage)) {
    return {
      reply:
        `Sure — you can browse available leads first and complete registration later.\n\n` +
        `👉 Leads: https://apnatutorhub.com/tutor/leads\n` +
        `👉 Plans: https://apnatutorhub.com/tutor/plans\n\n` +
        `If you want details for a specific inquiry on WhatsApp, reply with its *Lead ID* (e.g. #32042).`,
      nextStep: "DONE",
      updatedData: { ...data, lastBotAsk: "skip-reg", sameAskCount: 0 },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "Talk to Support 📞"],
    };
  }

  if (/password/i.test(rawMessage) && /(?:own|already|using|change|reset|update|purana)/i.test(rawMessage)) {
    // Send registered tutors through the real password reset flow.
    return {
      reply: `To reset your password, click *Forgot Password* on https://apnatutorhub.com/login — a reset link/OTP will be sent to your registered email or mobile. 🔑\nIf you don't have access to your email, reply *MANUAL RESET* here and I'll set a temporary password for you.`,
      nextStep: "DONE",
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["MANUAL RESET", "Help 📞"],
    };
  }

  const elsewhere = outsideNcrCity(rawMessage);
  if (elsewhere && /(?:nahi|not in delhi|ncr me nahi|stay|staying|hu|hoon|rehta|rehti|rahata|live|living|from)/i.test(rawMessage)) {
    return {
      reply:
        `Got it — you're based in *${elsewhere}*. No travel is needed!\n\n` +
        `We have Pan-India *Online* tuition leads (especially for Class 9–12) available here:\n` +
        `👉 https://apnatutorhub.com/tutor/leads?mode=ONLINE\n\n` +
        `I've saved your city as *${elsewhere}*. Which classes and subjects do you teach online?`,
      nextStep: "T_CONVO",
      updatedData: { ...data, city: elsewhere, area: elsewhere, mode: "ONLINE", lastBotAsk: "outside-ncr", sameAskCount: 0 },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Online Leads 💻", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
    };
  }

  if (refusesAdvancePayment(rawMessage)) {
    return {
      reply:
        `No problem at all — tutors never pay any advance commission to parents. 🙏\n\n` +
        `The membership plan is only for unlocking verified parent phone numbers and inquiries:\n` +
        `• ₹1,257 Commission Plan (6 months validity, 5 verified leads)\n\n` +
        `You can browse open leads first with no obligation, and reply *PAY* whenever you're ready.\n` +
        `👉 https://apnatutorhub.com/tutor/plans`,
      nextStep,
      updatedData: { ...data, lastBotAsk: "refuse-pay", sameAskCount: 0 },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Activate Plan ⚡", "Talk to Support 📞"],
    };
  }

  const tutorish = session.userType === "TUTOR" || step.startsWith("T_");
  if (!tutorish) return null;

  const lastAsk = String(data.lastBotAsk || "");
  const classAskPending =
    step === "T_CLASS" ||
    step === "T_SUBJECTS" ||
    /which class|which classes|kaunsi class|commerce|account|padhate|teach/i.test(lastAsk);

  if (isBareNo(rawMessage) && !classAskPending) return null;

  const rejecting = isSubjectNegation(rawMessage) || isBareNo(rawMessage);
  if (!rejecting) return null;

  const keys = rejectedSubjectKeys(rawMessage);
  const currentSubs = Array.isArray(data.subjects) ? (data.subjects as string[]) : [];
  const looksCommerce = currentSubs.some((s) =>
    /commerce|account|business\s*studies|\bbst\b/i.test(s)
  );
  const stripKeys =
    keys.length > 0
      ? keys
      : looksCommerce || /commerce|account/i.test(String(data.lastBotAsk || ""))
        ? ["commerce", "account", "business studies", "bst"]
        : currentSubs.length > 0 && (isBareNo(rawMessage) || step === "T_CLASS")
          ? currentSubs.map((s) => s.toLowerCase().slice(0, 8))
          : [];

  if (stripKeys.length === 0 && !isBareNo(rawMessage)) return null;

  const remaining = stripRejectedSubjects(currentSubs, stripKeys.length ? stripKeys : ["commerce"]);
  return {
    reply:
      remaining.length > 0
        ? `Got it, I've removed that subject. Which classes do you teach for *${remaining.join(", ")}*? 📚`
        : `Understood, I won't add Commerce / Accountancy.\n\nWhich classes and subjects do you teach? (For example: *Class 1-8 All Subjects*, *Class 9-10 Maths & Science*, or *Class 11-12 Physics*)`,
    nextStep: remaining.length > 0 ? "T_CLASS" : "T_CONVO",
    updatedData: {
      ...data,
      subjects: remaining,
      classLevel: remaining.length > 0 ? data.classLevel : undefined,
      classLevels: remaining.length > 0 ? data.classLevels : undefined,
      lastBotAsk: remaining.length > 0 ? "class" : "subjects",
      sameAskCount: 0,
    },
    userType: "TUTOR",
    retries: 0,
    quickReplies:
      remaining.length > 0
        ? ["Class 1-8", "Class 9-10", "Class 11-12"]
        : ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "English / Hindi"],
  };
}

function buildProfileViewResult(
  session: BotSession,
  data: Record<string, any>,
  step: string,
  userProfile: UserProfileContext | null | undefined
): EngineResult {
  const name = (data.name as string) || userProfile?.name || "Not set";
  const email = (data.email as string) || userProfile?.email || "Not set";
  const area = (data.area as string) || userProfile?.area || "Not set";
  const city = (data.city as string) || userProfile?.city || "";
  const subjects =
    Array.isArray(data.subjects) && data.subjects.length > 0
      ? (data.subjects as string[]).join(", ")
      : userProfile?.subjects?.length
        ? userProfile.subjects.join(", ")
        : "Not set";
  const classes =
    Array.isArray(data.classLevels) && data.classLevels.length > 0
      ? (data.classLevels as string[]).join(", ")
      : userProfile?.classLevels?.length
        ? userProfile.classLevels.join(", ")
        : (data.classLevel as string) || "Not set";
  const mode = (data.mode as string) || userProfile?.teachingMode || "Both (Online + Offline)";
  const location = city && !area.toLowerCase().includes(city.toLowerCase()) ? `${area}, ${city}` : area;
  const coinsStr = userProfile?.coins !== undefined && userProfile?.coins !== null ? `\n🪙 Coins: *${userProfile.coins}*` : "";

  const profileText = `👤 *Your Profile:*\n\nName: ${name}\nEmail: ${email}\nLocation: ${location}\nMode: ${mode}\nClasses: ${classes}\nSubjects: ${subjects}\nPhone: +91-${session.phone}${coinsStr}\nPassword: Set (encrypted 🔒)\n\nTo update anything, type:\n• *UPDATE AREA <new locality>*\n• *UPDATE MODE Online / Offline*\n• *UPDATE SUBJECTS <subjects & classes>*\n• *UPDATE PASSWORD <new password>*`;
  return {
    reply: profileText,
    nextStep: step,
    updatedData: data,
    retries: 0,
    quickReplies: ["Update Area 📍", "Update Mode 💻", "Update Subjects 📚", "View Leads 📋"],
  };
}

async function handleAiSemanticIntent(params: {
  ai: AiBotResponse;
  rawMessage: string;
  session: BotSession;
  step: string;
  data: Record<string, any>;
  userProfile: UserProfileContext | null | undefined;
  isDoneState: boolean;
}): Promise<EngineResult | null> {
  const { ai, rawMessage, session, step, data, userProfile, isDoneState } = params;
  const intent = ai.intent || "ONBOARD_OR_UPDATE";
  const safeNextStep = isDoneState ? "DONE" : step;
  const fallbackUserType = session.userType || (isDoneState ? "TUTOR" : ai.detectedRole || null);

  if (intent === "OFF_TOPIC_OR_RANDOM") {
    return {
      reply: ai.reply,
      nextStep: safeNextStep,
      updatedData: data,
      userType: fallbackUserType,
      retries: 0,
      quickReplies:
        ai.quickReplies && ai.quickReplies.length > 0
          ? ai.quickReplies
          : isDoneState
            ? ["View Leads 📋", "My Profile 👤", "Help 📞"]
            : ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "Help 📞"],
    };
  }

  if (intent === "DECLINE_OR_LATER") {
    const ext = ai.extractedData || {};
    const hasEntityFields = Boolean(
      ext.email ||
      ext.area ||
      (Array.isArray(ext.subjects) && ext.subjects.length > 0) ||
      (Array.isArray(ext.classLevels) && ext.classLevels.length > 0)
    );
    if (!hasEntityFields) {
      return {
        reply: ai.reply,
        nextStep: safeNextStep,
        updatedData: data,
        userType: fallbackUserType,
        retries: 0,
        quickReplies:
          ai.quickReplies && ai.quickReplies.length > 0
            ? ai.quickReplies
            : isDoneState
              ? ["View Leads 📋", "My Profile 👤", "Help 📞"]
              : ["View Leads 📋", "Help 📞", "MENU"],
      };
    }
    return null;
  }

  if (intent === "CHECK_PROFILE") {
    return buildProfileViewResult(session, data, safeNextStep, userProfile);
  }

  if (intent === "CHECK_COINS") {
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    return {
      reply: bal.found ? formatCoinBalanceMessage(bal.balance) : ai.reply,
      nextStep: safeNextStep,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies:
        bal.found && bal.balance > 0
          ? ["View All Leads 📋", "Open Wallet 💳", "Help 📞"]
          : ["View Plans 💰", "View Leads 📋", "Help 📞"],
    };
  }

  if (intent === "SHOW_PLANS_OR_PAY") {
    if (/(?:(?:\b₹?\s*999\b)|999\s*(?:wala|plan|offer|ka))/i.test(rawMessage)) {
      return {
        reply: formatOfferEnded999Message(),
        nextStep: isDoneState ? "DONE" : step === "WELCOME" ? "T_CONVO" : step,
        updatedData: data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["Commission Plan ₹1,257 🤝", "View Leads 📋", "Talk to Support 📞"],
      };
    }
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    const wantsPayOrPlanDetails =
      asksPlanPaymentOrQr(rawMessage) ||
      /\b(buy|recharge|purchase|plan|plans|pricing|membership|pack|qr|fee|charges)\b/i.test(rawMessage);
    let reply = ai.reply;
    if (wantsPayOrPlanDetails && !/1,?257|checkout=starter/i.test(reply)) {
      reply =
        bal.found && bal.balance > 0
          ? `You already have *${bal.balance} coins* in your wallet.\n\n${formatCoinPlansMessage()}`
          : formatCoinPlansMessage();
    }
    return {
      reply,
      nextStep: isDoneState ? "DONE" : step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies:
        ai.quickReplies && ai.quickReplies.length > 0
          ? ai.quickReplies
          : ["Activate Plan ⚡", "View Leads 📋", "Talk to Support 📞"],
      ...(shouldIncludePaymentQr(rawMessage, reply) || asksPlanPaymentOrQr(rawMessage) ? paymentQrImage() : {}),
    };
  }

  if (intent === "SHOW_LEADS") {
    const extArea = typeof ai.extractedData?.area === "string" ? ai.extractedData.area.trim() : "";
    const extCity = typeof ai.extractedData?.city === "string" ? ai.extractedData.city.trim() : "";
    const loc = extArea
      ? validateAndCleanLocality(extCity ? `${extArea}, ${extCity}` : extArea, extCity || (data.city as string) || "Delhi", true)
      : null;
    const searchArea =
      (loc?.isValid && !sameLocality(loc.area, loc.city) ? loc.area : "") ||
      (typeof data.area === "string" ? data.area : "") ||
      "";
    const searchCity = (loc?.city || (typeof data.city === "string" ? data.city : "Delhi")) || "Delhi";
    const tutorClassLevels =
      Array.isArray(data.classLevels) && data.classLevels.length > 0
        ? (data.classLevels as string[])
        : data.classLevel
          ? [data.classLevel as string]
          : undefined;
    if (searchArea || isDoneState) {
      const leads = await getChatbotMatchingLeads(
        searchArea || "Delhi",
        searchCity,
        tutorClassLevels,
        Array.isArray(data.subjects) ? (data.subjects as string[]) : undefined
      );
      if (leads.length > 0) {
        return {
          reply: formatTutorLeadsAndPlansMessage((data.name as string) || "Teacher", searchArea || searchCity, leads),
          nextStep: "DONE",
          updatedData: data,
          userType: "TUTOR",
          retries: 0,
          quickReplies: [`🔥 Unlock Lead #${leads[0].inquiryNumber}`, "💰 View Coin Plans", "🌐 Leads Dashboard"],
        };
      }
    }
    const leadReply = /apnatutorhub\.com\/tutor\/leads/i.test(ai.reply)
      ? ai.reply
      : `${ai.reply}\n\n👉 Browse all open leads: https://apnatutorhub.com/tutor/leads`;
    return {
      reply: leadReply,
      nextStep: isDoneState ? "DONE" : step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ai.quickReplies && ai.quickReplies.length > 0 ? ai.quickReplies : ["View Leads 📋", "My Profile 👤", "View Plans 💰"],
    };
  }

  if (intent === "PASSWORD_OR_LOGIN_HELP") {
    const needsLink = !/apnatutorhub\.com\/login|manual\s*reset/i.test(ai.reply);
    return {
      reply: needsLink
        ? `${ai.reply}\n\n👉 Log in here: https://apnatutorhub.com/login\nReply *MANUAL RESET* to set temporary password *Tutor@123*.`
        : ai.reply,
      nextStep: safeNextStep,
      updatedData: data,
      userType: fallbackUserType,
      retries: 0,
      quickReplies: ai.quickReplies && ai.quickReplies.length > 0 ? ai.quickReplies : ["MANUAL RESET", "View Leads 📋", "Help 📞"],
    };
  }

  if (intent === "SUPPORT_OR_HUMAN") {
    const asksContact = /\b(call|phone|contact|number|support|helpline|escalat|police|complaint|refund|manager|human)\b/i.test(rawMessage);
    const hasSupportInfo = /(08062180653|93191|apnatutorhub\.com)/i.test(ai.reply);
    return {
      reply:
        asksContact && !hasSupportInfo
          ? `${ai.reply}\n\n📞 Helpline: 08062180653 | WhatsApp Support: +91 93191 93109`
          : ai.reply,
      nextStep: safeNextStep,
      updatedData: data,
      userType: fallbackUserType,
      retries: 0,
      quickReplies:
        ai.quickReplies && ai.quickReplies.length > 0
          ? ai.quickReplies
          : isDoneState
            ? ["View Leads 📋", "My Profile 👤", "Talk to Support 📞"]
            : ["View Leads 📋", "View Plans 💰", "Help 📞"],
    };
  }

  return null;
}

async function tryDeterministicDoneShortcuts(params: {
  session: BotSession;
  rawMessage: string;
  data: Record<string, any>;
}): Promise<EngineResult | null> {
  const { session, rawMessage, data } = params;
  const rawTrimmed = rawMessage.trim();

  // Conversational fallbacks for free leads / delayed payment
  if (/bina\s*reg|free\s*lead|paise\s*nahi|payment\s*baad|ek\s*enquiry|enquiry\s*dedo|pehle\s*demo|yaar\b/i.test(rawMessage)) {
    return {
      reply: `We completely understand! However, verified parent phone numbers and home addresses require an active membership so only serious tutors connect with families. 🙏\n\nYou can start with our ₹1,257 Commission Based Plan (6 months validity, 5 leads).\n\n👉 View Plan: https://apnatutorhub.com/tutor/plans\n👉 Browse Leads: https://apnatutorhub.com/tutor/leads`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan 🤝", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  // 1. Reply to broadcast / enquiry interest ("1", "interested", "accept", etc.)
  if (
    /^(?:1|1\.|one|interested|i(?:'m|\s+am)?\s+interested|accept|haan\s+interested|padhana\s+hai|mujhe\s+padhana\s+hai|lead\s+(?:dedo|bhejo|chahiye|connect|unlock)|हाँ|पढ़ाना\s*है|पढाना\s*है|रुचि\s*है)$/iu.test(
      rawTrimmed
    )
  ) {
    return {
      reply: `Awesome! 🎉 Your interest has been noted.\n\nVisit https://apnatutorhub.com/tutor/leads to view full requirement details and unlock parent contact info.\n\nNeed help? WhatsApp Coordinator: +91 93191 93109`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Coins 🪙", "Talk to Coordinator 📞"],
    };
  }

  // 2. Reply "2" in DONE state -> Plans / Pricing
  if (/^(?:2|2\.|two|plans?|pricing|membership|recharge|प्लान)$/iu.test(rawTrimmed)) {
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    const planReply =
      bal.found && bal.balance > 0
        ? `${formatCoinBalanceMessage(bal.balance)}\n\nIf you'd like to add more coins, here is our plan:\n\n${formatCoinPlansMessage()}`
        : formatCoinPlansMessage();
    return {
      reply: planReply,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Open Wallet 💳", "Help 📞"],
      ...paymentQrImage(),
    };
  }

  // 3. Reply "3" in DONE state -> Support / Coordinator
  if (/^(?:3|3\.|three|help|support|coordinator|मदद|सहायता)$/iu.test(rawTrimmed)) {
    return {
      reply: `Hi, I'm Priya from ApnaTutorHub support. Just tell me what you need:\n• Leads — reply *View Leads* or type your area (e.g. *Rohini Delhi*)\n• Coins / Plan — reply *wallet* or *plans*\n• Profile — reply *my profile*\n\n📞 WhatsApp Support: +91 93191 93109\nHelpline: 08062180653 (9 AM – 7 PM)`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "View Plans 💰"],
    };
  }

  // 4. Account Deactivation / Data Deletion request
  if (
    /(?:account|profile|data|number)\s*(?:delete|hatao|remove|band|cancel|close)/i.test(rawMessage) ||
    /(?:delete|hatao|remove|band|cancel)\s*(?:mera\s*)?(?:account|profile|data|number)/i.test(rawMessage)
  ) {
    return {
      reply: `If you want to pause WhatsApp alerts, simply reply *STOP*. 🙏\n\nTo deactivate or permanently delete your account data, visit https://apnatutorhub.com/tutor/profile or message our compliance coordinator (+91 93191 93109) and we will process it right away.`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["STOP 🛑", "My Profile 👤", "Help 📞"],
    };
  }

  if (/^(hi|hello|hey|namaste|ha|haan|theek|thik|ok|okay|yes|done|हाँ|जी|ठीक|नमस्ते)$/iu.test(rawTrimmed)) {
    return {
      reply: `Hello! 😊 How can I help you today? Would you like to browse matching student leads or view plan details?`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "Talk to Support 📞"],
    };
  }

  if (/\b(fees?\s*kam|kam\s*(hai|hain)?\s*(fees?|budget)?|budget\s*kam|fees?\s*(issue|increase|badhao|zyada)|fee\s*kam)\b/i.test(rawMessage)) {
    return {
      reply: `Understood! New inquiries are filtered above market rates:\n• Classes 1–8: Monthly ₹6,000–₹7,600, *All Subjects*\n• Classes 9–12: Hourly ₹700–₹1,050, subject-specific\n\nTutors with a set locality get leads within 5 km; online-only tutors get Online inquiries.\n👉 https://apnatutorhub.com/tutor/leads`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Update Location 📍"],
    };
  }

  const isComplaintOrTrust = /\b(trust|scam|fake|fraud|loot|le\s*liye|kuch\s*(?:bhi\s*)?(?:nhi|nahi)\s*diya|refund|complaint|cheat)\b/i.test(rawMessage);
  const wantsProfileChange = !isComplaintOrTrust && /\b(update|change|set|changed|badal|naya|new|add|also|bhi)\b/i.test(rawMessage);
  if (wantsProfileChange && /\b(teaching\s*mode|mode|online\s*only|offline\s*only)\b/i.test(rawMessage)) {
    let newMode: "ONLINE" | "OFFLINE" | "EITHER" | null = null;
    if (/\bonline\b/i.test(rawMessage)) newMode = "ONLINE";
    else if (/\boffline\b/i.test(rawMessage)) newMode = "OFFLINE";
    else if (/\b(both|dono|either)\b/i.test(rawMessage)) newMode = "EITHER";

    if (newMode) {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, mode: newMode });
      return {
        reply: saved.updatedFields.includes("mode")
          ? `Teaching mode updated: *${newMode === "ONLINE" ? "Online (Pan-India) 💻" : newMode === "OFFLINE" ? "Offline (Home Tuition) 🏠" : "Online + Offline 🌐"}* ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("mode") ? { ...data, mode: newMode } : data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋"],
      };
    }
    return {
      reply: "Which teaching mode would you like to choose?\n• *Online* (Pan-India)\n• *Offline* (Home Tuition)\n• *Both* (Online + Offline)",
      nextStep: "UPDATE_MODE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Online 💻", "Offline 🏠", "Both 🌐", "Cancel"],
    };
  }
  if (wantsProfileChange && /\b(location|area|locality|jagah|address|city)\b/i.test(rawMessage)) {
    const tail = rawMessage.match(/\b(?:location|area|locality|jagah|address|city)\s+(?:to\s+|as\s+|is\s+|hai\s+|ko\s+|in\s+|for\s+)?([a-zA-Z0-9][a-zA-Z0-9\s.,\/-]{1,60})$/i);
    const loc = tail
      ? validateAndCleanLocality(tail[1].trim(), (data.city as string) || undefined, true)
      : null;
    if (loc?.isValid && !sameLocality(loc.area, loc.city)) {
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        area: loc.area,
        city: loc.city,
      });
      return {
        reply: saved.updatedFields.includes("area")
          ? `Location saved: *${loc.area}, ${loc.city}* 📍\n\nYou'll now receive home tuition alerts within 5 km of this area.`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("area") ? { ...data, area: loc.area, city: loc.city } : data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋"],
      };
    }
    return {
      reply: `What is your new teaching locality? Share your area and city — for example: *Saket Delhi*, *Indirapuram*, *Bandra Mumbai*, or *HSR Layout*. 📍`,
      nextStep: "UPDATE_AREA",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: [...getLocalitiesQuickReplies((data.city as string) || undefined), "Cancel"],
    };
  }
  if (wantsProfileChange && /\bsubjects?\b/i.test(rawMessage)) {
    const tail = rawMessage.match(/\bsubjects?\s+(?:to\s+|as\s+|hai\s+|are\s+|for\s+)?(.+)$/i);
    const inlineRaw = tail ? tail[1].trim() : "";
    const existingCls = Array.isArray(data.classLevels) && data.classLevels.length > 0
      ? (data.classLevels as string[])
      : data.classLevel
        ? [String(data.classLevel)]
        : undefined;
    const strictInline = inlineRaw && !/^(update|change|badal|set|karo|krdo)$/i.test(inlineRaw)
      ? enforceStrictEducation({ rawMessage, classesInput: existingCls })
      : null;
    if (strictInline?.errorPrompt) {
      return {
        reply: strictInline.errorPrompt,
        nextStep: "UPDATE_SUBJECTS",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics (11-12)", "Cancel"],
      };
    }
    if (strictInline?.ok && strictInline.subjects.length > 0) {
      const wantsAdd = /\b(also|bhi|add|aur ek)\b/i.test(rawMessage);
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        subjects: strictInline.subjects,
        classLevels: strictInline.classLevels.length > 0 ? strictInline.classLevels : undefined,
        mergeSubjects: wantsAdd,
        mergeClasses: wantsAdd,
      });
      const outSubs = saved.finalSubjects?.length ? saved.finalSubjects : strictInline.subjects;
      const outCls = saved.finalClassLevels?.length ? saved.finalClassLevels : strictInline.classLevels;
      return {
        reply: saved.updatedFields.includes("subjects")
          ? `Subjects saved: *${outSubs.join(", ")}*${outCls.length > 0 ? ` (Classes: *${outCls.join(", ")}*)` : ""} ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("subjects")
          ? {
            ...data,
            subjects: outSubs,
            ...(outCls.length > 0 ? { classLevels: outCls, classLevel: outCls[0] } : {}),
          }
          : data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋"],
      };
    }
    return {
      reply: `Which subjects and classes do you teach? For example: *Class 1-8 All Subjects*, *Class 9-10 Maths & Science*, or *Class 11-12 Physics*.`,
      nextStep: "UPDATE_SUBJECTS",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics (11-12)", "Cancel"],
    };
  }
  const wantsNameUpdate =
    !isComplaintOrTrust &&
    (
      /\b(?:update|change|set|edit|correct|rename|badal)\s+(?:my\s+|profile\s+)?name\b/i.test(rawMessage) ||
      /\b(?:my\s+name|mera\s+naa?m)\s+(?:is|to|as|hai)\b/i.test(rawMessage)
    );
  if (wantsNameUpdate) {
    const tail = rawMessage.match(/\bname\s+(?:to\s+|as\s+|is\s+|hai\s+)?([a-zA-Z][a-zA-Z\s.'-]{1,48})$/i);
    if (tail && isValidName(tail[1]) && !/^(update|change|changed|new|naya|set|badal|name)$/i.test(tail[1].trim())) {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, name: tail[1].trim() });
      return {
        reply: saved.updatedFields.includes("name")
          ? `Name saved: *${tail[1].trim()}* ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("name") ? { ...data, name: tail[1].trim() } : data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋"],
      };
    }
    return {
      reply: "Please enter your updated full name:",
      nextStep: "UPDATE_NAME",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }
  if (wantsProfileChange && /\b(class|classes|grade)\b/i.test(rawMessage) && !/\b(lead|tuition|koi)\b/i.test(rawMessage)) {
    const strictBoth = enforceStrictEducation({ rawMessage });
    const parsedCls = extractStrictClasses(rawMessage);
    const classesExtracted = strictBoth.classLevels.length > 0
      ? strictBoth.classLevels
      : parsedCls.labels.length > 0
        ? parsedCls.labels
        : extractAllClassLevelsFromText(rawMessage);
    if (strictBoth.errorPrompt) {
      return {
        reply: strictBoth.errorPrompt,
        nextStep: "UPDATE_SUBJECTS",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics (11-12)", "Cancel"],
      };
    }
    if (classesExtracted.length === 0) {
      return {
        reply: `Which classes do you teach? For example: *Class 1–8*, *Class 9–10*, or *Class 11–12*.`,
        nextStep: "UPDATE_CLASS",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Class 1-8", "Class 9-10", "Class 11-12", "Cancel"],
      };
    }
    const wantsAddClass = /\b(also|bhi|add|aur ek|along with|as well)\b/i.test(rawMessage);
    const saved = await syncUserCredentialsInDb({
      phone: session.phone,
      classLevels: classesExtracted,
      subjects: strictBoth.ok && strictBoth.subjects.length > 0 ? strictBoth.subjects : undefined,
      mergeClasses: wantsAddClass,
      mergeSubjects: wantsAddClass,
    });
    const outCls = saved.finalClassLevels || classesExtracted;
    const outSubs = saved.finalSubjects || (strictBoth.ok ? strictBoth.subjects : undefined);
    const savedSubsOk = Boolean(outSubs && outSubs.length > 0 && saved.updatedFields.includes("subjects"));
    return {
      reply: saved.updatedFields.includes("class") || savedSubsOk
        ? savedSubsOk
          ? `Subjects & classes updated: *${outSubs!.join(", ")}* (Classes: *${outCls.join(", ")}*) ✅`
          : `Classes saved: *${outCls.join(", ")}* ✅`
        : profileNotSavedReply(),
      nextStep: "DONE",
      updatedData: saved.updatedFields.includes("class") || savedSubsOk
        ? {
            ...data,
            classLevel: outCls[0],
            classLevels: outCls,
            ...(savedSubsOk ? { subjects: outSubs } : {}),
          }
        : data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋"],
    };
  }

  // Casual shorthand locality update e.g. "Update chirag delhi", "Can u update it for nehru place"
  const casualAreaUpdate = rawMessage.trim().match(
    /^(?:(?:can\s+u|can\s+you|please|pls|kindly)\s+)?(?:update|change|set)(?:\s+it|\s+my)?(?:\s+to|\s+for|\s+in)?\s+([a-zA-Z0-9][a-zA-Z0-9\s.,\/-]{2,60})$/i
  );
  if (
    !isComplaintOrTrust &&
    casualAreaUpdate &&
    !/\b(subject|subjects|class|classes|name|email|gmail|password|mode|profile|leads?|plans?)\b/i.test(casualAreaUpdate[1])
  ) {
    const loc = validateAndCleanLocality(casualAreaUpdate[1].trim(), (data.city as string) || undefined, true);
    if (loc.isValid && !sameLocality(loc.area, loc.city)) {
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        area: loc.area,
        city: loc.city,
      });
      return {
        reply: saved.updatedFields.includes("area")
          ? `Location updated: *${loc.area}, ${loc.city}* 📍\n\nYou'll now receive home tuition alerts within 5 km of this area.`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("area") ? { ...data, area: loc.area, city: loc.city } : data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋"],
      };
    }
  }

  // Area / locality leads query
  const areaLeadQuery = rawMessage.match(
    /\b([A-Za-z][A-Za-z\s]{2,30}?(?:nagar|vihar|pur|ganj|bagh|colony|enclave|sector|sec|kunj|park|town|place|puri|marg|basti|gali|ext|extension|block|phase|market|chowk)?)\b.*?\b(koi\s*(class|tuition|lead|requirement|student)|lead\s*(?:hai|hain|mile|milega)|class\s*(hai|hain|milegi|available)|tuition\s*(hai|hain|available)|koi.*(?:hai|hain)|available\s*(?:hai|hain)?)\b/i
  ) || rawMessage.match(
    /\b(koi|kuch)\s+(class|lead|tuition|student|requirement)\s+(hai|hain|milegi|available)\s*(in\s+|mein\s+|ke\s+liye\s+)?([A-Za-z][A-Za-z\s]{2,25})\b/i
  );

  const hasAreaLeadIntent = areaLeadQuery ||
    /\b([A-Za-z][A-Za-z\s]{2,20})\s+(mein|me|mai|mai?n|ke\s+aas\s+paas|near|ke\s+pass|ke\s+paas|ke\s+liye)\s+(koi|kuch|class|lead|tuition|student|requirements?)\b/i.test(rawMessage) ||
    /\b(koi|kuch|any)\s+(class|lead|tuition|student|work|requirement)\s+(?:hai|hain|available|milegi?|milenge?)?\s*(?:in|mein|at|at)?\s*([A-Za-z][A-Za-z\s]{2,25})\b/i.test(rawMessage);

  if (hasAreaLeadIntent) {
    const locMatch =
      rawMessage.match(/\b([A-Za-z][A-Za-z\s]{2,30}?(?:nagar|vihar|pur|ganj|bagh|colony|enclave|sector|kunj|park|puri|extension|phase)?)\s*(mein|me|mai|ke|near|aas|pass|paas|liye)\b/i) ||
      rawMessage.match(/\b(in|at)\s+([A-Za-z][A-Za-z\s]{2,25})\b/i) ||
      rawMessage.match(/([A-Za-z][A-Za-z\s]{2,25}?)\s+(mein|me|mai)\b/i);
    const rawLoc = locMatch ? (locMatch[2] || locMatch[1]).trim() : rawMessage.replace(/\b(koi|class|hai|hain|mein|me|mai|lead|tuition|student|available|requirement)\b/gi, " ").trim();
    const loc = validateAndCleanLocality(rawLoc.trim(), (data.city as string) || "Delhi");
    if (loc.isValid && !sameLocality(loc.area, loc.city)) {
      const searchArea = loc.area;
      const searchCity = loc.city;
      const classForSearch = (Array.isArray(data.classLevels) && data.classLevels.length > 0)
        ? (data.classLevels as string[])
        : (data.classLevel as string | undefined);
      const subjectsForSearch = Array.isArray(data.subjects) ? (data.subjects as string[]) : [];
      const leads = await getChatbotMatchingLeads(searchArea, searchCity, classForSearch, subjectsForSearch);
      const displayName = (data.name as string) || "Teacher";
      if (leads.length > 0) {
        const leadLines = leads.slice(0, 3).map((l, i) =>
          `${i + 1}. *#${l.inquiryNumber}* — ${l.classLevel} (${l.subjects.join(", ")})\n   📍 ${l.area} | ${l.mode} | 💰 ${l.budget}`
        ).join("\n\n");
        return {
          reply: `Hello *${displayName}*! There ${leads.length === 1 ? "is" : "are"} *${leads.length} active requirement${leads.length > 1 ? "s" : ""}* near *${searchArea}*:\n\n${leadLines}\n\n🔓 Unlock here: https://apnatutorhub.com/tutor/leads`,
          nextStep: "DONE",
          updatedData: data,
          userType: "TUTOR",
          retries: 0,
          quickReplies: [
            `🔥 Unlock #${leads[0].inquiryNumber}`,
            "View All Leads 📋",
            "My Coins 🪙",
          ],
        };
      } else {
        return {
          reply: `There are no matching open inquiries in *${searchArea}* right at this moment — parents post fresh requests every 15–30 minutes. 🔔\n\nMake sure your area is saved so you get the first WhatsApp alert as soon as one arrives:\nhttps://apnatutorhub.com/tutor/leads`,
          nextStep: "DONE",
          updatedData: data,
          userType: "TUTOR",
          retries: 0,
          quickReplies: ["Update My Area 📍", "View All Leads 📋", "Online Leads 💻"],
        };
      }
    }
  }

  // Very short conversational confirmations -> show leads directly
  if (/^(kaise|kya|haan|theek|okay|ok|sure|batao|bta?o|aage|next|aur|ha|huh|hmm|chalega|ho\s*gaya)[\s?!.]*$/i.test(rawTrimmed)) {
    const area = (data.area as string) || "Delhi";
    const tutorClassLevels = (Array.isArray(data.classLevels) && data.classLevels.length > 0)
      ? (data.classLevels as string[])
      : (data.classLevel ? [data.classLevel as string] : undefined);
    const leads = await getChatbotMatchingLeads(area, (data.city as string) || "Delhi", tutorClassLevels, data.subjects as string[]);
    const leadsLink = "https://apnatutorhub.com/tutor/leads";
    if (leads.length > 0) {
      const top = leads[0];
      return {
        reply: `Here is an active requirement near *${area}*:\n\n*#${top.inquiryNumber}* — ${top.classLevel} (${top.subjects.join(", ")})\n📍 ${top.area} | ${top.mode} | 💰 ${top.budget}\n\n🔓 Unlock details here:\n${leadsLink}`,
        nextStep: "DONE",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: [`🔥 Unlock #${top.inquiryNumber}`, "View All Leads 📋", "My Coins 🪙"],
      };
    }
    return {
      reply: `You can check the latest open leads in your area right here:\n👉 ${leadsLink}\n\nFeel free to ask any question anytime! 😊`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Update Area 📍", "My Coins 🪙"],
    };
  }

  // Asking for students / inquiries in area
  if (/\b(student\s*(chahiye|do|bhejo|dedo|mil\s*sakta|hai|hain|milega)|koi\s*student|need\s*student|padhane\s*ke\s*liye\s*student)\b/i.test(rawMessage)) {
    const area = (data.area as string) || "Delhi";
    const tutorClassLevels = (Array.isArray(data.classLevels) && data.classLevels.length > 0)
      ? (data.classLevels as string[])
      : (data.classLevel ? [data.classLevel as string] : undefined);
    const leads = await getChatbotMatchingLeads(area, (data.city as string) || "Delhi", tutorClassLevels, data.subjects as string[]);
    const leadsLink = "https://apnatutorhub.com/tutor/leads";
    if (leads.length > 0) {
      const top = leads[0];
      return {
        reply: `We found a matching *${top.classLevel}* requirement near *${area}* — ${top.subjects.join(", ")} | ${top.mode} | ${top.budget}\n\n🔓 Unlock here: ${leadsLink}`,
        nextStep: "DONE",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: [`🔥 Unlock #${top.inquiryNumber}`, "View All 📋", "My Coins 🪙"],
      };
    }
    return {
      reply: `No new requirement is open in *${area}* at the moment — you'll get an instant alert when one arrives. You can browse all nearby leads here:\n👉 ${leadsLink}`,
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Online Leads 💻", "Update Area 📍"],
    };
  }

  const doneLoose = await tryLooseTutorIntent(session, rawMessage, data, "DONE", "done");
  if (doneLoose) return doneLoose;

  if (looksLikeUnexpectedNoise(rawMessage)) {
    return {
      reply: looseIntentClarifyReply("CONFUSED", true),
      nextStep: "DONE",
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "Help 📞"],
    };
  }

  return null;
}

async function tryDeterministicPreAiFallbacks(params: {
  session: BotSession;
  rawMessage: string;
  msg: string;
  step: string;
  data: Record<string, any>;
  userProfile: UserProfileContext | null | undefined;
  chatHistory: ProcessMessageOptions["chatHistory"];
}): Promise<EngineResult | null> {
  const { session, rawMessage, msg, step, data, userProfile, chatHistory } = params;

  const personaHandled = resolvePersonaPrecheck({
    rawMessage,
    step,
    userType: session.userType ?? null,
    data,
    chatHistory,
    isRegistered: Boolean(userProfile?.isRegistered || data._registered),
    phone: session.phone,
  });
  if (personaHandled) {
    return {
      reply: personaHandled.reply,
      nextStep: personaHandled.nextStep,
      updatedData: {
        ...data,
        ...(personaHandled.updatedData || {}),
        lang: "en",
      },
      userType: personaHandled.userType ?? session.userType ?? null,
      retries: 0,
      quickReplies: personaHandled.quickReplies,
    };
  }

  // Conversational payment proof without 12-digit UTR
  const paymentPromptRecently =
    chatHistory?.some(
      (m) =>
        m.direction === "OUTBOUND" &&
        /upi-qr\.png|scan to pay|payment steps|kotakbank|utr number/i.test(m.body || "")
    ) ?? false;

  if (
    /\butr\b/i.test(rawMessage) ||
    /\b(?:screenshot|ss|receipt|payment\s*proof)\b.{0,20}\b(?:bhej|send|diya|kar|h|shared|sent)\b/i.test(rawMessage) ||
    (/^\s*(?:done|paid|payment\s*done|pay\s*done)\b/i.test(rawMessage.trim()) && paymentPromptRecently)
  ) {
    const justSaidDone = /^\s*(?:done|paid|payment\s*done|pay\s*done)\b/i.test(rawMessage.trim());
    return {
      reply: justSaidDone
        ? `Great! 🎉 If you paid online via Razorpay, your plan is already active — please check your dashboard:\n👉 https://apnatutorhub.com/tutor/leads\n\nIf you transferred via offline UPI, please reply with your 12-digit *UTR number* so our coordinator can verify and activate it.`
        : `Payment details noted! ✅ If you paid via Razorpay online gateway, your plan is already active at: https://apnatutorhub.com/tutor/leads. For any assistance, contact WhatsApp support: +91 93191 93109.`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: {
        ...data,
        lastBotAsk: "await-utr",
        sameAskCount: 0,
        paymentProofReceivedAt: new Date().toISOString(),
      },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Dashboard 🎓", "Talk to Support 📞"],
    };
  }

  // Conversational Tutor Document Submission phrases
  if (
    /\b(?:bhej\s*diya|bhej\s*diye|documents?\s*sent|documents?\s*attached|ye\s*lo|upload\s*kar\s*diya)\b/i.test(rawMessage)
  ) {
    return {
      reply: `✅ *Documents Received for Verification!*\n\nYour documents have been received by our verification desk. 📋\n\nOur team will review them within 2–4 working hours and activate the *Verified Tutor Badge ✅* on your profile. You'll receive a confirmation here on WhatsApp once approved.\n\nMeanwhile, you can browse fresh tuition requirements and connect with parents:\n👉 https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, kycDocsSubmittedOnWa: true },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Check Profile 👤", "Buy Coins 🪙"],
    };
  }

  // KYC & Profile Verification Handler
  if (
    /(?:kyc|verif|document|aadhaar|pan\s*card|identity|id\s*proof|marksheet|degree|profile\s*complet|complet.*profile|verify\s*profile)/i.test(rawMessage)
  ) {
    return {
      reply: `🎓 *ApnaTutorHub — Tutor Profile & KYC Verification Guide*\n\nHello! 🙏 You can complete your KYC verification in 2 easy ways to earn your *Verified Teacher Badge ✅*:\n\n━━━━━━━━━━━━━━━━━━━\n*Option 1: Upload Directly on Website (Fastest)*\n━━━━━━━━━━━━━━━━━━━\nOpen Step 6 (KYC Badge) on your profile page and upload your documents:\n👉 *Upload Portal:* https://apnatutorhub.com/tutor/profile\n\n*Required Documents:*\n1️⃣ Government ID (Aadhaar Front & Back / PAN Card)\n2️⃣ Address Proof (Aadhaar / Utility Bill / Bank Passbook)\n3️⃣ Clear Live Selfie (holding your ID)\n\n━━━━━━━━━━━━━━━━━━━\n*Option 2: Send Directly in This WhatsApp Chat*\n━━━━━━━━━━━━━━━━━━━\nYou can also send photos right here:\n📄 1. Aadhaar Card (Both Sides) or PAN Card\n🎓 2. Highest Degree / Marksheet\n🤳 3. A clear Selfie\n\n*⏱️ Review Time:* Our team verifies submitted documents within 2–4 working hours.\n\n*⭐ Verified Tutor Benefits:*\n✅ 'Verified Teacher' green badge on profile\n✅ 5x higher trust & faster parent callbacks\n✅ Priority lead matching\n\n💡 *Note:* KYC is optional to start — you can browse and unlock tuition leads right away!\n👉 *All Leads:* https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, askedKyc: true },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Open Profile 👤", "Main Menu 🏠"],
    };
  }

  const offScript = tryTutorOffScriptReply(session, rawMessage, data, step);
  if (offScript) return offScript;

  // Enquiry Follow-up
  const isEnquiryFollowUp =
    /(?:ye|yeh|to|toh)?\s*(?:kay|kya|kyu)\s*(?:hai\s*)?(?:fir|phir)\b|\b(?:ye|yeh)\s*(?:kay|kya)\s*hai\b|\bwhat\s*is\s*this\b|\biska\s*kya\s*(?:matlab|karu|karein)\b|\bkya\s*hai\s*ye\b|\bkyu\s*bheja\b/i.test(rawMessage);
  if (isEnquiryFollowUp) {
    return {
      reply: `This is an initial proposed tuition requirement posted by the student's parents. 📋\n\nAfter the demo class, you can directly discuss and finalize standard fees with the parent (for example, Class 1–8: ₹6,000–₹7,500/month, Class 9–12: ₹700–₹900/hour). 🎯\n\nWould you like to connect with this parent?`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Unlock Lead 📋", "Other Leads 🔍", "Talk to Coordinator 📞"],
    };
  }

  // Fees Low / Budget Complaint
  if (
    /\b(?:fees?|budget)\s*(?:is\s*)?(?:less|low|kam|chhota|bhot\s*kam|bahut\s*kam|zyada\s*kam|too\s*low)\b|\b(?:less|low|kam)\s*(?:fees?|budget)\b|\b(?:itne\s*me\s*kaise|fees\s*badhao)\b/i.test(rawMessage)
  ) {
    return {
      reply: `Thank you for sharing! Parents often enter a starting estimate when posting an inquiry, and you can directly discuss and finalize your preferred fee after the trial demo class. 📚\n\nWhich classes or areas would you like to see fresh leads for?`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Online Tuitions 💻", "Update Area 📍"],
    };
  }

  // Parent Not Picking / Lead Dispute
  if (
    /(?:call\s*(?:nahi|ni)\s*(?:uth|lag|mil)|phone\s*(?:nahi|ni)\s*(?:uth|lag|mil)|switched\s*off|not\s*reachable|not\s*picking|invalid\s*number|tutor\s*(?:mil\s*gaya|final|ho\s*gaya)|parent\s*mana\s*kar)/i.test(rawMessage)
  ) {
    return {
      reply: `We completely understand — parents are sometimes busy during office hours:\n\n1️⃣ Please send them a polite WhatsApp message introducing yourself from ApnaTutorHub.\n2️⃣ If there is no response within 24 hours or the parent mentions they already hired someone, let our support desk know — we will verify and refund the coins back to your wallet! 🪙\n\n📞 Support Desk: +91 93191 93109 (9 AM – 7 PM)`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Talk to Support 📞", "View Other Leads 📋", "My Coins 🪙"],
    };
  }

  // No Leads Coming Query
  if (
    /(?:leads?\s*(?:nahi|ni)\s*(?:aayi|aa\s*rahi|aati|aate|mil\s*rahi)|leads?\s*kyu\s*nahi|koi\s*leads?\s*(?:nahi|ni)|leads?\s*kab\s*aayegi|not\s*getting\s*leads?)/i.test(rawMessage)
  ) {
    const tutorArea = (data.area as string) || "your area";
    return {
      reply: `As soon as a parent posts a matching requirement near *${tutorArea}*, you receive an instant WhatsApp alert! 🔔\n\nMeanwhile, you can browse and unlock all active inquiries directly on your dashboard:\n👉 https://apnatutorhub.com/tutor/leads\n\nReply *MY PROFILE* anytime to check or update your location and subjects.`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "Update Area 📍"],
    };
  }

  if (session.userType === "TUTOR" || step.startsWith("T_")) {
    const socialLoose = await tryLooseTutorIntent(session, rawMessage, data, step, "social");
    if (socialLoose) return socialLoose;
  }

  // Severe legal / police threats
  if (/\b(police|court|consumer\s*court|consumer\s*forum|fir\b|cyber\s*crime|cyber\s*cell|legal\s*notice)\b/i.test(rawMessage)) {
    const cleanPhone = session.phone.replace(/^91/, "");
    return {
      reply: `Your concern has been escalated on priority for WhatsApp +91-${cleanPhone}. Our senior coordinator will review and assist you right away.\n\n📞 Direct WhatsApp Support: +91 93191 93109\n⏰ Hours: 9:00 AM – 7:00 PM (Mon–Sat)\n\nPlease share your specific issue or lead ID here and we'll resolve it promptly.`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["Talk to Support 📞", "View Leads 📋", "MENU 🏠"],
    };
  }

  // Free Leads / Bargaining
  if (
    /(?:bina\s*(?:paise|reg|payment)|free\s*(?:lead|enquiry|tuition|demo)|pehle\s*demo\s*(?:fir|phir|baad)|payment\s*baad|ek\s*(?:lead|enquiry)\s*(?:free|dedo))/i.test(rawMessage)
  ) {
    return {
      reply: `We understand your concern! Verified parent phone numbers and home addresses are gated behind a membership so only committed teachers connect with families. 🙏\n\nYou can start with our ₹1,257 Commission Based Plan (6 months validity, 5 verified leads).\n\n👉 View Plans: https://apnatutorhub.com/tutor/plans\n👉 Browse Leads: https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan 🤝", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  // Login/Dashboard access issues (excluding MANUAL RESET which runs pre-AI)
  const isLoginOrDashboardIssue =
    /^(?:not\s*login|login\s*nhi|cant\s*login|can't\s*login)$/i.test(rawMessage.trim()) ||
    /\b(?:id|i['’]?d|dashboard|account|login|portal|site|website)\b.*?\b(?:open|khul|login)\s*(?:nahi|ni|not)\s*(?:ho\s*raha|hona|rahi|raha\s*hai|h)?\b/i.test(rawMessage) ||
    /\b(?:open|khul|chal)\s*(?:nahi|ni)\s*(?:ho\s*raha|rahi|raha\s*hai|raha)\b.*?\b(?:id|i['’]?d|dashboard|account|login|portal)\b/i.test(rawMessage) ||
    /\b(?:login|sign\s*in)\s*(?:problem|issue|error|nahi\s*ho\s*raha|failed|atak|musibat|nhi\s*ho\s*rahi)\b/i.test(rawMessage);

  if (isLoginOrDashboardIssue) {
    const cleanPhone = session.phone.replace(/\D/g, "");
    const last10 = cleanPhone.slice(-10);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: session.phone },
          { phone: cleanPhone },
          { phone: `+91${last10}` },
          { phone: `91${last10}` },
          { phone: last10 },
        ],
      },
      select: { id: true, email: true, name: true },
    }).catch(() => null);

    const email = existingUser?.email || (data.email as string) || `user${last10}@apnatutorhub.com`;
    const name = existingUser?.name || (data.name as string) || "Teacher";
    return {
      reply:
        `Hello ${name}! If you're having trouble logging in or opening the dashboard, please check these steps: 📲\n\n` +
        `📧 *Registered Login:* ${email}\n` +
        `📱 *Mobile:* +91 ${last10}\n\n` +
        `1️⃣ *Direct Login Link:*\n👉 https://apnatutorhub.com/login\n\n` +
        `2️⃣ If you forgot your password, tap *MANUAL RESET* below — I'll set a temporary password (*Tutor@123*) immediately.\n\n` +
        `3️⃣ If the page looks stuck, try refreshing or opening it in Chrome.\n\n` +
        `Need help? WhatsApp support: +91 93191 93109`,
      nextStep: step === "WELCOME" ? "DONE" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["MANUAL RESET", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  // Password Query
  if (
    /(?:mera|apna|account|login)?\s*(?:ka\s*)?password\s*(?:kya\s*hai|batao|bhool\s*gaya|bataiye|dikhao|reset)|what\s*(?:is\s*)?(?:my\s*)?password|forgot\s*password|reset\s*password/i.test(
      rawMessage.trim()
    )
  ) {
    const email = (data.email as string) || "N/A";
    return {
      reply: `For your security, passwords are stored encrypted in our system. 🔐\n\n👤 *Your Login Details:*\n📱 Mobile: +91-${session.phone}\n📧 Email: ${email}\n\nTo set a new password right here, type:\n*UPDATE PASSWORD <new password>*\n(Example: UPDATE PASSWORD MyPass@123)`,
      nextStep: step === "WELCOME" ? "DONE" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Update Password", "My Profile 👤", "View Leads 📋"],
    };
  }

  // Interested reply matching a recent outbound lead alert
  const isRegistrationStep =
    step.startsWith("T_") ||
    step.startsWith("P_") ||
    step === "WELCOME";
  const isInterestedLeadReply =
    /^(?:interested|yes|i\s*am\s*interested|i'm\s*interested|agree|pl\s*arrange|arrange|mujhe\s*chahiye|ye\s*wali\s*(?:tution|tuition)|interested\s*in\s*this|yes\s*agree)\b/i.test(rawMessage.trim());

  if (!isRegistrationStep && isInterestedLeadReply && chatHistory && chatHistory.length > 0) {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const m = chatHistory[i];
      if (m.direction === "OUTBOUND" && m.body) {
        const histMatch =
          m.body.match(/(?:requirement|lead|inquiry|enquiry)\s*#?(\d{4,7})\b/i) ||
          m.body.match(/#(\d{4,7})\b/);
        if (histMatch) {
          const result = await formatSingleLeadInquiry(parseInt(histMatch[1], 10), session.phone);
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
    }
  }

  // Legacy High-Intent Scenarios (fallback when AI is off or unavailable)
  if (
    /(?:\b(?:parent|parents|student|party)\b.*\b(?:contact|number|phone|mobile|no)\b|\b(?:contact|number|phone|mobile|no)\b.*\b(?:parent|parents|student|party)\b)/i.test(rawMessage) ||
    /contact\s*no\s*(?:do|bhejo|dedo|de\s*do)/i.test(rawMessage)
  ) {
    return {
      reply: `To view the parent's direct verified mobile number and home address, please unlock the inquiry on our website:\n\n1️⃣ Open: https://apnatutorhub.com/tutor/leads\n2️⃣ Select the lead and click *Unlock Lead*\n3️⃣ The parent's verified call & WhatsApp number will appear immediately!\n\nDirect Support WhatsApp: +91 93191 93109`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Commission Plan 🤝", "Help 📞"],
    };
  }

  if (
    step !== "T_AREA" &&
    /(?:\bonline\b.*?\b(?:class|classes|tuition|tutor|available|teach|padhana|student|work)\b|\b(?:class|classes|tuition|tutor|teach|padhana)\b.*?\bonline\b|^online\s*(?:only)?$)/i.test(rawMessage) &&
    !/\b(plan|plans|subscription|membership|pricing|coins?|wallet|kharid|interested|facebook|requirement for)\b/i.test(rawMessage) &&
    data.lastBotAsk !== "online-generic"
  ) {
    return {
      reply: `Yes! We have Pan-India Online Tuition leads available (Google Meet / Zoom) — especially for Class 9–12 and international boards. 💻\n\n👉 *Browse Online Leads:*\nhttps://apnatutorhub.com/tutor/leads?mode=ONLINE\n\n👉 *Commission Based Plan (₹1,257):*\nhttps://apnatutorhub.com/tutor/plans\n\nWhich classes and subjects do you teach online?`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, mode: "ONLINE", area: data.area || "Online (Pan-India)", city: data.city || "Online", lastBotAsk: "online-generic", sameAskCount: 0 },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Online Leads 💻", "Commission Plan 🤝", "Update Subjects 📚"],
    };
  }

  if (
    /\b(?:distance\s*(?:is\s*)?(?:too\s*|so\s*|very\s*)?far|too\s*far|so\s*far|very\s*far|(?:bahut|bhot|bohot|bahot|kafi|zyada)\s*(?:door|dur)|(?:dur|door)\s*(?:hai|padega|h)|itni?\s*(?:door|dur)|location\s*is\s*far|not\s*in\s*delhi|mere\s*ghar\s*se\s*door|travel\s*nahi\s*kar\s*sakta)\b/i.test(rawMessage)
  ) {
    return {
      reply: `Understood! If that location is far from you, you have two easy options:\n\n1️⃣ *Filter Leads Within 5 km:*\nBrowse leads near your exact locality here:\nhttps://apnatutorhub.com/tutor/leads\n\n2️⃣ *Online Classes:*\nTeach students remotely from home with zero travel:\nhttps://apnatutorhub.com/tutor/leads?mode=ONLINE\n\nPlease share your exact locality and city (e.g. *Bandra Mumbai* or *Rohini Delhi*) so I can match closer inquiries! 📍`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Filter Leads 📍", "View Online Leads 💻", "Update Area 🏠"],
    };
  }

  if (
    /(?:mobile\s*app|application\s*kya\s*hai|name\s*of\s*your\s*mobile\s*app|app\s*download|play\s*store\s*app|download\s*app|app\s*ka\s*naam|konsa\s*app|kon\s*sa\s*app|kaha\s*se\s*download)/i.test(rawMessage)
  ) {
    return {
      reply: `ApnaTutorHub works directly in your mobile browser (and can be installed as an app in 1 tap without any Play Store download)! 📱\n\n*How to install on your phone:*\n1️⃣ Open https://apnatutorhub.com in Chrome\n2️⃣ Tap the 3-dots menu (⋮) in the top-right corner\n3️⃣ Select *"Install App"* or *"Add to Home Screen"*\n\nYou'll get instant access to live parent inquiries right from your home screen!`,
      nextStep: step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Open Website 🌐", "View Leads 📋", "Help 📞"],
    };
  }

  if (
    /(?:saari\s*toh\s*booked|sab\s*(?:hi\s*)?booked|all\s*leads?\s*(?:are\s*)?booked|booked\s*bata\s*raha|full\s*ho\s*gaya|lead\s*full\s*hai|koi\s*bhi\s*open\s*nahi|already\s*booked)/i.test(rawMessage)
  ) {
    return {
      reply: `To protect lead quality and give tutors a 90%+ selection chance, at most 3 verified tutors can unlock any inquiry. 🎯\n\nIf a lead says "Booked", all 3 slots are filled.\n\n👉 *Browse Fresh & Open Leads:*\nhttps://apnatutorhub.com/tutor/leads?status=ACTIVE\n\nNew parent inquiries arrive every 15–30 minutes, so keep an eye on your alerts!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["Fresh Leads ⚡", "Recharge Wallet 💳", "Coordinator Support 📞"],
    };
  }

  if (
    /(?:demo\s*class\s*kaise|demo\s*ka\s*rule|demo\s*ke\s*baad|trial\s*class|how\s*does\s*demo\s*work|first\s*class\s*free|pehle\s*demo)/i.test(rawMessage)
  ) {
    return {
      reply: `*Demo Class Process & Rules:* 🎓\n\n1️⃣ *For Tutors:*\nAfter unlocking a lead, call the parent to schedule a 30–45 minute trial demo class. Once the parent is satisfied, you finalize monthly or hourly fees directly.\n\n2️⃣ *Platform Terms:*\nOn tuition confirmation, standard terms apply (50% of 1st month tuition fee + 5% recurring commission from the 2nd month).\n\n3️⃣ *For Parents:*\nEnjoy 1 free trial demo session with a verified tutor and continue only if you're completely happy.`,
      nextStep: step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Commission Plan 🤝", "Help 📞"],
    };
  }

  if (
    /(?:mere\s*pa?ss\s*job|kuch\s*kaam\s*hai|job\s*chahiye|teaching\s*job|salary\s*kitni\s*milegi|interview\s*kab\s*hoga)/i.test(rawMessage)
  ) {
    return {
      reply: `ApnaTutorHub connects tutors directly with verified home and online tuition inquiries across India! 📚\n\nYou can browse matching requirements and connect with parents directly:\n👉 https://apnatutorhub.com/tutor/leads\n\nWhich classes, subjects, and area do you teach?`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Commission Plan 🤝", "Help 📞"],
    };
  }

  if (
    /^(?:interested|yes\s*interested|i\s*am\s*interested|sir\s*i\s*am\s*interested|interested\s*sir|interested\s*for\s*home\s*tuition|interested\s*for\s*tuition|want\s*this\s*lead|i\s*want\s*this\s*lead|mujhe\s*chahiye|apply\s*karna\s*hai|apply\s*kaise\s*kare|kaise\s*apply\s*kare|i\s*want\s*to\s*teach|interested\s*in\s*this|intrested|im\s*interested)\b/i.test(rawMessage.trim()) &&
    !/#\d{4,7}/.test(rawMessage)
  ) {
    return {
      reply: `Awesome! 🎉 We have verified student tuition requirements waiting on your dashboard.\n\n👉 *View & Unlock Leads:*\nhttps://apnatutorhub.com/tutor/leads\n\n👉 *Commission Based Plan (₹1,257):*\nhttps://apnatutorhub.com/tutor/plans\n\nIf you saw a specific WhatsApp alert, reply with its *Lead ID* (for example: *#32042*)!`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View All Leads 📋", "Commission Plan 🤝", "Talk to Coordinator 📞"],
    };
  }

  if (/^(?:please\s*)?call(?:\s*me|\s*karo|\s*kro|\s*kariye)?\.?$|\bmujhe\s+call\b|\bcall\s+kar(?:o|na)\b/i.test(rawMessage.trim())) {
    return {
      reply: `Please reach our coordinator desk for a call:\n📞 WhatsApp Support: +91 93191 93109 | Helpline: 08062180653\nHours: 9:00 AM – 7:00 PM (Mon–Sat)\n\nIf you're a tutor, browse live inquiries here: https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "WELCOME" : step,
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["View Leads 📋", "I'm a Tutor", "I'm a Parent"],
    };
  }

  if (/\bonline\s+le\s+s(?:k|ak)/i.test(rawMessage) || /\b(online|offline)\s+(?:le|kar)\s+(?:sakti|sakta|skti|skta)\b/i.test(rawMessage)) {
    const cls = normalizeCanonicalClassLevel(rawMessage);
    const wantsOnline = /\bonline\b/i.test(rawMessage);
    return {
      reply: wantsOnline
        ? `Online batches are strictly for *Class 9 and above*. Classes 1–8 are offline home tuition only.\n\nWhich classes and subjects do you teach? 📚`
        : `Classes 1–8 are offline home tuition only. Classes 9–12 can be online or home tuition.\n\nWhich classes and subjects do you teach? 📚`,
      nextStep: "T_CONVO",
      updatedData: { ...data, mode: wantsOnline ? "ONLINE" : "OFFLINE", ...(cls ? { classLevel: cls } : {}) },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["All Subjects, Class 1-8", "Maths & Science, Class 9-10", "Physics, Class 11-12"],
    };
  }

  if (/\b(samajh|samjh)\s*nahi\b|\bbaat\s*samajh\b|\bkya\s*bol\s*rahe\b|\bconfus/i.test(rawMessage)) {
    if (session.userType === "TUTOR" || step === "DONE" || data._registered === true) {
      return {
        reply: `No worries at all! 😊 Let me keep it simple — what would you like to do next?\n\n• View matching tuition leads — type *LEADS*\n• Check or update your profile — type *MY PROFILE*\n• Speak with a coordinator — Call *08062180653* or WhatsApp *+91 93191 93109*`,
        nextStep: "DONE",
        updatedData: data,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["View Leads 📋", "My Profile 👤", "Talk to Support 📞"],
      };
    }
    const cls = normalizeCanonicalClassLevel(typeof data.classLevel === "string" ? data.classLevel : "");
    return {
      reply: cls
        ? `No worries! For *${cls}*, simply type your subjects and locality (for example: *Mathematics, Rohini*).`
        : `No worries! You can send everything in one simple message like:\n*Class 8, All Subjects, Rohini Delhi*\n\nOr reply *1* if you are a Tutor, or *2* if you are a Parent.`,
      nextStep: session.userType === "PARENT" ? "P_CONVO" : step === "WELCOME" ? "WELCOME" : "T_CONVO",
      updatedData: data,
      userType: session.userType,
      retries: 0,
      quickReplies: ["Class 1-8 All Subjects", "Class 9-10 Maths", "1 - Tutor", "2 - Parent"],
    };
  }

  if (/\b(agree to take|free\s+(?:one\s+)?class|registration fees?|charges?\s+(?:bhi\s+)?lage|koi charges)\b/i.test(rawMessage)) {
    return {
      reply: `Your tuition fees are finalized directly with the parent after the demo class. To unlock verified parent contacts, you can activate our ₹1,257 Commission Based Plan (5 leads, 6-month validity).\n\n👉 https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan 🤝", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  if (/\b(hindi|english)\s+medium\b/i.test(rawMessage) && !normalizeCanonicalClassLevel(rawMessage)) {
    const medium = /hindi/i.test(rawMessage) ? "Hindi" : "English";
    return {
      reply: `Got it, *${medium} medium* noted! Which classes do you teach — Classes 1–8 (All Subjects), Class 9–10, or Class 11–12? 📚`,
      nextStep: "T_CONVO",
      updatedData: { ...data, languagePref: `${medium} medium` },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Class 1-8 All Subjects", "Class 9-10", "Class 11-12"],
    };
  }

  if (/\b(not attending|attend(?:ing)? the class|class nahi le|class miss)\b/i.test(rawMessage)) {
    return {
      reply: `This is the ApnaTutorHub tuition matching desk — class attendance isn't managed here.\n\nAre you a Tutor looking for students, or a Parent looking for a tutor?\n1 — Tutor\n2 — Parent`,
      nextStep: "WELCOME",
      updatedData: { lang: "en" },
      userType: null,
      retries: 0,
      quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent"],
    };
  }

  if (/\b(location\s*(kya|kahan|hai)|kahan\s*(hai|padh|hai ye)|where\s+is\s+(the\s+)?(tuition|class|location)|kitni\s+door|konsi\s+jagah)\b/i.test(rawMessage)) {
    return {
      reply: `Leads show only the public *locality / sector / colony* until unlocked (exact house numbers are kept private).\n\nShare your locality — such as *Mukundpur*, *Rohini*, or *Sector 45* — to get home tuition leads within 5 km (or Online for Class 9–12).`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Update Area 📍", "View Leads 📋", "Online Classes"],
    };
  }

  if (/\b(payment|fees?)\b.*\b(pehle|before|class)\b|\bclass(?:es)?\s+milne\s+se\s+pehle\b/i.test(rawMessage)) {
    return {
      reply: `Tutors finalize monthly or hourly fees directly with the parent after the trial demo. Membership credits are used only to unlock verified parent inquiries.\n\n👉 https://apnatutorhub.com/tutor/wallet`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan 🤝", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  if (
    step !== "WELCOME" &&
    session.step !== "WELCOME" &&
    /^(both|dono|online and offline|offline and online)$/i.test(rawMessage.trim())
  ) {
    const cls = normalizeCanonicalClassLevel(typeof data.classLevel === "string" ? data.classLevel : "");
    const junior = cls ? isTill8thClass(cls) : false;
    return {
      reply: junior
        ? `For Classes 1–8, we offer *offline home tuition* only. Which locality and city are you based in? 📍`
        : `Great! Both *home tuition and online classes* work well for Class 9–12. Which exact classes and subjects do you teach?`,
      nextStep: session.userType === "PARENT" ? "P_CONVO" : "T_CONVO",
      updatedData: { ...data, mode: junior ? "OFFLINE" : "EITHER" },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: junior ? ["Class 1-5 All Subjects", "Class 6-8", "Sector 45"] : ["Class 9-10 Maths", "Class 11-12 Physics", "Home Tuition"],
    };
  }

  const asksCoinBalance =
    /how many coins|kitne coins|coin balance|wallet balance|coins? (?:hai|hain|bache|bach[ae]|left|remaining)|mere (?:paas|pass).{0,24}coins|coins?.{0,24}(?:paas|pass|hain|hai)|already have coins|i (?:already )?have coins|coins? (?:already|to hain)/i.test(rawMessage);
  const explicitPlanAsk =
    /\b(buy coins|recharge|purchase coins|coin pack|membership|pricing|buy plan|plans?|kharid)\b/i.test(rawMessage);

  if (asksCoinBalance && !explicitPlanAsk) {
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    return {
      reply: bal.found
        ? formatCoinBalanceMessage(bal.balance)
        : `No tutor wallet was found for this number. Please log in to check your coin balance:\nhttps://apnatutorhub.com/tutor/wallet`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: bal.balance > 0
        ? ["View All Leads 📋", "Open Wallet 💳", "Talk to Support 📞"]
        : ["View Plans 💰", "View All Leads 📋", "Talk to Support 📞"],
    };
  }

  const isIdentityOrEmailInput =
    step === "T_NAME" ||
    step === "T_EMAIL" ||
    step === "T_PASSWORD" ||
    step === "UPDATE_NAME" ||
    step === "UPDATE_EMAIL" ||
    step === "UPDATE_PASSWORD" ||
    step === "P_STUDENT_NAME" ||
    Boolean(extractStrictEmail(rawMessage)) ||
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/.test(rawMessage.trim());

  if (
    !isIdentityOrEmailInput &&
    /(?:(?:\b₹?\s*999\b)|999\s*(?:wala|plan|offer|ka))/i.test(rawMessage)
  ) {
    return {
      reply: formatOfferEnded999Message(),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan ₹1,257 🤝", "View Leads 📋", "Talk to Support 📞"],
    };
  }

  if (
    !isIdentityOrEmailInput &&
    (asksPlanPaymentOrQr(rawMessage) || /^\s*(?:pay|qr|payment)\s*$/i.test(rawMessage.trim()))
  ) {
    return {
      reply: formatPlanPaymentQrMessage("1257"),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan ₹1,257 🤝", "View Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  const isConversationalQuestionOrObjection =
    rawMessage.trim().split(/\s+/).length > 3 ||
    /\b(?:kyu|kyun|keun|kaun|kaise|kya|why|how|phir|har\s*mahine|bhi|nahi|not|condition|sahi|fake|fraud|authentic|loot|advance|pehle|baad)\b/i.test(rawMessage);

  if (!isIdentityOrEmailInput && !isConversationalQuestionOrObjection && asksZeroCommissionPlan(rawMessage)) {
    return {
      reply: formatGrowthPlanDetailMessage(),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, interestedPlanType: "COMMISSION_1257" },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Commission Plan ₹1,257 🤝", "View Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  if (!isIdentityOrEmailInput && !isConversationalQuestionOrObjection && asksCommissionPlan(rawMessage)) {
    return {
      reply: formatCommissionPlanDetailMessage(),
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, interestedPlanType: "COMMISSION_1257" },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Activate Plan ⚡", "View Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  if (!isIdentityOrEmailInput && /\b(plans?|coins?|packs?|pricing|membership|buy\s*coins|recharge|wallet)\b/i.test(msg)) {
    const bal = await getTutorCoinBalanceByPhone(session.phone);
    if (bal.found && bal.balance > 0 && !explicitPlanAsk) {
      return {
        reply: formatCoinBalanceMessage(bal.balance),
        nextStep: step === "WELCOME" ? "T_CONVO" : step,
        updatedData: data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["View All Leads 📋", "Open Wallet 💳", "Talk to Support 📞"],
      };
    }
    const planReply = bal.found && bal.balance > 0
      ? `You already have *${bal.balance} coins* in your wallet — you can unlock leads right away.\n\nIf you'd like to add more credits, here is our current plan:\n\n${formatCoinPlansMessage()}`
      : formatCoinPlansMessage();
    return {
      reply: planReply,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["Recharge Wallet 💳", "View All Leads 📋", "Talk to Support 📞"],
      ...paymentQrImage(),
    };
  }

  if (
    !isIdentityOrEmailInput &&
    (/^(?:show\s+leads?|view\s+leads?|leads?|my\s+leads?|matching\s+leads?|unlock\s+leads?|explore\s+leads?)$/i.test(msg.trim()) ||
      (/\b(?:show|view|matching|my|explore)\s+lead/i.test(msg) && !/\d{4,7}/.test(msg)))
  ) {
    const tutorClassLevels = (Array.isArray(data.classLevels) && data.classLevels.length > 0)
      ? (data.classLevels as string[])
      : (data.classLevel ? [data.classLevel as string] : undefined);
    const leads = await getChatbotMatchingLeads(
      (data.area as string) || "Delhi",
      (data.city as string) || "Delhi",
      tutorClassLevels,
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

  return null;
}

function applyWelcomeEarlyTutorDetect(
  session: BotSession,
  rawMessage: string,
  step: string,
  data: Record<string, any>
): string {
  const rawTrimmed = rawMessage.trim();
  const explicitParentSignal =
    /\b(parent|child|kid|son|daughter|need\s+a?\s*tutor|looking\s+for\s+a?\s*tutor|want\s+a?\s*tutor|home\s*tutor\s*(?:needed|required|chahiye))\b/i.test(rawTrimmed);
  if (explicitParentSignal) return step;

  const hasSubjectSignal = /\b(math|maths|mathematics|mathmatics|science|sci|physics|phy|chemistry|chem|biology|bio|account|accountancy|commerce|english|hindi|sanskrit|social|sst|computer|coding|python|all\s*subject|combo|history|geography|political|eco|economics|french|german|spanish|jee|neet)\b/i.test(rawTrimmed);
  const hasClassSignal = extractStrictClasses(rawTrimmed).labels.length > 0;
  const hasLocSignal = validateAndCleanLocality(rawTrimmed).isValid || /\b(nagar|vihar|sector|colony|enclave|pur\b|ganj\b|bagh\b|kunj|road|street|delhi|noida|gurgaon|gurugram|ghaziabad|faridabad|mumbai|bangalore|pune|kolkata|jaipur|lucknow|chandigarh|indore|bhopal|patna|agra|madurai|chennai)\b/i.test(rawTrimmed);
  const hasTutorSignal = /\b(tutor|teach|teaching|teacher|padhana|padhana\s*hai|classes|tuition|tution)\b/i.test(rawTrimmed);

  if (step === "WELCOME" && (hasSubjectSignal || hasClassSignal || hasLocSignal || hasTutorSignal)) {
    session.step = "T_CONVO";
    session.userType = "TUTOR";
    data.lang = "en";
    data.userType = "TUTOR";
    return "T_CONVO";
  }
  return step;
}

export type ProcessMessageOptions = {
  useAi?: boolean;
  chatHistory?: Array<{
    direction: string;
    body: string;
    createdAt?: Date;
    senderName?: string | null;
  }>;
};

export async function processMessage(
  session: BotSession,
  rawMessage: string,
  options?: ProcessMessageOptions
): Promise<EngineResult> {
  const msg = rawMessage.trim().toUpperCase();
  let step = session.step === "LANG_SELECT" ? "WELCOME" : session.step;
  let { data, retries } = session;
  data = { ...data, lang: "en" };
  const useAi = options?.useAi !== false;
  const userProfile = await getStoredUserProfile(session.phone);

  const phoneVariants = Array.from(
    new Set([
      session.phone,
      canonicalIndiaPhone(session.phone),
      indiaPhoneLast10(session.phone),
      session.phone.replace(/\D/g, ""),
    ].filter(Boolean) as string[])
  );

  const chatHistory = options?.chatHistory ?? (
    await prisma.whatsappChatMessage.findMany({
      where: { phone: { in: phoneVariants } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { direction: true, body: true, createdAt: true, senderName: true },
    }).then((msgs) => msgs.reverse()).catch(() => [])
  );

  // Scrub stale/legacy dirty session fields first so invalid emails, junk names, or invalid subjects never persist
  if (data.email && (!isStrictValidEmail(data.email) || isPlaceholderEmail(String(data.email)))) {
    delete data.email;
  }
  if (data.name && !isValidName(String(data.name))) {
    delete data.name;
  }
  if (typeof data.area === "string" && /^(delhi ncr|india|unknown|na|none)$/i.test(data.area.trim())) {
    delete data.area;
  }
  if (Array.isArray(data.subjects) && data.subjects.length > 0) {
    const scrubbedSessionEdu = sanitizeEducationForDb(data.subjects, data.classLevels || (data.classLevel ? [data.classLevel] : []));
    data.subjects = scrubbedSessionEdu.subjects;
    if (scrubbedSessionEdu.classLevels.length > 0) {
      data.classLevels = scrubbedSessionEdu.classLevels;
      data.classLevel = scrubbedSessionEdu.classLevels[0];
    }
  }

  // Sync state data from DB profile if registered so context is never lost
  if (userProfile?.isRegistered) {
    if (!data._registered) data._registered = true;
    if (step !== "DONE" && !MID_FLOW_STEPS.has(step)) {
      step = "DONE";
    }
    if (!data.name && userProfile.name && isValidName(userProfile.name)) data.name = userProfile.name;
    if (!data.email && userProfile.email && isStrictValidEmail(userProfile.email) && !isPlaceholderEmail(userProfile.email)) {
      data.email = userProfile.email;
    }
    if (!data.area && userProfile.area && !/^(delhi ncr|india|unknown|na|none)$/i.test(userProfile.area.trim())) {
      data.area = userProfile.area;
    }
    if (!data.city && userProfile.city) data.city = userProfile.city;
    if ((!data.subjects || (Array.isArray(data.subjects) && data.subjects.length === 0)) && userProfile.subjects?.length) {
      const sanitizedProfileEdu = sanitizeEducationForDb(userProfile.subjects, userProfile.classLevels || []);
      if (sanitizedProfileEdu.subjects.length > 0) {
        data.subjects = sanitizedProfileEdu.subjects;
      }
      if ((!data.classLevels || (Array.isArray(data.classLevels) && data.classLevels.length === 0)) && sanitizedProfileEdu.classLevels.length > 0) {
        data.classLevels = sanitizedProfileEdu.classLevels;
        if (!data.classLevel) data.classLevel = sanitizedProfileEdu.classLevels[0];
      }
    }
    if ((!data.classLevels || (Array.isArray(data.classLevels) && data.classLevels.length === 0)) && userProfile.classLevels?.length) {
      const parsedProfileCls = extractStrictClasses(userProfile.classLevels.join(", ")).labels;
      if (parsedProfileCls.length > 0) {
        data.classLevels = parsedProfileCls;
        if (!data.classLevel) data.classLevel = parsedProfileCls[0];
      }
    }
    if (!data.mode && userProfile.teachingMode) {
      data.mode = userProfile.teachingMode;
    }
  }

  // ── Ignore WhatsApp Business Automated Away / Greeting Messages & Bare Reactions ──
  const trimmedRaw = rawMessage.trim();
  if (
    /^(?:thank\s*you\s*for\s*contacting|welcome\s*to\s.*thank\s*you\s*for\s*reaching|a\s*warm\s*welcome\s*to\s|hello\s+great\s+to\s+see\s+you\s+and\s+welcome\s+to)\b/i.test(trimmedRaw) ||
    /please\s*let\s*us\s*know\s*how\s*we\s*can\s*help\s*you\b/i.test(trimmedRaw) ||
    /this\s+chat\s+isn[’']?t\s+monitored|chat\s+is\s+not\s+monitored|you\s+may\s+not\s+receive\s+a\s+response\s+here|reach\s+out\s+to\s+our\s+team\s+at|automated\s+(?:message|response|reply)/i.test(trimmedRaw) ||
    /^\[reaction(?::[^\]]*)?\]$/i.test(trimmedRaw)
  ) {
    console.log(`[whatsapp-bot] Ignored automated WhatsApp business greeting/reaction from ${session.phone}`);
    return {
      reply: "",
      nextStep: step,
      updatedData: data,
      userType: session.userType,
      retries: 0,
    };
  }

  if (/^\[unsupported\]$/i.test(trimmedRaw)) {
    return {
      reply: `I couldn't read that attachment or message format. Please reply in text (for example: *LEADS*, *PLANS*, *PROFILE*, or ask your question directly).`,
      nextStep: step,
      updatedData: data,
      userType: session.userType,
      retries: 0,
    };
  }

  // ── Unsubscribe / Stop Commands (AquaSMS chat log pattern) ─────────────────
  // Guard against broadcast alert footers "(Reply STOP to Unsubscribe)" quoted or forwarded by users
  const unquotedStopMessage = rawMessage
    .replace(/\(?reply\s+stop\s+to\s+unsubscribe\)?/gi, "")
    .replace(/reply\s+stop/gi, "")
    .trim();
  const hasPositiveEngagementIntent = /\b(interested|interest|agree|yes|haan|want|chahiye|arrange|demo|send|lead|leads|available|ready|kardo|karo)\b/i.test(unquotedStopMessage);
  const isExplicitUnsubscribe =
    !hasPositiveEngagementIntent &&
    (/\b(?:unsubscribe|unsub|stop\s*messages?|stop\s*messaging|dont\s*message|don't\s*message|mat\s*bhejo|msg\s*mat\s*karo)\b/i.test(unquotedStopMessage) ||
      /^stop$/i.test(unquotedStopMessage));

  if (isExplicitUnsubscribe) {
    return {
      reply: `You have been unsubscribed from automated WhatsApp notifications. 🙏\n\nIf you ever want to receive tuition alerts again, simply reply *START*.\n\nApnaTutorHub.com`,
      nextStep: "WELCOME",
      updatedData: { ...data, unsubscribed: true, lang: "en" },
      userType: session.userType,
      retries: 0,
      quickReplies: ["START", "MENU"],
    };
  }

  // ── 1. Global Structural Fast-Paths Only (before AI) ──────────────────────
  // Automated payment UTR (exact 12-digit NPCI UTR)
  const utrNumberMatch = rawMessage.match(/\b(\d{12})\b/);
  if (utrNumberMatch) {
    return {
      reply:
        `✅ Thank you! Your UTR *${utrNumberMatch[1]}* has been received. 🙏\n\n` +
        `Our team will verify the payment within 15–30 minutes and activate your plan. You'll receive a confirmation right here once activated.\n\n` +
        `Need help? WhatsApp Support: +91 93191 93109`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, lastBotAsk: "utr-received", utrNumber: utrNumberMatch[1], sameAskCount: 0 },
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Talk to Support 📞"],
    };
  }

  // ── Global commands — always honoured regardless of step ───────────────

  if (CANCEL_COMMANDS.includes(msg)) {
    return {
      reply: MSG.CANCEL,
      nextStep: "WELCOME",
      updatedData: { lang: "en" },
      userType: null,
      retries: 0,
      quickReplies: ["MENU", "1 - Tutor", "2 - Parent"],
    };
  }

  // Explicit WhatsApp media/document attachment upload
  if (/(?:\[photo\s*\/\s*document|\[document)/i.test(rawMessage)) {
    return {
      reply: `✅ *Documents Received for Verification!*\n\nYour documents have been received by our verification desk. 📋\n\nOur team will review them within 2–4 working hours and activate the *Verified Tutor Badge ✅* on your profile. You'll receive a confirmation here on WhatsApp once approved.\n\nMeanwhile, you can browse fresh tuition requirements and connect with parents:\n👉 https://apnatutorhub.com/tutor/leads`,
      nextStep: step === "WELCOME" ? "T_CONVO" : step,
      updatedData: { ...data, kycDocsSubmittedOnWa: true },
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "Check Profile 👤", "Buy Coins 🪙"],
    };
  }

  // Exact single-token Help / Support / Call commands
  if (HELP_COMMANDS.includes(msg) || /^(?:support|help|madad|coordinator|call)$/i.test(rawMessage.trim())) {
    return {
      reply: `📞 *ApnaTutorHub Support Desk*\n\nYour message has been received by our coordinator desk. A team member will reply to you shortly right here on WhatsApp. 🙏\n\nTo speak directly with support:\n📞 Helpline: 08062180653\n⏰ Hours: 9:00 AM – 7:00 PM (Mon–Sat)\n\nFeel free to write your specific question here anytime!`,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "MENU 🏠"],
    };
  }

  // If user previously unsubscribed, check if they are re-engaging with an active request
  if (data.unsubscribed === true) {
    const isReengaging =
      SPECIAL_COMMANDS.includes(msg) ||
      /\b(start|hi|hello|leads?|demo|interested|tuition|class|sec(?:tor)?|delhi|noida|gurugram|mumbai)\b/i.test(rawMessage) ||
      validateAndCleanLocality(rawMessage, undefined, true).isValid;

    if (isReengaging) {
      // Clear unsubscribed flag and proceed with normal processing!
      data = { ...data, unsubscribed: false };
    } else {
      return {
        reply: `You had previously unsubscribed from tuition alerts. Reply *START* anytime to resume notifications. 🙏`,
        nextStep: "WELCOME",
        updatedData: data,
        userType: session.userType,
        retries: 0,
        quickReplies: ["START", "MENU"],
      };
    }
  }

  // ── Profile View ──────────────────────────────────────────────────────────
  if (/^(my\s*profile|profile|mera profile|meri profile|profil)$/i.test(rawMessage.trim())) {
    const name = (data.name as string) || userProfile?.name || "Not set";
    const email = (data.email as string) || userProfile?.email || "Not set";
    const area = (data.area as string) || userProfile?.area || "Not set";
    const city = (data.city as string) || userProfile?.city || "";
    const subjects =
      Array.isArray(data.subjects) && data.subjects.length > 0
        ? (data.subjects as string[]).join(", ")
        : userProfile?.subjects?.length
          ? userProfile.subjects.join(", ")
          : "Not set";
    const classes =
      Array.isArray(data.classLevels) && data.classLevels.length > 0
        ? (data.classLevels as string[]).join(", ")
        : userProfile?.classLevels?.length
          ? userProfile.classLevels.join(", ")
          : (data.classLevel as string) || "Not set";
    const mode = (data.mode as string) || userProfile?.teachingMode || "Both (Online + Offline)";
    const location = city && !area.toLowerCase().includes(city.toLowerCase()) ? `${area}, ${city}` : area;
    const coinsStr = userProfile?.coins !== undefined && userProfile.coins !== null ? `\n🪙 Coins: *${userProfile.coins}*` : "";

    const profileText = `👤 *Your Profile:*\n\nName: ${name}\nEmail: ${email}\nLocation: ${location}\nMode: ${mode}\nClasses: ${classes}\nSubjects: ${subjects}\nPhone: +91-${session.phone}${coinsStr}\nPassword: Set (encrypted 🔒)\n\nTo update anything, type:\n• *UPDATE AREA <new locality>*\n• *UPDATE MODE Online / Offline*\n• *UPDATE SUBJECTS <subjects & classes>*\n• *UPDATE PASSWORD <new password>*`;
    return {
      reply: profileText,
      nextStep: step,
      updatedData: data,
      retries: 0,
      quickReplies: ["Update Area 📍", "Update Mode 💻", "Update Subjects 📚", "View Leads 📋"],
    };
  }

  // ── Manual Password Reset (explicit command only; loose login help in AI / fallback) ──
  const isExplicitManualReset =
    /^(?:manual\s*reset|reset\s*(?:my\s*)?password|temporary\s*password|temp\s*password|aap\s*(?:hi\s*)?(?:kardo\s*reset|reset\s*(?:kardo|karo|kar\s*do)|password\s*reset\s*kardo))$/i.test(rawMessage.trim());
  if (isExplicitManualReset) {
    const cleanPhone = session.phone.replace(/\D/g, "");
    const last10 = cleanPhone.slice(-10);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: session.phone },
          { phone: cleanPhone },
          { phone: `+91${last10}` },
          { phone: `91${last10}` },
          { phone: last10 },
        ],
      },
      select: { id: true, email: true, name: true },
    }).catch(() => null);

    const validLoginEmail = [existingUser?.email, data.email].find(
      (e) => typeof e === "string" && isStrictValidEmail(e) && !isPlaceholderEmail(e)
    ) as string | undefined;
    const tempPass = "Tutor@123";
    await syncUserCredentialsInDb({
      phone: session.phone,
      password: tempPass,
    });
    const nextData: Record<string, any> = { ...data, password: tempPass };
    if (validLoginEmail) {
      nextData.email = validLoginEmail;
    } else {
      delete nextData.email;
    }
    return {
      reply:
        `🔑 *Temporary Password Activated!*\n\n` +
        `Your new login credentials are ready:\n` +
        `🔐 Password: *${tempPass}*\n` +
        (validLoginEmail
          ? `📧 Login ID: *${validLoginEmail}* or *${last10}*\n\n`
          : `📱 Login ID: *${last10}* (add a personal email anytime with *Update email yourname@gmail.com*)\n\n`) +
        `👉 *Log in now:* https://apnatutorhub.com/login\n\n` +
        `After logging in, you can change your password anytime from Profile Settings. ✅`,
      nextStep: step === "WELCOME" ? "DONE" : step,
      updatedData: nextData,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "Talk to Support 📞"],
    };
  }

  // ── Combined Email & Password Update Command ──
  const emailAndPassMatch =
    rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)\s+and\s+password(?:\s+(.+))?$/i) ||
    rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?password\s+and\s+(?:email|gmail)(?:\s+(.+))?$/i);

  if (emailAndPassMatch) {
    const rest = (emailAndPassMatch[1] || "").trim();
    const rawEmailToken = rest.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/);

    if (rawEmailToken) {
      const emailCheck = validateStrictEmail(rawEmailToken[0]);
      if (!emailCheck.ok) {
        return {
          reply: `⚠️ ${emailCheck.reason}`,
          nextStep: "UPDATE_EMAIL",
          updatedData: data,
          retries: 0,
          quickReplies: ["Cancel"],
        };
      }
      const email = emailCheck.email;
      const remainingTokens = rest.replace(rawEmailToken[0], "").trim().split(/\s+/).filter(Boolean);
      const possiblePass = remainingTokens.length > 0 ? remainingTokens[0] : null;

      if (possiblePass && possiblePass.length >= 6) {
        await syncUserCredentialsInDb({
          phone: session.phone,
          email,
          password: possiblePass,
        });
        const updated = { ...data, email, password: possiblePass };
        return {
          reply: `Both Email (*${email}*) and Password (*${possiblePass}*) have been updated! 🔒\n\nYou can log in anytime here:\nhttps://apnatutorhub.com/login`,
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
          reply: `Email *${email}* has been updated! ✅\n\nNow please enter your new password (at least 6 characters): 🔑`,
          nextStep: "UPDATE_PASSWORD",
          updatedData: updated,
          retries: 0,
          quickReplies: ["12345678", "Cancel"],
        };
      }
    } else {
      return {
        reply: "Please enter your new email address (for example, yourname@gmail.com): 📧",
        nextStep: "UPDATE_EMAIL",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
  }

  // ── Single-shot Password Update ──
  const directPassMatch = rawMessage.trim().match(/^(?:update|change|set)\s*(?:my\s*)?password\s+(.+)$/i);
  if (directPassMatch) {
    const newPass = directPassMatch[1].trim();
    if (newPass.length < 6) {
      return {
        reply: "Password must be at least 6 characters long. Please enter a new password: 🔑",
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
    const userEmail = (data.email as string) || "your email";
    return {
      reply: `Password updated successfully: *${newPass}* 🔒\n\nYou can log in using this password with your email (*${userEmail}*) or mobile (+91-${session.phone}):\nhttps://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: updated,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?password$/i.test(rawMessage.trim())) {
    return {
      reply: "Please enter your new password (at least 6 characters): 🔑",
      nextStep: "UPDATE_PASSWORD",
      updatedData: data,
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }

  // ── Single-shot Email Update ──
  const directEmailMatch = rawMessage.trim().match(
    /^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})$/i
  );
  if (directEmailMatch) {
    const emailCheck = validateStrictEmail(directEmailMatch[1]);
    if (!emailCheck.ok) {
      return {
        reply: `⚠️ ${emailCheck.reason}`,
        nextStep: "UPDATE_EMAIL",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
    const newEmail = emailCheck.email;
    await syncUserCredentialsInDb({
      phone: session.phone,
      email: newEmail,
    });
    const updated = { ...data, email: newEmail };
    return {
      reply: `Email updated successfully: *${newEmail}* ✅\n\nYou can now log in to your portal with this email:\nhttps://apnatutorhub.com/login`,
      nextStep: "DONE",
      updatedData: updated,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?(?:email|gmail)$/i.test(rawMessage.trim())) {
    return {
      reply: "Please enter your new email address (for example, yourname@gmail.com): 📧",
      nextStep: "UPDATE_EMAIL",
      updatedData: data,
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }

  // ── Single-shot Name ──
  const directNameMatch = rawMessage.trim().match(
    /^(?:(?:please|pls|can you|could you)\s+)?(?:update|change|set)\s+(?:my\s+)?name\s+(?:to\s+|as\s+|is\s+)?(.+)$/i
  );
  if (directNameMatch) {
    const newName = directNameMatch[1].trim();
    if (isValidName(newName)) {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, name: newName });
      return {
        reply: saved.updatedFields.includes("name")
          ? `Name updated: *${newName}* ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("name") ? { ...data, name: newName } : data,
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }
  if (/^(?:update|change|set)\s*(?:my\s*)?name$/i.test(rawMessage.trim())) {
    return { reply: "Please enter your new full name:", nextStep: "UPDATE_NAME", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  // ── Single-shot Area / Location ──
  const directAreaMatch = rawMessage.trim().match(
    /^(?:(?:please|pls|can you|could you|kindly)\s+)?(?:update|change|set)\s+(?:my\s+)?(?:new\s+)?(?:area|location|locality)\s+(?:to\s+|as\s+|is\s+|hai\s+)?(.+)$/i
  );
  if (directAreaMatch) {
    const loc = validateAndCleanLocality(directAreaMatch[1].trim(), (data.city as string) || "Delhi");
    if (!loc.isValid) {
      return {
        reply: loc.errorPrompt || `📍 Location *"${directAreaMatch[1].trim()}"* could not be recognized.\n\nPlease provide your locality and city — for example: *Rohini Delhi*, *Sector 62 Noida*, or *Bandra Mumbai*.`,
        nextStep: "UPDATE_AREA",
        updatedData: data,
        retries: 0,
        quickReplies: ["Cancel"],
      };
    }
    const saved = await syncUserCredentialsInDb({
      phone: session.phone,
      area: loc.area,
      city: loc.city,
    });
    return {
      reply: saved.updatedFields.includes("area")
        ? `Location updated: *${loc.area}, ${loc.city}* 📍\n\nYou'll now receive home tuition alerts within 5 km of this area.`
        : profileNotSavedReply(),
      nextStep: "DONE",
      updatedData: saved.updatedFields.includes("area") ? { ...data, area: loc.area, city: loc.city } : data,
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }
  if (/^(?:update|change|set)\s*(?:my\s*)?area$/i.test(rawMessage.trim())) {
    return { reply: "Please type your new locality and city (for example, *Rohini, Delhi*):", nextStep: "UPDATE_AREA", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?subjects?$/i.test(rawMessage.trim())) {
    return { reply: "Which subjects and classes do you teach? (For example: *Class 1-8 All Subjects* or *Class 9-10 Maths & Science*):", nextStep: "UPDATE_SUBJECTS", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  if (/^(?:change|update|reset)\s+(?:my\s+)?password$/i.test(rawMessage.trim())) {
    return {
      reply: "Please enter your new password (at least 6 characters): 🔑",
      nextStep: "UPDATE_PASSWORD",
      updatedData: data,
      retries: 0,
      quickReplies: ["Cancel"],
    };
  }

  if (/^(?:update|change|set)\s*(?:my\s*)?phone$/i.test(rawMessage.trim())) {
    return { reply: "Please enter your new 10-digit phone number:", nextStep: "UPDATE_PHONE", updatedData: data, retries: 0, quickReplies: ["Cancel"] };
  }

  // ── Handle active update steps (never trap user on questions, other languages, or cancel) ──
  const clearUpdateRetry = (d: Record<string, any>) => {
    const next = { ...d };
    delete next._updateRetry;
    return next;
  };
  if (
    step.startsWith("UPDATE_") &&
    /^(?:cancel|back|wapas|nahi|no|skip|later|leave\s*it|rehne\s*do|baad\s*m(?:ein|e)|abhi\s*nahi|forget\s*it|stop|chh?odo|band\s*karo|नहीं|बाद\s*में|छोड़ो)$/iu.test(rawMessage.trim())
  ) {
    return {
      reply: "Update cancelled. Let me know if you'd like to check leads or your profile.",
      nextStep: "DONE",
      updatedData: clearUpdateRetry(data),
      retries: 0,
      quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
    };
  }

  const updateRetryCount = step.startsWith("UPDATE_") ? Number(data._updateRetry || 0) + 1 : 0;
  const looksLikeNonAnswerQuestionOrForeign = (txt: string, allowSpaceWords = false): boolean => {
    const t = txt.trim();
    if (!t) return true;
    if (/[?？]/.test(t)) return true;
    if (/[^\u0000-\u007F]/.test(t) && !/^[👋🙏🤝🙋💐👍👌✅💯👏]+$/u.test(t)) return true;
    if (
      /\b(fees?|plan|plans|lead|leads|coin|coins|wallet|refund|trust|scam|fake|fraud|help|support|call|how|what|why|when|where|which|who|kya|kaise|kitna|kitne|kahan|kab|batao|btaiye|samjhao|forgot)\b/i.test(t)
    ) {
      return true;
    }
    if (!allowSpaceWords && t.split(/\s+/).length >= 4 && !t.includes("@")) return true;
    return false;
  };

  if (step === "UPDATE_NAME") {
    const newName = rawMessage
      .trim()
      .replace(/^(?:my\s+name\s+is|i\s+am|i'm|i\s+m|myself|this\s+is|mera\s+naa?m(?:\s+hai)?)\s+/i, "")
      .replace(/\s+hai$/i, "")
      .trim();
    if (!isValidName(newName)) {
      if (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `Got it! I paused the name update so we can help you directly.\n\nReply *LEADS*, *PLANS*, *MY PROFILE*, or call Helpline *08062180653* (WhatsApp *+91 93191 93109*).`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply: "Please enter a valid full name (letters only, up to 4 words):",
          nextStep: "UPDATE_NAME",
          updatedData: { ...data, _updateRetry: updateRetryCount },
          retries: updateRetryCount,
          quickReplies: ["Cancel"],
        };
      }
    } else {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, name: newName });
      return {
        reply: saved.updatedFields.includes("name") ? `Name updated: *${newName}* ✅` : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("name") ? clearUpdateRetry({ ...data, name: newName }) : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_EMAIL") {
    const extracted = extractStrictEmail(rawMessage);
    const emailCheck = validateStrictEmail(extracted || rawMessage);
    if (!emailCheck.ok) {
      if (looksLikeNonAnswerQuestionOrForeign(rawMessage) || updateRetryCount >= 2) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `Got it — we paused the email update so I can help you directly.\n\nWhenever you'd like to update it later, type *UPDATE EMAIL yourname@gmail.com*. Reply *LEADS*, *PLANS*, or *HELP* anytime!`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply: `⚠️ ${emailCheck.reason}`,
          nextStep: "UPDATE_EMAIL",
          updatedData: { ...data, _updateRetry: updateRetryCount },
          retries: updateRetryCount,
          quickReplies: ["Cancel"],
        };
      }
    } else {
      const newEmail = emailCheck.email;
      const saved = await syncUserCredentialsInDb({ phone: session.phone, email: newEmail });
      return {
        reply: saved.updatedFields.includes("email")
          ? `Email updated: *${newEmail}* ✅\n\nYou can log in here: https://apnatutorhub.com/login`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("email") ? clearUpdateRetry({ ...data, email: newEmail }) : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_PASSWORD") {
    const newPass = rawMessage.trim();
    const isOffTopicPass = looksLikeNonAnswerQuestionOrForeign(newPass) || /\s/.test(newPass);
    if (isOffTopicPass) {
      if (useAi) {
        step = "DONE";
        data = clearUpdateRetry(data);
      } else {
        return {
          reply: `I paused the password update instead of saving that message as a password.\n\nType *RESET PASSWORD* anytime for a temporary password, or ask your question directly!`,
          nextStep: "DONE",
          updatedData: clearUpdateRetry(data),
          retries: 0,
          quickReplies: ["Reset Password 🔑", "View Leads 📋", "Help 📞"],
        };
      }
    } else if (newPass.length < 6) {
      if (updateRetryCount >= 2) {
        return {
          reply: `No worries! We cancelled the password update. Type *UPDATE PASSWORD* anytime when you're ready.`,
          nextStep: "DONE",
          updatedData: clearUpdateRetry(data),
          retries: 0,
          quickReplies: ["My Profile 👤", "View Leads 📋"],
        };
      }
      return {
        reply: "Password must be at least 6 characters long (no spaces). Please enter a new password or type *Cancel*: 🔑",
        nextStep: "UPDATE_PASSWORD",
        updatedData: { ...data, _updateRetry: updateRetryCount },
        retries: updateRetryCount,
        quickReplies: ["Cancel"],
      };
    } else {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, password: newPass });
      const userEmail = (data.email as string) || "your registered login";
      return {
        reply: saved.updatedFields.includes("password")
          ? `Password updated successfully! 🔒\n\nYou can now log in using *${userEmail}* and your new password:\nhttps://apnatutorhub.com/login`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("password") ? clearUpdateRetry({ ...data, password: newPass }) : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_SUBJECTS") {
    const wantsAdd = /\b(also|bhi|add|aur ek|along with|as well)\b/i.test(rawMessage);
    const existingCls = Array.isArray(data.classLevels) && data.classLevels.length > 0
      ? (data.classLevels as string[])
      : data.classLevel
        ? [String(data.classLevel)]
        : undefined;
    const strict = enforceStrictEducation({
      rawMessage: rawMessage.trim(),
      classesInput: existingCls,
    });
    if (strict.errorPrompt) {
      return {
        reply: strict.errorPrompt,
        nextStep: "UPDATE_SUBJECTS",
        updatedData: { ...data, _updateRetry: updateRetryCount },
        retries: updateRetryCount,
        quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics (11-12)", "Cancel"],
      };
    }
    if (!strict.ok || strict.subjects.length === 0) {
      if (strict.pendingBaseSubjects.length === 0 && (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2)) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `I paused the subject update so I can help with your question. Whenever you're ready, type *UPDATE SUBJECTS Class 9-10 Maths & Science* (or ask about *LEADS* / *PLANS*)!`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply:
            strict.pendingBaseSubjects.length > 0
              ? `Got *${strict.pendingBaseSubjects.join(", ")}*! Which classes do you teach? (For example: *Class 1–8*, *Class 9–10*, or *Class 11–12*)`
              : `Please share both your *classes and subjects* (for example: *Class 1-8 All Subjects*, *Class 9-10 Maths & Science*, or *Class 11-12 Chemistry*):`,
          nextStep: strict.pendingBaseSubjects.length > 0 ? "UPDATE_CLASS" : "UPDATE_SUBJECTS",
          updatedData:
            strict.pendingBaseSubjects.length > 0
              ? clearUpdateRetry({ ...data, pendingBaseSubjects: strict.pendingBaseSubjects })
              : { ...data, _updateRetry: updateRetryCount },
          retries: updateRetryCount,
          quickReplies: ["Class 1-8", "Class 9-10", "Class 11-12", "Cancel"],
        };
      }
    } else {
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        subjects: strict.subjects,
        classLevels: strict.classLevels.length > 0 ? strict.classLevels : undefined,
        mergeSubjects: wantsAdd,
        mergeClasses: wantsAdd,
      });
      const outSubs = saved.finalSubjects?.length ? saved.finalSubjects : strict.subjects;
      const outCls = saved.finalClassLevels?.length ? saved.finalClassLevels : strict.classLevels;
      return {
        reply: saved.updatedFields.includes("subjects")
          ? `Subjects updated: *${outSubs.join(", ")}*${outCls.length > 0 ? ` (Classes: *${outCls.join(", ")}*)` : ""} ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("subjects")
          ? clearUpdateRetry({
            ...data,
            subjects: outSubs,
            ...(outCls.length > 0 ? { classLevels: outCls, classLevel: outCls[0] } : {}),
          })
          : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_CLASS") {
    const parsedCls = extractStrictClasses(rawMessage.trim());
    const fallbackSingle = normalizeCanonicalClassLevel(rawMessage.trim());
    const targetClsList = parsedCls.labels.length > 0 ? parsedCls.labels : fallbackSingle ? [fallbackSingle] : [];
    if (targetClsList.length === 0) {
      if (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `I paused the class update so we can help with your query. Type *UPDATE CLASS Class 9-10* anytime, or browse *LEADS* / *PLANS*!`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply: "Which classes do you teach? For example: *Class 1–8*, *Class 9–10*, or *Class 11–12*.",
          nextStep: "UPDATE_CLASS",
          updatedData: { ...data, _updateRetry: updateRetryCount },
          retries: updateRetryCount,
          quickReplies: ["Class 1-8", "Class 9-10", "Class 11-12", "Cancel"],
        };
      }
    } else {
      const pendingSubs = Array.isArray(data.pendingBaseSubjects)
        ? (data.pendingBaseSubjects as string[])
        : Array.isArray(data.subjects)
          ? (data.subjects as string[])
          : [];
      const strictFromPending = enforceStrictEducation({
        subjectsInput: pendingSubs,
        classesInput: targetClsList,
      });
      if (strictFromPending.errorPrompt) {
        return {
          reply: strictFromPending.errorPrompt,
          nextStep: "UPDATE_SUBJECTS",
          updatedData: clearUpdateRetry({ ...data, classLevels: targetClsList, classLevel: targetClsList[0] }),
          retries: 0,
          quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics (11-12)", "Cancel"],
        };
      }
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        classLevels: strictFromPending.classLevels.length ? strictFromPending.classLevels : targetClsList,
        subjects: strictFromPending.subjects.length ? strictFromPending.subjects : undefined,
      });
      const outCls = saved.finalClassLevels?.length ? saved.finalClassLevels : targetClsList;
      const outSubs = saved.finalSubjects?.length ? saved.finalSubjects : undefined;
      return {
        reply: saved.updatedFields.includes("class")
          ? `Classes updated: *${outCls.join(", ")}*${outSubs ? `\nSubjects: *${outSubs.join(", ")}*` : ""} ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("class")
          ? clearUpdateRetry({
            ...data,
            classLevel: outCls[0],
            classLevels: outCls,
            ...(outSubs ? { subjects: outSubs } : {}),
            pendingBaseSubjects: undefined,
          })
          : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_AREA") {
    if (/\b(password|passwd|email)\b/i.test(rawMessage) && !/\b(nagar|vihar|sector|colony)\b/i.test(rawMessage)) {
      if (/\bpassword\b/i.test(rawMessage)) {
        return { reply: "Please enter your new password (at least 6 characters):", nextStep: "UPDATE_PASSWORD", updatedData: clearUpdateRetry(data), retries: 0, quickReplies: ["Cancel"] };
      }
      return { reply: "Please enter your new email address:", nextStep: "UPDATE_EMAIL", updatedData: clearUpdateRetry(data), retries: 0, quickReplies: ["Cancel"] };
    }
    if (/\bsubjects?\b/i.test(rawMessage)) {
      return { reply: "Which subjects and classes do you teach? For example: *Class 1-8 All Subjects* or *Class 9-10 Maths & Science*.", nextStep: "UPDATE_SUBJECTS", updatedData: clearUpdateRetry(data), retries: 0, quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Cancel"] };
    }
    if (/\bfees?\b|\bbudget\b|\bkam hai\b/i.test(rawMessage)) {
      return {
        reply: "Noted! You'll be matched with leads offering competitive rates (Class 1–8 monthly ₹6,000+ All Subjects, Class 9–12 hourly ₹700+ subject-specific).",
        nextStep: "DONE",
        updatedData: clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["View Leads 📋", "My Profile 👤"],
      };
    }
    const loc = validateAndCleanLocality(rawMessage.trim(), (data.city as string) || undefined, true);
    if (!loc.isValid || sameLocality(loc.area, loc.city)) {
      if (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `No problem — I paused the location update so I can help directly. Reply *UPDATE AREA Rohini Delhi* anytime, or ask about *LEADS* or *PLANS*!`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply: loc.errorPrompt || "Please enter a valid locality and city — for example: *Saket Delhi*, *Indirapuram*, *Bandra Mumbai*, or *HSR Layout Bangalore*. 📍",
          nextStep: "UPDATE_AREA",
          updatedData: { ...data, _updateRetry: updateRetryCount },
          userType: "TUTOR",
          retries: updateRetryCount,
          quickReplies: [...getLocalitiesQuickReplies((data.city as string) || undefined), "Cancel"],
        };
      }
    } else {
      const saved = await syncUserCredentialsInDb({
        phone: session.phone,
        area: loc.area,
        city: loc.city,
      });
      return {
        reply: saved.updatedFields.includes("area")
          ? `Location updated: *${loc.area}, ${loc.city}* 📍\n\nYou'll now receive matching home tuition leads within 5 km of this area.`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("area") ? clearUpdateRetry({ ...data, area: loc.area, city: loc.city }) : clearUpdateRetry(data),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_PHONE") {
    const phoneMatch = rawMessage.match(/([6-9]\d{9})/);
    if (!phoneMatch && (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2)) {
      if (useAi) {
        step = "DONE";
        data = clearUpdateRetry(data);
      } else {
        return {
          reply: `Cancelled phone update. Let me know how I can help — reply *LEADS*, *PLANS*, or *HELP*!`,
          nextStep: "DONE",
          updatedData: clearUpdateRetry(data),
          retries: 0,
          quickReplies: ["View Leads 📋", "Help 📞"],
        };
      }
    } else {
      const newPhone = phoneMatch ? phoneMatch[1] : rawMessage.trim();
      return {
        reply: `Phone update request noted: *${newPhone}* 📱\n\nFor security verification, please message us directly from your new WhatsApp number.`,
        nextStep: "DONE",
        updatedData: clearUpdateRetry({ ...data, phone: newPhone }),
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  if (step === "UPDATE_MODE") {
    let mode: "ONLINE" | "OFFLINE" | "EITHER" | null = null;
    if (/\bonline\b/i.test(rawMessage)) mode = "ONLINE";
    else if (/\boffline\b/i.test(rawMessage)) mode = "OFFLINE";
    else if (/\b(both|dono|either)\b/i.test(rawMessage)) mode = "EITHER";

    if (!mode) {
      if (looksLikeNonAnswerQuestionOrForeign(rawMessage, true) || updateRetryCount >= 2) {
        if (useAi) {
          step = "DONE";
          data = clearUpdateRetry(data);
        } else {
          return {
            reply: `I paused the teaching-mode update so I can help directly. Reply *UPDATE MODE Online* / *Offline* / *Both* anytime!`,
            nextStep: "DONE",
            updatedData: clearUpdateRetry(data),
            retries: 0,
            quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
          };
        }
      } else {
        return {
          reply: "Please choose a valid teaching mode:\n• *Online* (Pan-India)\n• *Offline* (Home Tuition)\n• *Both* (Online + Offline)",
          nextStep: "UPDATE_MODE",
          updatedData: { ...data, _updateRetry: updateRetryCount },
          retries: updateRetryCount,
          quickReplies: ["Online 💻", "Offline 🏠", "Both 🌐", "Cancel"],
        };
      }
    } else {
      const saved = await syncUserCredentialsInDb({ phone: session.phone, mode });
      return {
        reply: saved.updatedFields.includes("mode")
          ? `Teaching mode updated: *${mode === "ONLINE" ? "Online (Pan-India) 💻" : mode === "OFFLINE" ? "Offline (Home Tuition) 🏠" : "Online + Offline 🌐"}* ✅`
          : profileNotSavedReply(),
        nextStep: "DONE",
        updatedData: saved.updatedFields.includes("mode") ? clearUpdateRetry({ ...data, mode }) : clearUpdateRetry(data),
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }
  }

  // ── Single Inquiry / Lead Unlock Shortcut (explicit #LeadID or bare ID in DONE) ──
  const isRegistrationStep =
    step.startsWith("T_") ||
    step.startsWith("P_") ||
    step === "WELCOME";

  const leadMatchAnywhere =
    rawMessage.match(/(?:requirement|lead|inquiry|enquiry)\s*#?(\d{4,7})\b/i) ||
    rawMessage.match(/#(\d{4,7})\b/);

  const isBareNumberInDone =
    (step === "DONE" || data._registered === true) &&
    /^\d{4,7}$/.test(rawMessage.trim());

  let targetInquiryNum: number | null = null;
  if (leadMatchAnywhere) {
    targetInquiryNum = parseInt(leadMatchAnywhere[1], 10);
  } else if (isBareNumberInDone) {
    targetInquiryNum = parseInt(rawMessage.trim(), 10);
  }

  if (!isRegistrationStep && targetInquiryNum) {
    const result = await formatSingleLeadInquiry(targetInquiryNum, session.phone);
    return {
      reply: result.reply,
      nextStep: "DONE",
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: result.quickReplies,
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

      const classMatch = normalizeCanonicalClassLevel(rawMessage);
      if (classMatch) sClass = classMatch;
      else return {
        reply: `Class level is not clear. Please format as:\n*Class 8, All Subjects, Rohini, 98xxxxxx*`,
        nextStep: "DONE",
        updatedData: data,
        userType: session.userType,
        retries: 0,
      };

      let adminCity = "Delhi";
      const locClean = validateAndCleanLocality(lines.length >= 2 ? lines[lines.length - 1] : rawMessage);
      if (locClean.isValid) {
        sArea = locClean.area;
        adminCity = locClean.city;
      } else {
        const localityPattern = new RegExp(`\\b(${DELHI_NCR_LOCALITIES.join("|")})\\b`, "i");
        const areaMatch = rawMessage.match(localityPattern);
        if (areaMatch) {
          sArea = areaMatch[0].charAt(0).toUpperCase() + areaMatch[0].slice(1).toLowerCase();
        } else if (lines.length >= 2) {
          sArea = lines[lines.length - 1];
        }
        const publicArea = extractPublicLocality(sArea, adminCity) || extractPublicLocality(rawMessage, adminCity);
        if (!publicArea) {
          return {
            reply: `Locality is not clear (do not include a house number).\nFor example: *Class 8, All Subjects, Rohini* or *Bandra Mumbai*`,
            nextStep: "DONE",
            updatedData: data,
            userType: session.userType,
            retries: 0,
          };
        }
        sArea = publicArea;
      }
      const adminStrict = enforceStrictEducation({
        rawMessage,
        classesInput: sClass,
      });
      const adminSubjects =
        adminStrict.subjects.length > 0
          ? adminStrict.subjects
          : leadSubjectsForClass(sClass, validateAndAlignSubjects(rawMessage, sClass).subjects);
      if (adminSubjects.length === 0) {
        return {
          reply: adminStrict.errorPrompt || `Subject is not clear. For Classes 1–8 write *All Subjects*. For Classes 9–12 specify subjects like *Mathematics, Science* or *Physics, Chemistry*.`,
          nextStep: "DONE",
          updatedData: data,
          userType: session.userType,
          retries: 0,
        };
      }

      const adminMode = isTill8thClass(sClass) ? "OFFLINE" : /\bonline\b/i.test(rawMessage) ? "ONLINE" : "OFFLINE";
      const adminSealed = sealLeadEntry({ classLevel: sClass, subjects: adminSubjects, area: sArea, mode: adminMode });
      if (!adminSealed.ok) {
        return {
          reply: adminSealed.reason,
          nextStep: "DONE",
          updatedData: data,
          userType: session.userType,
          retries: 0,
        };
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
              subjects: adminSealed.subjects,
              classLevel: adminSealed.classLevel,
              mode: adminSealed.mode,
              area: adminSealed.area,
              city: adminCity,
              status: "ACTIVE",
              notes: `Direct Admin Entry: ${sName}, Phone: +91-${pNum}`,
            },
          }).catch(() => ({ inquiryNumber: nextInq }))
          : { inquiryNumber: nextInq };

        return {
          reply: `✅ *Lead Successfully Created via WhatsApp!*\n\n📋 Ref: *#ATH-${newLead.inquiryNumber}*\n👤 Student: *${sName}*\n📱 Phone: *+91 ${pNum}*\n🎓 Class: *${sClass}*\n📍 Area: *${sArea}, ${adminCity}*\n\nMatching tutors will now receive instant alerts.`,
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

  // Always enforce English-only session language (never route to LANG_SELECT)
  data.lang = "en";

  // Skip SPECIAL_COMMANDS intercept for active mid-flow steps where "hi"/"hello" is a wrong input,
  // UNLESS the session was idle (>15 mins), in which case "hi" is a returning greeting to start fresh.
  // CRITICAL: If the user is already registered (DONE state or _registered is true),
  // NEVER demote them to WELCOME with userType: null when they send Hi/Hello/Menu!
  const isRegisteredUser = step === "DONE" || data._registered === true;
  if (isRegisteredUser && SPECIAL_COMMANDS.includes(msg)) {
    // START / MENU / HI must also re-subscribe a previously unsubscribed tutor.
    const cleanData: Record<string, any> = { ...data, lang: "en" };
    if (cleanData.unsubscribed) delete cleanData.unsubscribed;
    const isParent = session.userType === "PARENT" || data.userType === "PARENT" || Boolean(data.studentName || data.parentProfileId);
    if (isParent) {
      return {
        reply: `Hello! 🙏 Your tuition inquiry is active with our coordinator team.\n\nWould you like an update on your trial demo schedule or tuition fee details?`,
        nextStep: "DONE",
        updatedData: cleanData,
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Trial Demo Status", "Fee Info", "Talk to Coordinator 📞"],
      };
    }
    const tutorName = (data.name as string) || "Teacher";
    return {
      reply: `Hello ${tutorName}! 👋 I'm Priya, your ApnaTutorHub coordinator.\n\nWould you like to check matching student leads, update your profile, or view plans?`,
      nextStep: "DONE",
      updatedData: cleanData,
      userType: "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "My Profile 👤", "View Plans 💰", "Help 📞"],
    };
  }

  const isMidFlow = !session.isIdle && MID_FLOW_STEPS.has(step);
  if (SPECIAL_COMMANDS.includes(msg) && !isMidFlow) {
    const cleanData = session.isIdle ? { lang: "en" } : { ...data, lang: "en" };
    if ("unsubscribed" in cleanData && cleanData.unsubscribed) {
      delete (cleanData as Record<string, any>).unsubscribed;
    }
    return {
      reply: MSG.WELCOME,
      nextStep: "WELCOME",
      updatedData: cleanData,
      userType: null,
      retries: 0,
      quickReplies: ["1 - Tutor", "2 - Parent"],
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
          const ai = await askGeminiChatbot(rawMessage, session, chatHistory, userProfile);
          if (ai && ai.reply) {
            const parentClasses = extractAllClassLevelsFromText(rawMessage);
            const parentLoc = validateAndCleanLocality(rawMessage, (data.city as string) || undefined, true);
            const hasNewReq = Boolean(
              parentClasses.length > 0 ||
              ai.extractedData?.classLevel ||
              (parentLoc.isValid && !sameLocality(parentLoc.area, parentLoc.city)) ||
              (Array.isArray(ai.extractedData?.subjects) && ai.extractedData.subjects.length > 0)
            );
            let updatedData = { ...data };
            if (hasNewReq) {
              const newCls = parentClasses[0] || (ai.extractedData?.classLevel as string) || (data.classLevel as string);
              const newArea = parentLoc.isValid ? parentLoc.area : (ai.extractedData?.area as string) || (data.area as string);
              const newSubsRaw = (ai.extractedData?.subjects as string[]) || (data.subjects as string[]) || [];
              const parentStrict = enforceStrictEducation({
                subjectsInput: newSubsRaw,
                classesInput: newCls ? [newCls] : undefined,
              });
              const finalParentSubs = parentStrict.subjects.length ? parentStrict.subjects : newSubsRaw;
              if (newCls && newArea && finalParentSubs.length > 0) {
                await registerParentFromWhatsapp(session.phone, {
                  studentName: (data.studentName as string) || (data.name as string) || "Student",
                  parentName: (data.parentName as string) || (data.name as string) || "Parent",
                  email: isStrictValidEmail(data.email) ? String(data.email) : undefined,
                  phone: session.phone,
                  city: (parentLoc.city as string) || (data.city as string) || "Delhi",
                  area: newArea,
                  classLevel: newCls,
                  subjects: finalParentSubs,
                });
                updatedData = { ...updatedData, classLevel: newCls, area: newArea, subjects: finalParentSubs };
              }
            }
            return {
              reply: ai.reply,
              nextStep: "DONE",
              updatedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Fee Info", "Trial Demo Status", "Talk to Coordinator 📞"],
              ...(asksPlanPaymentOrQr(rawMessage) || /^\s*(?:pay|qr|payment)\s*$/i.test(rawMessage.trim()) ? paymentQrImage() : {}),
            };
          }
        } catch (err) { }
      }
      return {
        reply: `Hello! 🙏 Your tuition inquiry is active with our coordinator team.\n\nFor any updates on tuition fees or your trial demo class schedule, please connect with our desk directly:\n\n📞 WhatsApp Coordinator: +91 93191 93109\nHours: 9:00 AM – 7:00 PM (Mon–Sat)`,
        nextStep: "DONE",
        updatedData: data,
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Fee Info", "Demo Status", "Talk to Coordinator 📞"],
      };
    }

    // Tutor in DONE state:
    const rawTrimmed = rawMessage.trim();

    // Direct single email or email statement in DONE state
    const rawEmailTokenMatch = rawTrimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/i);
    const isBareEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/i.test(rawTrimmed);
    const hasEmailUpdateWords = isBareEmail || /\b(?:email|mail|gmail|id|update|change|mera|meri|set|save|ye|yeh|hai)\b/i.test(rawTrimmed);

    if (rawEmailTokenMatch && hasEmailUpdateWords) {
      const emailCheck = validateStrictEmail(rawEmailTokenMatch[0]);
      if (!emailCheck.ok) {
        return {
          reply: `⚠️ ${emailCheck.reason}`,
          nextStep: "DONE",
          updatedData: data,
          userType: session.userType || "TUTOR",
          retries: 0,
          quickReplies: ["My Profile 👤", "Cancel"],
        };
      }
      const newEmail = emailCheck.email;
      await syncUserCredentialsInDb({
        phone: session.phone,
        email: newEmail,
        name: (data.name as string) || undefined,
        area: (data.area as string) || undefined,
        city: (data.city as string) || undefined,
        subjects: Array.isArray(data.subjects) && data.subjects.length > 0 ? (data.subjects as string[]) : undefined,
        classLevels: Array.isArray(data.classLevels) && data.classLevels.length > 0 ? (data.classLevels as string[]) : undefined,
        mode: data.mode as any,
      });
      return {
        reply: `Email updated successfully: *${newEmail}* ✅\n\nYou can log in to your portal using this email:\nhttps://apnatutorhub.com/login`,
        nextStep: "DONE",
        updatedData: { ...data, email: newEmail },
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }

    // Direct password pattern in DONE state (e.g. "Rohit@2927" or "Swami@172")
    if (/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s])\S{6,30}$/.test(rawTrimmed)) {
      await syncUserCredentialsInDb({
        phone: session.phone,
        password: rawTrimmed,
        email: isStrictValidEmail(data.email) ? String(data.email) : undefined,
        name: (data.name as string) || undefined,
        area: (data.area as string) || undefined,
        city: (data.city as string) || undefined,
        subjects: Array.isArray(data.subjects) && data.subjects.length > 0 ? (data.subjects as string[]) : undefined,
        classLevels: Array.isArray(data.classLevels) && data.classLevels.length > 0 ? (data.classLevels as string[]) : undefined,
        mode: data.mode as any,
      });
      const userEmail = (data.email as string) || "your email";
      return {
        reply: `Password updated successfully: *${rawTrimmed}* 🔒\n\nYou can now log in using this password with your email (*${userEmail}*) or mobile (+91-${session.phone}):\nhttps://apnatutorhub.com/login`,
        nextStep: "DONE",
        updatedData: { ...data, password: rawTrimmed },
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["My Profile 👤", "View Leads 📋", "MENU"],
      };
    }

    // Combine rawMessage with recent inbound fragments from chatHistory (last 2 mins)
    const recentInbounds = (chatHistory || [])
      .filter((m) => m.direction === "INBOUND" && m.body && (!m.createdAt || Date.now() - new Date(m.createdAt).getTime() < 120_000))
      .map((m) => m.body.trim());
    const combinedContext = Array.from(new Set([...recentInbounds, rawMessage.trim()])).join(" \n ");

    // Strict extraction (supports multi-clause replies like "Biology 10 - 12. 1-5 all sub.")
    const rawMsgClasses = extractStrictClasses(rawMessage).labels;
    const msgClasses = rawMsgClasses.length > 0 ? rawMsgClasses : extractStrictClasses(combinedContext).labels;
    const wantsExplicitAdditive = /\b(also|bhi|add|along with|as well|aur ek)\b/i.test(rawMessage);
    const wantsReplace = !wantsExplicitAdditive;
    const subjectWordsRe =
      /\b(math|maths|mathematics|mathmatics|science|sci|physics|phy|chemistry|chem|biology|bio|account|accountancy|commerce|english|hindi|sanskrit|social|sst|computer|coding|python|all\s*subject|combo|history|geography|political|eco|economics|french|german|spanish|jee|neet)\b/i;
    const hasSubjectWords = subjectWordsRe.test(combinedContext);
    const rawHasSubjectWords = subjectWordsRe.test(rawMessage);
    const hasNegatedSubject = /\b(don't|dont|do\s+not|nahi|not)\s+teach\b/i.test(rawMessage);
    const directSubStatement = rawMessage.trim().match(
      /^(?:(?:sir|mam|hello|hi)[,\s]+)?(?:my\s+subjects?\s+(?:are|hai)|i\s+teach\s+(?:only\s+)?|subjects?\s*:)\s*(.+)$/i
    );
    const directSubStrict = directSubStatement && !hasNegatedSubject
      ? enforceStrictEducation({
        rawMessage: directSubStatement[1].trim(),
        classesInput: msgClasses.length > 0 ? msgClasses : (Array.isArray(data.classLevels) && data.classLevels.length > 0 ? (data.classLevels as string[]) : data.classLevel ? [String(data.classLevel)] : undefined),
      })
      : null;

    const isMsgSensitive =
      /^(default|skip|password|pwd|pass|reply\s*default|leads|plans|coins|help|menu|stop|cancel)$/i.test(rawMessage.trim()) ||
      rawMessage.includes("@") ||
      /\b[a-zA-Z]+[0-9]{2,}\b/i.test(rawMessage);

    const validEmailInMsg = extractStrictEmail(rawMessage);
    const directLocStatement = rawMessage.trim().match(
      /^(?:(?:sir|mam|hello|hi)[,\s]+)?(?:(?:change|update|set|mera|meri)\s+)?(?:my\s+(?:new\s+)?(?:location|area|locality|city)\s*(?:is|to|hai|kardo|karo)?|i\s+(?:live|stay|am\s+staying|am\s+living)\s+(?:in|at)|i\s+am\s+from|currently\s+(?:in|at)|location\s*[:=-])\s*(.+)$/i
    );
    const directLocRes = !isMsgSensitive && directLocStatement
      ? validateAndCleanLocality(directLocStatement[1].trim(), (data.city as string) || undefined, true)
      : null;

    if (directLocStatement && (!directLocRes || !directLocRes.isValid)) {
      return {
        reply: `📍 Location *"${directLocStatement[1].trim()}"* could not be verified.\n\nPlease enter your locality and city — for example:\n• *Rohini, Delhi*\n• *Sector 62, Noida*\n• *Bandra, Mumbai*\n• *Online (Pan-India)*`,
        nextStep: "DONE",
        updatedData: data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["Rohini, Delhi 📍", "Sector 62, Noida 📍", "Online (Pan-India) 🌐"],
      };
    }

    const applyDonePatch = async (opts: {
      ai?: Awaited<ReturnType<typeof askGeminiChatbot>>;
    }) => {
      const ai = opts.ai;
      const mergedData: Record<string, any> = { ...data, lang: "en" };
      let credentialsChanged = false;

      const aiEmail = ai?.extractedData?.email ? extractStrictEmail(String(ai.extractedData.email)) || String(ai.extractedData.email) : undefined;
      const extractedEmail = validEmailInMsg || (aiEmail && isStrictValidEmail(aiEmail) ? aiEmail : undefined);
      const extractedPassword = ai?.extractedData?.password as string | undefined;

      const needsEmailSync = extractedEmail && isStrictValidEmail(extractedEmail) && (
        extractedEmail.toLowerCase() !== data.email ||
        !userProfile?.email ||
        userProfile.email.startsWith("wa_") ||
        userProfile.email.startsWith("wa.") ||
        userProfile.email.toLowerCase() !== extractedEmail.toLowerCase()
      );

      if (needsEmailSync && extractedEmail) {
        mergedData.email = extractedEmail.toLowerCase();
        credentialsChanged = true;
      }

      if (extractedPassword && extractedPassword.length >= 6) {
        mergedData.password = extractedPassword;
        credentialsChanged = true;
      }

      // Location resolution
      let areaToSave: string | undefined;
      let cityToSave: string | undefined;
      if (directLocRes?.isValid && !sameLocality(directLocRes.area, directLocRes.city)) {
        areaToSave = directLocRes.area;
        cityToSave = directLocRes.city;
      } else if (ai?.extractedData && (typeof ai.extractedData.area === "string" || typeof ai.extractedData.city === "string")) {
        const aiArea = typeof ai.extractedData.area === "string" ? ai.extractedData.area.trim() : "";
        const aiCity = typeof ai.extractedData.city === "string" ? ai.extractedData.city.trim() : "";
        const combinedLoc = aiArea && aiCity && !aiArea.toLowerCase().includes(aiCity.toLowerCase())
          ? `${aiArea}, ${aiCity}`
          : (aiArea || aiCity);
        const loc = validateAndCleanLocality(combinedLoc, aiCity || (data.city as string) || undefined, true);
        if (loc.isValid && !sameLocality(loc.area, loc.city)) {
          areaToSave = loc.area;
          cityToSave = loc.city;
        }
      }

      // Strict Class & Subject resolution (always pass through enforceStrictEducation)
      const aiClsRaw = ai?.extractedData
        ? (Array.isArray(ai.extractedData.classLevels) && ai.extractedData.classLevels.length > 0
          ? ai.extractedData.classLevels.map((c) => String(c))
          : typeof ai.extractedData.classLevel === "string"
            ? [ai.extractedData.classLevel]
            : [])
        : [];
      const aiSubsRaw =
        ai?.extractedData && Array.isArray(ai.extractedData.subjects) && !hasNegatedSubject
          ? ai.extractedData.subjects.map((s) => String(s || "").trim()).filter(Boolean)
          : [];

      let classesToSave: string[] | undefined;
      let subjectsToSave: string[] | undefined;

      if (directSubStrict?.ok && directSubStrict.subjects.length > 0) {
        subjectsToSave = directSubStrict.subjects;
        classesToSave = directSubStrict.classLevels.length > 0 ? directSubStrict.classLevels : undefined;
      } else if (rawHasSubjectWords || rawMsgClasses.length > 0 || aiClsRaw.length > 0 || aiSubsRaw.length > 0) {
        const fallbackExistingCls =
          Array.isArray(data.classLevels) && data.classLevels.length > 0
            ? (data.classLevels as string[])
            : data.classLevel
              ? [String(data.classLevel)]
              : undefined;
        const strictRes = enforceStrictEducation({
          rawMessage: rawHasSubjectWords || rawMsgClasses.length > 0 ? rawMessage : undefined,
          subjectsInput: aiSubsRaw.length > 0 ? aiSubsRaw : undefined,
          classesInput: msgClasses.length > 0 ? msgClasses : aiClsRaw.length > 0 ? aiClsRaw : fallbackExistingCls,
        });
        if (strictRes.classLevels.length > 0) classesToSave = strictRes.classLevels;
        if (strictRes.subjects.length > 0) subjectsToSave = strictRes.subjects;
      }

      const nameToSave =
        typeof ai?.extractedData?.name === "string" && isValidName(ai.extractedData.name)
          ? String(ai.extractedData.name).trim()
          : undefined;

      // Mode resolution
      let modeToSave: "ONLINE" | "OFFLINE" | "EITHER" | undefined;
      const rawModeStr = String(ai?.extractedData?.mode || "").toUpperCase();
      if (rawModeStr === "ONLINE" || /\b(?:online\s*(?:only|classes|teaching|tuition)?|pan-?india)\b/i.test(rawMessage)) {
        modeToSave = "ONLINE";
      } else if (rawModeStr === "OFFLINE" || /\b(?:offline\s*(?:only|classes|teaching|tuition)?|home\s*tuitions?)\b/i.test(rawMessage)) {
        modeToSave = "OFFLINE";
      } else if (rawModeStr === "EITHER" || /\b(?:both|dono|either)\b/i.test(rawMessage)) {
        modeToSave = "EITHER";
      }

      const hasPatch = Boolean(
        credentialsChanged || nameToSave || areaToSave || subjectsToSave || (classesToSave && classesToSave.length > 0) || modeToSave
      );
      const saved = hasPatch
        ? await syncUserCredentialsInDb({
          phone: session.phone,
          email: credentialsChanged ? mergedData.email : undefined,
          password: credentialsChanged ? mergedData.password : undefined,
          name: nameToSave,
          area: areaToSave,
          city: cityToSave,
          subjects: subjectsToSave,
          classLevels: classesToSave,
          mode: modeToSave,
          mergeSubjects: !wantsReplace,
          mergeClasses: !wantsReplace,
        })
        : { ok: true, updatedFields: [] as string[], finalSubjects: undefined, finalClassLevels: undefined };

      const areaPatched = saved.updatedFields.includes("area") || Boolean(areaToSave);
      if (areaPatched) {
        if (areaToSave) mergedData.area = areaToSave;
        if (cityToSave) mergedData.city = cityToSave;
      }
      if (saved.updatedFields.includes("mode") && modeToSave) {
        mergedData.mode = modeToSave;
      }
      const displaySubjects = saved.finalSubjects || subjectsToSave;
      const displayClasses = saved.finalClassLevels || classesToSave;
      if ((saved.updatedFields.includes("subjects") || subjectsToSave) && displaySubjects) {
        mergedData.subjects = displaySubjects;
      }
      if ((saved.updatedFields.includes("class") || classesToSave) && displayClasses && displayClasses.length > 0) {
        mergedData.classLevel = displayClasses[0];
        mergedData.classLevels = displayClasses;
      }
      if (saved.updatedFields.includes("name") || nameToSave) mergedData.name = nameToSave;

      const savedBits = [
        (saved.updatedFields.includes("name") || nameToSave) && nameToSave ? `name *${nameToSave}*` : "",
        areaPatched && areaToSave ? `location *${[areaToSave, cityToSave].filter(Boolean).join(", ")}*` : "",
        (saved.updatedFields.includes("mode") || modeToSave) && modeToSave ? `mode *${modeToSave === "ONLINE" ? "Online (Pan-India) 💻" : modeToSave === "OFFLINE" ? "Offline (Home Tuition) 🏠" : "Both (Online + Offline) 🌐"}*` : "",
        (saved.updatedFields.includes("subjects") || subjectsToSave) && displaySubjects && displaySubjects.length > 0 ? `subjects *${displaySubjects.join(", ")}*` : "",
        (saved.updatedFields.includes("class") || classesToSave) && displayClasses && displayClasses.length > 0 ? `classes *${displayClasses.join(", ")}*` : "",
        saved.updatedFields.includes("email") ? `email *${mergedData.email}*` : "",
      ].filter(Boolean);

      return { savedBits, mergedData };
    };

    if (useAi) {
      try {
        const ai = await askGeminiChatbot(rawMessage, session, chatHistory, userProfile);
        if (ai && ai.reply) {
          ai.reply = ai.reply.replace(/\b(Seema|Anjali|Pooja|Riya|Simran|Neha|Shalini)\b/g, "Priya");
          const semantic = await handleAiSemanticIntent({
            ai,
            rawMessage,
            session,
            step: "DONE",
            data,
            userProfile,
            isDoneState: true,
          });
          if (semantic) return semantic;

          const { savedBits, mergedData } = await applyDonePatch({ ai });
          let reply = ai.reply;
          if (savedBits.length > 0 && !reply.toLowerCase().includes("updated") && !reply.toLowerCase().includes("saved")) {
            reply = `${reply}\n\n(Updated: ${savedBits.join(", ")} ✅)`;
          }

          return {
            reply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: session.userType,
            retries: 0,
            quickReplies: ai.quickReplies && ai.quickReplies.length > 0
              ? ai.quickReplies
              : ["View Leads", "Plans", "My Profile"],
            ...(shouldIncludePaymentQr(rawMessage, reply) ? paymentQrImage() : {}),
          };
        }
      } catch (err) {
        console.warn("[engine] AI call failed in DONE state:", err);
      }
    }

    // Deterministic fallback in DONE state (when useAi is false or Gemini unavailable)
    const preFallbackInDone = await tryDeterministicPreAiFallbacks({
      session,
      rawMessage,
      msg,
      step: "DONE",
      data,
      userProfile,
      chatHistory,
    });
    if (preFallbackInDone) return preFallbackInDone;

    const doneShortcut = await tryDeterministicDoneShortcuts({
      session,
      rawMessage,
      data,
    });
    if (doneShortcut) return doneShortcut;

    const hasExplicitStatement = Boolean(directLocStatement || directSubStatement || validEmailInMsg);
    if (hasExplicitStatement) {
      const fallbackPatch = await applyDonePatch({});
      if (fallbackPatch.savedBits.length > 0) {
        return {
          reply: `Saved: ${fallbackPatch.savedBits.join(", ")}. ✅\n\nProfile: https://apnatutorhub.com/tutor/profile`,
          nextStep: "DONE",
          updatedData: fallbackPatch.mergedData,
          userType: session.userType || "TUTOR",
          retries: 0,
          quickReplies: ["My Profile 👤", "View Leads 📋", "View Plans 💰"],
        };
      }
    }

    // Universal fallback in DONE state for unrecognized text or open questions
    if (looksLikeUnexpectedNoise(rawMessage)) {
      return {
        reply: looseIntentClarifyReply("CONFUSED", true),
        nextStep: "DONE",
        updatedData: data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["View Leads 📋", "My Profile 👤", "Help 📞"],
      };
    }

    return {
      reply: `Hello! How can I help you today? Feel free to ask any question about leads, plans, or your profile, or call Helpline *08062180653*. 📚\n\nDirect support WhatsApp: +91 93191 93109`,
      nextStep: "DONE",
      updatedData: data,
      userType: session.userType || "TUTOR",
      retries: 0,
      quickReplies: ["View Leads 📋", "View Plans 💰", "My Profile 👤", "Help 📞"],
    };
  }

  if (useAi) {
    try {
      const ai = await askGeminiChatbot(rawMessage, session, chatHistory, userProfile);
      if (ai && ai.reply) {
        if (!(session.step === "T_EMAIL" && rawMessage.includes("@"))) {
          const semantic = await handleAiSemanticIntent({
            ai,
            rawMessage,
            session,
            step,
            data,
            userProfile,
            isDoneState: false,
          });
          if (semantic) return semantic;
        }
        // Clean and merge extracted data
        const mergedData: Record<string, any> = { ...data };
        // During identity steps the answer is a NAME / EMAIL / PASSWORD — never a
        // locality. Gemini frequently mislabels those answers as `area`, which used
        // to overwrite the tutor's real teaching area in the DB. Skip AI area/city
        // entirely while collecting identity so the existing (correct) area wins.
        const isIdentityStep =
          session.step === "T_PASSWORD" ||
          session.step === "T_EMAIL" ||
          session.step === "T_NAME" ||
          session.step === "P_STUDENT_NAME";
        if (ai.extractedData) {
          for (const [k, v] of Object.entries(ai.extractedData)) {
            if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
              if (isIdentityStep && (k === "area" || k === "city")) continue;
              mergedData[k] = v;
            }
          }
        }

        // Additional Regex extractors for Email & Phone Number (strict firewall)
        const rawEmailInMsgMatch = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/);
        if (rawEmailInMsgMatch) {
          const strictEm = validateStrictEmail(rawEmailInMsgMatch[0]);
          if (strictEm.ok) {
            mergedData.email = strictEm.email;
          } else if (session.step === "T_EMAIL" || rawMessage.includes("@")) {
            return {
              reply: `⚠️ ${strictEm.reason}`,
              nextStep: "T_EMAIL",
              updatedData: { ...mergedData, email: undefined, lang: "en" },
              userType: session.userType || "TUTOR",
              retries: 0,
              quickReplies: [],
            };
          }
        } else if (mergedData.email && !isStrictValidEmail(mergedData.email)) {
          delete mergedData.email;
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

        // Name extractor (explicit name: ... or Dr/Prof title prefix)
        if (!mergedData.name || /^(teacher|tutor|user|student|unknown)$/i.test(String(mergedData.name).trim())) {
          const explicitNameMatch =
            rawMessage.match(/(?:my\s*name\s*is|mera\s*naam|name\s*is|naam\s*hai|i\s*am|main\s*hoon)\s+([a-zA-Z\s.'-]+)/i) ||
            rawMessage.match(/^(?:dr\.?|doctor|prof\.?|professor|mr\.?|mrs\.?|ms\.?|er\.?|adv\.?)\s+[a-zA-Z\s.'-]+$/i);
          if (explicitNameMatch) {
            const candidate = explicitNameMatch[1] ? explicitNameMatch[1].trim() : explicitNameMatch[0].trim();
            if (isValidName(candidate)) {
              mergedData.name = candidate;
            }
          }
        }

        // Additional entity extractors from message text — Universal Indian Locality Validation
        const isPasswordOrEmailStep = isIdentityStep;
        const isMsgSensitive =
          /^(default|skip|password|pwd|pass|reply\s*default|leads|plans|coins|help|menu|stop|cancel)$/i.test(rawMessage.trim()) ||
          rawMessage.includes("@") ||
          /\b[a-zA-Z]+[0-9]{2,}\b/i.test(rawMessage);

        const shouldCheckRawForArea =
          !isPasswordOrEmailStep &&
          !isMsgSensitive &&
          (Boolean(mergedData.area) || Boolean(mergedData.city) || session.step === "T_AREA" || session.step === "P_AREA" || PLACE_INDICATORS.test(rawMessage));
        if (shouldCheckRawForArea) {
          const aiAreaStr = typeof mergedData.area === "string" ? mergedData.area.trim() : "";
          const aiCityStr = typeof mergedData.city === "string" ? mergedData.city.trim() : "";
          const rawAreaCandidate = aiAreaStr
            ? (aiCityStr && !aiAreaStr.toLowerCase().includes(aiCityStr.toLowerCase()) ? `${aiAreaStr}, ${aiCityStr}` : aiAreaStr)
            : (aiCityStr || rawMessage);
          const locRes = validateAndCleanLocality(rawAreaCandidate, (mergedData.city || data.city || "Delhi") as string, true);
          if (locRes.isValid && !sameLocality(locRes.area, locRes.city)) {
            mergedData.area = locRes.area;
            mergedData.city = locRes.city;
          } else {
            if (locRes.city && locRes.city !== "Delhi") {
              mergedData.city = locRes.city;
            }
            if (mergedData.area) delete mergedData.area;
          }
        }

        const isInitialWelcomeChoice = session.step === "WELCOME" && /^[12]$/.test(rawMessage.trim());

        const aiClsCandidate =
          Array.isArray(ai.extractedData?.classLevels) && ai.extractedData.classLevels.length > 0
            ? ai.extractedData.classLevels
            : ai.extractedData?.classLevel
              ? [ai.extractedData.classLevel]
              : undefined;
        const strictEd = applyStrictEducationToData({
          rawMessage,
          isIdentityStep,
          isInitialWelcomeChoice,
          previousData: data,
          mergedData,
          aiSubjects: ai.extractedData?.subjects,
          aiClasses: aiClsCandidate,
        });
        if (strictEd.errorReply && session.userType !== "PARENT") {
          return {
            reply: strictEd.errorReply.reply,
            nextStep: strictEd.errorReply.nextStep,
            updatedData: { ...strictEd.mergedData, lang: "en" },
            userType: "TUTOR",
            retries: 0,
            quickReplies: strictEd.errorReply.quickReplies,
          };
        }

        // State-specific step input helpers
        if (session.step === "T_AREA" && !mergedData.area && rawMessage.trim().length >= 2 && !/^(menu|help|cancel)$/i.test(rawMessage.trim())) {
          const stepLoc = validateAndCleanLocality(rawMessage.trim(), (mergedData.city || data.city || "Delhi") as string, true);
          if (stepLoc.isValid && !sameLocality(stepLoc.area, stepLoc.city)) {
            mergedData.area = stepLoc.area;
            mergedData.city = stepLoc.city;
          } else if (stepLoc.city && stepLoc.city !== "Delhi") {
            mergedData.city = stepLoc.city;
          }
        }
        const keptArea = isIdentityStep
          ? (typeof data.area === "string" && data.area.trim() ? data.area.trim() : undefined)
          : keepArea(mergedData.area, rawMessage, data.area, (mergedData.city || data.city || "Delhi") as string);
        if (keptArea) mergedData.area = keptArea;
        else if (!mergedData.area) delete mergedData.area;

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

        const locResult = validateAndCleanLocality(mergedData.area || data.area, (mergedData.city || data.city || "Delhi") as string, true);
        const rawArea = locResult.isValid && !sameLocality(locResult.area, locResult.city) ? locResult.area : "";
        if (rawArea) {
          mergedData.area = locResult.area;
          mergedData.city = locResult.city;
        } else {
          if (locResult.city && locResult.city !== "Delhi") {
            mergedData.city = locResult.city;
          }
          if (mergedData.area) delete mergedData.area;
        }
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
              ? `Great! Which classes, subjects, and city / locality do you teach in (or Online)? 📚`
              : `Welcome! Which class, subjects, and city / locality do you need a tutor for? 🎓📍`,
            nextStep: isTutor ? "T_CONVO" : "P_CONVO",
            updatedData: { ...data, lang: "en", ...(isTutor ? { userType: "TUTOR" } : { userType: "PARENT" }) },
            userType: isTutor ? "TUTOR" : "PARENT",
            retries: 0,
            quickReplies: isTutor
              ? ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"]
              : ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
          };
        }

        // ── TUTOR Onboarding ──────────────────────────────────────────────────
        if (role === "TUTOR") {
          if (isSubjectNegation(rawMessage)) {
            const midOnboardOff = tryTutorOffScriptReply(session, rawMessage, mergedData, session.step);
            if (midOnboardOff) return midOnboardOff;
          }

          const isTutorReadyToFinalize =
            hasSubjects &&
            hasClass &&
            hasArea &&
            (Boolean(mergedData.email) || session.step === "T_EMAIL" || session.step === "T_PASSWORD" || Boolean(mergedData.password));

          // If Gemini generated a smart, contextual, human reply and registration is not finalizing yet:
          if (!isTutorReadyToFinalize && ai && ai.reply) {
            let nextStep = "T_CONVO";
            if (!hasSubjects) nextStep = "T_SUBJECTS";
            else if (!hasClass) nextStep = "T_CLASS";
            else if (!hasArea) nextStep = "T_AREA";
            else if (!mergedData.name) nextStep = "T_NAME";
            else if (!mergedData.email) nextStep = "T_EMAIL";

            // Live credential sync so extracted email, subjects, class, locality are saved immediately to DB
            try {
              const liveEmail = (typeof mergedData.email === "string" && isValidEmailDomain(mergedData.email)) ? mergedData.email : undefined;
              const liveArea = typeof mergedData.area === "string" ? mergedData.area : undefined;
              const liveCity = typeof mergedData.city === "string" ? mergedData.city : undefined;
              const liveSubs = subsArray.length > 0 ? subsArray : undefined;
              const liveClasses = classLevelsArray.length > 0 ? classLevelsArray : undefined;
              const liveName = (typeof mergedData.name === "string" && isValidName(mergedData.name)) ? mergedData.name : undefined;

              if (liveEmail || liveArea || liveCity || liveSubs || liveClasses || liveName) {
                await syncUserCredentialsInDb({
                  phone: session.phone,
                  email: liveEmail,
                  name: liveName,
                  area: liveArea,
                  city: liveCity,
                  subjects: liveSubs,
                  classLevels: liveClasses,
                  mode: mergedData.mode,
                });
              }
            } catch (syncErr) {
              console.warn("[engine] Live intake credential sync warning:", syncErr);
            }

            return {
              reply: ai.reply,
              nextStep,
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ai.quickReplies && ai.quickReplies.length > 0
                ? ai.quickReplies
                : ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
              ...(shouldIncludePaymentQr(rawMessage, ai.reply) ? paymentQrImage() : {}),
            };
          }

          // Case A: Missing all teaching details
          if (!hasSubjects && !hasClass && !hasArea) {
            // Check if user typed something that failed subject validation (hobby/unknown word)
            const caseASubCheck = isOffScriptTutorTalk(rawMessage)
              ? { isValid: false as const, errorPrompt: "" }
              : validateAndAlignSubjects(rawMessage.trim(), undefined);
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
              reply: `Great! Which classes, subjects, and locality do you teach in? 📚`,
              nextStep: "T_CONVO",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
            };
          }

          // Case B: Has subjects, but missing class and area
          if (hasSubjects && !hasClass && !hasArea) {
            const sFirst = subsArray[0] || "Subjects";
            const suggestions = getSubjectClassSuggestions(sFirst);
            return classAskOrBreak(mergedData, suggestions.prompt, suggestions.quickReplies);
          }

          // Case C: Has subjects and area, but missing class
          if (hasSubjects && hasArea && !hasClass) {
            const subsText = subsArray.join(", ");
            const suggestions = getSubjectClassSuggestions(subsArray[0] || "Subjects");
            return classAskOrBreak(
              mergedData,
              `Which classes do you teach *${subsText}* for in *${rawArea}*? 🎓`,
              suggestions.quickReplies
            );
          }

          // Common-Sense Subject-Grade Compatibility Validation (single-band check):
          if (hasSubjects && hasClass && classLevelsArray.length <= 1) {
            const rawCls = classLevelsArray[0] || (mergedData.classLevel as string) || "";
            const validation = validateSubjectClassCompatibility(subsArray, rawCls, "TUTOR");

            if (!validation.isValid) {
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
          }

          // Case D: Has subjects and class, but missing area
          if (hasSubjects && hasClass && !hasArea) {
            if (session.step === "T_AREA" && rawMessage.trim().length >= 2) {
              const locCheck = validateAndCleanLocality(rawMessage.trim(), (mergedData.city || data.city || "Delhi") as string);
              if (!locCheck.isValid) {
                return {
                  reply: locCheck.errorPrompt || "Please share your teaching locality and city (for example: *Rohini Delhi*, *Bandra Mumbai*, or *Sector 62 Noida*) 📍",
                  nextStep: "T_AREA",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: 0,
                  quickReplies: getLocalitiesQuickReplies((mergedData.city || data.city) as string),
                };
              }
              mergedData.area = locCheck.area;
              mergedData.city = locCheck.city;
              if (locCheck.area.toLowerCase().includes("online")) {
                mergedData.mode = "ONLINE";
                mergedData.modeKey = "2";
              }
            } else {
              const ctx = formatHumanTeachingContext(subsArray, classLevelsArray.length ? classLevelsArray : (mergedData.classLevel as string), rawArea);
              mergedData.subjects = ctx.cleanSubs;
              return {
                reply: ctx.humanAreaPrompt,
                nextStep: "T_AREA",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: getLocalitiesQuickReplies((mergedData.city || data.city) as string),
              };
            }
          }

          // Case E1: Has area only, missing subjects and class
          if (hasArea && !hasSubjects && !hasClass) {
            return {
              reply: `Which classes and subjects do you teach in *${rawArea}*? 📚`,
              nextStep: "T_CONVO",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
            };
          }

          // Case E2: Has class only, missing subjects and area
          if (hasClass && !hasSubjects && !hasArea) {
            const clsText = classLevelsArray.join(", ") || (mergedData.classLevel as string) || "Classes";
            return {
              reply: `Which subjects do you teach for *${clsText}*? 📚`,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Mathematics, Science", "Social Science, English", "Physics, Chemistry", "Accountancy, Economics"],
            };
          }

          // Case E3: Has class and area, missing subjects
          if (hasClass && hasArea && !hasSubjects) {
            const clsText = classLevelsArray.join(", ") || (mergedData.classLevel as string) || "Classes";
            return {
              reply: `Which subjects do you teach for *${clsText}* in *${rawArea}*? 📚`,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Mathematics, Science", "Social Science, English", "Physics, Chemistry", "Accountancy, Economics"],
            };
          }

          // Case E4: Missing subjects
          if (!hasSubjects) {
            const e4SubCheck = validateAndAlignSubjects(rawMessage.trim(), mergedData.classLevel as string | undefined);
            const e4ErrorPrompt = !e4SubCheck.isValid && e4SubCheck.errorPrompt && rawMessage.trim().length > 2
              ? e4SubCheck.errorPrompt
              : `📚 Which subjects and classes do you teach? For example: *Class 1-8 All Subjects*, *Class 9-10 Maths & Science*, or *Class 11-12 Physics*`;
            return {
              reply: e4ErrorPrompt,
              nextStep: "T_SUBJECTS",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
            };
          }

          // Case E5: Missing class
          if (!hasClass) {
            return classAskOrBreak(mergedData, `Which classes do you teach? 🎓`, [
              "Class 1-8 (All Subjects)",
              "Class 9-10",
              "Class 11-12",
              "All Classes (1 to 12)",
            ]);
          }

          // Case E6: Missing area
          const hasAreaNow = hasArea || Boolean(typeof mergedData.area === "string" && mergedData.area.trim().length >= 2);
          if (!hasAreaNow) {
            return {
              reply: `Which city and locality do you teach in (or Online)? 📍`,
              nextStep: "T_AREA",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: getLocalitiesQuickReplies((mergedData.city || data.city) as string),
            };
          }

          // Case F: ALL 3 TEACHING CRITERIA ARE PRESENT!
          const effectiveArea = (typeof mergedData.area === "string" && mergedData.area.trim()) || rawArea || (mergedData.city as string) || "Delhi";
          const ctx = formatHumanTeachingContext(
            subsArray,
            classLevelsArray.length ? classLevelsArray : (mergedData.classLevel as string),
            effectiveArea
          );
          mergedData.subjects = ctx.cleanSubs;
          const areaName = effectiveArea;
          const cityName = (mergedData.city as string) || "Delhi";
          const tutorName = (mergedData.name as string) || "";

          // 0. Name is mandatory — Ask for it before email if missing
          const hasValidName = isValidName(tutorName);

          if (!hasValidName && session.step !== "T_NAME" && session.step !== "T_EMAIL" && session.step !== "T_PASSWORD") {
            return {
              reply: `${ctx.humanEmailSummary}\n\n👤 Please share your *full name* (for example: *Priya Sharma* or *Rahul Gupta*):`,
              nextStep: "T_NAME",
              updatedData: mergedData,
              userType: "TUTOR",
              retries: 0,
              quickReplies: [],
            };
          }

          // If we are at T_NAME step, accept the name from the current message (strip wrappers; never loop forever)
          if (session.step === "T_NAME") {
            const rawEmailInName = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/);
            if (rawEmailInName) {
              const strictEmCheck = validateStrictEmail(rawEmailInName[0]);
              if (!strictEmCheck.ok) {
                return {
                  reply: `⚠️ ${strictEmCheck.reason}\n\nFirst, please enter your *full name* (for example: *Priya Sharma*):`,
                  nextStep: "T_NAME",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: 0,
                  quickReplies: [],
                };
              }
              mergedData.email = strictEmCheck.email;
              await syncUserCredentialsInDb({ phone: session.phone, email: strictEmCheck.email });
              return {
                reply: `Email noted: *${strictEmCheck.email}* ✅\n\n👤 Please also enter your *full name* (for example: *Priya Sharma* or *Rahul Gupta*):`,
                nextStep: "T_NAME",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: [],
              };
            }

            const nameCandidate = rawMessage
              .trim()
              .replace(/^(?:my\s+name\s+is|i\s+am|i'm|i\s+m|myself|this\s+is|mera\s+naa?m(?:\s+hai)?)\s+/i, "")
              .replace(/\s+hai$/i, "")
              .trim();
            if (!isValidName(nameCandidate)) {
              if ((session.retries || 0) >= 2 || /\?|\b(fees?|plan|plans|lead|leads|help|call|support)\b/i.test(rawMessage)) {
                if (ai.reply && !containsHindiOrHinglishSlip(ai.reply)) {
                  return {
                    reply: ai.reply,
                    nextStep: "T_CONVO",
                    updatedData: mergedData,
                    userType: "TUTOR",
                    retries: 0,
                    quickReplies: ai.quickReplies?.length ? ai.quickReplies : ["View Leads 📋", "Help 📞"],
                  };
                }
              } else {
                const typed = nameCandidate.slice(0, 25);
                const reason = /\d/.test(nameCandidate)
                  ? `"*${typed}*" contains numbers — please enter letters only.`
                  : nameCandidate.length < 2
                    ? `That name looks too short.`
                    : `"*${typed}*" does not look like a valid full name.`;
                return {
                  reply: `⚠️ ${reason}\n\n👤 Please type your *full name* (for example: *Priya Sharma* or *Rahul Gupta*):`,
                  nextStep: "T_NAME",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: (session.retries || 0) + 1,
                  quickReplies: [],
                };
              }
            } else {
              mergedData.name = nameCandidate;
            }
          }

          const resolvedTutorName = (mergedData.name as string) || "";

          // Strict Email Validation
          const rawEmailInTurn = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/);
          const candidateEmailToken = rawEmailInTurn ? rawEmailInTurn[0].trim().toLowerCase() : (typeof mergedData.email === "string" ? mergedData.email.trim().toLowerCase() : "");
          if (candidateEmailToken) {
            const emailRes = validateStrictEmail(candidateEmailToken);
            if (!emailRes.ok) {
              return {
                reply: `⚠️ ${emailRes.reason}`,
                nextStep: "T_EMAIL",
                updatedData: { ...mergedData, email: undefined },
                userType: "TUTOR",
                retries: 0,
                quickReplies: [],
              };
            }
          }
          const emailCandidate = candidateEmailToken && isStrictValidEmail(candidateEmailToken) ? candidateEmailToken : "";
          const hasValidEmail = Boolean(emailCandidate);

          // 1. Email is MANDATORY — unless tutor explicitly declines registration
          if (!hasValidEmail && session.step !== "T_PASSWORD") {
            const emailRepeats =
              String(mergedData.lastBotAsk || "") === "email"
                ? Number(mergedData.sameAskCount || 0) + 1
                : 1;
            const giveUpEmail =
              refusesRegistration(rawMessage) ||
              wantsLeadsOnWhatsApp(rawMessage) ||
              (emailRepeats >= 2 && (isAckOnly(rawMessage) || isBareNo(rawMessage))) ||
              emailRepeats >= 3;

            if (giveUpEmail && ctx.cleanSubs.length > 0 && classLevelsArray.length > 0) {
              try {
                await registerTutorFromWhatsapp(session.phone, {
                  name: resolvedTutorName || "Tutor",
                  email: waPlaceholderEmail(session.phone),
                  phone: session.phone,
                  password: "12345678",
                  city: cityName,
                  area: areaName,
                  subjects: ctx.cleanSubs,
                  classLevels: classLevelsArray,
                  classLevel: classLevelsArray[0],
                });
              } catch (regErr) {
                console.warn("[engine] Fallback tutor registration on email skip error:", regErr);
              }
              return {
                reply:
                  `✅ Profile details saved! You can share your email later for portal login.\n\n` +
                  `📋 Browse matching leads: https://apnatutorhub.com/tutor/leads\n` +
                  `💎 Membership plan (₹1,257): https://apnatutorhub.com/tutor/plans\n\n` +
                  `Reply *PAY* anytime for payment details!`,
                nextStep: "DONE",
                updatedData: { ...mergedData, _registered: true, lastBotAsk: "email-skip", sameAskCount: 0, lang: "en" },
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["View Leads 📋", "Activate Plan ⚡", "Talk to Support 📞"],
              };
            }

            if (session.step === "T_EMAIL") {
              return {
                reply: `⚠️ A valid email address (for example, *yourname@gmail.com*, *@yahoo.com*, or *@outlook.com*) is required for lead alerts and portal login.\n\n📧 Please share your email address:`,
                nextStep: "T_EMAIL",
                updatedData: { ...mergedData, lastBotAsk: "email", sameAskCount: emailRepeats, lang: "en" },
                userType: "TUTOR",
                retries: 0,
                quickReplies: [],
              };
            }

            return {
              reply: `Profile details noted! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\n📧 Please share your valid *email address* (e.g., yourname@gmail.com) for login & student lead alerts:`,
              nextStep: "T_EMAIL",
              updatedData: { ...mergedData, lastBotAsk: "email", sameAskCount: 1, lang: "en" },
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
            } catch { }

            if (isExisting) {
              const existingPhone10 = (existingUserPhone || "").replace(/\D/g, "").slice(-10);
              const sessionPhone10 = session.phone.replace(/\D/g, "").slice(-10);

              if (existingPhone10 && sessionPhone10 && existingPhone10 !== sessionPhone10) {
                mergedData.email = undefined;
                return {
                  reply: `⚠️ This email (*${emailCandidate}*) is already linked to another mobile number.\n\nPlease enter a different personal email address to link with this WhatsApp number: 📧`,
                  nextStep: "T_EMAIL",
                  updatedData: mergedData,
                  userType: "TUTOR",
                  retries: 0,
                  quickReplies: [],
                };
              }

              mergedData.email = emailCandidate;
              return {
                reply: `Email noted: *${emailCandidate}* ✅\n_(This email already has an account)_\n\n🔐 Please set a login password (min 6 characters) or reply *default*:`,
                nextStep: "T_PASSWORD",
                updatedData: mergedData,
                userType: "TUTOR",
                retries: 0,
                quickReplies: ["Default Password", "12345678"],
              };
            }

            mergedData.email = emailCandidate;
            const ackLabel = session.step === "T_EMAIL" || emailCandidate
              ? `Email noted: *${emailCandidate}* ✅`
              : (mergedData.area ? `Location noted: *${mergedData.area}* ✅` : `Details noted! ✅`);
            return {
              reply: `${ackLabel}\n\n🔐 Choose a password for your account login (min 6 characters), or reply *default*:`,
              nextStep: "T_PASSWORD",
              updatedData: { ...mergedData, emailAcknowledged: true },
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["Default Password", "12345678"],
            };
          }

          mergedData.email = emailCandidate;

          if (session.step === "T_PASSWORD") {
            const rawTrim = rawMessage.trim();
            const isDefaultChoice = /default|skip|12345678|nahi|no|set 12345678|dont\s*know|pata\s*nahi|forgot|bhool/i.test(rawTrim);
            const looksOffScript =
              /[?？]|[^\u0000-\u007F]/.test(rawTrim) ||
              /\s/.test(rawTrim) ||
              /\b(fees?|plan|plans|lead|leads|coin|coins|wallet|help|support|call|how|what|why|when|where|which|who|kya|kaise|kitna|kitne|batao|trust|scam|fake|refund)\b/i.test(rawTrim);
            if (isDefaultChoice) {
              mergedData.password = "12345678";
              mergedData._usedDefaultPassword = true;
            } else if (looksOffScript) {
              if ((session.retries || 0) >= 2) {
                mergedData.password = "12345678";
                mergedData._usedDefaultPassword = true;
              } else {
                const helpMsg = ai.reply && !containsHindiOrHinglishSlip(ai.reply)
                  ? ai.reply
                  : `I'm happy to help with that! You can review plans at https://apnatutorhub.com/tutor/plans or call Helpline *08062180653*.`;
                return {
                  reply: `${helpMsg}\n\n🔐 Whenever you're ready, enter a 6+ character password (no spaces) or reply *default* to finish setup:`,
                  nextStep: "T_PASSWORD",
                  updatedData: { ...mergedData, password: undefined },
                  userType: "TUTOR",
                  retries: (session.retries || 0) + 1,
                  quickReplies: ["Default Password", "12345678"],
                };
              }
            } else if (rawTrim.length >= 6) {
              mergedData.password = rawTrim;
            } else {
              return {
                reply: `⚠️ Password must be at least 6 characters long.\n\n🔐 Please enter a stronger password or reply *default*:`,
                nextStep: "T_PASSWORD",
                updatedData: { ...mergedData, password: undefined },
                userType: "TUTOR",
                retries: (session.retries || 0) + 1,
                quickReplies: ["Default Password", "12345678"],
              };
            }
          }

          const pwdStr = (mergedData.password as string) || "12345678";
          const phoneToUse = (mergedData.phone as string) || session.phone;
          const emailToUse = emailCandidate;

          try {
            await registerTutorFromWhatsapp(session.phone, {
              name: resolvedTutorName || "Tutor",
              email: emailToUse,
              phone: phoneToUse,
              password: pwdStr,
              city: cityName,
              area: areaName,
              subjects: ctx.cleanSubs,
              classLevels: classLevelsArray,
              experience: typeof mergedData.experience === "number" ? mergedData.experience : 2,
            });
          } catch (regErr) {
            console.error("[engine] auto-register tutor failed:", regErr);
          }

          const usedDefault = mergedData._usedDefaultPassword === true;
          delete mergedData.password;
          delete mergedData._usedDefaultPassword;
          mergedData._registered = true;
          mergedData.lang = "en";

          const loginLine = `📧 ${emailToUse} | 📱 ${phoneToUse}`;
          const pwdNote = usedDefault
            ? `\n🔑 Default password: *12345678* (you can update it after logging in at https://apnatutorhub.com/login)`
            : ``;
          const finalName = resolvedTutorName || (typeof mergedData.name === "string" ? mergedData.name : "");
          const nameGreeting = finalName && !/^(tutor|teacher|user|unknown)$/i.test(finalName.trim()) ? `, ${finalName.trim()}` : "";
          const profileReply =
            `✅ *Your tutor profile is ready${nameGreeting}!*\n` +
            `🔐 Login: ${loginLine}\nhttps://apnatutorhub.com/login${pwdNote}\n\n` +
            `📋 Reply *LEADS* to view matching student inquiries\n` +
            `💎 Reply *PAY* for the Commission Based Plan (₹1,257)\n` +
            `👉 Plans: https://apnatutorhub.com/tutor/plans`;

          return {
            reply: profileReply,
            nextStep: "DONE",
            updatedData: mergedData,
            userType: "TUTOR",
            retries: 0,
            quickReplies: [
              "View Leads 📋",
              "Activate Plan ⚡",
              "Membership Plans 💎",
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

          const isParentReadyToFinalize = parentHasSubs && parentHasClass && parentHasArea;
          if (!isParentReadyToFinalize && ai && ai.reply) {
            let nextStep = "P_CONVO";
            if (!parentHasClass) nextStep = "P_CLASS";
            else if (!parentHasSubs) nextStep = "P_SUBJECTS";
            else if (!parentHasArea) nextStep = "P_AREA";

            return {
              reply: ai.reply,
              nextStep,
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ai.quickReplies && ai.quickReplies.length > 0
                ? ai.quickReplies
                : ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
            };
          }

          if (!parentHasSubs && !parentHasClass && !parentHasArea) {
            return {
              reply: `Which class, subjects, and locality do you need a tutor for? 🎓📍`,
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
              reply: `Which class is the student in? 🎓`,
              nextStep: "P_CONVO",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: suggestions.quickReplies,
            };
          }

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
                  reply: locCheck.errorPrompt || "Please share your locality and city (for example: *Rohini Delhi*, *Bandra Mumbai*, or *Sector 62 Noida*) 📍",
                  nextStep: "P_AREA",
                  updatedData: mergedData,
                  userType: "PARENT",
                  retries: 0,
                  quickReplies: ["Dwarka", "Rohini", "South Delhi", "Noida / Gurgaon"],
                };
              }
            }
            return {
              reply: `Which locality and city do you need the tutor in for *${parentSubs.join(", ")} (${parentClass})*? 📍`,
              nextStep: "P_AREA",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Dwarka", "Rohini", "South Delhi", "Noida / Gurgaon"],
            };
          }

          if (!parentHasSubs && (parentHasClass || parentHasArea)) {
            return {
              reply: `Which subjects do you need help with? 📚`,
              nextStep: "P_CONVO",
              updatedData: mergedData,
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Maths & Science", "All Subjects", "English", "Physics / Chemistry"],
            };
          }

          const classLevelName = normalizeCanonicalClassLevel(String(parentClass));
          const areaName = extractPublicLocality(parentArea, (mergedData.city as string) || "Delhi");
          if (!classLevelName) {
            return {
              reply: `Which class is the student in? Please enter Class 1–12, Nursery, JEE, or NEET. 🎓`,
              nextStep: "P_CONVO",
              updatedData: { ...mergedData, classLevel: undefined, classLevels: undefined },
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12"],
            };
          }
          const parentStrict = enforceStrictEducation({
            subjectsInput: parentSubs,
            classesInput: [classLevelName],
          });
          const parentLeadSubjects =
            parentStrict.subjects.length > 0
              ? parentStrict.subjects
              : leadSubjectsForClass(classLevelName, parentSubs);
          if (parentLeadSubjects.length === 0) {
            return {
              reply: parentStrict.errorPrompt || `Which specific subjects do you need for *${classLevelName}*? 📚`,
              nextStep: "P_CONVO",
              updatedData: { ...mergedData, classLevel: classLevelName },
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Mathematics", "Science", "English", "Physics"],
            };
          }
          if (!areaName) {
            return {
              reply: `Please share your locality / sector (without a house number) for *${parentLeadSubjects.join(", ")} (${classLevelName})*: 📍`,
              nextStep: "P_AREA",
              updatedData: { ...mergedData, classLevel: classLevelName, subjects: parentLeadSubjects },
              userType: "PARENT",
              retries: 0,
              quickReplies: ["Dwarka", "Rohini", "Mukundpur", "Sector 45"],
            };
          }

          if (session.userType === "TUTOR") {
            return {
              reply: `Your account is registered as a Tutor, so this was not posted as a student inquiry.\nReply *LEADS* to view matching tuition leads.`,
              nextStep: "T_CONVO",
              updatedData: data,
              userType: "TUTOR",
              retries: 0,
              quickReplies: ["View Leads 📋", "My Profile"],
            };
          }
          const parentReg = await registerParentFromWhatsapp(session.phone, {
            studentName: (mergedData.studentName as string) || (mergedData.name as string) || "Student",
            parentName: (mergedData.parentName as string) || (mergedData.name as string) || "Parent",
            email: isStrictValidEmail(mergedData.email) ? String(mergedData.email) : undefined,
            phone: (mergedData.phone as string) || session.phone,
            city: (mergedData.city as string) || "Delhi",
            area: areaName,
            classLevel: classLevelName,
            subjects: parentLeadSubjects,
            timing: (mergedData.timing as string) || undefined,
          });
          if (!parentReg.ok) {
            return {
              reply: `Your request could not be saved yet. Please share class, subjects, and locality cleanly (for example: *Class 4, All Subjects, Mukundpur*).`,
              nextStep: "P_CONVO",
              updatedData: { ...mergedData, classLevel: classLevelName, area: areaName, subjects: parentLeadSubjects },
              userType: "PARENT",
              retries: 0,
            };
          }

          delete mergedData.password;
          delete mergedData._usedDefaultPassword;
          mergedData._registered = true;
          mergedData.lang = "en";

          const parentName = (mergedData.name as string) || (mergedData.parentName as string) || "";
          const parentProfileReply =
            `✅ *Your tuition requirement has been registered${parentName ? `, ${parentName}` : ""}!*\n\n` +
            `📚 Class: ${classLevelName}\n` +
            `📖 Subjects: ${parentLeadSubjects.join(", ")}\n` +
            `📍 Area: ${areaName}\n\n` +
            `Our team is matching verified tutors for your request.\n` +
            `Reply *DEMO* anytime to schedule a free trial demo class! 🎓`;

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
  const preFallback = await tryDeterministicPreAiFallbacks({
    session,
    rawMessage,
    msg,
    step,
    data,
    userProfile,
    chatHistory,
  });
  if (preFallback) return preFallback;

  step = applyWelcomeEarlyTutorDetect(session, rawMessage, step, data);

  // Parent requirement intake fallback (when AI is off or returned null)
  const mentionsRequirement = /\b(class|grade|subject|physics|chemistry|maths|math|science|accounts|accountancy|biology|nursery|lkg|ukg|jee|neet|all subjects)\b/i.test(rawMessage);
  if (session.userType !== "TUTOR" && step !== "DONE" && (session.userType === "PARENT" || step.startsWith("P_") || mentionsRequirement)) {
    const previous: IntakeDraft = {
      classLevel: typeof data.classLevel === "string" ? data.classLevel : undefined,
      subjects: Array.isArray(data.subjects) ? (data.subjects as string[]) : undefined,
      area: typeof data.area === "string" ? data.area : undefined,
      city: typeof data.city === "string" ? data.city : undefined,
      mode: data.mode === "ONLINE" || data.mode === "OFFLINE" ? data.mode : undefined,
      confirm: (data.intakeConfirm as IntakeDraft["confirm"]) ?? null,
    };
    const assessed = assessIntake(rawMessage, previous);
    const intakeData: Record<string, unknown> = {
      ...data,
      classLevel: assessed.draft.classLevel,
      subjects: assessed.draft.subjects,
      area: assessed.draft.area,
      city: assessed.draft.city || data.city,
      mode: assessed.draft.mode,
      intakeConfirm: assessed.draft.confirm ?? null,
      userType: "PARENT",
      lang: "en",
    };
    if (!assessed.ready || !assessed.draft.classLevel || !assessed.draft.area || !assessed.draft.subjects?.length) {
      return {
        reply: assessed.reply,
        nextStep: "P_CONVO",
        updatedData: intakeData,
        userType: "PARENT",
        retries: 0,
        quickReplies: assessed.quickReplies,
      };
    }
    const saved = await registerParentFromWhatsapp(session.phone, {
      studentName: (data.studentName as string) || (data.name as string) || "Student",
      parentName: (data.parentName as string) || (data.name as string) || "Parent",
      email: isStrictValidEmail(data.email) ? String(data.email) : undefined,
      phone: (data.phone as string) || session.phone,
      city: assessed.draft.city || (data.city as string) || "Delhi",
      area: assessed.draft.area,
      classLevel: assessed.draft.classLevel,
      subjects: assessed.draft.subjects,
      modeKey: assessed.draft.mode === "ONLINE" ? "2" : "1",
    });
    if (!saved.ok) {
      return {
        reply: `Could not save yet: ${saved.error}\nPlease re-send the class, subjects, and locality. For example: *Class 8, All Subjects, Rohini*`,
        nextStep: "P_CONVO",
        updatedData: intakeData,
        userType: "PARENT",
        retries: 0,
      };
    }
    return {
      reply: `✅ Requirement saved!\n\n📚 ${assessed.draft.classLevel} · ${assessed.draft.subjects.join(", ")}\n📍 ${assessed.draft.area}\n🏠 ${assessed.draft.mode === "ONLINE" ? "Online" : "Home tuition"}\n\nRef #${saved.inquiryNumber}. Our team will match qualified tutors shortly.`,
      nextStep: "DONE",
      updatedData: { ...intakeData, _registered: true, intakeConfirm: null },
      userType: "PARENT",
      retries: 0,
      quickReplies: ["Fee Info", "Talk to Coordinator 📞"],
    };
  }

  if (step === "WELCOME") {
    const normalized = rawMessage.trim();
    if (normalized === "1" || /tutor|teach|instructor/i.test(normalized)) {
      return {
        reply: `Great! Which classes, subjects, and city / locality do you teach in (or Online)? 📚`,
        nextStep: "T_CONVO",
        updatedData: { lang: "en", userType: "TUTOR" },
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Physics, Class 11-12, Rohini"],
      };
    }
    if (normalized === "2" || /parent|student|child|hire/i.test(normalized)) {
      return {
        reply: `Welcome! Which class, subjects, and locality do you need a tutor for? 🎓📍`,
        nextStep: "P_CONVO",
        updatedData: { lang: "en", userType: "PARENT" },
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Class 9-10 Maths & Sci", "Class 1-5 All Subjects", "Class 11-12"],
      };
    }

    if (looksLikeUnexpectedNoise(normalized)) {
      return {
        reply: `I didn't quite recognize that message — I'm Priya from *ApnaTutorHub*! 🙏\n\nPlease reply *1* if you are a *Tutor*, *2* if you are a *Parent*, or ask your question directly.`,
        nextStep: "WELCOME",
        updatedData: { lang: "en" },
        userType: null,
        retries: 0,
        quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "Help 📞"],
      };
    }

    if (normalized.includes("?") || /^(?:what|how|why|when|where|who|which|can|could|do|does|is|are|tell)\b/i.test(normalized)) {
      return {
        reply: `Hi! I'm Priya from *ApnaTutorHub*. I can help you:\n• Find nearby or online tuition leads (reply *1 — Tutor*)\n• Book a verified home or online tutor (reply *2 — Parent*)\n• Get support & plan details (Helpline *08062180653* or WhatsApp *+91 93191 93109*)`,
        nextStep: "WELCOME",
        updatedData: { lang: "en" },
        userType: null,
        retries: 0,
        quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "View Plans 💰", "Help 📞"],
      };
    }

    const welcomedArea = extractPublicLocality(normalized);
    if (welcomedArea || normalized.length >= 3) {
      return {
        reply: `Welcome to *ApnaTutorHub*! 🙏\n\nPlease let us know who you are:\n\n1 — *Tutor* (Looking for tuition students)\n2 — *Parent* (Looking for a home tutor)`,
        nextStep: "WELCOME",
        updatedData: welcomedArea ? { area: welcomedArea, city: "Delhi", lang: "en" } : { lang: "en" },
        userType: null,
        retries: 0,
        quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent"],
      };
    }

    return handleInvalid(
      session,
      MSG.WELCOME,
      ["1 - Tutor", "2 - Parent"]
    );
  }

  // TUTOR conversational fallback: Require subject, class, area, name, email, and password before registering
  if (step === "T_CONVO" || step === "T_NAME" || step === "T_SUBJECTS" || step === "T_CLASS" || step === "T_AREA" || step === "T_EMAIL" || step === "T_PASSWORD" || step === "DONE") {
    const trimmed = rawMessage.trim();
    const fallbackOff = tryTutorOffScriptReply(session, rawMessage, data, step);
    if (fallbackOff) return fallbackOff;
    const updated: Record<string, any> = { ...data, lang: "en" };

    const rawEmailInFallback = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/);
    if (rawEmailInFallback) {
      const strictFbEmail = validateStrictEmail(rawEmailInFallback[0]);
      if (strictFbEmail.ok) {
        updated.email = strictFbEmail.email;
      } else if (step === "T_EMAIL" || trimmed.includes("@")) {
        return {
          reply: `⚠️ ${strictFbEmail.reason}`,
          nextStep: "T_EMAIL",
          updatedData: { ...updated, email: undefined },
          userType: "TUTOR",
          retries: 0,
          quickReplies: [],
        };
      }
    } else if (updated.email && !isStrictValidEmail(updated.email)) {
      delete updated.email;
    }

    const phoneMatch = trimmed.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
    if (phoneMatch && !updated.phone) updated.phone = phoneMatch[1];

    const pwdMatch = trimmed.match(/(?:password|pass|pwd)[:\s=]+([^\s\n,]+)/i);
    if (pwdMatch) {
      updated.password = pwdMatch[1].trim();
    } else if (step === "T_PASSWORD" && !updated.password && !/^(menu|help|cancel)$/i.test(trimmed)) {
      updated.password = trimmed;
    }

    const isSpecialStep =
      step === "T_PASSWORD" ||
      step === "T_EMAIL" ||
      step === "T_NAME" ||
      session.step === "T_PASSWORD" ||
      session.step === "T_EMAIL" ||
      session.step === "T_NAME";

    const strictFb = applyStrictEducationToData({
      rawMessage: trimmed,
      isIdentityStep: isSpecialStep,
      isInitialWelcomeChoice: session.step === "WELCOME" && /^[12]$/.test(trimmed),
      previousData: data,
      mergedData: updated,
    });
    if (strictFb.errorReply) {
      return {
        reply: strictFb.errorReply.reply,
        nextStep: strictFb.errorReply.nextStep,
        updatedData: strictFb.mergedData,
        userType: "TUTOR",
        retries: 0,
        quickReplies: strictFb.errorReply.quickReplies,
      };
    }

    const isSensitiveInput =
      Boolean(rawEmailInFallback) ||
      Boolean(pwdMatch) ||
      /^(default|skip|password|pwd|pass|reply\s*default|leads|plans|coins|help|menu|stop|cancel)$/i.test(trimmed) ||
      /\b[a-zA-Z]+[0-9]{2,}\b/i.test(trimmed);

    if (!isSpecialStep && !isSensitiveInput && !isAckOnly(trimmed) && !isOffScriptTutorTalk(trimmed)) {
      const locResFallback = validateAndCleanLocality(trimmed, (updated.city as string) || "Delhi");
      if (locResFallback.isValid && locResFallback.area && locResFallback.area.toLowerCase() !== "delhi") {
        const pubArea = extractPublicLocality(
          locResFallback.area,
          locResFallback.city || (updated.city as string) || "Delhi"
        );
        if (pubArea) {
          updated.area = pubArea;
          if (locResFallback.city) updated.city = locResFallback.city;
        }
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

    // Handle random noise or general questions gracefully before re-prompting teaching details
    if (!hasSubs && !hasCls && !hasAr && !isSpecialStep) {
      if (looksLikeUnexpectedNoise(trimmed)) {
        return {
          reply: looseIntentClarifyReply("CONFUSED", false),
          nextStep: step === "DONE" ? "DONE" : step,
          updatedData: updated,
          userType: "TUTOR",
          retries: 0,
          quickReplies: ["All Subjects, Class 1-8", "Maths, Class 9-10, Dwarka", "Help 📞"],
        };
      }
      if (trimmed.includes("?") || /^(?:what|how|why|when|where|who|which|can|could|do|does|is|are|tell)\b/i.test(trimmed)) {
        return {
          reply: `Happy to help! You can ask about tuition leads, verification, or plans anytime, or reach Helpline *08062180653* (WhatsApp: *+91 93191 93109*).\n\nWhenever you're ready to get matching leads, share the classes, subjects, and locality you teach 📚`,
          nextStep: step === "DONE" ? "DONE" : step,
          updatedData: updated,
          userType: "TUTOR",
          retries: 0,
          quickReplies: ["View Leads 📋", "View Plans 💰", "All Subjects, Class 1-8"],
        };
      }
      return {
        reply: `Great! Which classes, subjects, and locality (or Online) do you teach? 📚`,
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
      return classAskOrBreak(updated, suggestions.prompt, suggestions.quickReplies);
    }

    if (hasAr && hasSubs && !hasCls) {
      const subsStr = subsArr.join(", ");
      const suggestions = getSubjectClassSuggestions(subsArr[0] || "Subjects");
      return classAskOrBreak(
        updated,
        `Which classes do you teach *${subsStr}* for in *${areaStr}*? 🎓`,
        suggestions.quickReplies
      );
    }

    // Single-band compatibility safety check
    if (hasSubs && hasCls && classArr.length <= 1) {
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
    }

    if (hasSubs && hasCls && !hasAr) {
      if (step === "T_AREA" && trimmed.length >= 2) {
        const locCheck = validateAndCleanLocality(trimmed, (updated.city as string) || "Delhi");
        if (!locCheck.isValid) {
          return {
            reply: locCheck.errorPrompt || "Please share your teaching locality and city (for example: *Rohini Delhi*, *Bandra Mumbai*, or *Sector 62 Noida*) 📍",
            nextStep: "T_AREA",
            updatedData: updated,
            userType: "TUTOR",
            retries: 0,
            quickReplies: getLocalitiesQuickReplies((updated.city || data.city) as string),
          };
        }
      }
      const ctx = formatHumanTeachingContext(subsArr, classArr.length ? classArr : "", areaStr);
      updated.subjects = ctx.cleanSubs;
      return {
        reply: ctx.humanAreaPrompt,
        nextStep: "T_AREA",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: getLocalitiesQuickReplies((updated.city || data.city) as string),
      };
    }

    if (hasAr && !hasSubs && !hasCls) {
      return {
        reply: `Which classes and subjects do you teach in *${areaStr}*? 📚`,
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
        : `📚 Which subjects and classes do you teach? For example: *Class 1-8 All Subjects*, *Class 9-10 Maths & Science*, or *Class 11-12 Physics*`;
      return {
        reply: fallbackSubPrompt,
        nextStep: "T_SUBJECTS",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
      };
    }

    if (!hasCls) {
      return classAskOrBreak(updated, `Which classes do you teach? 🎓`, [
        "Class 1-8 (All Subjects)",
        "Class 9-10",
        "Class 11-12",
        "All Classes (1 to 12)",
      ]);
    }

    if (!hasAr) {
      return {
        reply: `Which city and locality do you teach in (or Online)? 📍`,
        nextStep: "T_AREA",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: getLocalitiesQuickReplies((updated.city || data.city) as string),
      };
    }

    const ctx = formatHumanTeachingContext(subsArr, classArr.length ? classArr : "", areaStr);
    updated.subjects = ctx.cleanSubs;
    const areaName = areaStr || "Delhi";

    // 0. Name is mandatory — Ask for it before email if missing
    const fallbackTutorName = (updated.name as string) || "";
    if (!isValidName(fallbackTutorName) && session.step !== "T_NAME" && step !== "T_EMAIL" && step !== "T_PASSWORD") {
      return {
        reply: `Profile details noted! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\n👤 Please share your *full name* (for example: *Priya Sharma* or *Rahul Gupta*):`,
        nextStep: "T_NAME",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: [],
      };
    }

    // If currently at T_NAME step, validate and save the name (strip wrappers; never loop forever)
    if (session.step === "T_NAME") {
      const nameCandidate = rawMessage
        .trim()
        .replace(/^(?:my\s+name\s+is|i\s+am|i'm|i\s+m|myself|this\s+is|mera\s+naa?m(?:\s+hai)?)\s+/i, "")
        .replace(/\s+hai$/i, "")
        .trim();
      if (!isValidName(nameCandidate)) {
        if ((session.retries || 0) >= 2 || /[?？]|[^\u0000-\u007F]/.test(rawMessage) || /\b(fees?|plan|plans|lead|leads|help|call|support)\b/i.test(rawMessage)) {
          return {
            reply: `No worries! Let's help you right away — ask any question about leads or plans, or share your classes, subjects, and locality anytime.\n\nHelpline: *08062180653* | WhatsApp Support: +91 93191 93109`,
            nextStep: "T_CONVO",
            updatedData: updated,
            userType: "TUTOR",
            retries: 0,
            quickReplies: ["All Subjects, Class 1-8", "View Plans 💰", "Help 📞"],
          };
        }
        const typed = nameCandidate.slice(0, 25);
        const reason = /\d/.test(nameCandidate)
          ? `"*${typed}*" contains numbers — please enter letters only.`
          : nameCandidate.length < 2
            ? `That name looks too short.`
            : `"*${typed}*" does not look like a valid full name.`;
        return {
          reply: `⚠️ ${reason}\n\n👤 Please type your *full name* (for example: *Priya Sharma* or *Rahul Gupta*):`,
          nextStep: "T_NAME",
          updatedData: updated,
          userType: "TUTOR",
          retries: (session.retries || 0) + 1,
          quickReplies: [],
        };
      }
      updated.name = nameCandidate;
    }

    const emailStr = typeof updated.email === "string" ? updated.email.trim().toLowerCase() : "";
    const emailValidation = validateStrictEmail(emailStr);
    const hasValidEmail = emailValidation.ok;

    // 1. Check Email (STRICT — VALID DOMAIN ONLY)
    if (!hasValidEmail && step !== "T_PASSWORD") {
      const emailRepeats =
        String(updated.lastBotAsk || "") === "email" ? Number(updated.sameAskCount || 0) + 1 : 1;
      if (
        refusesRegistration(trimmed) ||
        wantsLeadsOnWhatsApp(trimmed) ||
        (emailRepeats >= 2 && (isAckOnly(trimmed) || isBareNo(trimmed))) ||
        emailRepeats >= 3
      ) {
        return {
          reply:
            `No problem — you can share a valid email (e.g. yourname@gmail.com) later.\n\nBrowse leads & plans anytime:\n👉 https://apnatutorhub.com/tutor/leads\n👉 https://apnatutorhub.com/tutor/plans`,
          nextStep: "DONE",
          updatedData: { ...updated, lastBotAsk: "email-skip", sameAskCount: 0 },
          userType: "TUTOR",
          retries: 0,
          quickReplies: ["View Leads 📋", "View Plans 💰", "Talk to Support 📞"],
        };
      }
      return {
        reply:
          step === "T_EMAIL"
            ? `⚠️ A valid email address (for example, *yourname@gmail.com*, *@yahoo.com*, or *@outlook.com*) is required for lead alerts and login.\n\n📧 Please enter a real email address:`
            : `Profile details noted! 📚 ${areaName} — ${ctx.humanSubjectLabel}\n\n📧 Please share your *email address* (e.g., yourname@gmail.com) for student lead alerts and login:`,
        nextStep: "T_EMAIL",
        updatedData: { ...updated, email: undefined, lastBotAsk: "email", sameAskCount: emailRepeats },
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
      } catch { }

      if (isExisting) {
        const existingPhone10 = (existingUserPhone || "").replace(/\D/g, "").slice(-10);
        const sessionPhone10 = session.phone.replace(/\D/g, "").slice(-10);

        if (existingPhone10 && sessionPhone10 && existingPhone10 !== sessionPhone10) {
          updated.email = undefined;
          return {
            reply: `⚠️ This email (*${emailStr}*) is already linked to another mobile number.\n\nPlease enter a different personal email address to link with this WhatsApp number: 📧`,
            nextStep: "T_EMAIL",
            updatedData: updated,
            userType: "TUTOR",
            retries: 0,
            quickReplies: [],
          };
        }
      }

      const ackPrefix = (step === "T_AREA" || updated.area)
        ? `📍 Area noted: *${areaName}* ✅`
        : `📧 Email noted: *${emailStr}* ✅`;

      return {
        reply: `${ackPrefix}\n\n🔐 Choose a password for your account login (min 6 characters), or reply *default*:`,
        nextStep: "T_PASSWORD",
        updatedData: updated,
        userType: "TUTOR",
        retries: 0,
        quickReplies: ["Default Password", "12345678"],
      };
    }

    if (step === "T_PASSWORD") {
      const looksOffScript =
        /[?？]|[^\u0000-\u007F]/.test(trimmed) ||
        /\s/.test(trimmed) ||
        /\b(fees?|plan|plans|lead|leads|coin|coins|wallet|help|support|call|how|what|why|when|where|which|who|kya|kaise|kitna|kitne|batao|trust|scam|fake|refund)\b/i.test(trimmed);
      if (/default|skip|12345678|nahi|no|dont\s*know|pata\s*nahi|forgot|bhool/i.test(pwdStr)) {
        updated.password = "12345678";
        updated._usedDefaultPassword = true;
      } else if (looksOffScript) {
        if ((session.retries || 0) >= 2) {
          updated.password = "12345678";
          updated._usedDefaultPassword = true;
        } else {
          return {
            reply: `Got it! For plans & fee details visit https://apnatutorhub.com/tutor/plans (or call Helpline *08062180653*).\n\n🔐 Whenever you're ready, enter a 6+ character password (no spaces) or reply *default*:`,
            nextStep: "T_PASSWORD",
            updatedData: { ...updated, password: undefined },
            userType: "TUTOR",
            retries: (session.retries || 0) + 1,
            quickReplies: ["Default Password", "12345678"],
          };
        }
      } else if (pwdStr.length < 6) {
        return {
          reply: `⚠️ Password must be at least 6 characters long (no spaces).\n\n🔐 Please enter a valid password or reply *default*:`,
          nextStep: "T_PASSWORD",
          updatedData: { ...updated, password: undefined },
          userType: "TUTOR",
          retries: (session.retries || 0) + 1,
          quickReplies: ["Default Password", "12345678"],
        };
      }
    }

    // 3. Register Tutor
    const phoneToUse = (updated.phone as string) || session.phone;
    const emailToUse = hasValidEmail ? emailStr : undefined;
    const tutorName = (updated.name as string) || "";

    try {
      await registerTutorFromWhatsapp(session.phone, {
        name: tutorName || "Tutor",
        email: emailToUse,
        phone: phoneToUse,
        password: pwdStr,
        city: (updated.city as string) || "Delhi",
        area: areaName,
        subjects: ctx.cleanSubs,
        classLevels: classArr,
      });
    } catch (regErr) {
      console.error("[engine] fallback auto-register tutor failed:", regErr);
    }

    const usedDefault = updated._usedDefaultPassword === true;
    delete updated.password;
    delete updated._usedDefaultPassword;
    updated._registered = true;
    updated.lang = "en";

    const loginLine2 = emailToUse ? `📧 ${emailToUse} | 📱 ${phoneToUse}` : `📱 ${phoneToUse}`;
    const pwdNote2 = usedDefault
      ? `\n🔑 Default password: *12345678* (you can update it after logging in at https://apnatutorhub.com/login)`
      : ``;
    const profileReply2 =
      `✅ *Your tutor profile is ready${tutorName ? `, ${tutorName}` : ""}!*\n` +
      `🔐 Login: ${loginLine2}\nhttps://apnatutorhub.com/login${pwdNote2}\n\n` +
      `Reply *LEADS* to view matching student inquiries 📋\n` +
      `Reply *PLANS* to view membership plans 💎`;

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

  // PARENT conversational fallback: register only a real class, real subjects, and a locality.
  if (step === "P_CONVO") {
    const trimmed = rawMessage.trim();
    const updated: Record<string, any> = { ...data, lang: "en" };

    const parsedStrictParent = applyStrictEducationToData({
      rawMessage: trimmed,
      isIdentityStep: false,
      isInitialWelcomeChoice: false,
      previousData: data,
      mergedData: updated,
    });
    if (parsedStrictParent.errorReply) {
      return {
        reply: parsedStrictParent.errorReply.reply,
        nextStep: "P_CONVO",
        updatedData: parsedStrictParent.mergedData,
        userType: "PARENT",
        retries: 0,
        quickReplies: parsedStrictParent.errorReply.quickReplies,
      };
    }

    const parsedArea = keepArea(updated.area, trimmed, data.area, (updated.city as string) || "Delhi");
    if (parsedArea) updated.area = parsedArea;
    else if (!extractPublicLocality(typeof updated.area === "string" ? updated.area : "")) delete updated.area;

    const classLevelName = Array.isArray(updated.classLevels) && updated.classLevels.length > 0
      ? String(updated.classLevels[0])
      : normalizeCanonicalClassLevel(typeof updated.classLevel === "string" ? updated.classLevel : "");
    const leadSubjects = Array.isArray(updated.subjects) ? (updated.subjects as string[]) : [];
    const areaName = extractPublicLocality(typeof updated.area === "string" ? updated.area : "", (updated.city as string) || "Delhi");

    if (!classLevelName) {
      return {
        reply: `Please share the student's class — Class 1–12, Nursery/KG, JEE, or NEET. 🎓`,
        nextStep: "P_CONVO",
        updatedData: updated,
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12"],
      };
    }
    if (leadSubjects.length === 0) {
      return {
        reply: `Which subjects do you need a tutor for in *${classLevelName}*? (Classes 1–8 cover All Subjects). 📚`,
        nextStep: "P_CONVO",
        updatedData: { ...updated, classLevel: classLevelName },
        userType: "PARENT",
        retries: 0,
        quickReplies: isTill8thClass(classLevelName) ? ["All Subjects"] : ["Maths", "Science", "English", "Physics"],
      };
    }
    if (!areaName) {
      return {
        reply: `Please share your locality / sector (without a house number) for *${classLevelName}* — for example *Mukundpur* or *Sector 45*: 📍`,
        nextStep: "P_AREA",
        updatedData: { ...updated, classLevel: classLevelName, subjects: leadSubjects },
        userType: "PARENT",
        retries: 0,
        quickReplies: ["Dwarka", "Rohini", "Mukundpur", "Sector 45"],
      };
    }

    const parentReg = await registerParentFromWhatsapp(session.phone, {
      studentName: (updated.studentName as string) || (updated.name as string) || "Student",
      parentName: (updated.parentName as string) || (updated.name as string) || "Parent",
      email: isStrictValidEmail(updated.email) ? String(updated.email) : undefined,
      phone: (updated.phone as string) || session.phone,
      city: (updated.city as string) || "Delhi",
      area: areaName,
      classLevel: classLevelName,
      subjects: leadSubjects,
    });
    if (!parentReg.ok) {
      return {
        reply: `Could not save yet. Please send class, subjects, and locality cleanly — for example: *Class 5, All Subjects, Rohini*.`,
        nextStep: "P_CONVO",
        updatedData: { ...updated, classLevel: classLevelName, area: areaName, subjects: leadSubjects },
        userType: "PARENT",
        retries: 0,
      };
    }
    updated.classLevel = classLevelName;
    updated.area = areaName;
    updated.subjects = leadSubjects;
    updated._registered = true;

    const pName = (updated.name as string) || (updated.parentName as string) || "";
    const parentProfileReply2 =
      `✅ *Your tuition requirement has been registered${pName ? `, ${pName}` : ""}!*\n\n` +
      `📚 Class: ${(updated.classLevel as string) || ""}\n` +
      `📍 Area: ${areaName}\n\n` +
      `Our team is matching verified tutors for your request.\n` +
      `Reply *DEMO* anytime to book a free trial class! 🎓`;

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
    reply: MSG.WELCOME,
    nextStep: "WELCOME",
    updatedData: { lang: "en" },
    userType: null,
    retries: 0,
    quickReplies: ["1 - Tutor", "2 - Parent"],
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
      return ["1 (₹6k–₹6.8k/mo)", "2 (₹6.8k–₹7.6k/mo)", "3 (₹700–₹850/hr)", "4 (₹850–₹1,050/hr)"];
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
    if (session.step === "DONE" || (session.data as Record<string, unknown>)?._registered === true) {
      return {
        reply: `I didn't quite catch that — no worries! 😊\n\nHere's what you can type anytime:\n• *Leads* — view matching student requirements\n• *Plans* — check wallet & membership options\n• *Help* — reach our coordinator desk`,
        nextStep: "DONE",
        updatedData: session.data,
        userType: session.userType || "TUTOR",
        retries: 0,
        quickReplies: ["View Leads 📋", "View Plans 💰", "Help 📞"],
      };
    }
    return {
      reply: `Let's start fresh! 😅 Type *MENU* to begin.`,
      nextStep: "WELCOME",
      updatedData: { lang: "en" },
      userType: null,
      retries: 0,
      quickReplies: ["MENU", "HELP"],
    };
  }

  // Step-specific contextual guidance (English-only)
  const step = session.step;
  let stepHint = "";
  let stepQuickReplies = quickReplies || ["MENU", "HELP"];

  if (step === "T_NAME") {
    stepHint = `👤 Please enter your *full name* (for example: *Priya Sharma*, *Rahul Gupta*).\nLetters only, no digits or symbols.`;
  } else if (step === "T_CITY") {
    stepHint = `📍 Please share your city — for example *Delhi*, *Mumbai*, *Noida*, *Bangalore*, or *Lucknow*.`;
  } else if (step === "T_AREA") {
    stepHint = `🏠 Please enter your *locality / sector* and city.\nFor example: *Rohini*, *Dwarka*, *Sector 62 Noida*, or *Andheri West*.`;
    stepQuickReplies = getLocalitiesQuickReplies((session.data.city as string) || (session.data.area as string));
  } else if (step === "T_SUBJECTS") {
    stepHint = `📚 Which subjects do you teach? Examples:\n• Classes 1–8: *All Subjects*\n• Classes 9–10: *Mathematics, Science, Social Science, English*\n• Classes 11–12: *Physics, Chemistry, Accountancy, Economics*`;
    stepQuickReplies = ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"];
  } else if (step === "T_CLASSES") {
    stepHint = `🎓 Reply with class numbers (comma-separated allowed):\n1 → Class 1–5\n2 → Class 6–8\n3 → Class 9–10\n4 → Class 11–12\n5 → JEE/NEET\n6 → All`;
    stepQuickReplies = ["1,2,3", "3,4", "4", "6 (All)"];
  } else if (step === "T_MODE") {
    stepHint = `🏡 Reply *1*, *2*, or *3*:\n1 → Home Visit (in-person)\n2 → Online Only\n3 → Both (Home + Online)`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "T_TIMING") {
    stepHint = `⏰ Share your available timings, such as:\n*Evenings 5–8pm*, *Weekdays 4–8pm*, or *Mornings only*.`;
    stepQuickReplies = ["Evenings 5-8pm", "Mornings 7-10am", "Weekends only", "Flexible"];
  } else if (step === "T_EXPERIENCE") {
    stepHint = `💼 Enter a single number for your teaching experience in years (for example: *2*, *5*, *10*, or *0*).`;
    stepQuickReplies = ["0", "1", "3", "5"];
  } else if (step === "T_CONFIRM") {
    stepHint = `Reply *1*, *2*, or *3*:\n1 → ✅ Confirm & Register\n2 → ✏️ Edit (start over)\n3 → ❌ Cancel`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "P_STUDENT_NAME") {
    stepHint = `👶 Please share the student's name (for example: *Aarav*, *Priya*).`;
  } else if (step === "P_CLASS") {
    stepHint = `🎓 Reply with a number from *1 to 6*:\n1 → Nursery/KG/Class 1–2\n2 → Class 3–5\n3 → Class 6–8\n4 → Class 9–10\n5 → Class 11–12\n6 → JEE/NEET`;
    stepQuickReplies = ["1", "2", "3", "4", "5", "6"];
  } else if (step === "P_SUBJECTS") {
    stepHint = `📚 Which subjects does the student need help with? (Classes 1–8 follow All Subjects).`;
    stepQuickReplies = ["All Subjects", "Maths & Science", "English", "Physics, Chemistry"];
  } else if (step === "P_CITY") {
    stepHint = `📍 Please enter your city — for example *Delhi*, *Noida*, *Mumbai*, *Gurgaon*, or *Lucknow*.`;
  } else if (step === "P_AREA") {
    stepHint = `🏠 Please enter your *locality / sector* and city.\nFor example: *Rohini Delhi*, *Bandra Mumbai*, or *Sector 62 Noida*.`;
    stepQuickReplies = getLocalitiesQuickReplies((session.data.city as string) || (session.data.area as string));
  } else if (step === "P_MODE") {
    stepHint = `🏡 Reply *1*, *2*, or *3*:\n1 → Home Tutor (at your home)\n2 → Online\n3 → Either is fine`;
    stepQuickReplies = ["1", "2", "3"];
  } else if (step === "P_BUDGET") {
    stepHint = `💰 Select a budget range:\n1 → ₹6,000–₹6,800/month (Class 1-5)\n2 → ₹6,800–₹7,600/month (Class 6-8)\n3 → ₹700–₹850/hr (Class 9-10)\n4 → ₹850–₹1,050/hr (Class 11-12)`;
    stepQuickReplies = ["1 (Class 1-5)", "2 (Class 6-8)", "3 (Class 9-10)", "4 (Class 11-12)"];
  } else if (step === "WELCOME") {
    stepHint = `Reply *1* if you are a Tutor, or *2* if you are a Parent looking for a tutor.`;
    stepQuickReplies = ["1 - Tutor", "2 - Parent"];
  }

  const reply = contextHint
    ? `${contextHint}`
    : stepHint
      ? `I didn't quite understand that. 🙏\n\n${stepHint}`
      : `I didn't quite understand that. 🙏 Type *MENU* to restart.`;

  return {
    reply,
    nextStep: session.step,
    updatedData: session.data,
    retries: nextRetries,
    quickReplies: stepQuickReplies,
  };
}
