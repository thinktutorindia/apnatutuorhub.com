import { createNotification } from "@/lib/notification-engine";
import {
  buildAquaTuitionEnquiryPlaceholders,
  type LeadTemplateData,
} from "@/lib/lead-notify-template";
import type { LeadNotifyChannel } from "@/lib/queue";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";

/** How admin Lead Dispatch sends alerts (in-app is included unless IN_APP_ONLY). */
export type LeadDispatchVia = "WHATSAPP" | "EMAIL" | "BOTH" | "IN_APP";

export function channelsForLeadDispatch(via: LeadDispatchVia): LeadNotifyChannel[] {
  switch (via) {
    case "IN_APP":
      return ["IN_APP", "PUSH"];
    case "WHATSAPP":
      return ["IN_APP", "PUSH", "WHATSAPP"];
    case "EMAIL":
      return ["IN_APP", "PUSH", "EMAIL"];
    case "BOTH":
    default:
      return ["IN_APP", "PUSH", "EMAIL", "WHATSAPP"];
  }
}

export async function notifyTutorForLeadDispatch(opts: {
  userId: string;
  phone: string | null;
  leadId: string;
  title: string;
  message: string;
  via: LeadDispatchVia;
  leadForTemplate: LeadTemplateData;
}): Promise<{ whatsAppAttempted: boolean; whatsAppOk: boolean }> {
  const { userId, phone, leadId, title, message, via, leadForTemplate } = opts;
  const selected = channelsForLeadDispatch(via);

  const wantsInApp = selected.includes("IN_APP");
  const wantsPush = selected.includes("PUSH");
  const wantsEmail = selected.includes("EMAIL");
  const wantsWhatsApp = selected.includes("WHATSAPP");

  if (wantsInApp) {
    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "WEB",
      title,
      message,
      actionUrl: "/tutor/leads",
      referenceId: leadId,
      sendEmail: wantsEmail,
      sendPush: wantsPush,
      skipAutoEmail: !wantsEmail,
      forceSend: true,
    });
  } else if (wantsPush) {
    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "PUSH",
      title,
      message,
      actionUrl: "/tutor/leads",
      referenceId: leadId,
      skipAutoEmail: true,
      forceSend: true,
    });
  } else if (wantsEmail) {
    await createNotification({
      userId,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "EMAIL",
      title,
      message,
      actionUrl: "/tutor/leads",
      referenceId: leadId,
      sendEmail: true,
      skipAutoEmail: true,
      forceSend: true,
    });
  }

  if (!wantsWhatsApp) {
    return { whatsAppAttempted: false, whatsAppOk: false };
  }

  const waPlaceholders = buildAquaTuitionEnquiryPlaceholders(leadForTemplate);
  const normalizedPhone = phone ? normalizeIndiaWhatsApp(phone) : null;
  if (!normalizedPhone) {
    return { whatsAppAttempted: true, whatsAppOk: false };
  }

  const wa = await sendAquaWhatsAppMessage({
    to: normalizedPhone,
    mode: "template",
    templateId: "tuition_enquiry_direct",
    placeholders: waPlaceholders.slice(0, 7),
    text: `${title}\n\n${message}\nhttps://apnatutorhub.com/tutor/leads`,
    bypassDailyCap: true,
  });

  if (wa.ok) {
    await upsertWhatsAppChatMessage({
      phone: normalizedPhone,
      direction: "OUTBOUND",
      senderName: "Lead Enquiry",
      body: `[Tuition Enquiry]\n${message}`,
      step: "LEAD_MATCHED",
      messageId: wa.providerMessageId ?? null,
      messageType: "template",
      status: wa.rawStatus ?? "accepted",
      isRead: true,
    }).catch(() => {});
  }

  return { whatsAppAttempted: true, whatsAppOk: wa.ok };
}
