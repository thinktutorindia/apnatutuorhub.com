/**
 * lib/whatsapp-bot/session.ts
 * Read / write WhatsApp chatbot session state in PostgreSQL.
 */

import { prisma } from "@/lib/prisma";

export type BotSession = {
  id: string;
  phone: string;
  userType: string | null;
  step: string;
  data: Record<string, unknown>;
  retries: number;
};

/** Load existing session or create a fresh WELCOME one. */
export async function getOrCreateSession(phone: string): Promise<BotSession> {
  const raw = await prisma.whatsappSession.upsert({
    where: { phone },
    create: { phone, step: "WELCOME", data: {}, retries: 0 },
    update: { lastMessageAt: new Date() },
  });

  return {
    id: raw.id,
    phone: raw.phone,
    userType: raw.userType,
    step: raw.step,
    data: (raw.data as Record<string, unknown>) ?? {},
    retries: raw.retries,
  };
}

/** Persist updated step + data. */
export async function updateSession(
  phone: string,
  step: string,
  data: Record<string, unknown>,
  userType?: string | null,
  retries?: number
): Promise<void> {
  await prisma.whatsappSession.update({
    where: { phone },
    data: {
      step,
      data: data as never, // Prisma Json accepts any object — cast needed
      ...(userType !== undefined && { userType }),
      ...(retries !== undefined && { retries }),
      lastMessageAt: new Date(),
    },
  });
}

/** Reset the session back to WELCOME (used for MENU command or after completion). */
export async function resetSession(phone: string): Promise<void> {
  await prisma.whatsappSession.upsert({
    where: { phone },
    create: { phone, step: "WELCOME", data: {}, userType: null, retries: 0 },
    update: { step: "WELCOME", data: {}, userType: null, retries: 0, lastMessageAt: new Date() },
  });
}

/** Increment retry counter (on invalid replies). Reset on valid reply. */
export async function bumpRetries(phone: string, current: number): Promise<number> {
  const next = current + 1;
  await prisma.whatsappSession.update({
    where: { phone },
    data: { retries: next, lastMessageAt: new Date() },
  });
  return next;
}
