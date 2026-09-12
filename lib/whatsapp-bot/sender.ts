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
export async function sendBotMessage(to: string, text: string): Promise<void> {
  const result = await sendAquaWhatsAppMessage({ to, mode: "text", text });
  if (!result.ok) {
    // Log but don't throw — a failed send shouldn't crash the webhook handler
    console.error(`[whatsapp-bot] send failed to ${to}: ${result.error}`);
  }
}
