/**
 * Official Support Contact Details
 * WhatsApp / helpline shown to parents and tutors.
 */
export const SUPPORT_PHONE_DISPLAY = "+91 87997 07960";
export const SUPPORT_PHONE_NUMBER = "+91 87997 07960";
export const SUPPORT_WHATSAPP_RAW = "918799707960";

export function getWhatsAppSupportLink(customText?: string): string {
  const text = customText
    ? encodeURIComponent(customText)
    : encodeURIComponent("Hi ApnaTutorHub Support, I need help.");
  return `https://wa.me/${SUPPORT_WHATSAPP_RAW}?text=${text}`;
}
