/**
 * Local WhatsApp chat log.
 * The admin inbox reads this table, so threads survive after Aqua deletes its copy.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

export type WhatsAppChatDirection = "INBOUND" | "OUTBOUND";

export type WhatsAppChatLogInput = {
  phone: string;
  direction: WhatsAppChatDirection;
  body: string;
  senderName?: string | null;
  contactName?: string | null;
  step?: string | null;
  messageId?: string | null;
  messageType?: string | null;
  status?: string | null;
  isRead?: boolean;
  createdAt?: Date;
};

function cleanPhone(phone: string): string | null {
  return normalizeIndiaWhatsApp(phone) || phone.replace(/\D/g, "") || null;
}

export async function upsertWhatsAppChatMessage(input: WhatsAppChatLogInput) {
  const phone = cleanPhone(input.phone);
  const body = input.body?.trim();
  if (!phone || !body) return null;

  const messageId = input.messageId?.trim() || null;
  const data = {
    phone,
    direction: input.direction,
    senderName: input.senderName?.trim() || null,
    contactName: input.contactName?.trim() || null,
    body,
    step: input.step?.trim() || null,
    messageId,
    messageType: input.messageType?.trim() || null,
    status: input.status?.trim() || null,
    isRead: input.isRead ?? input.direction === "OUTBOUND",
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  };

  if (messageId) {
    try {
      return await prisma.whatsappChatMessage.upsert({
        where: { messageId },
        create: data,
        update: {
          contactName: data.contactName ?? undefined,
          messageType: data.messageType ?? undefined,
          senderName: data.senderName ?? undefined,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return prisma.whatsappChatMessage.findUnique({ where: { messageId } });
      }
      throw err;
    }
  }

  return prisma.whatsappChatMessage.create({ data });
}

export async function updateWhatsAppChatMessageStatus(messageId: string, status: string) {
  const id = messageId.trim();
  const next = status.trim();
  if (!id || !next) return;
  await prisma.whatsappChatMessage.updateMany({
    where: { messageId: id },
    data: { status: next },
  });
}
