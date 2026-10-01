import { createHmac } from "crypto";

const SARVAM_BASE = "https://api.sarvam.ai";

function sarvamKey(): string | null {
  return process.env.SARVAM_API_KEY || null;
}

function voiceSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SARVAM_API_KEY || "apnatutorhub-voice";
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

function languageCode(text: string): "hi-IN" | "en-IN" {
  return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
}

export async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const key = sarvamKey();
  if (!key) return null;
  const spoken = text.slice(0, 500);
  const body = {
    text: spoken,
    target_language_code: languageCode(spoken),
    language_code: languageCode(spoken),
    model: "bulbul:v3",
    speaker: "priya",
    pace: 1,
    speech_sample_rate: 8000,
  };
  const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.warn("[voice] Sarvam TTS failed", response.status, (await response.text()).slice(0, 180));
    return null;
  }
  const json = (await response.json()) as { audios?: string[] };
  const audio = json.audios?.[0];
  if (!audio) return null;
  return Buffer.from(audio, "base64");
}

export async function transcribeSpeech(audio: Buffer, filename = "caller.wav"): Promise<string> {
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
