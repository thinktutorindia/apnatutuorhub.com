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
  | "needClasses"
  | "unsupportedEmail"
  | "humanHandoff"
  | "oneMoment"
  | "leads"
  | "plans"
  | "fees"
  | "login"
  | "online"
  | "whereFrom"
  | "callMe"
  | "confirmSave";

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
  needClasses: {
    EN: "Which classes and subjects do you teach?",
    HINGLISH: "Aap kaunsi classes aur subjects padhate hain?",
    HI: "आप किस कक्षा और विषय पढ़ाते हैं?",
  },
  leads: {
    EN: "You can browse matching tuition leads on your dashboard: https://apnatutorhub.com/tutor/leads",
    HINGLISH: "Aap apne dashboard par matching tuition leads dekh sakte hain: https://apnatutorhub.com/tutor/leads",
    HI: "आप अपने डैशबोर्ड पर मैचिंग ट्यूशन लीड देख सकते हैं: https://apnatutorhub.com/tutor/leads",
  },
  plans: {
    EN: "The ₹1,257 Commission Plan gives 60 coins — 6 primary / 3 secondary / 2 senior unlocks, or any mix: https://apnatutorhub.com/tutor/plans",
    HINGLISH: "₹1,257 Commission Plan me 60 coins milte hain — 6 primary / 3 secondary / 2 senior unlocks, ya koi mix: https://apnatutorhub.com/tutor/plans",
    HI: "₹1,257 कमीशन प्लान में 60 कॉइन्स मिलते हैं — 6 प्राइमरी / 3 सेकंडरी / 2 सीनियर अनलॉक, या कोई मिश्रण: https://apnatutorhub.com/tutor/plans",
  },
  fees: {
    EN: "Fees are fixed by class: 1-8 ₹8,000–12,000/month; 9-10 ₹800–1,200/hour; 11-12 ₹1,200–2,200/hour.",
    HINGLISH: "Fees class ke hisaab se fixed hain: 1-8 ₹8,000–12,000/month; 9-10 ₹800–1,200/hour; 11-12 ₹1,200–2,200/hour.",
    HI: "शुल्क कक्षा के अनुसार निर्धारित हैं: 1-8 ₹8,000–12,000/माह; 9-10 ₹800–1,200/घंटा; 11-12 ₹1,200–2,200/घंटा।",
  },
  login: {
    EN: "Log in at https://apnatutorhub.com/login. If you forgot your password, reply MANUAL RESET.",
    HINGLISH: "https://apnatutorhub.com/login par login kijiye. Password bhool gaye to MANUAL RESET likhiye.",
    HI: "https://apnatutorhub.com/login पर लॉगिन करें। पासवर्ड भूल गए हों तो MANUAL RESET लिखें।",
  },
  online: {
    EN: "We have Pan-India online tuition leads: https://apnatutorhub.com/tutor/leads?mode=ONLINE",
    HINGLISH: "Pan-India online tuition leads maujood hain: https://apnatutorhub.com/tutor/leads?mode=ONLINE",
    HI: "पैन-इंडिया ऑनलाइन ट्यूशन लीड उपलब्ध हैं: https://apnatutorhub.com/tutor/leads?mode=ONLINE",
  },
  whereFrom: {
    EN: "You received our message because you registered or enquired on ApnaTutorHub. Reply STOP to opt out.",
    HINGLISH: "Aapko hamara message isliye mila kyunki aapne ApnaTutorHub par register ya enquiry ki thi. STOP karke band kar sakte hain.",
    HI: "आपको हमारा संदेश इसलिए मिला क्योंकि आपने ApnaTutorHub पर पंजीकरण या पूछताछ की थी। STOP से बंद कर सकते हैं।",
  },
  callMe: {
    EN: "Our coordinator will call you. Please share a convenient time.",
    HINGLISH: "Hamara coordinator aapko call karega. Suitable time bhejiye.",
    HI: "हमारा समन्वयक आपको कॉल करेगा। कृपया सुविधाजनक समय बताएं।",
  },
  confirmSave: {
    EN: "Please reply YES to confirm this change, or NO to cancel.",
    HINGLISH: "Is badlaav ko confirm karne ke liye YES likhiye, ya cancel ke liye NO.",
    HI: "इस परिवर्तन की पुष्टि के लिए YES लिखें, या रद्द करने के लिए NO।",
  },
};

/** Reply to an inbound message in the SAME language family. */
export function replyInLanguage(inbound: string, key: TemplateKey): string {
  return TEMPLATES[key][detectLanguage(inbound)];
}
