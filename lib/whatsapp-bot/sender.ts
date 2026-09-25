/**
 * lib/whatsapp-bot/sender.ts
 * Thin wrapper around the existing Aqua SMS client for chatbot replies.
 * Uses the same config (AQUA_WHATSAPP_*) already in .env.
 */

import { sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";

/**
 * Global toggle for automatic WhatsApp bot replies.
 * TEMPORARILY DISABLED per user instruction.
 * To re-enable: Set AUTO_BOT_REPLY_ENABLED = true and AQUA_WHATSAPP_AUTO_REPLY="true".
 */
export const AUTO_BOT_REPLY_ENABLED = false;

/**
 * Send a plain-text WhatsApp message to a user.
 * `to` should be E.164 digits without +, e.g. "919876543210".
 */
export async function sendBotMessage(to: string, text: string): Promise<boolean> {
  const isEnabled =
    AUTO_BOT_REPLY_ENABLED && process.env.AQUA_WHATSAPP_AUTO_REPLY === "true";

  if (!isEnabled) {
    console.log(`[whatsapp-bot] Auto-reply is TEMPORARILY OFF. sendBotMessage skipped for ${to}`);
    return false;
  }

  const result = await sendAquaWhatsAppMessage({
    to,
    mode: "text",
    text,
    bypassDailyCap: true,
  });
  if (!result.ok) {
    console.error(`[whatsapp-bot] send failed to ${to}: ${result.error}`);
    return false;
  }
  return true;
}
