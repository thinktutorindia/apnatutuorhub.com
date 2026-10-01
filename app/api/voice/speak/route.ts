import { NextResponse } from "next/server";
import { readSpeakToken, synthesizeSpeech } from "@/lib/voice-agent/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, Buffer>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = readSpeakToken(url.searchParams.get("t") ?? "", url.searchParams.get("s") ?? "");
  if (!text) return NextResponse.json({ error: "Invalid speech request" }, { status: 400 });

  const cached = cache.get(text);
  const audio = cached ?? (await synthesizeSpeech(text));
  if (!audio) {
    return NextResponse.json(
      { error: "Speech is not configured. Add SARVAM_API_KEY." },
      { status: 503 }
    );
  }
  cache.set(text, audio);
  if (cache.size > 40) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=600",
    },
  });
}
