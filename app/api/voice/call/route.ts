import { NextResponse } from "next/server";
import { VOICE_GREETING, handleCallerTurn } from "@/lib/voice-agent/session";
import {
  downloadRecording,
  prefetchSpeech,
  speakPath,
  transcribeSpeech,
} from "@/lib/voice-agent/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(request: Request): string {
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (configured.startsWith("http")) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function callXml(origin: string, callId: string, say: string, done: boolean): string {
  const play = xmlEscape(speakPath(origin, say));
  const action = xmlEscape(`${origin}/api/voice/call?callId=${encodeURIComponent(callId)}`);
  const follow = done
    ? "<Hangup/>"
    : `<Record action="${action}" maxLength="10" timeout="3" playBeep="false" />`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${play}</Play>${follow}</Response>`;
}

async function readFields(request: Request): Promise<Record<string, string>> {
  const url = new URL(request.url);
  const fields: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    fields[key] = value;
  });
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (value != null) fields[key] = String(value);
    }
  } else if (type.includes("form")) {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") fields[key] = value;
    }
  }
  return fields;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: "Priya",
    number: "08062180653",
    greeting: VOICE_GREETING,
    speech: Boolean(process.env.SARVAM_API_KEY),
  });
}

export async function POST(request: Request) {
  const fields = await readFields(request);
  const callId = fields.callId || fields.CallSid || fields.call_sid || `local-${Date.now()}`;
  const from = (fields.from || fields.From || fields.CallFrom || "").replace(/\s/g, "");
  const origin = originOf(request);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");

  let callerText = (fields.text || "").trim();
  const recordingUrl = fields.RecordingUrl || fields.recordingUrl || "";
  if (!callerText && recordingUrl) {
    const audio = await downloadRecording(recordingUrl);
    callerText = await transcribeSpeech(audio);
  }

  if (!callerText) {
    await prefetchSpeech(VOICE_GREETING);
    if (wantsJson) {
      return NextResponse.json({ say: VOICE_GREETING, callId, audioUrl: speakPath(origin, VOICE_GREETING) });
    }
    return new NextResponse(callXml(origin, callId, VOICE_GREETING, false), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  const turn = await handleCallerTurn({ callId, from: from || "unknown", callerText });
  await prefetchSpeech(turn.say);
  const done = turn.complete || turn.handoff;
  if (wantsJson) {
    return NextResponse.json({
      say: turn.say,
      role: turn.role,
      extracted: turn.extracted,
      handoff: turn.handoff,
      complete: turn.complete,
      inquiryNumber: turn.inquiryNumber ?? null,
      audioUrl: speakPath(origin, turn.say),
    });
  }
  return new NextResponse(callXml(origin, callId, turn.say, done), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
