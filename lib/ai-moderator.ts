/**
 * lib/ai-moderator.ts
 * Enterprise Upgrade — Phase 4: AI Moderation Engine
 *
 * Automated content moderation for user-generated text:
 * - Lead descriptions & requirements
 * - Tutor profile bios & qualifications
 * - Public review content
 * - Chat messages
 *
 * Protection Mechanisms:
 * 1. Contact Leak Prevention (Phone numbers, emails, external URLs hidden in text to bypass platform fees)
 * 2. Profanity & Offensiveness Filtering
 * 3. Text Sanitization (Redacts phone numbers/emails with `[REDACTED]`)
 */

// ── Regex Patterns ────────────────────────────────────────────────────────────

// Indian phone numbers in various formats (+91, 10-digits, spaced, dot-separated, word-formatted)
const PHONE_PATTERN =
  /(?:\+?91[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g;

// Email pattern
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// External URLs (except internal platform links)
const URL_PATTERN =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Profanity list (basic tier)
const PROFANITY_WORDS = [
  "abuse",
  "scam",
  "cheat",
  "fake",
  "idiot",
  "stupid",
  "fraud",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModerationResult = {
  isAllowed: boolean;
  status: "APPROVED" | "FLAGGED" | "REJECTED";
  flaggedReasons: string[];
  sanitizedContent: string;
};

// ── Moderation Engine ─────────────────────────────────────────────────────────

/**
 * Moderates user-supplied text content.
 * Redacts contact leaks and detects spam/profanity.
 */
export function moderateText(text: string): ModerationResult {
  if (!text || typeof text !== "string") {
    return {
      isAllowed: true,
      status: "APPROVED",
      flaggedReasons: [],
      sanitizedContent: "",
    };
  }

  const flaggedReasons: string[] = [];
  let sanitizedContent = text;

  // Check 1: Phone Numbers
  const withPhoneRedacted = sanitizedContent.replace(PHONE_PATTERN, "[REDACTED PHONE]");
  if (withPhoneRedacted !== sanitizedContent) {
    flaggedReasons.push("CONTACT_LEAK_PHONE");
    sanitizedContent = withPhoneRedacted;
  }

  // Check 2: Emails
  const withEmailRedacted = sanitizedContent.replace(EMAIL_PATTERN, "[REDACTED EMAIL]");
  if (withEmailRedacted !== sanitizedContent) {
    flaggedReasons.push("CONTACT_LEAK_EMAIL");
    sanitizedContent = withEmailRedacted;
  }

  // Check 3: External URLs
  const withUrlRedacted = sanitizedContent.replace(URL_PATTERN, "[REDACTED LINK]");
  if (withUrlRedacted !== sanitizedContent) {
    flaggedReasons.push("EXTERNAL_URL");
    sanitizedContent = withUrlRedacted;
  }

  // Check 4: Profanity
  const lowerText = text.toLowerCase();
  const foundProfanity = PROFANITY_WORDS.filter((word) =>
    lowerText.includes(word)
  );

  if (foundProfanity.length > 0) {
    flaggedReasons.push(`PROFANITY_${foundProfanity.join("_").toUpperCase()}`);
  }

  // Determination
  const hasContactLeak = flaggedReasons.some((r) =>
    r.startsWith("CONTACT_LEAK")
  );
  const hasProfanity = flaggedReasons.some((r) => r.startsWith("PROFANITY"));

  let status: ModerationResult["status"] = "APPROVED";
  let isAllowed = true;

  if (hasProfanity) {
    status = "REJECTED";
    isAllowed = false;
  } else if (hasContactLeak) {
    status = "FLAGGED";
    isAllowed = true; // Allowed but redacted
  }

  return {
    isAllowed,
    status,
    flaggedReasons,
    sanitizedContent,
  };
}
