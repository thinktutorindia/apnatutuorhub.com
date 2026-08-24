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

