/**
 * Official Support Contact Details
 */
export const SUPPORT_PHONE_NUMBER = "+91 7703 801 849";
export const SUPPORT_WHATSAPP_RAW = "917703801849";

export function getWhatsAppSupportLink(customText?: string): string {
  const text = customText
    ? encodeURIComponent(customText)
    : encodeURIComponent("Hi ApnaTutorHub Support, I need help.");
  return `https://wa.me/${SUPPORT_WHATSAPP_RAW}?text=${text}`;
}
