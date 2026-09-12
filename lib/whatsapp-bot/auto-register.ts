/**
 * lib/whatsapp-bot/auto-register.ts
 * Creates User + TutorProfile (for tutors) or User + ParentProfile + Lead (for parents)
 * from the data collected during the chatbot conversation.
 */

import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import {
  TUTOR_CLASS_MAP,
  TEACHING_MODE_MAP,
  CLASS_MAP,
  BUDGET_MAP,
} from "./messages";

// ── Types ────────────────────────────────────────────────────────────────────

export type TutorBotData = {
  name: string;
  city: string;
  area: string;
  subjects: string[];        // ["Mathematics", "Physics"]
  classKeys: string[];       // ["1","2","3"] — keys into TUTOR_CLASS_MAP
  modeKey: string;           // "1" | "2" | "3"
  timing: string;
  experience: number;
};

export type ParentBotData = {
  studentName: string;
  classKey: string;          // "1"–"6" — key into CLASS_MAP
  subjects: string[];
  city: string;
  area: string;
  timing: string;
  modeKey: string;           // "1" | "2" | "3"
  budgetKey: string;         // "1"–"4" — key into BUDGET_MAP
  parentName: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function modeToTeachingMode(key: string): "ONLINE" | "OFFLINE" | "EITHER" {
  if (key === "1") return "OFFLINE";
  if (key === "2") return "ONLINE";
  return "EITHER";
}

function modeToLeadMode(key: string): "ONLINE" | "OFFLINE" | "EITHER" {
  if (key === "1") return "OFFLINE";
  if (key === "2") return "ONLINE";
  return "EITHER";
}

function phoneToEmail(phone: string): string {
  return `wa_${phone}@apnatutorhub.com`;
}

/** Generate a magic login link using NextAuth email sign-in (passwordless). */
async function generateMagicLink(email: string): Promise<string> {
  const base = process.env.NEXTAUTH_URL ?? "https://apnatutorhub.com";
  // Store a verification token valid for 24 h
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });
  return `${base}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(email)}`;
}

// ── Tutor Registration ────────────────────────────────────────────────────────

export type TutorRegistrationResult =
  | { ok: true; magicLink: string; tutorProfileId: string }
  | { ok: false; error: string };

export async function registerTutorFromWhatsapp(
  phone: string,
  data: TutorBotData
): Promise<TutorRegistrationResult> {
  const normalizedPhone = normalizeIndiaWhatsApp(phone) ?? phone;
  const email = phoneToEmail(normalizedPhone);

  // Resolve class levels
  const classLevels = data.classKeys.includes("6")
    ? Object.values(TUTOR_CLASS_MAP).slice(0, 5) // All 5
    : data.classKeys.map((k) => TUTOR_CLASS_MAP[k] ?? k);

  const teachingMode = modeToTeachingMode(data.modeKey);

  try {
    // Upsert User (WhatsApp users don't have a real email, we use a synthetic one)
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name: data.name,
        email,
        phone: normalizedPhone,
        role: "TUTOR",
        isActive: true,
      },
      update: {
        name: data.name,
        phone: normalizedPhone,
        role: "TUTOR",
      },
    });

    // Create TutorProfile if not already present
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
    let profileId: string;

    if (existing) {
      profileId = existing.id;
      await prisma.tutorProfile.update({
        where: { id: existing.id },
        data: {
          city: data.city,
          address: data.area,
          subjects: data.subjects,
          classLevels,
          teachingMode,
          experience: data.experience,
        },
      });
    } else {
      const profile = await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          city: data.city,
          address: data.area,
          subjects: data.subjects,
          classLevels,
          teachingMode,
          experience: data.experience,
          onboardingStep: 3, // Mark partial onboarding so the website can continue
        },
      });
      profileId = profile.id;

      // Create wallet for the new tutor
      await prisma.wallet.upsert({
        where: { tutorProfileId: profileId },
        create: { tutorProfileId: profileId, balance: 0 },
        update: {},
      });
    }

    const magicLink = await generateMagicLink(email);

    return { ok: true, magicLink, tutorProfileId: profileId };
  } catch (err) {
    console.error("[auto-register] tutor registration failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}

// ── Parent Registration ───────────────────────────────────────────────────────

export type ParentRegistrationResult =
  | { ok: true; inquiryNumber: number; leadId: string }
  | { ok: false; error: string };

export async function registerParentFromWhatsapp(
  phone: string,
  data: ParentBotData
): Promise<ParentRegistrationResult> {
  const normalizedPhone = normalizeIndiaWhatsApp(phone) ?? phone;
  const email = phoneToEmail(normalizedPhone);
  const budget = BUDGET_MAP[data.budgetKey] ?? BUDGET_MAP["1"];
  const classLevel = CLASS_MAP[data.classKey] ?? data.classKey;
  const mode = modeToLeadMode(data.modeKey);

  // Generate inquiry number
  const inquiryNumber = Math.floor(100000 + Math.random() * 900000);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name: data.parentName,
        email,
        phone: normalizedPhone,
        role: "PARENT",
        isActive: true,
      },
      update: {
        name: data.parentName,
        phone: normalizedPhone,
      },
    });

    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, city: data.city },
      update: { city: data.city },
    });

    // Create student profile
    const student = await prisma.studentProfile.create({
      data: {
        parentProfileId: parentProfile.id,
        name: data.studentName,
        classLevel,
        subjects: data.subjects,
      },
    });

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        inquiryNumber,
        parentProfileId: parentProfile.id,
        studentProfileId: student.id,
        subjects: data.subjects,
        classLevel,
        mode,
        city: data.city,
        area: data.area,
        timingPreference: data.timing,
        budgetMin: budget.min,
        budgetMax: budget.max,
        status: "ACTIVE",
        coinCost: 10,
        maxTutors: 5,
        radiusKm: 15,
      },
    });

    return { ok: true, inquiryNumber, leadId: lead.id };
  } catch (err) {
    console.error("[auto-register] parent registration failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}
