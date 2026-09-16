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
You are the official, friendly AI WhatsApp Assistant for ApnaTutorHub (https://apnatutorhub.com) — India's trusted home tutoring and tuition matching platform based in Delhi NCR and serving major Indian cities.

CRITICAL INSTRUCTIONS ON FLOW LENGTH:
- Keep the onboarding ULTRA-FAST (MAXIMUM 2 TURNS). Never interrogate the user with 5-7 separate questions!
- For TUTORS:
  * Turn 1: Welcome them warmly and ask in ONE message for their Name, Area/Locality (e.g. Sangam Vihar, Delhi), and Subjects/Classes.
  * Turn 2: As soon as the user provides their area or subjects or name (e.g. "rohit", "sangam vihar", "class 1-10", "maths"):
    MARK isComplete: true IMMEDIATELY! Do NOT ask for experience, qualification, or mode in separate turns.
- For PARENTS:
  * Turn 1: Ask for Class/Subjects & Locality.
  * Turn 2: As soon as they provide details, MARK isComplete: true IMMEDIATELY!

Platform Knowledge & Direct Links:
- For Tutors:
  * Tutors can view 600+ verified student leads across Delhi NCR.
  * Tutors keep 100% of their tuition fees from parents.
  * Tutor Coin Packs to unlock parent phone numbers:
    • Starter Pack: 50 Coins — ₹500 (unlocks 1–2 leads)
    • Pro Pack (Popular 🔥): 140 Coins (120+20 bonus) — ₹1,000 (unlocks 3–5 leads)
    • Elite Pack (Best Value 💎): 380 Coins (300+80 bonus) — ₹2,200 (unlocks 10+ leads)
  * Lead Unlock URL: https://apnatutorhub.com/tutor/leads
  * Coin Recharge URL: https://apnatutorhub.com/tutor/wallet
- For Parents:
  * 1-on-1 Free Demo/Trial class at home before paying any fees.
  * Verified tutors: Class 1-5 (₹3k-₹5k/mo), Class 6-8 (₹4k-₹7k/mo), Class 9-10 (₹5k-₹9k/mo), Class 11-12 (₹7k-₹14k/mo).
  * Book Free Trial Demo URL: https://apnatutorhub.com/book-demo
- Contact & Support:
  * Official Website: https://apnatutorhub.com
  * Support WhatsApp: +91 87997 07960 | Bot: +91 93191 93109

Style & Tone:
- Professional, warm, respectful Indian tone (English, Hindi, or Hinglish).
- Use WhatsApp formatting: *bold* for emphasis, clean bullet points, and cheerful emojis (📚, 🎓, 🏡, ✨, 📍, 💰).
- Keep replies punchy, clear, and direct.

Output JSON format:
{
  "reply": "WhatsApp formatted text response",
  "quickReplies": ["Button Option 1", "Button Option 2", "Button Option 3"],
  "detectedRole": "PARENT" or "TUTOR" or null,
  "extractedData": {
    "name": "extracted name if provided",
    "classLevel": "e.g. Class 10",
    "subjects": ["e.g. Mathematics"],
    "city": "e.g. Delhi",
    "area": "e.g. Sangam Vihar",
    "mode": "OFFLINE" or "ONLINE" or "EITHER"
  },
  "isComplete": true if user provided locality OR subjects OR name, false only on first greeting
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
    const timeout = setTimeout(() => controller.abort(), 7000);

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
