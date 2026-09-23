/**
 * Official Support Contact Details
 * WhatsApp / helpline shown to parents and tutors.
 */
export const SUPPORT_PHONE_DISPLAY = "+91 93191 93109";
export const SUPPORT_PHONE_NUMBER = "+91 93191 93109";
export const SUPPORT_WHATSAPP_RAW = "919319193109";

export function getWhatsAppSupportLink(customText?: string): string {
  const text = customText
    ? encodeURIComponent(customText)
    : encodeURIComponent("Hi ApnaTutorHub Support, I need help.");
  return `https://wa.me/${SUPPORT_WHATSAPP_RAW}?text=${text}`;
}
