/**
 * lib/whatsapp-bot/sender.ts
 * Thin wrapper around the existing Aqua SMS client for chatbot replies.
 * Uses the same config (AQUA_WHATSAPP_*) already in .env.
 */

import { sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";

/**
 * Send a plain-text WhatsApp message to a user.
 * `to` should be E.164 digits without +, e.g. "919876543210".
 */
export async function sendBotMessage(to: string, text: string): Promise<boolean> {
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
