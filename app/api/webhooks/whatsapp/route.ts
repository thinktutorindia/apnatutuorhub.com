/**
 * app/api/webhooks/whatsapp/route.ts
 *
 * Configure this URL in the Aqua SMS portal as the webhook endpoint:
 *   https://www.apnatutorhub.com/api/webhooks/whatsapp
 *
 * Pinbot sends a POST with JSON body. The shape varies slightly by version;
 * we normalise all known variants into { phone, text }.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSession, updateSession, resetSession } from "@/lib/whatsapp-bot/session";
import { processMessage } from "@/lib/whatsapp-bot/engine";
import { sendBotMessage } from "@/lib/whatsapp-bot/sender";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

export const runtime = "nodejs";

// ── Automatic WhatsApp Reply Toggle ──────────────────────────────────────────
// Enabled for live automatic chatbot replies.
export const AUTO_REPLY_ENABLED = true;

// ── Payload normalisation ────────────────────────────────────────────────────

type NormalisedInbound = { phone: string; text: string; messageId?: string } | null;

function extractTextFromMessage(msg: Record<string, unknown>): string {
  let text = "";

  // 1. Text message
  if (msg.text && typeof msg.text === "object") {
    const textBlock = msg.text as Record<string, unknown>;
    if (typeof textBlock.body === "string") text = textBlock.body;
  } else if (typeof msg.body === "string") {
    text = msg.body;
  }

  // 2. Interactive Button & List Reply (SmartPing doc pg 58, 60)
  if (!text && msg.interactive && typeof msg.interactive === "object") {
    const interactive = msg.interactive as Record<string, unknown>;
    if (interactive.type === "button_reply" && interactive.button_reply) {
      const btn = interactive.button_reply as Record<string, unknown>;
      text = (typeof btn.title === "string" && btn.title) || (typeof btn.id === "string" && btn.id) || "";
    } else if (interactive.type === "list_reply" && interactive.list_reply) {
      const list = interactive.list_reply as Record<string, unknown>;
      text = (typeof list.title === "string" && list.title) || (typeof list.id === "string" && list.id) || "";
    }
  }

  // 3. Template Quick Reply Button (SmartPing doc pg 66)
  if (!text && msg.button && typeof msg.button === "object") {
    const btn = msg.button as Record<string, unknown>;
    text = (typeof btn.text === "string" && btn.text) || (typeof btn.payload === "string" && btn.payload) || "";
  }

  // 4. Media Caption fallback
  if (!text && msg.image && typeof msg.image === "object") {
    const img = msg.image as Record<string, unknown>;
    if (typeof img.caption === "string") text = img.caption;
  } else if (!text && msg.document && typeof msg.document === "object") {
    const doc = msg.document as Record<string, unknown>;
    if (typeof doc.caption === "string") text = doc.caption;
  }

  return text.trim();
}

/**
 * Aqua SMS / Pinbot webhook bodies come in several shapes.
 * We support Meta Cloud API v3 and legacy Pinbot variants.
 * Also parses interactive button replies, list replies, and quick reply buttons (per SmartPing docs).
 */
function parseInboundPayload(body: Record<string, unknown>): NormalisedInbound {
  // Shape 0: Meta Cloud API / Pinbot v3 format (entry[].changes[].value.messages[])
  if (Array.isArray(body.entry) && body.entry.length > 0) {
    const entry = body.entry[0] as Record<string, unknown>;
    if (Array.isArray(entry?.changes) && entry.changes.length > 0) {
      const change = entry.changes[0] as Record<string, unknown>;
      const value = change?.value as Record<string, unknown> | undefined;
      if (Array.isArray(value?.messages) && value.messages.length > 0) {
        const msg = value.messages[0] as Record<string, unknown>;
        const rawFrom = typeof msg.from === "string" ? msg.from : "";
        const phone = normalizeIndiaWhatsApp(rawFrom);
        const text = extractTextFromMessage(msg);
        const messageId = typeof msg.id === "string" ? msg.id : undefined;

        if (phone && text) return { phone, text, messageId };
      }
    }
  }

  // Shape 0b: Root messages array { messages: [...] }
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const msg = body.messages[0] as Record<string, unknown>;
    const rawFrom = typeof msg.from === "string" ? msg.from : "";
    const phone = normalizeIndiaWhatsApp(rawFrom);
    const text = extractTextFromMessage(msg);
    const messageId = typeof msg.id === "string" ? msg.id : undefined;
    if (phone && text) return { phone, text, messageId };
  }

  // Shape 0c: Nested under body.data.messages
  if (body.data && typeof body.data === "object") {
    const dataObj = body.data as Record<string, unknown>;
    if (Array.isArray(dataObj.messages) && dataObj.messages.length > 0) {
      const msg = dataObj.messages[0] as Record<string, unknown>;
      const rawFrom = typeof msg.from === "string" ? msg.from : "";
      const phone = normalizeIndiaWhatsApp(rawFrom);
      const text = extractTextFromMessage(msg);
      const messageId = typeof msg.id === "string" ? msg.id : undefined;
      if (phone && text) return { phone, text, messageId };
    }
  }

  // Shape 1: { from, message: { text } }  ← most common Pinbot v2
  const rawFrom =
    (typeof body.from === "string" && body.from) ||
    (typeof body.From === "string" && body.From) ||
    (typeof body.sender === "string" && body.sender) ||
    (typeof body.mobile === "string" && body.mobile) ||
    (typeof body.phone === "string" && body.phone) ||
    (typeof body.waId === "string" && body.waId) ||
    "";

  if (rawFrom) {
    const msgBlock = body.message as Record<string, unknown> | undefined;
    const text =
      typeof msgBlock?.text === "string"
        ? msgBlock.text
        : typeof msgBlock?.body === "string"
          ? msgBlock.body
          : typeof body.text === "string"
            ? body.text
            : typeof body.body === "string"
              ? body.body
              : typeof body.Body === "string"
                ? body.Body
                : typeof body.message === "string"
                  ? body.message
                  : "";
    const phone = normalizeIndiaWhatsApp(rawFrom);
    const messageId = typeof body.id === "string" ? body.id : typeof body.messageId === "string" ? body.messageId : undefined;
    if (phone && text) return { phone, text: text.trim(), messageId };
  }

  return null;
}

// ── Message Deduplication ────────────────────────────────────────────────────
// Pinbot/Aqua may retry webhooks causing duplicate bot replies.
// Cache message IDs for 25s; for text-only, deduplicate within 3s to allow consecutive same-digit inputs.
const recentMessages = new Map<string, number>(); // key → timestamp
const DEDUP_TTL_MS = 25_000;

function isDuplicateMessage(phone: string, text: string, messageId?: string): boolean {
  const now = Date.now();
  for (const [key, ts] of recentMessages) {
    if (now - ts > DEDUP_TTL_MS) recentMessages.delete(key);
  }

  if (messageId) {
    const key = `msg:${messageId}`;
    if (recentMessages.has(key)) {
      console.log(`[whatsapp-webhook] Duplicate message ID ignored: ${messageId}`);
      return true;
    }
    recentMessages.set(key, now);
    return false;
  }

  const dedupKey = `${phone}:${text.trim().toLowerCase().slice(0, 100)}`;
  const lastSeen = recentMessages.get(dedupKey);
  if (lastSeen && now - lastSeen < 3_000) {
    console.log(`[whatsapp-webhook] Rapid duplicate message ignored from ${phone}`);
    return true;
  }
  recentMessages.set(dedupKey, now);
  return false;
}

// ── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Optional: verify a shared secret header or param if configured
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (webhookSecret) {
    const url = new URL(request.url);
    const incomingSecret =
      request.headers.get("x-webhook-secret") ??
      request.headers.get("x-aqua-secret") ??
      url.searchParams.get("secret") ??
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
    // Check if this is an outbound status update (sent / delivered / read / failed) per SmartPing docs
    const statusUpdate = parseStatusPayload(body);
    if (statusUpdate) {
      await handleStatusUpdate(statusUpdate);
      return smartPingSuccess();
    }

    // Pinbot / SmartPing other event types (template updates, account alerts) — acknowledged
    console.log("[whatsapp-webhook] Non-message payload, acknowledged:", JSON.stringify(body).slice(0, 200));
    return smartPingSuccess();
  }

  const { phone, text, messageId } = inbound;

  // ── Deduplication check ─────────────────────────────────────────────────
  if (isDuplicateMessage(phone, text, messageId)) {
    return smartPingSuccess(); // Silently ack, don't re-process
  }

  // ── Automatic WhatsApp Reply Active ──────────────────────────────────────
  const isAutoReplyOn = AUTO_REPLY_ENABLED;

  if (!isAutoReplyOn) {
    console.log(
      `[whatsapp-bot] Auto-reply is OFF. Inbound from ${phone}: "${text.slice(0, 80)}" acknowledged without sending automated reply.`
    );
    return smartPingSuccess();
  }

  console.log(`[whatsapp-bot] Inbound from ${phone}: "${text.slice(0, 80)}"`);

  try {
    // 1. Load or create session
    const session = await getOrCreateSession(phone);

    // 2. Process through state machine
    const result = await processMessage(session, text);

    // 3. Persist state
    await updateSession(
      phone,
      result.nextStep,
      result.updatedData,
      result.userType,
      result.retries
    );

    // 4. Send reply (free within 24-hr service window)
    const sent = await sendBotMessage(phone, result.reply);
    console.log(`[whatsapp-webhook] Automated reply sent to ${phone}: ${sent ? "SUCCESS" : "FAILED"}`);

    return smartPingSuccess();
  } catch (err) {
    console.error("[whatsapp-webhook] Unhandled error:", err);
    // Try to send an error message to the user
    try {
      await sendBotMessage(
        phone,
        "Kuch gadbad ho gayi. *MENU* type karo phir se try karne ke liye."
      );
    } catch {
      // Best-effort
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── SmartPing Outbound Status Tracking (per aquadocssms.pdf) ──────────────────

type NormalisedStatus = {
  messageId: string;
  status: "SENT" | "DELIVERED" | "SEEN" | "FAILED";
  recipientId?: string;
  error?: string;
};

function parseStatusPayload(body: Record<string, unknown>): NormalisedStatus | null {
  if (Array.isArray(body.entry) && body.entry.length > 0) {
    const entry = body.entry[0] as Record<string, unknown>;
    if (Array.isArray(entry?.changes) && entry.changes.length > 0) {
      const change = entry.changes[0] as Record<string, unknown>;
      const value = change?.value as Record<string, unknown> | undefined;
      if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
        const s = value.statuses[0] as Record<string, unknown>;
        const messageId = typeof s.id === "string" ? s.id : null;
        const rawStatus = typeof s.status === "string" ? s.status.toLowerCase() : "";
        if (!messageId) return null;

        let status: "SENT" | "DELIVERED" | "SEEN" | "FAILED" = "SENT";
        if (rawStatus === "delivered") status = "DELIVERED";
        else if (rawStatus === "read") status = "SEEN";
        else if (rawStatus === "failed") status = "FAILED";

        let error: string | undefined;
        if (Array.isArray(s.errors) && s.errors.length > 0) {
          const errObj = s.errors[0] as Record<string, unknown>;
          error = typeof errObj.title === "string" ? errObj.title : undefined;
        }

        return {
          messageId,
          status,
          recipientId: typeof s.recipient_id === "string" ? s.recipient_id : undefined,
          error,
        };
      }
    }
  }
  return null;
}

async function handleStatusUpdate(update: NormalisedStatus): Promise<void> {
  try {
    const delivery = await prisma.notificationDelivery.findFirst({
      where: { providerMessageId: update.messageId },
      select: { id: true, notificationId: true },
    });

    if (delivery) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: update.status,
          errorMessage: update.error ?? null,
        },
      });

      if (update.status === "DELIVERED" || update.status === "SEEN") {
        await prisma.notification.update({
          where: { id: delivery.notificationId },
          data: {
            status: update.status,
            deliveredAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.warn("[whatsapp-webhook] Could not update delivery status:", err);
  }
}

/** Official response expected by SmartPing Callback API (aquadocssms.pdf pg 39, 96) */
function smartPingSuccess(): NextResponse {
  return NextResponse.json({
    code: 200,
    status: "OK",
    "0": JSON.stringify({ code: 200, status: "success" }),
    ok: true,
  });
}

// GET handler — Pinbot / Meta Cloud API verification ping
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge") ?? url.searchParams.get("challenge");
  const token = url.searchParams.get("hub.verify_token");
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET || process.env.WHATSAPP_VERIFY_TOKEN;

  if (challenge) {
    if (expectedSecret && token && token !== expectedSecret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({
    status: "WhatsApp webhook is live ✅",
    autoReply: AUTO_REPLY_ENABLED,
  });
}
