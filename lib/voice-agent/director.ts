import type { VoiceExtract, VoiceRole, VoiceTurn } from "./agent";
import {
  callerPrefersHindi,
  extractFromCallerText,
  inferVoiceRole,
  nextMissingAsk,
  parentReady,
  spokenLeadLine,
  type VoiceLeadBrief,
} from "./match";

export function isAffirmative(text: string): boolean {
  const t = text.trim();
  return /^(haan|haa+|han|yes|ok|okay|theek|ji+|haanji|sure)\b/i.test(t) ||
    /\b(bhej do|bhej dena|bhej dijiye|send (it|kar|do)|whatsapp (pe|par) bhej|ha bhej)\b/i.test(t);
}

export function isNegative(text: string): boolean {
  return /\b(nahi|naah|mat bhej|later|baad mein|abhi nahi)\b/i.test(text) &&
    !/\btutor hoon\b/i.test(text);
}

export function wantsAnotherLead(text: string): boolean {
  return /\b(ek aur|dusri|another|next lead|aur bata)\b/i.test(text);
}

export function faqKind(
  text: string
): "plan" | "unlock" | "handoff" | "commission" | null {
  if (/\b(insaan|manager|human|refund|dhokha|fraud|complaint)\b/i.test(text)) return "handoff";
  if (/\b(commission|percent|%|kat(ta|te)|pehle mahine)\b/i.test(text)) return "commission";
  if (/\b(999|plan|membership|coins?|wallet|kitne)\b/i.test(text)) return "plan";
  if (/\b(unlock|login|password|forgot|dashboard|kaise le)\b/i.test(text)) return "unlock";
  return null;
}

function faqSay(kind: NonNullable<ReturnType<typeof faqKind>>, hindi: boolean): string {
  if (kind === "handoff") {
    return hindi
      ? "समझ गई। कोऑर्डिनेटर WhatsApp पर फॉलो करेगा, सपोर्ट ऐट अपनाट्यूटरहब डॉट कॉम।"
      : "Understood. A coordinator will follow on WhatsApp, or email support at apnatutorhub dot com.";
  }
  if (kind === "commission") {
    return hindi
      ? "हम ट्यूशन पर कमीशन नहीं लेते। पेरेंट आपको सीधे फीस देते हैं।"
      : "We take no tuition commission. The parent pays you directly.";
  }
  if (kind === "plan") {
    return hindi
      ? "ग्रोथ प्लान नौ सौ निन्यानवे प्लस जीएसटी, लगभग साठ कॉइन। क्लास एक से आठ की लीड करीब दस कॉइन।"
      : "Growth plan is 999 plus GST, about 60 coins. Class 1 to 8 unlock is about 10 coins.";
  }
  return hindi
    ? "पहले ईमेल से Forgot Password कीजिए, फिर ट्यूटर लीड्स में unlock। डिफ़ॉल्ट पासवर्ड नहीं होता।"
    : "Use Forgot Password on the first email, then Tutor Leads to unlock. There is no default password.";
}

export function directVoiceTurn(input: {
  callerText: string;
  extracted: VoiceExtract;
  role: VoiceRole;
  leads: VoiceLeadBrief[];
  offeredLead?: VoiceLeadBrief | null;
  leadIndex?: number;
}): VoiceTurn {
  const extracted = extractFromCallerText(input.callerText, input.extracted);
  const role = inferVoiceRole(input.callerText, input.role);
  const hindi = callerPrefersHindi(input.callerText);
  const faq = faqKind(input.callerText);
  const leads = input.leads;
  const idx = Math.min(input.leadIndex ?? 0, Math.max(0, leads.length - 1));

  if (faq === "handoff") {
    return { say: faqSay("handoff", hindi), role, extracted, handoff: true, complete: false };
  }
  if (faq) {
    return { say: faqSay(faq, hindi), role, extracted, handoff: false, complete: false };
  }

  if (role === "TUTOR" && input.offeredLead && isAffirmative(input.callerText)) {
    return {
      say: hindi
        ? "जी, WhatsApp पर भेज रही हूँ। Unlock करीब दस कॉइन, प्लान नौ सौ निन्यानवे प्लस जीएसटी। पहले Forgot Password।"
        : "Sending it on WhatsApp. Unlock is about 10 coins. Plan 999 plus GST. First login: Forgot Password.",
      role,
      extracted,
      handoff: false,
      complete: false,
      offeredLead: input.offeredLead,
      sendOffered: true,
      leadIndex: input.leadIndex ?? 0,
    };
  }

  if (role === "TUTOR" && isNegative(input.callerText)) {
    return {
      say: hindi
        ? "ठीक है। नई लीड आते ही WhatsApp अलर्ट जाएगा।"
        : "Alright. You will get a WhatsApp alert when a new lead comes.",
      role,
      extracted,
      handoff: false,
      complete: false,
    };
  }

  if (role === "TUTOR" && wantsAnotherLead(input.callerText) && leads[idx + 1]) {
    return {
      say: spokenLeadLine(leads[idx + 1], hindi),
      role,
      extracted,
      handoff: false,
      complete: false,
      offeredLead: leads[idx + 1],
      leadIndex: idx + 1,
    };
  }

  const speakingLead = role === "TUTOR" ? leads[0] : undefined;
  return {
    say: nextMissingAsk(role, extracted, hindi, leads),
    role,
    extracted,
    handoff: false,
    complete: parentReady(role, extracted),
    offeredLead: speakingLead ?? input.offeredLead ?? null,
    leadIndex: speakingLead ? 0 : input.leadIndex,
  };
}
