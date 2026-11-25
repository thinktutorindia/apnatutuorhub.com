/**
 * lib/whatsapp-bot/session.ts
 * Read / write WhatsApp chatbot session state in PostgreSQL.
 */

import { prisma } from "@/lib/prisma";
import { buildIndiaUserLookupOr, canonicalIndiaPhone } from "@/lib/india-phone";
import { isPlaceholderEmail } from "./strict-rules";

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

/** Load existing session or create a fresh English WELCOME session (never LANG_SELECT). */
export async function getOrCreateSession(phone: string): Promise<BotSession> {
  const sessionPhone = canonicalIndiaPhone(phone) ?? phone.replace(/\D/g, "");
  const existing = await prisma.whatsappSession.findUnique({ where: { phone: sessionPhone } });
  const isIdle = existing?.lastMessageAt
    ? Date.now() - new Date(existing.lastMessageAt).getTime() > 15 * 60 * 1000 // 15 minutes idle
    : false;

  const initialStep = existing?.step && existing.step !== "LANG_SELECT" ? existing.step : "WELCOME";
  const raw = await prisma.whatsappSession.upsert({
    where: { phone: sessionPhone },
    create: { phone: sessionPhone, step: "WELCOME", data: { lang: "en" }, retries: 0 },
    update: { step: initialStep },
  });

  let step = raw.step === "LANG_SELECT" ? "WELCOME" : raw.step;
  let data: Record<string, unknown> = { ...((raw.data as Record<string, unknown>) ?? {}), lang: "en" };

  // ── Session recovery ONLY for genuinely registered/onboarded users ─────────
  // CRITICAL: Do NOT mark an un-onboarded CRM interest stub (onboardingStep === 0,
  // placeholder wa.* email, empty/generic subjects & no city/area) as DONE!
  const shouldCheckRegistration = !data._registered || step !== "DONE";
  if (shouldCheckRegistration) {
    const registeredUser = await prisma.user.findFirst({
      where: {
        OR: buildIndiaUserLookupOr(sessionPhone) as never,
      },
      include: {
        tutorProfile: {
          select: { id: true, address: true, city: true, subjects: true, classLevels: true, teachingMode: true, onboardingStep: true },
        },
        parentProfile: {
          select: {
            id: true,
            _count: { select: { leads: true } },
          },
        },
      },
    });

    if (registeredUser) {
      const tp = registeredUser.tutorProfile;
      const pp = registeredUser.parentProfile;
      const isTutor = registeredUser.role === "TUTOR" || Boolean(tp);
      const isParent = !isTutor && (registeredUser.role === "PARENT" || Boolean(pp));
      const userType = isTutor ? "TUTOR" : isParent ? "PARENT" : "TUTOR";

      const hasRealEmail = !isPlaceholderEmail(registeredUser.email);
      const isTutorFullyOnboarded = Boolean(
        tp &&
          (tp.onboardingStep >= 7 ||
            hasRealEmail ||
            (tp.subjects.length > 0 &&
              tp.classLevels.length > 0 &&
              Boolean(tp.address || tp.city) &&
              !(tp.subjects.length === 1 && tp.subjects[0] === "All Subjects" && tp.classLevels.join(",") === "Class 1-10")))
      );
      const isParentOnboarded = Boolean(pp && (pp._count.leads > 0 || hasRealEmail));

      if ((isTutor && isTutorFullyOnboarded) || (isParent && isParentOnboarded)) {
        const restoredData: Record<string, unknown> = {
          ...data,
          _registered: true,
          lang: "en",
          name: registeredUser.name ?? (data.name as string) ?? "",
          email: hasRealEmail ? registeredUser.email : ((data.email as string) || ""),
          phone: registeredUser.phone ?? phone,
          userType,
        };

        if (tp) {
          restoredData.area = tp.address ?? (data.area as string) ?? "";
          restoredData.city = tp.city ?? (data.city as string) ?? "";
          if (tp.subjects.length > 0) restoredData.subjects = tp.subjects;
          if (tp.classLevels.length > 0) {
            restoredData.classLevels = tp.classLevels;
            restoredData.classLevel = tp.classLevels[0];
          }
          restoredData.mode = tp.teachingMode ?? (data.mode as string) ?? "EITHER";
        }

        await prisma.whatsappSession.update({
          where: { phone: sessionPhone },
          data: { step: "DONE", data: restoredData as never, userType, lastMessageAt: new Date() },
        });

        return {
          id: raw.id,
          phone: sessionPhone,
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
  }
  // ── End session recovery ───────────────────────────────────────────────────

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
 * Concurrency guard per phone. Webhook identical-text duplicates are already dropped
 * by isDuplicateMessage in route.ts; here we only serialize concurrent bursts (>1000ms).
 */
export async function claimReplyTurn(session: BotSession): Promise<boolean> {
  const now = new Date();
  const previous = session.lastMessageAt ? new Date(session.lastMessageAt) : null;
  if (!session.justCreated && previous && now.getTime() - previous.getTime() < 1000) {
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
  const safeStep = step === "LANG_SELECT" ? "WELCOME" : step;
  await prisma.whatsappSession.update({
    where: { phone },
    data: {
      step: safeStep,
      data: { ...data, lang: "en" } as never,
      ...(userType !== undefined && { userType }),
      ...(retries !== undefined && { retries }),
      lastMessageAt: new Date(),
    },
  });
}

/** Reset the session back to WELCOME (English-only entry). */
export async function resetSession(phone: string): Promise<void> {
  await prisma.whatsappSession.upsert({
    where: { phone },
    create: { phone, step: "WELCOME", data: { lang: "en" }, userType: null, retries: 0 },
    update: { step: "WELCOME", data: { lang: "en" }, userType: null, retries: 0, lastMessageAt: new Date() },
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
