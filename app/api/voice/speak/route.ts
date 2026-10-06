import { NextResponse } from "next/server";
import {
  prefetchSpeech,
  readCachedSpeech,
  readSpeakToken,
  synthesizeSpeech,
} from "@/lib/voice-agent/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = readSpeakToken(url.searchParams.get("t") ?? "", url.searchParams.get("s") ?? "");
  if (!text) return NextResponse.json({ error: "Invalid speech request" }, { status: 400 });

  let audio = readCachedSpeech(text);
  if (!audio) {
    await prefetchSpeech(text);
    audio = readCachedSpeech(text) ?? (await synthesizeSpeech(text));
  }
  if (!audio) {
    return NextResponse.json(
      { error: "Speech is not configured." },
      { status: 503 }
    );
  }
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=600",
    },
  });
}
