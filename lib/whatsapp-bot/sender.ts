/**
 * lib/whatsapp-bot/sender.ts
 * Thin wrapper around the existing Aqua SMS client for chatbot replies.
 * Uses the same config (AQUA_WHATSAPP_*) already in .env.
 */

import { sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";

/** Drop legacy ₹99 or ₹999 starter offers; replace with active ₹1,257 Commission Plan */
export function omitStarterPlan(text: string): string {
  let out = text.replace(
    /(?:₹|rs\.?|inr)\s*(?:99|999)(?!\d)\s*(?:starter|trial)?\s*offer\s*(?:ya|or|and|\/)\s*/gi,
    ""
  );
  out = out.replace(
    /(?:₹|rs\.?|inr)\s*(?:99|999)(?!\d)(\s*(?:starter|trial|festival))?\s*(offer|plan|pass|deal|membership)/gi,
    "₹1,257 $2"
  );
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Global toggle for automatic WhatsApp bot replies.
 * Enabled for live automated chatbot interactions.
 */
export const AUTO_BOT_REPLY_ENABLED = true;

/**
 * Send a plain-text WhatsApp message to a user.
 * `to` should be E.164 digits without +, e.g. "919000000000".
 * Also persists the outbound message to whatsapp_chat_messages for staff view.
 */
export async function sendBotMessage(
  to: string,
  text: string,
  meta?: { step?: string; messageId?: string; senderName?: string }
): Promise<boolean> {
  const isEnabled = AUTO_BOT_REPLY_ENABLED;

  if (!isEnabled) {
    console.log(`[whatsapp-bot] Auto-reply is OFF. sendBotMessage skipped for ${to}`);
    return false;
  }

  const safeText = omitStarterPlan(text);

  const result = await sendAquaWhatsAppMessage({
    to,
    mode: "text",
    text: safeText,
    bypassDailyCap: true,
  });

  // Persist outbound message immediately so the thread stays complete if Aqua drops its copy.
  upsertWhatsAppChatMessage({
    phone: to,
    direction: "OUTBOUND",
    senderName: meta?.senderName ?? "Bot",
    body: safeText,
    step: meta?.step ?? null,
    messageId: result.providerMessageId ?? meta?.messageId ?? null,
    messageType: "text",
    status: result.ok ? result.rawStatus ?? "accepted" : "failed",
    isRead: true,
  }).catch((e) => console.warn("[chat-log] Failed to save outbound message:", e));

  if (!result.ok) {
    console.error(`[whatsapp-bot] send failed to ${to}: ${result.error}`);
    return false;
  }
  return true;
}

/**
 * Send one or more images (e.g. payment QR) to a user and persist them
 * to whatsapp_chat_messages so staff can see them in the chat thread.
 */
export async function sendBotImageMessage(
  to: string,
  imageUrls: string[],
  caption?: string,
  meta?: { step?: string; senderName?: string }
): Promise<boolean> {
  if (!imageUrls.length) return true;
  const isEnabled = AUTO_BOT_REPLY_ENABLED;
  if (!isEnabled) {
    console.log(`[whatsapp-bot] Auto-reply is OFF. sendBotImageMessage skipped for ${to}`);
    return false;
  }

  let allOk = true;
  for (const url of imageUrls) {
    const result = await sendAquaWhatsAppMessage({
      to,
      mode: "image",
      imageUrl: url,
      imageCaption: caption,
      bypassDailyCap: true,
    });

    upsertWhatsAppChatMessage({
      phone: to,
      direction: "OUTBOUND",
      senderName: meta?.senderName ?? "Bot",
      body: caption ? `[image] ${caption} · ${url}` : `[image] ${url}`,
      step: meta?.step ?? null,
      messageId: result.providerMessageId ?? null,
      messageType: "image",
      status: result.ok ? result.rawStatus ?? "accepted" : "failed",
      isRead: true,
    }).catch((e) => console.warn("[chat-log] Failed to save outbound image:", e));

    if (!result.ok) {
      allOk = false;
      console.error(`[whatsapp-bot] image send failed to ${to} (${url}): ${result.error}`);
    }
  }
  return allOk;
}
