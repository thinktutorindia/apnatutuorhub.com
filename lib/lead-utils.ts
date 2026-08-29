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

/**
 * Detects whether a lead is Hourly (per hour / per class) or Monthly.
 */
export function getLeadRateType(lead?: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  timingPreference?: string | null;
} | null): BudgetRateType {
  if (!lead) return "MONTHLY";
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
 */
export function formatLeadBudget(
  lead?: {
    budgetMin?: number | null;
    budgetMax?: number | null;
    notes?: string | null;
    timingPreference?: string | null;
  } | null,
  style: "short" | "full" = "short"
): string {
  if (!lead || (!lead.budgetMin && !lead.budgetMax)) {
    return "Negotiable";
  }

  const isHourly = getLeadRateType(lead) === "HOURLY";
  const unit = style === "full" ? (isHourly ? " / hour" : " / month") : (isHourly ? "/hr" : "/mo");

  if (lead.budgetMin && lead.budgetMax) {
    if (lead.budgetMin === lead.budgetMax) {
      return `₹${lead.budgetMin.toLocaleString("en-IN")}${unit}`;
    }
    return `₹${lead.budgetMin.toLocaleString("en-IN")} – ₹${lead.budgetMax.toLocaleString("en-IN")} ${unit}`;
  }

  if (lead.budgetMin) {
    return `From ₹${lead.budgetMin.toLocaleString("en-IN")} ${unit}`;
  }

  return `Up to ₹${lead.budgetMax!.toLocaleString("en-IN")} ${unit}`;
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
 * Returns false if online classes are disabled for this grade (i.e. <= 5th class),
 * true if online classes are permitted.
 */
export function isOnlineClassEligible(classLevel?: string | null): boolean {
  return !isTill5thClass(classLevel);
}

/**
 * Checks if lead notifications are permitted.
 * Blocks notifications for ONLINE mode if the class level is <= 5th grade.
 */
export function canSendLeadNotification(lead: {
  mode?: string | null;
  classLevel?: string | null;
}): boolean {
  if (lead.mode === "ONLINE" && isTill5thClass(lead.classLevel)) {
    return false;
  }
  return true;
}


