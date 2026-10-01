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
  lastMessageAt?: Date;
  isIdle?: boolean;
  justCreated?: boolean;
};

/** Load existing session or create a fresh language-select one. */
export async function getOrCreateSession(phone: string): Promise<BotSession> {
  const existing = await prisma.whatsappSession.findUnique({ where: { phone } });
  const isIdle = existing?.lastMessageAt
    ? Date.now() - new Date(existing.lastMessageAt).getTime() > 15 * 60 * 1000 // 15 minutes idle
    : false;

  const raw = await prisma.whatsappSession.upsert({
    where: { phone },
    create: { phone, step: "LANG_SELECT", data: {}, retries: 0 },
    update: { step: existing?.step ?? "LANG_SELECT" },
  });

  let step = raw.step;
  let data = (raw.data as Record<string, unknown>) ?? {};

  // ── Session recovery for already-registered users ──────────────────────────
  // If the session looks fresh (LANG_SELECT/WELCOME with empty data), check if
  // this phone is already a registered user. If yes, restore to DONE so the bot
  // doesn't ask them to create a profile again.
  const isBlankSession = (step === "LANG_SELECT" || step === "WELCOME") && !data._registered;
  if (isBlankSession) {
    const rawPhone = phone.replace(/\D/g, "");
    const last10 = rawPhone.slice(-10);
    const phoneVariants: string[] = [phone, rawPhone];
    if (last10) {
      phoneVariants.push(last10);
      phoneVariants.push(`91${last10}`);
    }

    const registeredUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...phoneVariants.map((p) => ({ phone: p })),
          { email: `wa_${last10}@apnatutorhub.com` },
        ],
      },
      include: {
        tutorProfile: { select: { id: true, address: true, city: true, subjects: true } },
        parentProfile: { select: { id: true } },
      },
    });

    if (registeredUser) {
      // Restore session to DONE state with stored profile data
      const restoredData: Record<string, unknown> = {
        _registered: true,
        name: registeredUser.name ?? "",
        email: registeredUser.email ?? "",
        phone: registeredUser.phone ?? phone,
      };

      if (registeredUser.tutorProfile) {
        restoredData.area = registeredUser.tutorProfile.address ?? "";
        restoredData.city = registeredUser.tutorProfile.city ?? "";
        restoredData.subjects = registeredUser.tutorProfile.subjects ?? [];
      }

      const userType = registeredUser.parentProfile ? "PARENT" : "TUTOR";

      // Persist restored session so future requests don't need to re-query
      await prisma.whatsappSession.update({
        where: { phone },
        data: { step: "DONE", data: restoredData as never, userType, lastMessageAt: new Date() },
      });

      return {
        id: raw.id,
        phone: raw.phone,
        userType,
        step: "DONE",
        data: restoredData,
        retries: 0,
        lastMessageAt: existing?.lastMessageAt || raw.lastMessageAt,
        isIdle,
        justCreated: !existing,
      };
    }
  }
  // ── End session recovery ───────────────────────────────────────────────────

  // Normal path: return session as-is from DB
  return {
    id: raw.id,
    phone: raw.phone,
    userType: raw.userType,
    step,
    data,
    retries: raw.retries,
    lastMessageAt: existing?.lastMessageAt || raw.lastMessageAt,
    isIdle,
    justCreated: !existing,
  };
}

/**
 * One reply per phone at a time. A second webhook for the same tap loses this lock
 * and must not send another message.
 */
export async function claimReplyTurn(session: BotSession): Promise<boolean> {
  const now = new Date();
  const previous = session.lastMessageAt ? new Date(session.lastMessageAt) : null;
  if (!session.justCreated && previous && now.getTime() - previous.getTime() < 4500) {
    return false;
  }
  const won = await prisma.whatsappSession.updateMany({
    where: {
      id: session.id,
      ...(previous ? { lastMessageAt: previous } : {}),
    },
    data: { lastMessageAt: now },
  });
  return won.count === 1;
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
    create: { phone, step: "LANG_SELECT", data: {}, userType: null, retries: 0 },
    update: { step: "LANG_SELECT", data: {}, userType: null, retries: 0, lastMessageAt: new Date() },
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
