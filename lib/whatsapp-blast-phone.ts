import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

export type WhatsAppReachability = {
  dispatchPhone: string | null;
  hasInbound: boolean;
  lastInboundAt: Date | null;
  within24h: boolean;
};

export async function getWhatsAppReachability(
  rawPhone: string | null | undefined
): Promise<WhatsAppReachability> {
  const dispatchPhone = rawPhone ? normalizeIndiaWhatsApp(rawPhone) : null;
  if (!dispatchPhone) {
    return { dispatchPhone: null, hasInbound: false, lastInboundAt: null, within24h: false };
  }

  const lastInbound = await prisma.whatsappChatMessage.findFirst({
    where: { phone: dispatchPhone, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const lastInboundAt = lastInbound?.createdAt ?? null;
  const within24h = lastInboundAt
    ? Date.now() - lastInboundAt.getTime() < 23 * 60 * 60 * 1000
    : false;

  return {
    dispatchPhone,
    hasInbound: Boolean(lastInboundAt),
    lastInboundAt,
    within24h,
  };
}

/** Wait for webhook to update delivery status on outbound message id. */
export async function waitForWhatsAppDeliveryStatus(
  messageId: string,
  waitMs = 4500
): Promise<string | null> {
  if (!messageId) return null;
  await new Promise((r) => setTimeout(r, waitMs));
  const row = await prisma.whatsappChatMessage.findFirst({
    where: { messageId },
    select: { status: true },
  });
  return row?.status ?? null;
}
