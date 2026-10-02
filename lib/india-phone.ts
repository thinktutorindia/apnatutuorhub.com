/**
 * Single canonical format for Indian mobiles in DB: 91 + 10 digits (e.g. 919876543210).
 */
import type { PrismaClient, User } from "@prisma/client";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";

export function canonicalIndiaPhone(input: string): string | null {
  return normalizeIndiaWhatsApp(input);
}

export function indiaPhoneLast10(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const last = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last) ? last : null;
}

/** WhatsApp auto-register placeholder email (must match phoneToEmail in auto-register). */
export function waPlaceholderEmail(input: string): string {
  const canon = canonicalIndiaPhone(input);
  if (canon) return `wa_${canon}@apnatutorhub.com`;
  const last10 = indiaPhoneLast10(input);
  if (last10) return `wa_${last10}@apnatutorhub.com`;
  return `wa_${input.replace(/\D/g, "")}@apnatutorhub.com`;
}

/** Admin manual create fallback email pattern. */
export function userPhonePlaceholderEmail(input: string): string | null {
  const last10 = indiaPhoneLast10(input);
  return last10 ? `user${last10}@apnatutorhub.com` : null;
}

export function buildIndiaPhoneOrFilter(
  input: string
): Array<{ phone: string } | { phone: { endsWith: string } }> {
  const raw = input.replace(/\D/g, "");
  const canon = canonicalIndiaPhone(input);
  const last10 = indiaPhoneLast10(input);
  const variants = new Set<string>();
  if (canon) variants.add(canon);
  if (raw) variants.add(raw);
  if (last10) {
    variants.add(last10);
    variants.add(`91${last10}`);
  }
  const filters: Array<{ phone: string } | { phone: { endsWith: string } }> = [];
  for (const p of variants) {
    if (p) filters.push({ phone: p });
  }
  if (last10) filters.push({ phone: { endsWith: last10 } });
  return filters;
}

export function buildIndiaUserLookupOr(input: string) {
  const phoneFilters = buildIndiaPhoneOrFilter(input);
  const emails = new Set<string>();
  const wa = waPlaceholderEmail(input);
  emails.add(wa);
  const waLast10 = indiaPhoneLast10(input);
  if (waLast10) emails.add(`wa_${waLast10}@apnatutorhub.com`);
  const userPh = userPhonePlaceholderEmail(input);
  if (userPh) emails.add(userPh);
  return [
    ...phoneFilters,
    ...Array.from(emails).map((email) => ({ email })),
  ];
}

type UserWithProfiles = User & {
  tutorProfile?: { id: string } | null;
  parentProfile?: { id: string } | null;
};

/**
 * One WhatsApp number → one user row when possible (oldest account, prefer tutor with profile).
 */
export async function findPrimaryUserForWhatsApp(
  prisma: PrismaClient,
  input: string,
  opts?: { includeProfiles?: boolean }
): Promise<UserWithProfiles | null> {
  const include = opts?.includeProfiles
    ? { tutorProfile: { select: { id: true } }, parentProfile: { select: { id: true } } }
    : undefined;

  const users = await prisma.user.findMany({
    where: { OR: buildIndiaUserLookupOr(input) as never },
    include,
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) return null;
  if (users.length === 1) return users[0] as UserWithProfiles;

  const withTutor = users.filter((u) => (u as UserWithProfiles).tutorProfile);
  const pick = (withTutor.length > 0 ? withTutor : users)[0];
  console.warn(
    `[india-phone] ${users.length} users share phone ${input.slice(-4)}… — using ${pick.id} (${pick.email})`
  );
  return pick as UserWithProfiles;
}

export async function ensureCanonicalPhoneOnUser(
  prisma: PrismaClient,
  userId: string,
  input: string
): Promise<void> {
  const canon = canonicalIndiaPhone(input);
  if (!canon) return;
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ phone: null }, { phone: { not: canon } }] },
    data: { phone: canon },
  });
}
