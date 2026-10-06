/**
 * Spoken call agent. Gemini decides the next line. TTS speaks it.
 */
import { normalizeCanonicalClassLevel } from "@/lib/lead-utils";
import { VOICE_GREETING, VOICE_PROMPT_BODY } from "./training-playbook";
import {
  callerPrefersHindi,
  extractFromCallerText,
  inferVoiceRole,
  languageMismatch,
  nextMissingAsk,
  parentReady,
  soundsLikeChatbot,
  type VoiceLeadBrief,
} from "./match";

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

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

function asRole(value: unknown, locked: VoiceRole): VoiceRole {
  if (locked) return locked;
  const text = String(value ?? "").toUpperCase().trim();
  if (text === "TUTOR") return "TUTOR";
  if (text === "PARENT") return "PARENT";
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
  const classLevel = raw.classLevel ? normalizeCanonicalClassLevel(String(raw.classLevel)) || String(raw.classLevel).trim() || undefined : undefined;
  return {
    name: raw.name ? String(raw.name).trim() : undefined,
    classLevel,
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

export { VOICE_GREETING };

function groundedTurn(input: {
  callerText: string;
  extracted: VoiceExtract;
  role: VoiceRole;
  llmExtract?: VoiceExtract;
  say?: string;
  handoff?: boolean;
  leads?: VoiceLeadBrief[];
  alreadyGreeted?: boolean;
}): VoiceTurn {
  const thisTurn = extractFromCallerText(input.callerText, {});
  const locked = mergeExtract(input.extracted, thisTurn);
  const extracted = mergeExtract(input.llmExtract ?? {}, locked);
  const role = inferVoiceRole(input.callerText, input.role);
  const hindi = callerPrefersHindi(input.callerText);
  let say = (input.say || "").trim();
  if (say && languageMismatch(say, hindi)) say = "";
  if (say && soundsLikeChatbot(say)) say = "";
  if (say && input.alreadyGreeted && /नमस्ते|स्वागत|welcome/i.test(say)) say = "";
  return {
    say: say || nextMissingAsk(role, extracted, hindi, input.leads),
    role,
    extracted,
    handoff: Boolean(input.handoff),
    complete: parentReady(role, extracted),
  };
}

export async function nextVoiceTurn(input: {
  callerText: string;
  history: VoiceHistoryItem[];
  extracted: VoiceExtract;
  role: VoiceRole;
  liveLeads?: VoiceLeadBrief[];
}): Promise<VoiceTurn> {
  const history =
    input.history.length > 0
      ? input.history
      : [{ speaker: "priya" as const, text: VOICE_GREETING }];
  const leads = input.liveLeads ?? [];
  const grounded = groundedTurn({
    callerText: input.callerText,
    extracted: input.extracted,
    role: input.role,
    leads,
    alreadyGreeted: true,
  });
  const apiKey = geminiKey();
  if (!apiKey || !input.callerText.trim()) return grounded;

  const leadBlock =
    leads.length > 0
      ? `LIVE_LEADS (speak only the first, then ask):\n${leads
          .slice(0, 2)
          .map((lead, i) => `${i + 1}. ${lead.classLevel}, ${lead.area}, ${lead.budget}`)
          .join("\n")}`
      : "LIVE_LEADS: none in that area/class right now.";

  const prompt = `${VOICE_PROMPT_BODY}

${leadBlock}
Collected so far: ${JSON.stringify({ role: grounded.role, ...grounded.extracted })}
This call already started. Priya already greeted. Continue — do not welcome again.
Recent call:
${history.map((item) => `${item.speaker}: ${item.text}`).join("\n")}
Caller just said: "${input.callerText.replace(/"/g, "'")}"
`;

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"];
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.35, responseMimeType: "application/json" },
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
      return groundedTurn({
        callerText: input.callerText,
        extracted: grounded.extracted,
        role: asRole(parsed.role, grounded.role),
        llmExtract: asExtract(parsed.extracted),
        say,
        handoff: Boolean(parsed.handoff),
        leads,
        alreadyGreeted: true,
      });
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return grounded;
}
