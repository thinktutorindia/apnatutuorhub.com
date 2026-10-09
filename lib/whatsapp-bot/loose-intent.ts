/**
 * Human-style messages that are not exact keywords — typos, slang, vague replies.
 */

export type LooseIntent =
  | "GREETING"
  | "THANKS"
  | "LEADS"
  | "PLANS"
  | "PROFILE"
  | "HELP"
  | "CONFUSED"
  | "NOISE";

const LEADS_LOOSE =
  /\b(leds?|lede|lid|leadz|tuition|tution|students?|requirement|inquiry|enquiry|class\s*chahiye|padhana|padha(?:na|ne)|unlock|contact\s*number|parent\s*no)\b/i;
const PLANS_LOOSE =
  /\b(pln|paln|plan|membership|membrship|recharge|rechrg|top\s*up|topup|wallet|coins?|kharid|payment|pay\s*karna)\b/i;
const PROFILE_LOOSE =
  /\b(profil|profile|mera\s*data|my\s*detail|location\s*update|area\s*change|subject\s*change)\b/i;
const HELP_LOOSE =
  /\b(help|madad|support|samjha(?:o|na)|explain|bata(?:o|do)|guide|kaise\s*kaam)\b/i;
const THANKS_LOOSE =
  /\b(thanks?|thank\s*you|dhanyavad|shukriya|thx|ty|ok\s*thanks|theek\s*hai\s*thanks)\b/i;
const GREETING_LOOSE =
  /^(hi+|hello+|hey+|namaste|namaskar|good\s*(morning|evening|afternoon)|gm|sup)[\s!.]*$/i;

/** Very short or emoji-only — not enough signal for AI without context */
export function looksLikeUnexpectedNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length <= 2 && !/^\d+$/.test(t)) return true;
  if (/^[\p{Emoji}\s]+$/u.test(t)) return true;
  if (/^[^a-zA-Z0-9\u0900-\u097F]{1,8}$/.test(t)) return true;
  if (/^(asdf|qwerty|test|xxx|hahaha+|lol+|hehe+)$/i.test(t)) return true;
  return false;
}

export function detectLooseIntent(rawMessage: string): LooseIntent | null {
  const t = rawMessage.trim();
  if (!t) return "NOISE";

  if (GREETING_LOOSE.test(t)) return "GREETING";
  if (THANKS_LOOSE.test(t)) return "THANKS";
  if (LEADS_LOOSE.test(t)) return "LEADS";
  if (PLANS_LOOSE.test(t)) return "PLANS";
  if (PROFILE_LOOSE.test(t)) return "PROFILE";
  if (HELP_LOOSE.test(t)) return "HELP";
  if (/\b(pata\s*nahi|samajh\s*nahi|kuch\s*nahi|random|galat|wrong|typo|mistake|sorry|maaf)\b/i.test(t)) {
    return "CONFUSED";
  }

  return null;
}

export function looseIntentClarifyReply(intent: LooseIntent, isTutor: boolean): string {
  if (intent === "GREETING") {
    return isTutor
      ? "Namaste! Main Priya, ApnaTutorHub se. Aap tutor hain — aapke area ki leads dekhni hain ya profile update karna hai?"
      : "Namaste! Main Priya, ApnaTutorHub se. Bachche ke liye tutor chahiye ya koi aur sawaal?";
  }
  if (intent === "THANKS") {
    return "Aapka dhanyavaad! Kuch aur chahiye ho to likh dein — *leads*, *profile*, *coins*, ya *help*.";
  }
  if (intent === "CONFUSED" || intent === "NOISE") {
    return isTutor
      ? "Thoda clear nahi hua — koi baat nahi. 😊\n\nAap yeh likh sakte hain:\n• *Leads* — matching students\n• *Rohini mein koi class?* — area wise leads\n• *My profile* — apna data\n• *Help* — coordinator\n\nYa seedha apna sawaal ek line mein likh dein."
      : "Thoda clear nahi hua. Bachche ki *class*, *subject* aur *area* ek line mein likh dein — jaise: *Class 8, Maths, Saket*";
  }
  if (intent === "LEADS") return "";
  if (intent === "PLANS") return "";
  if (intent === "PROFILE") return "";
  if (intent === "HELP") return "";
  return "";
}
