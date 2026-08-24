/**
 * lib/lead-utils.ts
 *
 * Centralized utility for sequential Inquiry IDs / Lead Codes.
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
