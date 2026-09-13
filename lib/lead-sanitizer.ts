/**
 * Lead Sanitizer Utility
 * Prevents student/parent phone numbers, emails, and internal batch metadata
 * from leaking to tutors before purchasing the lead.
 */

/**
 * Sanitizes lead notes to ensure NO phone numbers, emails, or internal
 * admin/batch metadata are leaked to tutors before purchase.
 *
 * @param notes Raw notes string from the database
 * @param isPurchased Whether the tutor has unlocked/purchased this lead
 * @returns Cleaned notes string or null if empty/sanitized completely
 */
export function sanitizeLeadNotes(
  notes: string | null | undefined,
  isPurchased = false
): string | null {
  if (!notes) return null;

  let text = notes;

  // 1. Always strip internal batch, source, and admin metadata tags
  text = text
    .replace(/\[(?:MONTHLY RATE|HOURLY|DAILY|SYSTEM)[^\]]*\]/gi, "")
    .replace(/\[Batch:[^\]]*\]/gi, "")
    .replace(/\[Source:[^\]]*\]/gi, "")
    .replace(/\[RefId:[^\]]*\]/gi, "")
    .replace(/\[Ref:[^\]]*\]/gi, "")
    .replace(/ATH-PAR-\d+/gi, "");

  // 2. If NOT purchased, aggressively strip ANY contact details
  if (!isPurchased) {
    text = text
      // Strip explicit Contact wrappers like | Contact: +91 98914 45446 | or / Contact: +91 98914 45446]
      .replace(/[|/]?\s*Contact:\s*[^|\]\n]+(?:[|\]]|$)/gi, "")
      // Strip call/contact phrases leading into numbers
      .replace(/(?:please\s+)?(?:call|contact|whatsapp|reach|ping|msg|message)\s+(?:me|us)?\s*(?:at|on)?\s*[:=–-]?\s*\+?[\d\s-]{7,}\d/gi, "")
      .replace(/(?:Contact|Phone|Ph|Call|Mobile|Mob|WhatsApp|WA|Wapp|Tel|Number|No)\s*[:=–-]?\s*\+?[\d\s-]{7,}\d/gi, "")
      // Strip Indian mobile numbers (with or without +91, spaces, hyphens)
      .replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g, "")
      .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, "")
      // Any sequence of 10-12 digits or formatted numbers like 98765 43210 or spaced numbers
      .replace(/\b\d{5}[\s-]\d{5}\b/g, "")
      .replace(/\b\d{10,12}\b/g, "")
      .replace(/(?:\b\d[\s-]?){10,12}\b/g, "")
      // Strip email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
      // Strip standalone contact labels left behind
      .replace(/(?:Contact|Phone|Mobile|WhatsApp|Call)\s*[:=–-]?\s*/gi, "");
  } else {
    // Even if purchased, clean out the ugly "| Contact: +91 ... |" wrapper
    // because parent phone is already shown cleanly in parentDetails.phone!
    text = text.replace(/[|/]?\s*Contact:\s*[^|\]\n]+(?:[|\]]|$)/gi, "");
  }

  // 3. Clean up dangling delimiters, pipes, commas, brackets, dashes, quotes, and whitespace
  text = text
    .replace(/^[|/\\,\-;:\s"\])]+/, "")
    .replace(/[|/\\,\-;:\s"\[(]+$/, "")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 4. If text is empty or contains no meaningful letters (or only separators)
  if (!text || text.length < 3) return null;
  // If only punctuation, digits, or symbols remain without letters
  if (!/[a-zA-Z]/.test(text)) return null;

  return text;
}
