import { createHmac } from "crypto";

const SARVAM_BASE = "https://api.sarvam.ai";

function sarvamKey(): string | null {
  return process.env.SARVAM_API_KEY || null;
}

function geminiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

function voiceSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SARVAM_API_KEY || "apnatutorhub-voice";
}

export function hasServerVoice(): boolean {
  return Boolean(sarvamKey() || geminiKey());
}

export function speakToken(text: string): string {
  return createHmac("sha256", voiceSecret()).update(text).digest("base64url");
}

export function speakPath(origin: string, text: string): string {
  const spoken = text.slice(0, 500);
  const token = Buffer.from(spoken, "utf8").toString("base64url");
  const sig = speakToken(spoken);
  return `${origin}/api/voice/speak?t=${token}&s=${sig}`;
}

export function readSpeakToken(token: string, signature: string): string | null {
  const text = Buffer.from(token, "base64url").toString("utf8").slice(0, 500);
  if (!text || speakToken(text) !== signature) return null;
  return text;
}

export function languageCode(text: string): "hi-IN" | "en-IN" {
  return /[\u0900-\u097F]/.test(text) || /\b(hai|hoon|chahiye|kya|mujhe)\b/i.test(text) ? "hi-IN" : "en-IN";
}

function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function sarvamOnce(
  text: string,
  model: "bulbul:v3" | "bulbul:v2",
  speaker: string
): Promise<Buffer | null> {
  const key = sarvamKey();
  if (!key) return null;
  const spoken = text.slice(0, 500);
  const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: spoken,
      target_language_code: languageCode(spoken),
      model,
      speaker,
      pace: 1,
      speech_sample_rate: 24000,
      enable_preprocessing: true,
    }),
  });
  if (!response.ok) {
    console.warn("[voice] Sarvam TTS skipped", model, speaker, response.status);
    return null;
  }
  const json = (await response.json()) as { audios?: string[] };
  const audio = json.audios?.[0];
  if (!audio) return null;
  return Buffer.from(audio, "base64");
}

async function synthesizeWithSarvam(text: string): Promise<Buffer | null> {
  return (
    (await sarvamOnce(text, "bulbul:v3", "priya")) ||
    (await sarvamOnce(text, "bulbul:v2", "anushka"))
  );
}

async function synthesizeWithGemini(text: string): Promise<Buffer | null> {
  const key = geminiKey();
  if (!key) return null;
  const spoken = text.slice(0, 500);
  const lang = languageCode(spoken);
  const models = ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash-tts", "gemini-2.5-pro-preview-tts"];
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: spoken }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                languageCode: lang,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
              },
            },
          }),
        }
      );
      if (!response.ok) continue;
      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
      };
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      const data = part?.inlineData?.data;
      const mime = part?.inlineData?.mimeType || "";
      if (!data) continue;
      const raw = Buffer.from(data, "base64");
      const rateMatch = mime.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
      return mime.includes("wav") ? raw : pcmToWav(raw, sampleRate);
    } catch {
      continue;
    }
  }
  return null;
}

export async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  return (await synthesizeWithSarvam(text)) || (await synthesizeWithGemini(text));
}

export async function transcribeSpeech(audio: Buffer, filename = "caller.m4a"): Promise<string> {
  const key = sarvamKey();
  if (!key || audio.length === 0) return "";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  const response = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": key },
    body: form,
  });
  if (!response.ok) {
    console.warn("[voice] Sarvam STT failed", response.status, (await response.text()).slice(0, 180));
    return "";
  }
  const json = (await response.json()) as { transcript?: string };
  return (json.transcript ?? "").trim();
}

export async function downloadRecording(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) return Buffer.alloc(0);
  return Buffer.from(await response.arrayBuffer());
}

const ttsCache = new Map<string, Buffer>();

export async function prefetchSpeech(text: string): Promise<void> {
  const spoken = text.slice(0, 500);
  if (!spoken || ttsCache.has(spoken)) return;
  const audio = await synthesizeSpeech(spoken);
  if (audio) {
    ttsCache.set(spoken, audio);
    if (ttsCache.size > 48) {
      const oldest = ttsCache.keys().next().value;
      if (oldest) ttsCache.delete(oldest);
    }
  }
}

export function readCachedSpeech(text: string): Buffer | null {
  return ttsCache.get(text.slice(0, 500)) ?? null;
}
