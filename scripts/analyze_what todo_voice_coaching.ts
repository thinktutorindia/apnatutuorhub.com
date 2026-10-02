/**
 * Transcribe whattodo coaching recordings and summarize for voice agent training.
 * npx tsx scripts/analyze_what todo_voice_coaching.ts
 */
import * as fs from "fs";
import * as path from "path";

try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "").trim();
  }
} catch {}

const DIR = path.join(process.cwd(), "whattodo");
const OUT = path.join(DIR, "voice_coaching_analysis.json");

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

async function transcribeWithGemini(filePath: string): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString("base64");
  const mime = "audio/mp4";
  const prompt = `This is a training/coaching recording for ApnaTutorHub phone coordinator "Priya".
Transcribe the full call in order. Label speakers if you can (coordinator vs trainee/caller).
Keep Hindi in Devanagari where spoken. Include exact phrases used for greeting, parent enquiry, tutor plan pitch, fees, and closing.
Return plain text transcript only.`;

  const models = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"];
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );
    if (!res.ok) {
      console.warn(model, res.status, (await res.text()).slice(0, 200));
      continue;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
  }
  throw new Error("Gemini transcription failed for all models");
}

async function buildVoicePlaybook(transcripts: { file: string; text: string }[]): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const combined = transcripts.map((t) => `=== ${t.file} ===\n${t.text}`).join("\n\n");
  const prompt = `You are building a phone voice agent playbook for ApnaTutorHub (Priya coordinator).

From these TWO coaching call transcripts, extract ONLY what Priya/coordinator should say on live calls.

Output JSON:
{
  "greeting": "one short spoken greeting (match training tone)",
  "parentFlow": ["ordered steps/questions for parent wanting tutor"],
  "tutorFlow": ["ordered steps for tutor calling about leads/plan"],
  "mustSay": ["exact phrases from training to reuse"],
  "mustNotSay": ["forbidden phrases e.g. 99 plan, AI mention"],
  "feeRules": "how to talk about budget on call",
  "handoffTriggers": ["when to transfer to human"],
  "toneNotes": "2-3 sentences on pace, warmth, Hinglish vs English",
  "sampleLines": ["5-8 example Priya lines copied or lightly cleaned from transcript"]
}

Transcripts:
${combined.slice(0, 120000)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /\.m4a\.mp4$|\.m4a$|\.mp4$/i.test(f))
    .sort();
  if (files.length === 0) {
    console.error("No audio files in whattodo/");
    process.exit(1);
  }
  console.log("Files:", files.join(", "));
  const transcripts: { file: string; text: string }[] = [];
  for (const file of files) {
    console.log(`Transcribing ${file}...`);
    const text = await transcribeWithGemini(path.join(DIR, file));
    transcripts.push({ file, text });
    fs.writeFileSync(path.join(DIR, `${file}.transcript.txt`), text, "utf8");
    console.log(`  ${text.length} chars`);
  }
  console.log("Building playbook...");
  const playbookRaw = await buildVoicePlaybook(transcripts);
  const playbook = JSON.parse(playbookRaw) as Record<string, unknown>;
  fs.writeFileSync(
    OUT,
    JSON.stringify({ transcripts: transcripts.map((t) => ({ file: t.file, length: t.text.length })), playbook }, null, 2),
    "utf8"
  );
  console.log("Wrote", OUT);
  console.log(playbookRaw.slice(0, 2000));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
