/**
 * Spoken call agent. Gemini decides the next line. Sarvam speaks it.
 * Call recordings can replace this prompt later. The phone flow stays the same.
 */

export type VoiceRole = "PARENT" | "TUTOR" | null;

export type VoiceExtract = {
  name?: string;
  classLevel?: string;
  subjects?: string[];
  area?: string;
  city?: string;
  fee?: number;
  rateType?: "MONTHLY" | "HOURLY";
};

export type VoiceTurn = {
  say: string;
  role: VoiceRole;
  extracted: VoiceExtract;
  handoff: boolean;
  complete: boolean;
};

export type VoiceHistoryItem = { speaker: "caller" | "priya"; text: string };

const VOICE_PROMPT = `
You are Priya, the phone coordinator at ApnaTutorHub. You are on a live phone call.

SPEECH RULES:
- Reply in 1 or 2 short spoken sentences. One question only.
- No emojis, no markdown, no bullet lists, no URLs.
- If the caller speaks English, answer only in simple English.
- If the caller speaks Hindi or Hinglish, write the reply in Devanagari, not Roman Hindi. Example: "आठवीं क्लास के लिए रोहिणी में होम ट्यूशन नोट कर रही हूँ. आपका नाम क्या है?"
- Class 1 to 8 is always All Subjects. Do not ask which subject. Ask the area, then the name.
- Sound like a person on a call. Do not say you are an AI.

WHAT YOU HANDLE:
- Parent wants a home tutor: collect class, then subjects, then area, then their name, then the fee if they know it. One question at a time.
- Class 1 to 8 is home tuition for All Subjects, monthly. Set subjects to ["All Subjects"] and do not ask which subject.
- Class 9 and above can be a named subject. Ask if the fee is per month or per hour only after they give a number.
- Tutor calling about leads: explain only the ₹999 plan, 60 coins, 30 days, 0% commission. One lead costs 5% of the monthly fee inside those 60 coins, and never more than 60. Max 3 tutors per lead. Tell them to open the leads page on the ApnaTutorHub website. Do not mention a ₹99 plan.
- Complaint, refund, fraud, or "mujhe insaan se baat karni hai": set handoff true and say you are connecting them to the coordinator.

COMPLETE:
- Parent: complete true only when class, subject, and area are known.
- Tutor: complete true after you have explained the plan and they have no more question.
- Otherwise complete false.

Return JSON only:
{
  "say": "spoken reply",
  "role": "PARENT" or "TUTOR" or null,
  "extracted": {
    "name": "",
    "classLevel": "Class 8",
    "subjects": ["All Subjects"],
    "area": "Rohini",
    "city": "Delhi",
    "fee": 4500,
    "rateType": "MONTHLY"
  },
  "handoff": false,
  "complete": false
}
classLevel must be Nursery, LKG, UKG, KG, Class 1 to Class 12, JEE, NEET, or CUET. Omit fields you do not know. Do not invent a fee.
`;

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

function asRole(value: unknown): VoiceRole {
  const text = String(value ?? "").toUpperCase();
  if (text.includes("TUTOR") || text.includes("TEACH")) return "TUTOR";
  if (text.includes("PARENT") || text.includes("STUDENT")) return "PARENT";
  return null;
}

function asExtract(value: unknown): VoiceExtract {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects.map((item) => String(item).trim()).filter(Boolean)
    : undefined;
  const fee = Number(raw.fee);
  const rate = String(raw.rateType ?? "").toUpperCase();
  return {
    name: raw.name ? String(raw.name).trim() : undefined,
    classLevel: raw.classLevel ? String(raw.classLevel).trim() : undefined,
    subjects,
    area: raw.area ? String(raw.area).trim() : undefined,
    city: raw.city ? String(raw.city).trim() : undefined,
    fee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : undefined,
    rateType: rate === "HOURLY" || rate === "MONTHLY" ? rate : undefined,
  };
}

export function mergeExtract(prev: VoiceExtract, next: VoiceExtract): VoiceExtract {
  return {
    name: next.name || prev.name,
    classLevel: next.classLevel || prev.classLevel,
    subjects: next.subjects?.length ? next.subjects : prev.subjects,
    area: next.area || prev.area,
    city: next.city || prev.city,
    fee: next.fee || prev.fee,
    rateType: next.rateType || prev.rateType,
  };
}

export const VOICE_GREETING =
  "Namaste. Main ApnaTutorHub se Priya bol rahi hoon. Bataiye, aapko ghar par tutor chahiye, ya aap khud padhate hain?";

export async function nextVoiceTurn(input: {
  callerText: string;
  history: VoiceHistoryItem[];
  extracted: VoiceExtract;
  role: VoiceRole;
}): Promise<VoiceTurn> {
  const fallback: VoiceTurn = {
    say: "Maaf kijiye, awaaz clear nahi aayi. Ek baar phir bataiye, aapko tutor chahiye ya aap padhate hain?",
    role: input.role,
    extracted: input.extracted,
    handoff: false,
    complete: false,
  };
  const apiKey = geminiKey();
  if (!apiKey || !input.callerText.trim()) return fallback;

  const prompt = `${VOICE_PROMPT}

Collected so far: ${JSON.stringify({ role: input.role, ...input.extracted })}
Recent call:
${input.history.map((item) => `${item.speaker}: ${item.text}`).join("\n")}
Caller just said: "${input.callerText.replace(/"/g, "'")}"
`;

  const models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
        }
      );
      if (!response.ok) continue;
      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const say = String(parsed.say ?? "").trim();
      if (!say) continue;
      return {
        say,
        role: asRole(parsed.role) ?? input.role,
        extracted: mergeExtract(input.extracted, asExtract(parsed.extracted)),
        handoff: Boolean(parsed.handoff),
        complete: Boolean(parsed.complete),
      };
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return fallback;
}
