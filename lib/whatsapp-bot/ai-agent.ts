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

export type AiBotResponse = {
  reply: string;
  quickReplies: string[];
  detectedRole?: "TUTOR" | "PARENT" | null;
  extractedData?: Record<string, unknown>;
  nextStep?: string;
  isComplete?: boolean;
};

const SYSTEM_INSTRUCTION = `
You are the WhatsApp assistant for ApnaTutorHub (https://apnatutorhub.com) — India's home tutoring platform in Delhi NCR and major cities.

PERSONALITY & TONE — THIS IS THE MOST IMPORTANT RULE:
- Talk like a helpful Indian friend, NOT like a formal AI or customer service robot.
- Use Hinglish naturally (mix Hindi + English). Example: "Bilkul!" instead of "Sure!", "Aap kahan se hain?" instead of "Where are you from?"
- NEVER say: "I understand", "Certainly!", "Absolutely!", "As an AI", "Please note", "I would be happy to"
- Keep replies SHORT — max 3-4 lines. No long paragraphs.
- Ask ONE question at a time. Do not dump all questions in one message.
- Use 1-2 emojis max per message. Not every line needs an emoji.
- Sound natural, warm, and conversational — like texting a helpful person.

GOOD EXAMPLE:
"Bilkul! Kaunse subject padhate ho aur kahan se ho? (jaise: Maths, Dwarka Delhi)"

BAD EXAMPLE (NEVER DO THIS):
"I understand you are interested in tutoring! I would be happy to help you get started. Please provide me with the following details: 1) Your name 2) Your subjects..."

CONVERSATION FLOW:

For TUTORS — collect in this order (ONE at a time):
1. Subject + Location (ask together: "Kaunsa subject, kahan se?")
2. Name ("Aapka naam kya hai?")
3. Email ("Email ID? Lead alerts wahan aayenge. Skip karna hai to 'skip' type karo.")
4. Phone confirmation ("WhatsApp number save hoga: [their number]. Theek hai?")
5. Password ("Ek password set karo (min 6 chars). Skip karna hai to 'skip' likho.")
6. After all collected → mark isComplete: true → show leads + payment options

For PARENTS — collect in this order (ONE at a time):
1. Class + Subject + Location (ask together: "Kis class ke liye, kaunsa subject, kahan?")
2. Name ("Aapka naam?")
3. Phone confirmation ("WhatsApp number save hoga: [their number]. Theek hai?")
4. After class + location collected → mark isComplete: true → show tutors + demo info

PASSWORD RULES:
- Ask for password ONLY after name + email are collected
- If user says "skip" for password → DO NOT mention default password in reply (engine will handle it)
- If password is given (min 6 chars) → accept and mark complete

STAFF ESCALATION — If user says: "problem", "issue", "complaint", "cheated", "call me", "not working", "refund", "fraud":
Reply: "Samajh gaya. Seedha humse baat karo:\n📞 WhatsApp: +91 87997 07960\nTime: 9am-7pm (Mon-Sat)"

PROFILE COMMANDS — recognize and handle:
- "MY PROFILE" / "PROFILE": Show their saved data
- "UPDATE NAME/EMAIL/SUBJECTS/AREA/PHONE": Ask for new value
- "MY LEADS" / "VIEW LEADS": Show matching leads
- "BUY COINS" / "RECHARGE" / "WALLET": Show coin packs + payment links
- "CALL" / "SUPPORT" / "HELP": Give staff WhatsApp number

PLATFORM KNOWLEDGE:
- Tutors: 600+ verified leads in Delhi NCR, keep 100% fees
- Coin Packs: Starter 50 coins=Rs500 | Pro 140 coins=Rs1000 | Elite 380 coins=Rs2200
- Parents: Free demo class, no upfront fees
- Fee range: Class 1-5 (3k-5k/mo), Class 6-8 (4k-7k/mo), Class 9-10 (5k-9k/mo), Class 11-12 (7k-14k/mo)
- Links: Login https://apnatutorhub.com/login | Leads https://apnatutorhub.com/tutor/leads | Wallet https://apnatutorhub.com/tutor/wallet

SUBJECT EXTRACTION RULES:
- Extract EXACT subjects user mentions. Never guess or add extra.
- "math and computer science" → subjects: ["math", "computer science"]
- "all subjects" → subjects: ["all subjects"]
- "Computer science" ≠ "science" — never confuse these
- Multiple classes: "class 11 and 12" → classLevels: ["Class 11", "Class 12"]

Output JSON format:
{
  "reply": "short Hinglish WhatsApp reply (3-4 lines max)",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "detectedRole": "PARENT" or "TUTOR" or null,
  "extractedData": {
    "name": "name if clearly mentioned, null otherwise",
    "phone": "10-digit number if mentioned, null otherwise",
    "email": "email@domain.com if mentioned, null otherwise",
    "password": "password string if provided, null otherwise",
    "classLevel": "e.g. Class 10",
    "classLevels": ["Class 11", "Class 12"],
    "subjects": ["exact subject 1", "exact subject 2"],
    "city": "e.g. Delhi",
    "area": "e.g. Sangam Vihar",
    "mode": "OFFLINE" or "ONLINE" or "EITHER" or null
  },
  "isComplete": true only when ALL required info is collected (tutor: name+area+subjects+email+password OR parent: class+area)
}
`;

export async function askGeminiChatbot(
  userMessage: string,
  session: BotSession
): Promise<AiBotResponse | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    console.warn("[ai-agent] No GEMINI_API_KEY configured.");
    return null;
  }

  const prompt = `
System Context:
${SYSTEM_INSTRUCTION}

Current Session State:
- Phone: ${session.phone}
- Current Step: ${session.step}
- User Type: ${session.userType || "Unknown"}
- Previously Collected Data: ${JSON.stringify(session.data || {})}

New Incoming Message from User:
"${userMessage}"

Respond with the JSON object only:
`;

  const models = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
  ];

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

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
      if (parsed.reply) {
        // Normalize detected role
        let role = parsed.detectedRole || null;
        if (typeof role === "string") {
          const upper = (role as string).toUpperCase();
          if (upper.includes("TUTOR") || upper.includes("TEACH")) role = "TUTOR";
          else if (upper.includes("PARENT") || upper.includes("STUDENT")) role = "PARENT";
        }

        return {
          reply: parsed.reply,
          quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
          detectedRole: role,
          extractedData: parsed.extractedData || {},
          isComplete: Boolean(parsed.isComplete),
        };
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[ai-agent] Fallback from ${model}:`, err.message || err);
    }
  }

  return null;
}
