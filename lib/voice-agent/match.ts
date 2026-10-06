import {
  extractPublicLocality,
  isTill8thClass,
  leadSubjectsForClass,
  normalizeCanonicalClassLevel,
} from "@/lib/lead-utils";
import type { VoiceExtract, VoiceRole } from "./agent";

const TUTOR_SELF =
  /\b(main tutor|i am a tutor|i'm a tutor|i am tutor|tutor hoon|teacher hoon|main padhata|main padhati|main padhata hoon|leads chahiye|unlock lead|membership|coins chahiye)\b/i;
const PARENT_NEED =
  /\b(tutor chahiye|teacher chahiye|tuition chahiye|home tuition|mujhe tutor|need a tutor|need a teacher|looking for (a )?tutor|bachch|beta |beti |padhana hai|padhai)\b/i;

export function inferVoiceRole(text: string, current: VoiceRole): VoiceRole {
  if (current) return current;
  const tutorSelf = TUTOR_SELF.test(text);
  const parentNeed = PARENT_NEED.test(text);
  if (parentNeed) return "PARENT";
  if (tutorSelf) return "TUTOR";
  return null;
}

export function callerPrefersHindi(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
  const english = /\b(i need|i am|i'm|looking for|please)\b/i.test(text);
  const hinglish = /\b(hai|hoon|chahiye|mujhe|mera|kya|ke liye)\b/i.test(text);
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
  const match = text.match(/(?:mera naam|my name is|i am|main)\s+([a-zA-Z\u0900-\u097F]{2,40})(?:\s|$)/i);
  const name = match?.[1]?.trim();
  if (!name) return prev;
  if (/^(tutor|teacher|parent|student|hoon|hai)$/i.test(name)) return prev;
  return name;
}

export function extractFromCallerText(text: string, prev: VoiceExtract): VoiceExtract {
  const classLevel = normalizeCanonicalClassLevel(text) || prev.classLevel;
  const area = extractPublicLocality(text, prev.city || inferCity(text, prev.city)) || prev.area;
  const city = inferCity(text, prev.city);
  const fee = inferFee(text) ?? prev.fee;
  const name = inferName(text, prev.name);
  const subjects = classLevel ? leadSubjectsForClass(classLevel, prev.subjects) : prev.subjects;
  const rateType = classLevel
    ? isTill8thClass(classLevel)
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
  const sayHindi = /[\u0900-\u097F]/.test(say) || /\b(hai|aap|chahiye|kya|hoon|ji)\b/i.test(say);
  if (hindi && !sayHindi) return true;
  if (!hindi && /[\u0900-\u097F]/.test(say) && !/[A-Za-z]{3,}/.test(say)) return true;
  return false;
}

export function parentReady(role: VoiceRole, extracted: VoiceExtract): boolean {
  if (role !== "PARENT") return false;
  if (!extracted.classLevel || !extracted.area) return false;
  if (/^(delhi|ncr|delhi ncr|india)$/i.test(extracted.area)) return false;
  if (!isTill8thClass(extracted.classLevel) && !extracted.subjects?.length) return false;
  return true;
}

export function nextMissingAsk(role: VoiceRole, extracted: VoiceExtract, hindi: boolean): string {
  if (!role) {
    return hindi
      ? "बताइए, आपको होम ट्यूशन चाहिए या आप ट्यूटर हैं?"
      : "Are you looking for a home tutor, or are you a tutor?";
  }
  if (role === "TUTOR") {
    return hindi
      ? "लीड्स के लिए ग्रोथ प्लान नौ सौ निन्यानवे रुपये प्लस जीएसटी है, लगभग साठ कॉइन। पहले ईमेल से Forgot Password करके Tutor लीड्स पेज खोलिए।"
      : "The Growth plan is 999 rupees plus GST, about 60 coins. First login: Forgot Password, then Tutor, Leads.";
  }
  if (!extracted.classLevel) {
    return hindi ? "बच्चा कौनसी क्लास में है?" : "Which class is the child in?";
  }
  if (!isTill8thClass(extracted.classLevel) && !extracted.subjects?.length) {
    return hindi ? "कौनसा विषय चाहिए, मैथ्स साइंस या कोई और?" : "Which subject — Maths, Science, or another?";
  }
  if (!extracted.area || /^(delhi|ncr|delhi ncr|india)$/i.test(extracted.area)) {
    return hindi
      ? "कौनसी कॉलोनी या लोकेलिटी है? जैसे रोहिणी, करोल बाग, या नोएडा सेक्टर चालीस।"
      : "Which colony or locality? For example Rohini, Karol Bagh, or Noida Sector 40.";
  }
  if (!extracted.name) {
    return hindi ? "पेरेंट का नाम बताइए।" : "What is the parent’s name?";
  }
  return hindi
    ? "Enquiry नोट हो गई है। पास के ट्यूटर को बताया जाएगा।"
    : "Enquiry noted. Nearby tutors will be informed.";
}
