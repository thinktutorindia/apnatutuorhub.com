import {
  extractPublicLocality,
  isTill8thClass,
  leadSubjectsForClass,
  normalizeCanonicalClassLevel,
} from "@/lib/lead-utils";
import type { VoiceExtract, VoiceRole } from "./agent";

export type VoiceLeadBrief = {
  classLevel: string;
  area: string;
  budget: string;
};

export function normalizeCallerText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bapki\b/gi, "aapko")
    .replace(/\bapke\b/gi, "aapke")
    .replace(/\bapko\b/gi, "aapko")
    .replace(/\bapp\b/gi, "aap")
    .replace(/\bchiaye\b/gi, "chahiye")
    .replace(/\bchahie\b/gi, "chahiye")
    .replace(/\bchahye\b/gi, "chahiye")
    .replace(/\bnhi\b/gi, "nahi")
    .replace(/\bnahi+\b/gi, "nahi")
    .replace(/\bmai\b/gi, "main")
    .replace(/\bhu\b/gi, "hoon")
    .replace(/\bhun\b/gi, "hoon")
    .replace(/\bhoun\b/gi, "hoon")
    .replace(/\bpdata\b/gi, "padhata")
    .replace(/\bpadta\b/gi, "padhata")
    .replace(/\bpadhta\b/gi, "padhata")
    .replace(/\bpadhti\b/gi, "padhati")
    .replace(/\bbtaiye\b/gi, "bataiye")
    .replace(/\bbtao\b/gi, "batao")
    .replace(/\btk\b/gi, "tak")
    .replace(/\bmam\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TUTOR_SELF =
  /\b(main tutor|tutor hoon|tutor hun|teacher hoon|main padhata|main padhati|padhata hoon|padhati hoon|leads chahiye|leads bata|leads do|enquiry do|unlock lead|membership|coins chahiye|main teacher)\b/i;
const PARENT_NEED =
  /\b(tutor chahiye|teacher chahiye|tuition chahiye|home tuition|mujhe tutor|need a tutor|need a teacher|looking for (a )?tutor|bachch|beta |beti |padhana hai)\b/i;

export function inferVoiceRole(text: string, current: VoiceRole): VoiceRole {
  const tutorSelf = TUTOR_SELF.test(text);
  const parentNeed = PARENT_NEED.test(text);
  if (tutorSelf && !parentNeed) return "TUTOR";
  if (current) return current;
  if (parentNeed) return "PARENT";
  return null;
}

export function callerPrefersHindi(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
  const english = /\b(i need|i am|i'm|looking for|please)\b/i.test(text);
  const hinglish = /\b(hai|hoon|chahiye|mujhe|mera|kya|ke liye|nahi|main)\b/i.test(text);
  if (english && !hinglish) return false;
  return true;
}

function inferCity(text: string, prev?: string): string | undefined {
  const match = text.match(
    /\b(greater noida|new delhi|delhi|noida|gurugram|gurgaon|ghaziabad|faridabad|sonipat|bahadurgarh)\b/i
  );
  if (match) {
    const city = match[1].replace(/\s+/g, " ");
    if (/^gurgaon$/i.test(city)) return "Gurugram";
    if (/^new delhi$/i.test(city)) return "Delhi";
    return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase().replace(/\bdelhi\b/i, "Delhi");
  }
  return prev;
}

function inferFee(text: string): number | undefined {
  const match = text.replace(/,/g, "").match(/\b(\d{3,6})\s*(?:rs|inr|rupees|\/mo|per month|month|hourly|\/hr)?\b/i);
  if (!match) return undefined;
  const fee = Number(match[1]);
  return fee >= 300 && fee <= 50000 ? fee : undefined;
}

function inferName(text: string, prev?: string): string | undefined {
  const match = text.match(/(?:mera naam|my name is)\s+([a-zA-Z\u0900-\u097F]{2,40})(?:\s|$)/i);
  const name = match?.[1]?.trim();
  if (!name) return prev;
  if (/^(tutor|teacher|parent|student|hoon|hai)$/i.test(name)) return prev;
  return name;
}

function titlePlace(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function cleanArea(area?: string | null): string | undefined {
  if (!area) return undefined;
  const named = area.match(
    /\b([A-Za-z][A-Za-z'-]*\s+(?:Vihar|Nagar|Bagh|Kunj|Colony|Enclave|Ganj|Pur)|Sector\s*-?\s*\d+[A-Za-z]?|Rohini|Dwarka|Saket|Kalkaji)\b/i
  );
  if (named) return titlePlace(named[1]);
  const stripped = area
    .replace(/^\s*(app|aap|mujhe|mujhko|please|ko|ki|ke|main|hoon)\s+/gi, "")
    .trim();
  return stripped || undefined;
}

function classFromSpeech(text: string, prev?: string): string | undefined {
  const till = text.match(
    /(?:class|grade|std)?\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:tak|till|upto|se tak)/i
  );
  if (till) {
    const n = parseInt(till[1], 10);
    if (n >= 2 && n <= 12) return `Class 1-${n}`;
    if (n === 1) return "Class 1";
  }
  return normalizeCanonicalClassLevel(text) || prev;
}

function isJuniorBand(classLevel?: string): boolean {
  if (!classLevel) return false;
  if (isTill8thClass(classLevel)) return true;
  const till = classLevel.match(/^Class 1-([1-8])$/i);
  return Boolean(till);
}

export function extractFromCallerText(text: string, prev: VoiceExtract): VoiceExtract {
  const classLevel = classFromSpeech(text, prev.classLevel);
  const area =
    cleanArea(extractPublicLocality(text, prev.city || inferCity(text, prev.city))) || prev.area;
  const city = inferCity(text, prev.city);
  const fee = inferFee(text) ?? prev.fee;
  const name = inferName(text, prev.name);
  const subjects = classLevel
    ? isJuniorBand(classLevel)
      ? ["All Subjects"]
      : leadSubjectsForClass(classLevel, prev.subjects)
    : prev.subjects;
  const rateType = classLevel
    ? isJuniorBand(classLevel)
      ? "MONTHLY"
      : prev.rateType || (fee && fee < 2000 ? "HOURLY" : "MONTHLY")
    : prev.rateType;
  return {
    name,
    classLevel: classLevel || undefined,
    subjects: subjects?.length ? subjects : prev.subjects,
    area: area || undefined,
    city,
    fee,
    rateType,
  };
}

export function languageMismatch(say: string, hindi: boolean): boolean {
  const sayHindi = /[\u0900-\u097F]/.test(say) || /\b(hai|aap|chahiye|kya|hoon|ji|achha|theek)\b/i.test(say);
  if (hindi && !sayHindi) return true;
  if (!hindi && /[\u0900-\u097F]/.test(say) && !/[A-Za-z]{3,}/.test(say)) return true;
  return false;
}

export function soundsLikeChatbot(say: string): boolean {
  return /स्वागत|welcome to|apnatutorhub\.com|वेबसाइट|website |login करके|लीड्स पेज|visit (our|the) (site|website)|go to (the )?website/i.test(
    say
  );
}

export function parentReady(role: VoiceRole, extracted: VoiceExtract): boolean {
  if (role !== "PARENT") return false;
  if (!extracted.classLevel || !extracted.area) return false;
  if (/^(delhi|ncr|delhi ncr|india)$/i.test(extracted.area)) return false;
  if (!isTill8thClass(extracted.classLevel) && !extracted.subjects?.length) return false;
  return true;
}

export function spokenLeadLine(lead: VoiceLeadBrief, hindi: boolean): string {
  const place = lead.area || "nearby";
  if (hindi) {
    return `${place} में ${lead.classLevel} की एक enquiry है, फीस लगभग ${lead.budget}। Unlock करीब दस कॉइन। WhatsApp पर भेज दूँ?`;
  }
  return `There is a ${lead.classLevel} enquiry in ${place}, fee about ${lead.budget}. Unlock is about 10 coins. Shall I send it on WhatsApp?`;
}

export function nextMissingAsk(
  role: VoiceRole,
  extracted: VoiceExtract,
  hindi: boolean,
  leads: VoiceLeadBrief[] = []
): string {
  if (!role) {
    return hindi
      ? "जी, आपको ट्यूटर चाहिए या आप खुद पढ़ाते हैं?"
      : "Just to be sure — do you need a tutor, or do you teach?";
  }
  if (role === "TUTOR") {
    if (leads[0]) return spokenLeadLine(leads[0], hindi);
    if (!extracted.area || /^(delhi|ncr|delhi ncr|india)$/i.test(extracted.area)) {
      return hindi ? "अच्छा, आप ट्यूटर हैं। कौनसी एरिया से पढ़ाते हैं?" : "Got it, you teach. Which area are you in?";
    }
    if (!extracted.classLevel) {
      return hindi
        ? `${extracted.area} से। कौनसी क्लास तक पढ़ाते हैं?`
        : `${extracted.area} — till which class do you teach?`;
    }
    return hindi
      ? `${extracted.area} में ${extracted.classLevel} की ताज़ी लीड अभी नहीं है। आते ही WhatsApp अलर्ट जाएगा। प्लान नौ सौ निन्यानवे प्लस जीएसटी, लगभग साठ कॉइन।`
      : `No fresh ${extracted.classLevel} lead in ${extracted.area} right now. WhatsApp alert goes out when one comes. Plan is 999 plus GST, about 60 coins.`;
  }
  if (!extracted.classLevel) {
    return hindi ? "बच्चा कौनसी क्लास में है?" : "Which class is the child in?";
  }
  if (!isTill8thClass(extracted.classLevel) && !extracted.subjects?.length) {
    return hindi ? "कौनसा विषय चाहिए?" : "Which subject?";
  }
  if (!extracted.area || /^(delhi|ncr|delhi ncr|india)$/i.test(extracted.area)) {
    return hindi ? "कौनसी कॉलोनी है? जैसे संगम विहार या रोहिणी।" : "Which colony? For example Sangam Vihar or Rohini.";
  }
  if (!extracted.name) {
    return hindi ? "पेरेंट का नाम बताइए।" : "Parent’s name?";
  }
  return hindi
    ? "Enquiry नोट हो गई। पास के ट्यूटर को बताया जाएगा।"
    : "Enquiry noted. Nearby tutors will be informed.";
}
