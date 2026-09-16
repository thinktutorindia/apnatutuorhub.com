/**
 * app/api/chatbot/simulate/route.ts
 *
 * Dedicated live simulation endpoint for testing the WhatsApp Chatbot in the browser.
 * Connects directly to the Bot Engine and Gemini AI agent without sending real SMS/WhatsApp.
 */

import { NextResponse } from "next/server";
import { getOrCreateSession, updateSession, resetSession } from "@/lib/whatsapp-bot/session";
import { processMessage } from "@/lib/whatsapp-bot/engine";

export const runtime = "nodejs";

const DEFAULT_SIMULATOR_PHONE = "919999000000";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const phone = (body.phone || DEFAULT_SIMULATOR_PHONE).trim();
    const message = (body.message || "").trim();
    const useAi = body.useAi !== false;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Get or create session
    const session = await getOrCreateSession(phone);

    // 2. Process through hybrid engine (with Gemini AI support)
    const result = await processMessage(session, message, { useAi });

    // 3. Persist updated session
    await updateSession(
      phone,
      result.nextStep,
      result.updatedData,
      result.userType,
      result.retries
    );

    const updatedSession = await getOrCreateSession(phone);

    return NextResponse.json({
      success: true,
      reply: result.reply,
      quickReplies: result.quickReplies || [],
      nextStep: result.nextStep,
      updatedData: result.updatedData,
      userType: result.userType,
      session: updatedSession,
    });
  } catch (err: any) {
    console.error("[chatbot-simulate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process message" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone") || DEFAULT_SIMULATOR_PHONE;
    await resetSession(phone);
    const session = await getOrCreateSession(phone);

    return NextResponse.json({
      success: true,
      message: "Session reset to WELCOME",
      session,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone") || DEFAULT_SIMULATOR_PHONE;
    const session = await getOrCreateSession(phone);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
