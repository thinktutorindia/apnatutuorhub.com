/**
 * CONTEXT — profile and pipeline state read from the DB, never from session JSON.
 * Pure helpers are exported for tests; loadContext() is read-only.
 */
import { prisma } from "@/lib/prisma";
import { buildIndiaPhoneOrFilter, canonicalIndiaPhone, indiaPhoneLast10 } from "@/lib/india-phone";

export type ProfileContext = {
  name?: string | null;
  email?: string | null;
  emailIsPlaceholder?: boolean;
  locality?: string | null;
  landmark?: string | null;
  city?: string | null;
  subjects?: string[];
  classLevels?: string[];
};

export function computeMissing(profile: ProfileContext): string[] {
  const missing: string[] = [];
  if (!profile.name?.trim()) missing.push("name");
  if (!profile.email?.trim() || profile.emailIsPlaceholder) missing.push("email");
  if (!profile.locality?.trim() && !profile.city?.trim()) missing.push("location");
  if (!profile.classLevels?.length || !profile.subjects?.length) missing.push("classes_subjects");
  return missing;
}

export function computeInvalid(profile: ProfileContext): string[] {
  const invalid: string[] = [];
  if (profile.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profile.email)) invalid.push("email");
  if (profile.emailIsPlaceholder) invalid.push("email_placeholder");
  return invalid;
}

export function windowExpiresAt(lastInboundAt: Date | null | undefined, now = new Date()): Date | null {
  if (!lastInboundAt) return null;
  return new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000);
}

export function isWindowOpen(lastInboundAt: Date | null | undefined, now = new Date()): boolean {
  const expires = windowExpiresAt(lastInboundAt, now);
  return expires ? now.getTime() < expires.getTime() : false;
}

export function isPendingSoft(askedAt: Date | null | undefined, now = new Date()): boolean {
  if (!askedAt) return false;
  return now.getTime() - askedAt.getTime() > 12 * 60 * 60 * 1000;
}

export function hoursSince(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  return Math.round(((now.getTime() - date.getTime()) / (60 * 60 * 1000)) * 10) / 10;
}

export async function loadContext(phone: string) {
  const canonical = canonicalIndiaPhone(phone) ?? phone.replace(/\D/g, "");
  const last10 = indiaPhoneLast10(phone);
  const phoneVariants = Array.from(new Set([phone, canonical, last10, `91${last10}`].filter(Boolean) as string[]));

  const [session, user, messages] = await Promise.all([
    prisma.whatsappSession.findUnique({ where: { phone: canonical } }),
    prisma.user.findFirst({
      where: { OR: buildIndiaPhoneOrFilter(phone) as never },
      select: {
        id: true,
        name: true,
        email: true,
        tutorProfile: {
          select: {
            subjects: true,
            classLevels: true,
            locality: true,
            landmark: true,
            city: true,
            address: true,
          },
        },
        parentProfile: { select: { locality: true, landmark: true, city: true, address: true } },
      },
    }),
    prisma.whatsappChatMessage.findMany({
      where: { phone: { in: phoneVariants } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { direction: true, body: true, senderName: true, createdAt: true },
    }),
  ]);

  const tp = user?.tutorProfile;
  const pp = user?.parentProfile;
  const profile: ProfileContext = {
    name: user?.name,
    email: user?.email,
    emailIsPlaceholder: /^wa[._]/i.test(user?.email ?? "") || /@apnatutorhub\.com$/i.test(user?.email ?? ""),
    locality: tp?.locality ?? pp?.locality ?? null,
    landmark: tp?.landmark ?? pp?.landmark ?? null,
    city: tp?.city ?? pp?.city ?? null,
    subjects: tp?.subjects ?? [],
    classLevels: tp?.classLevels ?? [],
  };

  const chronological = [...messages].reverse();
  const lastInbound = chronological.filter((m) => m.direction === "INBOUND").at(-1)?.createdAt ?? null;

  return {
    phone: canonical,
    profile,
    missing: computeMissing(profile),
    invalid: computeInvalid(profile),
    pendingQuestion: session?.pendingQuestion ?? null,
    pendingAskedAt: session?.pendingAskedAt ?? null,
    pendingIsSoft: isPendingSoft(session?.pendingAskedAt),
    rollingSummary: session?.rollingSummary ?? null,
    unsubscribed: session?.unsubscribed ?? false,
    windowExpiresAt: windowExpiresAt(lastInbound),
    hoursSinceLastInbound: hoursSince(lastInbound),
    recentMessages: chronological.map((m) => ({
      direction: m.direction,
      body: m.body,
      senderName: m.senderName,
      at: m.createdAt.toISOString(),
    })),
  };
}
