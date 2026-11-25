/**
 * lib/whatsapp-bot/persona-understanding.ts
 *
 * Understands human personas, Hinglish/colloquial wording, NRI fluency replies,
 * portal/app confusion, trust concerns, and rapid fragmented messages BEFORE
 * slot extraction runs — preventing false subject/class/location pollution
 * while replying strictly in clean, warm English.
 */

import { isLanguagePreferenceContext } from "./strict-rules";

export type PersonaChatEntry = {
  direction: string;
  body: string;
  createdAt?: Date;
};

export type PersonaPrecheckResult = {
  reply: string;
  nextStep: string;
  updatedData?: Record<string, unknown>;
  userType?: "TUTOR" | "PARENT" | null;
  quickReplies?: string[];
  handled: true;
};

function lastOutboundBody(chatHistory?: PersonaChatEntry[]): string {
  if (!chatHistory || chatHistory.length === 0) return "";
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    if (chatHistory[i].direction === "OUTBOUND" && chatHistory[i].body) {
      return chatHistory[i].body;
    }
  }
  return "";
}

function latestMentionedInquiry(chatHistory?: PersonaChatEntry[]): number | null {
  if (!chatHistory) return null;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (m.direction === "OUTBOUND" && m.body) {
      const match = m.body.match(/(?:requirement|lead|inquiry|enquiry)\s*#?(\d{4,7})\b/i) || m.body.match(/#(\d{4,7})\b/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Understands user persona and conversational context BEFORE entity regexes or slot filling.
 * Returns null if the message contains concrete profile slots (subjects/classes/email/location/name)
 * or standard commands that should flow through the core onboarding/profile pipeline.
 */
export function resolvePersonaPrecheck(params: {
  rawMessage: string;
  step: string;
  userType: string | null;
  data: Record<string, unknown>;
  chatHistory?: PersonaChatEntry[];
  isRegistered: boolean;
  phone: string;
}): PersonaPrecheckResult | null {
  const raw = params.rawMessage.trim();
  const lower = raw.toLowerCase();
  const lastOut = lastOutboundBody(params.chatHistory);
  const recentLeadId = latestMentionedInquiry(params.chatHistory);
  const isNriPitchContext = /nri|hindi mein comfortable nahi|english communication|student location:\s*online/i.test(lastOut);
  const isLangPromptContext = /choose your language|अपनी भाषा चुनें|english\s*\n\s*2\s*[—-]\s*हिंदी/i.test(lastOut);

  // 1. Language / Spoken Fluency / Medium clarification
  // e.g. "No thodi hindi thodi English", "Hindi medium", or bare "English" after a language ask
  const bareLangReply = /^(?:english|eng|hindi)$/i.test(lower);
  const spokePrefReply =
    isLanguagePreferenceContext(raw) ||
    /^(?:no\s+)?(?:thodi|little|some|average|basic|hindi\s+or\s+english|hindi\s+and\s+english|fluent\s+in\s+english|comfortable\s+in\s+english)\b/i.test(lower) ||
    (/\b(?:thodi|little|fluent|comfortable)\b/i.test(lower) && /\b(?:hindi|english)\b/i.test(lower));

  if (
    (spokePrefReply || (bareLangReply && (isLangPromptContext || isNriPitchContext || params.step === "WELCOME"))) &&
    !/\b(?:teach|subject|class\s*\d|tutor|tuition)\b/i.test(lower)
  ) {
    const decliningEnglish = /\b(?:no|not|thodi|little|hindi\s+medium|only\s+hindi)\b/i.test(lower);
    return {
      handled: true,
      reply: decliningEnglish
        ? `No problem at all! Since NRI online batches require fluent English, we'll match you with our regular Indian home & online tuitions instead.\n\nWhich classes, subjects, and city/area (or Online) do you teach? 📚`
        : `Got it, thanks! 😊 Let's set up or match your tutor profile.\n\nWhich subjects, classes, and city/area (or Online) do you teach? 📚`,
      nextStep: "T_CONVO",
      userType: "TUTOR",
      updatedData: {
        ...params.data,
        userType: "TUTOR",
        languagePref: decliningEnglish ? "Bilingual / Hindi-English" : "English",
      },
      quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
    };
  }

  // 2. Portal vs App confusion ("Like on the app?", "Where is the app?", "Do I need an app?")
  if (/\b(?:like\s+on\s+(?:the\s+)?app|on\s+(?:the\s+)?app|is\s+there\s+an\s+app|your\s+app|need\s+an\s+app|download\s+(?:the\s+)?app|app\s+link)\b/i.test(lower)) {
    const phone10 = params.phone.replace(/\D/g, "").slice(-10);
    const leadRefNote = recentLeadId ? ` for Requirement *#${recentLeadId}*` : "";
    return {
      handled: true,
      reply:
        `No Play Store download is needed — ApnaTutorHub opens directly in your phone browser${leadRefNote}:\n\n` +
        `🔗 Login: https://apnatutorhub.com/login (Mobile: *${phone10}*)\n` +
        `📋 Live Leads: https://apnatutorhub.com/tutor/leads\n\n` +
        `If you need a password reset, reply *MANUAL RESET*, or share your subjects, classes & area here!`,
      nextStep: params.isRegistered ? "DONE" : "T_CONVO",
      userType: "TUTOR",
      quickReplies: ["MANUAL RESET", "View Leads 📋", "Update My Subjects 📚"],
    };
  }

  // 3. Explicit Tutor Role Clarifier ("Lead as a tutor", "I'm a tutor", "Looking for leads as a tutor")
  if (
    /^(?:leads?\s+as\s+a?\s*tutor|as\s+a\s+tutor|i\s*(?:'m|am)\s+a?\s*tutor|tutor\s+leads?|looking\s+for\s+(?:tuition\s+)?leads?\s*(?:as\s+a?\s*tutor)?)$/i.test(
      lower.replace(/[.!?]+$/, "").trim()
    )
  ) {
    return {
      handled: true,
      reply: `Great! Let's get you set up for tuition leads. Which *classes*, *subjects*, and *city/locality* (or *Online*) do you teach? 📚`,
      nextStep: "T_CONVO",
      userType: "TUTOR",
      updatedData: { ...params.data, userType: "TUTOR" },
      quickReplies: ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)", "Commerce (11-12)"],
    };
  }

  // 4. Lead Availability / Comfort Replies to Broadcasts ("I'm comfortable", "I am available", "Required??")
  if (
    /^(?:i\s*(?:'m|am)\s*(?:comfortable|available|ready)|comfortable|available|yes\s*(?:i\s*(?:'m|am)\s*)?(?:available|comfortable)|required\s*\??)$/i.test(
      lower.replace(/[.!]+$/, "").trim()
    ) &&
    params.step !== "T_NAME" &&
    params.step !== "T_EMAIL" &&
    params.step !== "T_PASSWORD" &&
    params.step !== "T_AREA"
  ) {
    const phone10 = params.phone.replace(/\D/g, "").slice(-10);
    const hasSubs = Array.isArray(params.data.subjects) && params.data.subjects.length > 0;
    const hasLoc = Boolean(params.data.area || params.data.city);
    const leadLine = recentLeadId ? `Thanks for responding to Requirement *#${recentLeadId}*! ` : `Thanks for your message! `;
    const nextAsk = hasSubs && hasLoc
      ? `Log in with your mobile (*${phone10}*) to view full details and connect with the parent:\n🔗 https://apnatutorhub.com/tutor/leads\n\nIf you need a quick password reset, just reply *MANUAL RESET*.`
      : `Please share the *classes*, *subjects*, and *city/area (or Online)* you teach so I can update your profile and match leads:\n🔗 https://apnatutorhub.com/tutor/leads`;
    return {
      handled: true,
      reply: `${leadLine}${nextAsk}`,
      nextStep: params.isRegistered ? "DONE" : "T_CONVO",
      userType: "TUTOR",
      updatedData: { ...params.data, userType: "TUTOR" },
      quickReplies: hasSubs ? ["View Leads 📋", "MANUAL RESET", "Help 📞"] : ["All Subjects (Class 1-8)", "Maths & Science (9-10)", "Physics / Chem (11-12)"],
    };
  }

  // 5. Trust / Authenticity / Verification Doubt ("M beleive kaise kru", "How do I trust you", "Fake or real")
  if (
    /\b(?:believe|beleive|trust|vishwas|bharosa|authentic|genuine|real\s+or\s+fake|fake\s+hai|fraud\s+lag)\b/i.test(lower)
  ) {
    const phone10 = params.phone.replace(/\D/g, "").slice(-10);
    return {
      handled: true,
      reply:
        `We completely understand wanting to verify before paying anything online. 🙏\n\n` +
        `• Browse real live parent requirements first — *zero upfront payment needed* to log in and inspect your dashboard:\n🔗 https://apnatutorhub.com/login (Mobile: *${phone10}*)\n` +
        `• Direct Coordinator Support: WhatsApp *+91 93191 93109* | Helpline *08062180653* (9 AM – 7 PM Mon–Sat).\n\n` +
        `Once you confirm matching students in your area, you can decide when to unlock contacts.`,
      nextStep: params.isRegistered ? "DONE" : "T_CONVO",
      userType: params.userType === "PARENT" ? "PARENT" : "TUTOR",
      quickReplies: ["View Leads 📋", "MANUAL RESET", "Talk to Coordinator 📞"],
    };
  }

  // 6. Callback / Phone Not Connecting Complaints ("Call me", "Number nahi lagta", "Aap call kariye")
  if (
    /\b(?:number\s*(?:nahi|ni)\s*lag|no\s*call|koi\s*call\s*n(?:ahi|hi)|call\s*(?:kar|kr)o|call\s*(?:kar|kr)iye|please\s*call|call\s*me|baat\s*karni\s*h|want\s+a?\s*call)\b/i.test(
      lower
    ) &&
    params.step !== "T_NAME" &&
    params.step !== "T_EMAIL"
  ) {
    const phone10 = params.phone.replace(/\D/g, "").slice(-10);
    return {
      handled: true,
      reply:
        `We've noted your callback request on *${phone10}*. 📞\n\n` +
        `Our coordinator desk is available at *08062180653* (9 AM – 7 PM Mon–Sat) and WhatsApp *+91 93191 93109*.\n` +
        `You can also share your specific question or area/subjects right here in chat and I'll handle it immediately!`,
      nextStep: params.isRegistered ? "DONE" : params.step === "WELCOME" ? "T_CONVO" : params.step,
      userType: params.userType === "PARENT" ? "PARENT" : "TUTOR",
      quickReplies: ["View Leads 📋", "My Profile 👤", "MANUAL RESET"],
    };
  }

  return null;
}
