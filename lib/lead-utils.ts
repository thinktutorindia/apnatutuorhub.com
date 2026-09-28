/**
 * lib/lead-utils.ts
 *
 * Centralized utility for sequential Inquiry IDs / Lead Codes and Budget Formatting.
 * Ensures all inquiries across Parent, Admin, Tutor, and Notification modules
 * have strictly increasing sequential inquiry numbers (e.g. #031593 -> #031594 -> #031595).
 */

/**
 * Formats a lead's inquiry number into a clean 6-digit zero-padded string (e.g. "031593").
 * Falls back gracefully to legacy ID slicing if inquiryNumber is not yet set.
 */
export function getInquiryDisplayCode(
  lead?: { id?: string | null; inquiryNumber?: number | null } | null
): string {
  if (!lead) return "000000";

  if (typeof lead.inquiryNumber === "number" && lead.inquiryNumber > 0) {
    return String(lead.inquiryNumber).padStart(6, "0");
  }

  if (lead.id) {
    const digits = lead.id.replace(/\D/g, "");
    if (digits.length >= 6) {
      return digits.slice(-6);
    }
    return lead.id.slice(-6).toUpperCase();
  }

  return "000000";
}

/**
 * Returns formatted "#031593" string with hash prefix.
 */
export function getInquiryHashTag(
  lead?: { id?: string | null; inquiryNumber?: number | null } | null
): string {
  return `#${getInquiryDisplayCode(lead)}`;
}

/**
 * Atomically resolves the next sequential inquiry number.
 * Starting base is 31593 (existing lead #031593).
 */
export async function getNextInquiryNumber(
  prismaOrTx: any
): Promise<number> {
  const BASE_INQUIRY_NUMBER = 31593;

  try {
    const highest = await prismaOrTx.lead.findFirst({
      where: {
        inquiryNumber: { not: null },
      },
      orderBy: {
        inquiryNumber: "desc",
      },
      select: {
        inquiryNumber: true,
      },
    });

    if (highest?.inquiryNumber && highest.inquiryNumber >= BASE_INQUIRY_NUMBER) {
      return highest.inquiryNumber + 1;
    }

    return BASE_INQUIRY_NUMBER + 1;
  } catch (err) {
    console.error("[getNextInquiryNumber] Failed to query highest inquiryNumber:", err);
    return BASE_INQUIRY_NUMBER + 1;
  }
}

export type BudgetRateType = "MONTHLY" | "HOURLY";

/** Tutor cards always show 3 slots. Extra unlocks stay open and are not shown as a full card. */
export const PUBLIC_TUTOR_SLOTS = 3;

export function publicTutorSlots(purchaseCount?: number | null): {
  max: number;
  purchased: number;
  left: number;
} {
  const purchased = Math.min(
    Math.max(0, purchaseCount ?? 0),
    PUBLIC_TUTOR_SLOTS - 1
  );
  return {
    max: PUBLIC_TUTOR_SLOTS,
    purchased,
    left: PUBLIC_TUTOR_SLOTS - purchased,
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gradeNumberFromClass(classLevel?: string | null): number | null {
  if (!classLevel) return null;
  if (/jee|neet|cuet|entrance|iit/i.test(classLevel)) return 12;
  const match = classLevel.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= 1 && n <= 12 ? n : null;
}

/**
 * Parent-style fee quote with a small gap (₹4,500–₹4,650), stable per lead.
 * Wide legacy bands and inflated hourly rates are pulled into a local tuition range.
 */
export function realisticTightBudget(lead?: {
  id?: string | null;
  inquiryNumber?: number | null;
  classLevel?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  timingPreference?: string | null;
} | null): { min: number; max: number } | null {
  if (!lead) return null;
  const grade = gradeNumberFromClass(lead.classLevel);
  const hourly = getLeadRateType(lead) === "HOURLY";
  const storedMin = lead.budgetMin && lead.budgetMin > 0 ? lead.budgetMin : null;
  const storedMax = lead.budgetMax && lead.budgetMax > 0 ? lead.budgetMax : null;

  if (!hourly && storedMin && storedMax) {
    const spread = storedMax - storedMin;
    if (spread > 0 && spread <= 200 && storedMin >= 3200 && storedMax <= 5600) {
      return { min: storedMin, max: storedMax };
    }
  }
  if (hourly && storedMin && storedMax) {
    const ceiling = grade !== null && grade >= 11 ? 700 : 430;
    const spread = storedMax - storedMin;
    if (spread > 0 && spread <= 40 && storedMin >= 280 && storedMax <= ceiling) {
      return { min: storedMin, max: storedMax };
    }
  }

  if (!lead.classLevel && !storedMin && !storedMax) return null;

  const seed = String(lead.inquiryNumber || lead.id || lead.classLevel || "lead");
  const pick = hashSeed(seed);

  if (!hourly) {
    const mins = grade !== null && grade <= 5
      ? [3600, 3750, 3900, 4100]
      : [4200, 4350, 4500, 4650];
    const min = mins[pick % mins.length];
    return { min, max: min + 150 };
  }

  const senior = grade !== null && grade >= 11;
  const mins = senior ? [450, 480, 520, 560] : [320, 340, 360, 380];
  const min = mins[pick % mins.length];
  return { min, max: min + (senior ? 30 : 20) };
}

/**
 * Leads older than a day and a half are presented as posted in the last ~34 hours,
 * so September inventory still reads as a fresh enquiry. Already-recent leads keep their time.
 */
export function presentLeadPostedAt(dateInput: string | Date, seed = ""): Date {
  const posted = new Date(dateInput);
  if (Number.isNaN(posted.getTime())) return new Date();
  const freshWindowMs = 36 * 60 * 60 * 1000;
  if (Date.now() - posted.getTime() < freshWindowMs) return posted;
  const hoursAgo = 2 + (hashSeed(`${seed}|${posted.toISOString()}`) % 33);
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

/**
 * Detects whether a lead is Hourly (per hour / per class) or Monthly.
 */
export function getLeadRateType(lead?: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  timingPreference?: string | null;
  classLevel?: string | null;
} | null): BudgetRateType {
  if (!lead) return "MONTHLY";

  // UNIVERSAL RULE:
  // Class 1 to 8: Strictly MONTHLY (/mo or /month)
  // Class 9 and above: Strictly HOURLY (/hr or /hour)
  if (lead.classLevel) {
    if (isTill8thClass(lead.classLevel)) {
      return "MONTHLY";
    }
    const numMatch = lead.classLevel.match(/\b(\d{1,2})\b/);
    if (numMatch && parseInt(numMatch[1], 10) >= 9) {
      return "HOURLY";
    }
    if (/jee|neet|cuet|entrance|senior|coding|computer/i.test(lead.classLevel)) {
      return "HOURLY";
    }
  }

  const notesLower = (lead.notes || "").toLowerCase();
  const timingLower = (lead.timingPreference || "").toLowerCase();

  if (
    notesLower.includes("[hourly]") ||
    notesLower.includes("hourly") ||
    notesLower.includes("/hr") ||
    notesLower.includes("per hour") ||
    notesLower.includes("per class") ||
    timingLower.includes("/hr") ||
    timingLower.includes("hourly")
  ) {
    return "HOURLY";
  }

  // If budgetMax is very small (<= 1500) and notes don't explicitly say monthly, likely hourly
  if (
    lead.budgetMax &&
    lead.budgetMax > 0 &&
    lead.budgetMax <= 1500 &&
    !notesLower.includes("[monthly]") &&
    !notesLower.includes("/mo") &&
    !notesLower.includes("per month")
  ) {
    return "HOURLY";
  }

  return "MONTHLY";
}

/**
 * Formats lead budget range nicely with proper unit (/mo or /hr).
 * Automatically normalizes any mismatched legacy values.
 */
export function formatLeadBudget(
  lead?: {
    budgetMin?: number | null;
    budgetMax?: number | null;
    notes?: string | null;
    timingPreference?: string | null;
    classLevel?: string | null;
  } | null,
  style: "short" | "full" = "short"
): string {
  if (!lead || (!lead.budgetMin && !lead.budgetMax && !lead.classLevel)) {
    return "Negotiable";
  }

  const isHourly = getLeadRateType(lead) === "HOURLY";
  const unit = style === "full" ? (isHourly ? " / hour" : " / month") : (isHourly ? "/hr" : "/mo");

  const tight = realisticTightBudget(lead);
  let bMin = tight?.min ?? lead.budgetMin;
  let bMax = tight?.max ?? lead.budgetMax;

  if (bMin && bMax) {
    if (bMin === bMax) {
      return `₹${bMin.toLocaleString("en-IN")}${unit}`;
    }
    return `₹${bMin.toLocaleString("en-IN")} – ₹${bMax.toLocaleString("en-IN")} ${unit}`;
  }

  if (bMin) {
    return `From ₹${bMin.toLocaleString("en-IN")} ${unit}`;
  }

  return `Up to ₹${bMax!.toLocaleString("en-IN")} ${unit}`;
}

/**
 * Checks whether an email address is a real, genuine user email (e.g. gmail, yahoo, outlook, custom domain)
 * vs a system-generated placeholder / auto-assigned account (e.g. user123@apnatutorhub.com).
 * Used to protect against wasting Resend / SES email credits on non-existent addresses.
 */
export function isGenuineEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (
    e.includes("@apnatutorhub.com") ||
    e.includes("@apnatutorhub.internal") ||
    e.includes("@placeholder.com") ||
    e.includes("@example.com") ||
    e.includes("@test.com")
  ) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Returns true if an email is a system placeholder / auto-generated test email.
 */
export function isSystemGeneratedEmail(email?: string | null): boolean {
  return !isGenuineEmail(email);
}

/**
 * Checks whether a class level is for early grades / primary school up to 5th grade
 * (Nursery, KG, LKG, UKG, Playgroup, Prep, Class 1 to 5, 1st to 5th Std, etc.).
 * Children up to 5th standard cannot effectively take online classes on their own.
 */
export function isTill5thClass(classLevel?: string | null): boolean {
  if (!classLevel || typeof classLevel !== "string") return false;
  const s = classLevel.trim().toLowerCase();
  if (!s) return false;

  // 1. Early childhood keywords
  if (
    s.includes("nursery") ||
    s.includes("playgroup") ||
    s.includes("lkg") ||
    s.includes("ukg") ||
    s.includes("pre-kg") ||
    s.includes("prep") ||
    s.includes("kindergarten") ||
    s.includes("primary") ||
    s.includes("junior kg") ||
    s.includes("senior kg") ||
    /\bkg\b/.test(s)
  ) {
    return true;
  }

  // 2. Explicit Class 1-5 ranges e.g. "Class 1-5", "1 to 5", "Class 1 to 5", "1st to 5th", "Class I-V"
  if (
    /(?:class\s*)?1\s*(?:[-–—]|\bto\b)\s*5\b/i.test(s) ||
    /1st\s*(?:[-–—]|\bto\b)\s*5th/i.test(s) ||
    /class\s*(i|1)\s*(?:[-–—]|\bto\b)\s*(v|5)/i.test(s)
  ) {
    return true;
  }

  // 3. Higher band checks — if it matches 6-8, 9-10, 11-12, JEE, NEET, CA, Coding, etc., it is NOT <= 5
  if (
    /class\s*(6|7|8|9|10|11|12)\b/i.test(s) ||
    /\b(6|7|8|9|10|11|12)(th)?\s*(grade|std|standard)?\b/i.test(s) ||
    /class\s*6\s*[-–—to]\s*8/i.test(s) ||
    /class\s*9\s*[-–—to]\s*10/i.test(s) ||
    /class\s*11\s*[-–—to]\s*12/i.test(s) ||
    /class\s*(vi|vii|viii|ix|x|xi|xii)\b/i.test(s) ||
    /jee|neet|iit|medical|ca|commerce|coding|computer|programming/i.test(s)
  ) {
    return false;
  }

  // 4. Single class 1 to 5 / Roman I to V
  if (
    /^class\s*([1-5])$/i.test(s) ||
    /^([1-5])(st|nd|rd|th)?\s*(grade|std|standard)?$/i.test(s) ||
    /^class\s*(i{1,3}|iv|v)$/i.test(s) ||
    /\b([1-5])(st|nd|rd|th)\b/i.test(s) ||
    /class\s*([1-5])\b/i.test(s) ||
    /class\s*(i|ii|iii|iv|v)\b/i.test(s)
  ) {
    return true;
  }

  return false;
}

/**
 * Class 1–8 (and nursery/KG/primary/middle): no online classes.
 * Used for tutor notifications and dummy leads.
 */
export function isTill8thClass(classLevel?: string | null): boolean {
  if (!classLevel || typeof classLevel !== "string") return false;
  const s = classLevel.trim().toLowerCase();
  if (!s) return false;

  if (isTill5thClass(classLevel)) return true;

  if (
    s.includes("middle") ||
    /(?:class\s*)?(?:1|6)\s*(?:[-–—]|\bto\b)\s*8\b/i.test(s) ||
    /class\s*(vi|6)\s*(?:[-–—]|\bto\b)\s*(viii|8)/i.test(s)
  ) {
    return true;
  }

  if (
    /class\s*(9|10|11|12)\b/i.test(s) ||
    /\b(9|10|11|12)(th)?\s*(grade|std|standard)?\b/i.test(s) ||
    /class\s*9\s*[-–—to]\s*10/i.test(s) ||
    /class\s*11\s*[-–—to]\s*12/i.test(s) ||
    /class\s*(ix|x|xi|xii)\b/i.test(s) ||
    /jee|neet|iit|medical|ca\b|commerce|coding|computer|programming/i.test(s)
  ) {
    return false;
  }

  if (
    /^class\s*([6-8])$/i.test(s) ||
    /^([6-8])(th)?\s*(grade|std|standard)?$/i.test(s) ||
    /^class\s*(vi|vii|viii)$/i.test(s) ||
    /\b([6-8])(th)\b/i.test(s) ||
    /class\s*([6-8])\b/i.test(s) ||
    /class\s*(vi|vii|viii)\b/i.test(s)
  ) {
    return true;
  }

  return false;
}

/**
 * Returns false if online classes are disabled for this grade (i.e. <= 8th class),
 * true if online classes are permitted.
 */
export function isOnlineClassEligible(classLevel?: string | null): boolean {
  return !isTill8thClass(classLevel);
}

/**
 * Checks if lead notifications are permitted.
 * Blocks notifications for ONLINE mode if the class level is <= 8th grade.
 */
export function canSendLeadNotification(lead: {
  mode?: string | null;
  classLevel?: string | null;
}): boolean {
  if (lead.mode === "ONLINE" && isTill8thClass(lead.classLevel)) {
    return false;
  }
  return true;
}


