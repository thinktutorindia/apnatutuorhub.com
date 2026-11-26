/**
 * ONE language policy for the modular pipeline: match the user's language.
 * English in → English out · Hinglish in → Hinglish out · Hindi in → Hindi out.
 *
 * This module is shadow-only for now; the legacy engine stays English-only
 * until cutover. No network calls, no DB writes.
 */

export type ReplyLanguage = "EN" | "HINGLISH" | "HI";

const DEVANAGARI = /[\u0900-\u097F]/;
const HINGLISH_MARKERS = /\b(aap|aapka|aapko|aapke|kaise|kya|kyu|kyun|nahi|nahin|chahiye|chahein|batao|bataiye|samajh|theek|thik|haan|han|ji|sir|ma'am|padhna|padhana|leads?|plans?|karo|karein|milti|milte|hai|hain|hoon|rehta|rehti|yahin|yahi|abhi|pehle|baad|mein|mai|se|ka|ki|ke|ko|aur|ya|test|check|kar|diya|diye|doon|dunga|dungi)\b/i;

export function detectLanguage(text: string): ReplyLanguage {
  const raw = (text ?? "").trim();
  if (!raw) return "EN";
  if (DEVANAGARI.test(raw)) return "HI";
  const words = raw.match(/[a-zA-Z]+/g) ?? [];
  const hinglishCount = words.filter((w) => HINGLISH_MARKERS.test(w)).length;
  // A single common marker like "ji" is enough to flip a short message.
  if (hinglishCount >= 1 && words.length <= 5) return "HINGLISH";
  if (hinglishCount >= 2) return "HINGLISH";
  return "EN";
}

export type TemplateKey =
  | "fallback"
  | "welcomeBack"
  | "needName"
  | "needEmail"
  | "needLocation"
  | "unsupportedEmail"
  | "humanHandoff"
  | "oneMoment";

const TEMPLATES: Record<TemplateKey, Record<ReplyLanguage, string>> = {
  fallback: {
    EN: "Sorry, I didn't get that. Reply 1 for leads, 2 for plans, or HUMAN.",
    HINGLISH: "Sorry, samajh nahi paya. Leads ke liye 1, plans ke liye 2, ya HUMAN likhiye.",
    HI: "माफ़ कीजिए, मैं समझ नहीं पाया। लीड्स के लिए 1, प्लान के लिए 2, या HUMAN लिखिए।",
  },
  welcomeBack: {
    EN: "Welcome back! What would you like to do today?",
    HINGLISH: "Wapas swagat hai! Aaj aap kya karna chahte hain?",
    HI: "वापस स्वागत है! आज आप क्या करना चाहेंगे?",
  },
  needName: {
    EN: "What is your full name?",
    HINGLISH: "Aapka poora naam kya hai?",
    HI: "आपका पूरा नाम क्या है?",
  },
  needEmail: {
    EN: "Please share a valid email address.",
    HINGLISH: "Kripya ek valid email address bhejiye.",
    HI: "कृपया एक मान्य ईमेल पता भेजें।",
  },
  needLocation: {
    EN: "Please share your locality and city.",
    HINGLISH: "Aapki locality aur city bhejiye.",
    HI: "आपकी लोकैलिटी और शहर भेजें।",
  },
  unsupportedEmail: {
    EN: "This email doesn't look supported, please send another one.",
    HINGLISH: "Yeh email supported nahi lagta, kripya doosra email bhejiye.",
    HI: "यह ईमेल समर्थित नहीं लगता, कृपया दूसरा ईमेल भेजें।",
  },
  humanHandoff: {
    EN: "I'm connecting you with our coordinator. Please share a convenient time.",
    HINGLISH: "Main aapko coordinator se connect kar raha hoon. Suitable time bhejiye.",
    HI: "मैं आपको समन्वयक से जोड़ रहा हूँ। सुविधाजनक समय भेजें।",
  },
  oneMoment: {
    EN: "One moment please…",
    HINGLISH: "Thoda wait kijiye…",
    HI: "कृपया एक क्षण प्रतीक्षा करें…",
  },
};

/** Reply to an inbound message in the SAME language family. */
export function replyInLanguage(inbound: string, key: TemplateKey): string {
  return TEMPLATES[key][detectLanguage(inbound)];
}
