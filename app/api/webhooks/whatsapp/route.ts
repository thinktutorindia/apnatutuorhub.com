/**
 * app/api/webhooks/whatsapp/route.ts
 *
 * Receives inbound WhatsApp messages from Aqua SMS / Pinbot.
 * Configure this URL in the Aqua SMS portal as the webhook endpoint:
 *   https://apnatutorhub.com/api/webhooks/whatsapp
 *
 * Pinbot sends a POST with JSON body. The shape varies slightly by version;
 * we normalise all known variants into { phone, text }.
 */

import { NextResponse } from "next/server";
import { getOrCreateSession, updateSession, resetSession } from "@/lib/whatsapp-bot/session";
import { processMessage } from "@/lib/whatsapp-bot/engine";
import { sendBotMessage } from "@/lib/whatsapp-bot/sender";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

export const runtime = "nodejs";

// ── Payload normalisation ────────────────────────────────────────────────────

type NormalisedInbound = { phone: string; text: string } | null;

/**
 * Aqua SMS / Pinbot webhook bodies come in several shapes.
 * We support the most common ones here.
 */
function parseInboundPayload(body: Record<string, unknown>): NormalisedInbound {
  // Shape 1: { from, message: { text } }  ← most common Pinbot v2
  if (body.from && typeof body.from === "string") {
    const msgBlock = body.message as Record<string, unknown> | undefined;
    const text =
      typeof msgBlock?.text === "string"
        ? msgBlock.text
        : typeof msgBlock?.body === "string"
          ? msgBlock.body
          : typeof body.text === "string"
            ? body.text
            : "";
    const phone = normalizeIndiaWhatsApp(body.from as string);
    if (phone && text) return { phone, text };
  }

  // Shape 2: { sender, body }  ← some older Pinbot versions
  if (body.sender && typeof body.sender === "string") {
    const text = typeof body.body === "string" ? body.body : "";
    const phone = normalizeIndiaWhatsApp(body.sender as string);
    if (phone && text) return { phone, text };
  }

  // Shape 3: Aqua SMS { mobile, message }
  if (body.mobile && typeof body.mobile === "string") {
    const text = typeof body.message === "string" ? body.message : "";
    const phone = normalizeIndiaWhatsApp(body.mobile as string);
    if (phone && text) return { phone, text };
  }

  return null;
}

// ── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Optional: verify a shared secret header if configured
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret =
      request.headers.get("x-webhook-secret") ??
      request.headers.get("x-aqua-secret") ??
      "";
    if (incomingSecret !== webhookSecret) {
      console.warn("[whatsapp-webhook] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inbound = parseInboundPayload(body);

  if (!inbound) {
    // Pinbot also sends delivery receipts and other event types — ignore silently
    console.log("[whatsapp-webhook] Non-message payload, ignoring:", JSON.stringify(body).slice(0, 200));
    return NextResponse.json({ ok: true });
  }

  const { phone, text } = inbound;

  console.log(`[whatsapp-bot] Inbound from ${phone}: "${text.slice(0, 80)}"`);

  try {
    // 1. Load or create session
    const session = await getOrCreateSession(phone);

    // 2. Process through state machine
    const result = await processMessage(session, text);

    // 3. Persist state
    if (result.nextStep === "WELCOME" || result.nextStep === "DONE") {
      await resetSession(phone);
      // If we're going to a specific non-welcome first step after reset, update again
      if (result.nextStep !== "WELCOME") {
        await updateSession(phone, result.nextStep, result.updatedData, result.userType, result.retries);
      }
    } else {
      await updateSession(
        phone,
        result.nextStep,
        result.updatedData,
        result.userType,
        result.retries
      );
    }

    // 4. Send reply
    await sendBotMessage(phone, result.reply);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp-webhook] Unhandled error:", err);
    // Try to send an error message to the user
    try {
      await sendBotMessage(
        phone,
        "⚠️ We encountered an issue. Please type *MENU* to restart or *HELP* for support."
      );
    } catch {
      // Best-effort
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET handler — Pinbot may send a verification ping
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge") ?? url.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "WhatsApp webhook is live ✅" });
}
