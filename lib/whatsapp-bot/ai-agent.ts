/**
 * lib/whatsapp-bot/ai-agent.ts
 *
 * Gemini AI-powered conversational engine for the ApnaTutorHub WhatsApp Chatbot.
 * - Knowledge base on ApnaTutorHub (plans, pricing, demo classes, locations).
 * - Understands natural language in English, Hindi, and Hinglish.
 * - Detects user role (Tutor vs Parent) and extracts entities (subjects, class, locality, budget).
 * - Formats responses with WhatsApp formatting (*bold*, emojis) and suggests interactive Quick Reply Buttons.
 */

import { BotSession } from "./session";
import { UserProfileContext } from "./user-profile-context";
import { enforceStrictEducation, extractStrictEmail, isPlaceholderEmail, validateStrictEmail } from "./strict-rules";
import { looksLikeUnexpectedNoise } from "./loose-intent";

export type ChatHistoryEntry = {
  direction: string;
  body: string;
  createdAt?: Date;
  senderName?: string | null;
};

export type AiIntent =
  | "ONBOARD_OR_UPDATE"
  | "SHOW_LEADS"
  | "SHOW_PLANS_OR_PAY"
  | "CHECK_COINS"
  | "CHECK_PROFILE"
  | "SUPPORT_OR_HUMAN"
  | "PASSWORD_OR_LOGIN_HELP"
  | "DECLINE_OR_LATER"
  | "OFF_TOPIC_OR_RANDOM";

export const VALID_AI_INTENTS: ReadonlySet<AiIntent> = new Set<AiIntent>([
  "ONBOARD_OR_UPDATE",
  "SHOW_LEADS",
  "SHOW_PLANS_OR_PAY",
  "CHECK_COINS",
  "CHECK_PROFILE",
  "SUPPORT_OR_HUMAN",
  "PASSWORD_OR_LOGIN_HELP",
  "DECLINE_OR_LATER",
  "OFF_TOPIC_OR_RANDOM",
]);

export type AiBotResponse = {
  reply: string;
  quickReplies: string[];
  intent?: AiIntent;
  detectedRole?: "TUTOR" | "PARENT" | null;
  extractedData?: Record<string, unknown>;
  nextStep?: string;
  isComplete?: boolean;
};

const SYSTEM_INSTRUCTION = `
You are Priya, the coordinator for ApnaTutorHub (https://apnatutorhub.com) — India's leading home and online tutoring network across Delhi NCR, Mumbai, Bengaluru, Pune, Hyderabad, Kolkata, Jaipur, Lucknow, Patna, Ahmedabad, Chandigarh, and Pan-India Online.

⚠️ ENGLISH-ONLY OUTPUT RULE (ABSOLUTE):
- ALWAYS reply strictly in warm, polite, natural **English only**.
- Even if the user messages in Hinglish, Hindi script, typos, slang, or another language, understand their intent completely and reply in **clean English only** (never Hindi script, never Hinglish words/sentences like "kaunsi class", "aapka", "batao", "theek hai", "samajh", or "Namaste! Main Priya hoon...").

⚠️ IDENTITY & CONVERSATIONAL CONTINUITY:
- Your name is PRIYA and ONLY Priya. Never call yourself any other name.
- NEVER introduce yourself from scratch if there is already prior conversation history or a previous alert. Answer their specific message, question, availability reply, or complaint directly!
- NEVER emit robotic menus ("Type 1 for Hindi / Type 2 for English") or ask more than ONE question at a time.
- Keep replies SHORT (1 to 3 concise lines, 1 emoji max).
- Understand ANY human expression, arbitrary phrasing, typos, Hinglish, multi-intent sentences (e.g. "Call me later, btw I teach Chemistry Class 11"), questions ("how does this work?", "fees is low", "parent not picking up", "Like on the app?"), or random/off-topic text cleanly without getting confused.
- NEVER restart or force Tutor/Parent onboarding when the user asks a general help question or sends random/off-topic text — answer kindly in English and gently offer clear next options.
- CRITICAL CONTEXT DISAMBIGUATION: If the user is replying about spoken language comfort (e.g. "No thodi hindi thodi English", "English", "Hindi medium") right after a language question or an NRI English-fluency requirement, DO NOT treat "English" or "Hindi" as a teaching subject! Clarify warmly and ask which academic subjects, classes, and city/area they teach.

⚠️ SEMANTIC INTENT CLASSIFICATION (ALWAYS SET "intent"):
- "ONBOARD_OR_UPDATE": User is selecting role (Tutor/Parent) or providing/updating name, email, password, classes, subjects, locality, city, or teaching mode (including mixed messages that also give valid profile data).
- "SHOW_LEADS": Registered/active tutor asks to see leads, inquiries, students in an area, or replies interested/yes to a broadcast alert.
- "SHOW_PLANS_OR_PAY": User asks about plans, pricing, ₹1,257 Commission plan, discontinued ₹999/₹2,999 offers, buying coins, QR/UPI payment, or zero-commission terms.
- "CHECK_COINS": User asks how many coins / wallet balance they have left.
- "CHECK_PROFILE": User wants to see their saved profile details or verify what was saved.
- "SUPPORT_OR_HUMAN": User asks a help/how-to question (KYC, app/PWA install, parent not picking up, fee complaint, refund, demo rules, job/salary question, callback request, legal escalation, "what is this?", "not understanding") or wants human support (Helpline: 08062180653, WhatsApp: +91 93191 93109).
- "PASSWORD_OR_LOGIN_HELP": User asks how to log in, forgot password, or password help.
- "DECLINE_OR_LATER": User declines, says busy / call later / not interested right now. (Still extract explicit valid subjects/classes/email ONLY if clearly stated.)
- "OFF_TOPIC_OR_RANDOM": Random gibberish ("asdf", "???", "test"), meaningless text, jokes, or unrelated chatter with no tutoring request. Acknowledge kindly in 1–2 short English lines explaining how you can help (Tutor inquiries / Find a Tutor / Support 08062180653) and leave extractedData completely empty!

⚠️ STRICT EDUCATION TAXONOMY RULES (NEVER VIOLATE):
1. **Classes 1 to 8 (and Nursery/KG / Pre-Primary):**
   - Strictly **"All Subjects"** ONLY! Never save individual named subjects (like Maths, Science, Physics, English) for Classes 1–8.
   - Example: "1 to 8 class" or "Nursery to class 3" or "Maths Science Class 4" -> classes = Nursery/KG / Class 1..8, subjects = All Subjects for Class <n>.
   - Home tuition (offline) only for Classes 1–8.
2. **Classes 9 to 10:**
   - Strictly Class 9–10 school subjects + class ONLY: Mathematics, Science, Social Science, English, Hindi, Sanskrit, Computer Science.
   - NEVER store sub-branches (Physics, Chemistry, Biology) for Class 9–10 — map them to **Science**! Map History/Geography/Civics/Economics for 9–10 to **Social Science**!
   - NEVER store "All Subjects" for Classes 9–10! If someone says "All subjects 9-10", ask which specific Class 9–10 subjects they teach/need.
3. **Classes 11 to 12 (and JEE / NEET / CUET):**
   - Strictly specific stream subjects + class ONLY (e.g., Physics, Chemistry, Mathematics, Biology, Accountancy, Business Studies, Economics, Computer Science, History, Political Science, Geography, Psychology, Sociology, English, Hindi).
   - NEVER store "All Subjects" or generic "Science" or "Social Science" for Classes 11–12!
4. **Mixed Multi-Band Inputs:**
   - Support tutors teaching multiple bands cleanly, e.g., "Biology 10 - 12. 1-5 all sub." -> Class 1–5 (All Subjects) + Class 10 (Science) + Class 11–12 (Biology).
5. **Strict No-Junk Rule:**
   - NEVER store conversational filler ("comfortable", "available", "interested", "app", "required", "test", "asdf") into subjects, classLevels, area, city, name, or email.

⚠️ STRICT EMAIL VALIDATION RULE:
- Only accept and extract real valid email addresses with genuine domains (e.g. name@gmail.com, teacher@yahoo.co.in, work@outlook.com, custom valid domain@org.in).
- NEVER extract random words, missing-TLD domains, typos (.gom/.con/@gmai.com), or apnatutorhub placeholder addresses.

⚠️ PLATFORM FACTS (VERIFIED):
- Active Tutor Plan: **₹1,257 Commission Based Plan** (6 months validity, unlocks 5 verified parent contacts, max 3 tutors per lead, 50% commission on 1st month tuition fee + 5% recurring from 2nd month onwards). Instant Razorpay activation: https://apnatutorhub.com/tutor/plans?checkout=STARTER
- Zero-commission / Silver ₹2,999 plans & ₹999 offers are discontinued/ended.
- Portal access works directly in mobile browser (PWA installable, no Play Store download needed): Login https://apnatutorhub.com/login | Leads https://apnatutorhub.com/tutor/leads | Plans https://apnatutorhub.com/tutor/plans | Wallet https://apnatutorhub.com/tutor/wallet
- Helpline: 08062180653 (9 AM – 7 PM Mon–Sat) | Official WhatsApp Coordinator: +91 93191 93109
- Login issues / Reset: Tell them to use Forgot Password at https://apnatutorhub.com/login, try password 12345678 (if auto-registered), or reply *MANUAL RESET* to set temporary password *Tutor@123*.
- Market-above Fee Guide: Class 1–5 ₹6,000–₹6,800/month | Class 6–8 ₹6,800–₹7,600/month | Class 9–10 ₹700–₹850/hour | Class 11–12 ₹850–₹1,050/hour.

CONVERSATION COLLECTION ORDER (ONE question at a time):
- For Tutors: (1) Subjects + Classes + City/Locality (or Online), (2) Full Name, (3) Real Email ID (required, valid domain only), (4) Password (or 'default' -> 12345678). Never mark isComplete: true until all required fields are collected.
- For Parents: Class + Subject + Locality (no house numbers), then Name. Free demo class available.

Output strict JSON only:
{
  "intent": "ONBOARD_OR_UPDATE" | "SHOW_LEADS" | "SHOW_PLANS_OR_PAY" | "CHECK_COINS" | "CHECK_PROFILE" | "SUPPORT_OR_HUMAN" | "PASSWORD_OR_LOGIN_HELP" | "DECLINE_OR_LATER" | "OFF_TOPIC_OR_RANDOM",
  "reply": "short, friendly English-only WhatsApp reply (1-3 lines max)",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "detectedRole": "PARENT" or "TUTOR" or null,
  "extractedData": {
    "name": "name if clearly mentioned, null otherwise",
    "phone": "10-digit number if mentioned, null otherwise",
    "email": "valid email@domain.com ONLY, null otherwise",
    "password": "password string if explicitly given, null otherwise",
    "classLevels": ["Class 1", "Class 2", "Class 10"] or [],
    "classLevel": "primary class band string if any, null otherwise",
    "subjects": ["canonical subject names only"],
    "city": "valid city or 'Online' or null",
    "area": "valid locality/sector/colony or 'Online (Pan-India)' or null",
    "mode": "OFFLINE" or "ONLINE" or "EITHER" or null
  },
  "isComplete": true only when ALL required fields are collected cleanly
}
`;

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const HINGLISH_SLIP_RE =
  /\b(?:namaste|aapka|aapko|aapke|aapki|apna\s+naam|kaunsi|kaun\s*sa|batayein|batao|bataiye|samajh|theek\s*hai|thik\s*hai|main\s+priya\s+hoon|padhate\s*hain|padhana|chahiye|bhej\s*do|kar\s*do|kardo|kripya|dhanyawad|shukriya|kitne\s+coins|kahan\s+se|kya\s+hai|kaise\s+hai|kyu|kyun|nahi\s+hai|nhi)\b/i;

export function containsHindiOrHinglishSlip(text: string): boolean {
  if (!text) return false;
  return DEVANAGARI_RE.test(text) || HINGLISH_SLIP_RE.test(text);
}

function englishFallbackForIntent(intent: AiIntent): string {
  switch (intent) {
    case "OFF_TOPIC_OR_RANDOM":
      return `Hi! I'm Priya from ApnaTutorHub. How can I help you today — finding teaching leads, booking a home/online tutor, or reaching support (08062180653)?`;
    case "DECLINE_OR_LATER":
      return `No problem at all! Feel free to message anytime whenever you need tuition leads or a tutor. Have a great day!`;
    case "SUPPORT_OR_HUMAN":
      return `Happy to help! You can reach our coordinator desk on WhatsApp at +91 93191 93109 or call Helpline 08062180653 (9 AM – 7 PM Mon–Sat). Please share your exact question here too!`;
    case "PASSWORD_OR_LOGIN_HELP":
      return `You can log in anytime at https://apnatutorhub.com/login using your registered email or mobile number. Reply *MANUAL RESET* if you'd like a temporary password (*Tutor@123*).`;
    case "SHOW_LEADS":
      return `You can browse and unlock all active matching tuition leads on your dashboard: https://apnatutorhub.com/tutor/leads`;
    case "SHOW_PLANS_OR_PAY":
      return `Our current ₹1,257 Commission Based Plan gives 6 months validity and 5 verified parent contacts: https://apnatutorhub.com/tutor/plans`;
    case "CHECK_COINS":
      return `You can check your live coin wallet anytime here: https://apnatutorhub.com/tutor/wallet`;
    case "CHECK_PROFILE":
      return `You can view or update your saved teaching profile anytime by replying *MY PROFILE* or visiting https://apnatutorhub.com/tutor/profile.`;
    default:
      return `Got it! Please share your classes, subjects, and locality (or email) so I can update your details accurately.`;
  }
}

export function sanitizeAiBotResponse(
  parsed: Partial<AiBotResponse> | null | undefined,
  userMessage: string
): AiBotResponse | null {
  if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    return null;
  }

  const rawIntent = typeof parsed.intent === "string" ? parsed.intent.trim().toUpperCase() : "";
  const intent: AiIntent = VALID_AI_INTENTS.has(rawIntent as AiIntent)
    ? (rawIntent as AiIntent)
    : "ONBOARD_OR_UPDATE";

  let role = parsed.detectedRole || null;
  if (typeof role === "string") {
    const upper = role.toUpperCase();
    if (upper.includes("TUTOR") || upper.includes("TEACH")) role = "TUTOR";
    else if (upper.includes("PARENT") || upper.includes("STUDENT")) role = "PARENT";
    else role = null;
  }

  // Strict deterministic sanitizer on AI extractedData so Gemini hallucinations can NEVER pollute DB
  const rawExt: Record<string, unknown> =
    parsed.extractedData && typeof parsed.extractedData === "object" && !Array.isArray(parsed.extractedData)
      ? { ...parsed.extractedData }
      : {};

  if (intent === "OFF_TOPIC_OR_RANDOM") {
    for (const k of Object.keys(rawExt)) {
      delete rawExt[k];
    }
  } else {
    // 0. Reject junk/placeholder names
    if (typeof rawExt.name === "string") {
      const cleanName = rawExt.name.trim();
      if (
        !cleanName ||
        looksLikeUnexpectedNoise(cleanName) ||
        /^(teacher|tutor|user|student|unknown|sir|mam|madam|none|null|na)$/i.test(cleanName)
      ) {
        delete rawExt.name;
      } else {
        rawExt.name = cleanName;
      }
    }

    // 1. Strict Email scrub (prefer validated email in userMessage or validated AI email)
    const strictMsgEmail = extractStrictEmail(userMessage);
    const aiEmailRes = typeof rawExt.email === "string" ? validateStrictEmail(rawExt.email) : null;
    if (strictMsgEmail) {
      rawExt.email = strictMsgEmail;
    } else if (aiEmailRes && aiEmailRes.ok && !isPlaceholderEmail(aiEmailRes.email)) {
      rawExt.email = aiEmailRes.email;
    } else {
      delete rawExt.email;
    }

    // 2. Strict Education scrub (enforce 1-8 All Subjects, 9-10 school subjects, 11-12 stream subjects)
    const aiSubs = Array.isArray(rawExt.subjects) ? (rawExt.subjects as unknown[]).map(String) : [];
    const aiCls = [
      ...(Array.isArray(rawExt.classLevels) ? (rawExt.classLevels as unknown[]).map(String) : []),
      ...(typeof rawExt.classLevel === "string" && rawExt.classLevel ? [rawExt.classLevel] : []),
    ];
    if (aiSubs.length > 0 || aiCls.length > 0) {
      const enforced = enforceStrictEducation({
        rawMessage: userMessage,
        subjectsInput: aiSubs,
        classesInput: aiCls,
      });
      if (enforced.classLevels.length > 0) {
        rawExt.classLevels = enforced.classLevels;
        rawExt.classLevel = enforced.classLevels[0];
      } else {
        delete rawExt.classLevels;
        delete rawExt.classLevel;
      }
      if (enforced.subjects.length > 0) {
        rawExt.subjects = enforced.subjects;
      } else if (enforced.pendingBaseSubjects.length > 0) {
        rawExt.subjects = enforced.pendingBaseSubjects;
      } else {
        delete rawExt.subjects;
      }
    }
  }

  let safeReply = parsed.reply.replace(/\b(Seema|Anjali|Pooja|Riya|Simran|Neha|Shalini)\b/g, "Priya").trim();
  if (containsHindiOrHinglishSlip(safeReply)) {
    safeReply = englishFallbackForIntent(intent);
  }

  return {
    reply: safeReply,
    quickReplies: Array.isArray(parsed.quickReplies)
      ? parsed.quickReplies.filter((q): q is string => typeof q === "string" && !containsHindiOrHinglishSlip(q)).slice(0, 4)
      : [],
    intent,
    detectedRole: role,
    extractedData: rawExt,
    isComplete: intent === "OFF_TOPIC_OR_RANDOM" ? false : Boolean(parsed.isComplete),
  };
}

export async function askGeminiChatbot(
  userMessage: string,
  session: BotSession,
  chatHistory?: ChatHistoryEntry[],
  userProfile?: UserProfileContext | null
): Promise<AiBotResponse | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    console.warn("[ai-agent] No GEMINI_API_KEY configured.");
    return null;
  }

  let historySection = "";
  let historyExtractedSection = "";
  if (chatHistory && chatHistory.length > 0) {
    // Scan inbound messages in chatHistory for previously mentioned emails
    const historyEmails: string[] = [];
    for (const m of chatHistory) {
      if (m.direction === "INBOUND" && m.body) {
        const emailMatches = m.body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches) {
          for (const em of emailMatches) {
            const cleanEm = em.toLowerCase();
            if (!cleanEm.endsWith("@apnatutorhub.com") && !historyEmails.includes(cleanEm)) {
              historyEmails.push(cleanEm);
            }
          }
        }
      }
    }

    if (historyEmails.length > 0) {
      historyExtractedSection = `\r\nUser Email Already Found in Past Chat Messages: ${historyEmails.join(", ")} (NEVER ASK FOR EMAIL AGAIN!)\r\n`;
    }

    const formatted = chatHistory
      .slice(-60)
      .map((m) => {
        const who = m.direction === "INBOUND" ? "User/Tutor" : "Bot (Priya)";
        const time = m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "";
        const timeTag = time ? ` [${time}]` : "";
        return `[${who}${timeTag}]: ${m.body.replace(/\s+/g, " ").slice(0, 1000)}`;
      })
      .join("\r\n");
    historySection = `\r\nRecent Conversation History (${Math.min(chatHistory.length, 60)} messages, chronological order, most recent at bottom):\r\n${formatted}\r\n`;
  }

  let profileSection = "";
  if (userProfile && userProfile.isRegistered) {
    const parts = [
      `- Registered: YES (${userProfile.role || "TUTOR"})`,
      userProfile.name ? `- Name: ${userProfile.name}` : null,
      userProfile.email ? `- Email: ${userProfile.email}` : null,
      userProfile.area || userProfile.city ? `- Location: ${[userProfile.area, userProfile.city].filter(Boolean).join(", ")}` : null,
      userProfile.teachingMode ? `- Teaching Mode: ${userProfile.teachingMode}` : null,
      userProfile.subjects && userProfile.subjects.length > 0 ? `- Subjects: ${userProfile.subjects.join(", ")}` : null,
      userProfile.classLevels && userProfile.classLevels.length > 0 ? `- Classes: ${userProfile.classLevels.join(", ")}` : null,
      userProfile.coins !== undefined && userProfile.coins !== null ? `- Wallet Balance: ${userProfile.coins} coins` : null,
      userProfile.subscriptionPlan ? `- Plan: ${userProfile.subscriptionPlan}` : null,
    ].filter(Boolean);

    if (userProfile.recentLeads && userProfile.recentLeads.length > 0) {
      parts.push(`- Posted Student Requirements:\n  ${userProfile.recentLeads.map((l) => `* ${l.title || l.classLevel || "Tuition"} (${(l.subjects || []).join(", ")}) in ${l.area || "City"} [${l.status}]`).join("\n  ")}`);
    }

    profileSection = `\r\nStored User Profile in Database:\r\n${parts.join("\r\n")}\r\n`;
  }

  const prompt = `\r\nSystem Context:\r\n${SYSTEM_INSTRUCTION}\r\n\r\nCurrent Session State:\r\n- Phone: ${session.phone}\r\n- Current Step: ${session.step}\r\n- User Type: ${session.userType || "Unknown"}\r\n- Previously Collected Data: ${JSON.stringify(session.data || {})}\r\n${profileSection}${historyExtractedSection}${historySection}\r\nNew Incoming Message from User:\r\n"${userMessage}"\r\n\r\nRespond with the JSON object only:\r\n`;

  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    try {
      const isLite = model.includes("lite");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const generationConfig: Record<string, any> = {
        temperature: 0.2,
        responseMimeType: "application/json",
      };
      if (!isLite) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[ai-agent] HTTP ${res.status} on ${model}:`, errText.slice(0, 150));
        continue;
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as AiBotResponse;
      const sanitized = sanitizeAiBotResponse(parsed, userMessage);
      if (sanitized) {
        return sanitized;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[ai-agent] Fallback from ${model}:`, err.message || err);
    }
  }

  return null;
}
