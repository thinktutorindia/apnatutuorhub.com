/**
 * lib/whatsapp-bot/loose-intent.ts
 * Human-style messages that are not exact keywords — typos, slang, vague replies.
 */

export type LooseIntent =
  | "GREETING"
  | "THANKS"
  | "LEADS"
  | "PLANS"
  | "PROFILE"
  | "HELP"
  | "DECLINE"
  | "WRONG_INFO"
  | "PING"
  | "CONFUSED"
  | "NOISE";

const LEADS_LOOSE =
  /\b(leds?|lede|lid|leadz|tuition|tution|students?|requirement|inquiry|enquiry|class\s*chahiye|padhana|padha(?:na|ne)|unlock|contact\s*number|parent\s*no)\b/i;
const PLANS_LOOSE =
  /\b(pln|paln|plan|membership|membrship|recharge|rechrg|top\s*up|topup|wallet|coins?|kharid|payment|pay\s*karna)\b/i;
const PROFILE_LOOSE =
  /\b(profil|profile|mera\s*data|my\s*detail|location\s*update|area\s*change|subject\s*change)\b/i;
const HELP_LOOSE =
  /\b(help|madad|support|samjha(?:o|na)|explain|bata(?:o|do)|guide|kaise\s*kaam|insan|human|agent|call\s*karo|phone\s*karo|call\s*me|call\s*kr|baat\s*karni)\b/i;
const THANKS_LOOSE =
  /^(?:thanks?|thank\s*you|dhanyavad|shukriya|thx|ty|ok\s*thanks|theek\s*hai\s*thanks)(?:\s+(?:ji|sir|mam|madam|priya))?[\s!.]*$|^(?:धन्यवाद|शुक्रिया|थैंक्यू|थैंक्स)[\s!.]*$/iu;
const GREETING_LOOSE =
  /^(?:hi+|hello+|hey+|namaste|namaskar|good\s*(?:morning|evening|afternoon)|gm|sup)(?:\s+(?:ji|sir|mam|madam|priya|bhai|team))?[\s!.]*$|^(?:नमस्ते|नमस्कार|प्रणाम|शुभप्रभात)(?:\s+जी)?[\s!.]*$/iu;

const DECLINE_LOOSE =
  /^(?:no+|ni+|na+|nahi+|nope|nah|kuch\s*nahi|not\s*interested|nothing|nahi\s*chahiye|not\s*needed|abhi\s*nahi|later)(?:\s+(?:thanks?|thx|ji|sir|mam|madam|bhai))?[\s.!]*$|^(?:नहीं|ना|कुछ\s*नहीं|ज़रूरत\s*नहीं|बाद\s*में)(?:\s+जी)?[\s.!]*$/iu;

const WRONG_INFO_LOOSE =
  /\b(?:wrong|galat|incorrect|fake|bad|invalid)\b.*\b(?:info|information|number|lead|detail|details|data|phone)\b|\b(?:these\s*info\s*are\s*wrong|info\s*galat\s*hai|number\s*galat|galat\s*lead|galat\s*hai)\b|गलत\s*नंबर|गलत\s*लीड|गलत\s*जानकारी/iu;

const GREETING_EMOJIS = /^[👋🙏🤝🙋💐]+$/u;
const ACK_EMOJIS = /^[👍👌✅💯👏]+$/u;
const PING_PATTERNS = /^[.?!,\s]+$/;

/**
 * Filter out real noise/gibberish.
 * Never flags common Indian text replies like "No", "Ni", "Ok", single digits, Hindi words or standard emojis as noise.
 */
export function looksLikeUnexpectedNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  // Real short answers, digits & pings are NOT noise (Roman + Devanagari)
  if (/^(no|ni|na|ha|ok|ji|hi|\.|\?|\?\?|\?\?\?|1|2|3|4|5|6|हाँ|ना|जी|नहीं|नमस्ते)$/iu.test(t)) return false;
  if (GREETING_EMOJIS.test(t) || ACK_EMOJIS.test(t)) return false;

  // Real gibberish or spam strings
  if (/^(asdf|qwerty|test|xxx|hahaha+|lol+|hehe+|zzz+|abcdef)$/i.test(t)) return true;
  if (/^[^a-zA-Z0-9\u0900-\u097F]{4,}$/.test(t) && !GREETING_EMOJIS.test(t) && !ACK_EMOJIS.test(t)) return true;

  return false;
}

export function detectLooseIntent(rawMessage: string): LooseIntent | null {
  const t = rawMessage.trim();
  if (!t) return "NOISE";

  // Emoji greetings & acknowledgements
  if (GREETING_EMOJIS.test(t)) return "GREETING";
  if (ACK_EMOJIS.test(t)) return "THANKS";
  if (PING_PATTERNS.test(t)) return "PING";

  // Decline / negation answers ("No", "Ni", "Kuch nahi")
  if (DECLINE_LOOSE.test(t)) return "DECLINE";

  // Wrong information / bad lead complaints
  if (WRONG_INFO_LOOSE.test(t)) return "WRONG_INFO";

  const isTelecomNoise = /thank\s*you\s*for\s*calling|my\s*post\s*paid/i.test(t);
  const hasQuestion = /\?/.test(t) || /(?:kay|kya|kyu|fir|phir|why|what|kahan|kaise|kitne|kaunsa)/i.test(t);

  if (GREETING_LOOSE.test(t) && !hasQuestion) return "GREETING";
  if (THANKS_LOOSE.test(t) && !isTelecomNoise && !hasQuestion) return "THANKS";
  if (LEADS_LOOSE.test(t) && !hasQuestion) return "LEADS";
  if (PLANS_LOOSE.test(t)) return "PLANS";
  if (PROFILE_LOOSE.test(t)) return "PROFILE";
  if (HELP_LOOSE.test(t)) return "HELP";
  if (/\b(pata\s*nahi|samajh\s*nahi|random|typo|mistake|sorry|maaf)\b/i.test(t)) {
    return "CONFUSED";
  }

  return null;
}

export function looseIntentClarifyReply(intent: LooseIntent, isTutor: boolean): string {
  if (intent === "GREETING") {
    return isTutor
      ? "Namaste! Main Priya, ApnaTutorHub coordinator. Batayein, matching leads dekhni hain ya profile update karni hai? 🙏"
      : "Namaste! Main Priya, ApnaTutorHub coordinator. Bachche ke liye tutor chahiye ya koi aur sawaal? 🙏";
  }
  if (intent === "THANKS") {
    return "Aapka dhanyavaad! Kuch aur chahiye ho to likh dein — *leads*, *profile*, *coins*, ya *help*.";
  }
  if (intent === "DECLINE") {
    return "Theek hai, koi baat nahi! 🙏 Jab bhi aapko fresh tuition requirements ya koi help chahiye ho, bas yahan *LEADS* likh dein.";
  }
  if (intent === "WRONG_INFO") {
    return "Report note kar li gayi hai! 📋 Agar kisi lead mein contact number ya student detail galat hai, toh hamari verification team turant check karke lead update karegi aur coins wallet mein refund kar degi.\n\n📞 Support Helpline: 08062180653 / WhatsApp: +91 93191 93109";
  }
  if (intent === "PING") {
    return isTutor
      ? "Ji batayein, hum aapki kya madad kar sakte hain? Aap matching student leads dekhna chahte hain ya koi requirement check karni hai? 😊"
      : "Ji batayein, bachche ke liye kaunsi class aur subject ka home tutor chahiye? 🎓";
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
