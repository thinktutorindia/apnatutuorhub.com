/**
 * lib/whatsapp-bot/sender.ts
 * Thin wrapper around the existing Aqua SMS client for chatbot replies.
 * Uses the same config (AQUA_WHATSAPP_*) already in .env.
 */

import { sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";

/**
 * Global toggle for automatic WhatsApp bot replies.
 * Enabled for live automated chatbot interactions.
 */
export const AUTO_BOT_REPLY_ENABLED = true;

/**
 * Send a plain-text WhatsApp message to a user.
 * `to` should be E.164 digits without +, e.g. "919876543210".
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

  const result = await sendAquaWhatsAppMessage({
    to,
    mode: "text",
    text,
    bypassDailyCap: true,
  });

  // Persist outbound message immediately so the thread stays complete if Aqua drops its copy.
  upsertWhatsAppChatMessage({
    phone: to,
    direction: "OUTBOUND",
    senderName: meta?.senderName ?? "Bot",
    body: text,
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
