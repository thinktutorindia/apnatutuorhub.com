/**
 * lib/whatsapp-bot/auto-register.ts
 * Creates User + TutorProfile (for tutors) or User + ParentProfile + Lead (for parents)
 * from the data collected during the chatbot conversation.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  canonicalIndiaPhone,
  ensureCanonicalPhoneOnUser,
  findPrimaryUserForWhatsApp,
  waPlaceholderEmail,
} from "@/lib/india-phone";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import {
  TUTOR_CLASS_MAP,
  TEACHING_MODE_MAP,
  CLASS_MAP,
  BUDGET_MAP,
} from "./messages";
import { validateAndCleanLocality, PLACE_INDICATORS } from "./subject-rules";
import { enforceStrictEducation, isPlaceholderEmail, validateStrictEmail } from "./strict-rules";
import { dispatchLeadMatching } from "@/lib/matching-dispatcher";
import { extractPublicLocality, isTill8thClass, leadSubjectsForClass, normalizeCanonicalClassLevel, realisticTightBudget } from "@/lib/lead-utils";
import { sealLeadEntry } from "@/lib/whatsapp-bot/intake";
import { getLeadPointCost } from "@/lib/subscription-plans";

// ── Types ────────────────────────────────────────────────────────────────────

export type TutorBotData = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  city?: string;
  area?: string;
  subjects?: string[];        // ["Mathematics", "Physics"]
  classKeys?: string[];      // ["1","2","3"] — keys into TUTOR_CLASS_MAP
  classLevels?: string[];
  classLevel?: string;
  modeKey?: string;          // "1" | "2" | "3"
  timing?: string;
  experience?: number;
};

export type ParentBotData = {
  studentName?: string;
  parentName?: string;
  name?: string;
  email?: string;
  phone?: string;
  classKey?: string;         // "1"–"6" — key into CLASS_MAP
  classLevel?: string;
  subjects?: string[];
  city?: string;
  area?: string;
  timing?: string;
  modeKey?: string;          // "1" | "2" | "3"
  budgetKey?: string;        // "1"–"4" — key into BUDGET_MAP
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
  return waPlaceholderEmail(phone);
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

// ── Canonical Taxonomy Expansion Helpers ─────────────────────────────────────

const CORE_SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Hindi",
  "Social Studies",
  "EVS",
  "Physics",
  "Chemistry",
  "Biology",
  "Sanskrit",
  "Computer Science",
];

const COMBO_SUBJECTS_BY_GRADE: Record<number, string> = {
  1: "All Subjects For Class I",
  2: "All Subjects For Class II",
  3: "All Subjects For Class III",
  4: "All Subjects For Class IV",
  5: "All Subjects For Class V",
  6: "All Subjects For Class VI",
  7: "All Subjects For Class VII",
  8: "All Subjects For Class VIII",
  9: "All Subjects For Class IX",
  10: "All Subjects For Class X",
};

const ROMAN_MAP: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

const REVERSE_ROMAN: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

export function expandTutorSubjectsAndClasses(input: {
  rawSubjects?: string[];
  rawClassLevels?: string[];
  rawClassLevel?: string;
  rawClassKeys?: string[];
}): { subjects: string[]; classLevels: string[] } {
  const classInputs: string[] = [
    ...(input.rawClassLevels || []),
    ...(input.rawClassLevel ? [input.rawClassLevel] : []),
  ];

  if (input.rawClassKeys && input.rawClassKeys.length > 0) {
    if (input.rawClassKeys.includes("6")) {
      classInputs.push("Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12");
    } else {
      classInputs.push(...input.rawClassKeys.map((k) => TUTOR_CLASS_MAP[k] ?? k));
    }
  }

  const enforced = enforceStrictEducation({
    subjectsInput: input.rawSubjects || [],
    classesInput: classInputs,
  });

  return {
    subjects: enforced.subjects,
    classLevels: enforced.classLevels,
  };
}

// ── Tutor Registration ────────────────────────────────────────────────────────

export type TutorRegistrationResult =
  | { ok: true; magicLink: string; tutorProfileId: string }
  | { ok: false; error: string };

export async function registerTutorFromWhatsapp(
  phone: string,
  data: TutorBotData
): Promise<TutorRegistrationResult> {
  const normalizedPhone = canonicalIndiaPhone(data.phone || phone);
  if (!normalizedPhone) {
    return { ok: false, error: "Valid WhatsApp mobile is required to register as a tutor." };
  }
  const emailCheck = data.email ? validateStrictEmail(data.email) : null;
  const email = emailCheck && emailCheck.ok && !isPlaceholderEmail(emailCheck.email)
    ? emailCheck.email
    : phoneToEmail(phone);

  // Locality only — never store a password, default, chat sentence, or door address as the teaching area.
  let safeAreaInput = data.area;
  if (
    typeof safeAreaInput === "string" &&
    (/^(default|skip|password|pwd|pass|reply\s*default|none|null|undefined)$/i.test(safeAreaInput.trim()) ||
      (data.password && safeAreaInput.trim().toLowerCase() === data.password.trim().toLowerCase()) ||
      (!PLACE_INDICATORS.test(safeAreaInput) && /\b[a-zA-Z]+[0-9]{2,}\b/i.test(safeAreaInput)))
  ) {
    safeAreaInput = undefined;
  }
  const locRes = validateAndCleanLocality(safeAreaInput || data.city, data.city, true);
  const city = locRes.isValid ? locRes.city : (locRes.city || data.city || "Delhi");
  const area = extractPublicLocality(locRes.isValid ? locRes.area : safeAreaInput, city) || (locRes.isValid ? locRes.area : city);

  // Strict single-source firewall on classes and subjects:
  // 1-8 = All Subjects ONLY, 9-10 = school subjects (no sub-branches), 11-12 = stream subjects only.
  const expanded = expandTutorSubjectsAndClasses({
    rawSubjects: data.subjects,
    rawClassLevels: data.classLevels,
    rawClassLevel: data.classLevel,
    rawClassKeys: data.classKeys,
  });

  const classLevels = expanded.classLevels;
  const subjects = expanded.subjects;
  const teachingMode = data.modeKey ? modeToTeachingMode(data.modeKey) : "EITHER";

  try {
    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password && data.password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    let user =
      (await findPrimaryUserForWhatsApp(prisma, data.phone || phone)) ??
      (email ? await prisma.user.findUnique({ where: { email } }) : null);

    if (user) {
      let emailToUpdate: string | undefined = undefined;
      if (email && !email.startsWith("wa_") && !email.startsWith("wa.") && email !== user.email) {
        const existingEmailUser = await prisma.user.findUnique({ where: { email } });
        if (!existingEmailUser || existingEmailUser.id === user.id) {
          emailToUpdate = email;
        } else {
          console.warn(`[auto-register] Cannot update email to ${email} for user ${user.id} — email owned by ${existingEmailUser.id}`);
        }
      }

      const updatePasswordHash =
        passwordHash ?? (!user.passwordHash ? await bcrypt.hash("12345678", 10) : undefined);

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role:
            user.email?.toLowerCase() === "coderrohit2927@gmail.com" || user.role === "SUPER_ADMIN"
              ? "SUPER_ADMIN"
              : user.role === "SUB_ADMIN"
                ? "SUB_ADMIN"
                : user.role || "TUTOR",
          phone: normalizedPhone,
          ...(emailToUpdate ? { email: emailToUpdate } : {}),
          ...(updatePasswordHash ? { passwordHash: updatePasswordHash } : {}),
          // Mark as WHATSAPP
          signupSource: "WHATSAPP",
        },
      });
      await ensureCanonicalPhoneOnUser(prisma, user.id, data.phone || phone);
    } else {
      const createPasswordHash = passwordHash ?? (await bcrypt.hash("12345678", 10));
      user = await prisma.user.create({
        data: {
          name: data.name || "Tutor",
          email,
          phone: normalizedPhone,
          passwordHash: createPasswordHash,
          role: "TUTOR",
          isActive: true,
          signupSource: "WHATSAPP",
        },
      });
    }

    // Create TutorProfile if not already present
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
    let profileId: string;

    const coords = resolveLocationCoordinates(`${area || ""} ${city || ""}`);

    if (existing) {
      profileId = existing.id;
      await prisma.tutorProfile.update({
        where: { id: existing.id },
        data: {
          city,
          address: area,
          ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
          subjects,
          classLevels,
          teachingMode,
          experience: data.experience || existing.experience || 2,
          onboardingStep: Math.max(existing.onboardingStep, 7),
        },
      });
    } else {
      const profile = await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          city,
          address: area,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          subjects,
          classLevels,
          teachingMode,
          experience: data.experience || 2,
          onboardingStep: 7, // WhatsApp-registered tutors have provided all essential info
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

    const magicLink = await generateMagicLink(user.email);
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
  const rawTargetPhone = (data.phone || phone).replace(/\D/g, "");
  const normalizedPhone = canonicalIndiaPhone(data.phone || phone) ?? rawTargetPhone;
  const emailCheck = data.email ? validateStrictEmail(data.email) : null;
  const email = emailCheck && emailCheck.ok && !isPlaceholderEmail(emailCheck.email)
    ? emailCheck.email
    : phoneToEmail(phone);
  const classLevel = normalizeCanonicalClassLevel(
    data.classLevel || (data.classKey && CLASS_MAP[data.classKey]) || ""
  );
  if (!classLevel) return { ok: false, error: "A real class is required" };
  const sealed = sealLeadEntry({
    classLevel,
    subjects: data.subjects,
    area: data.area,
    mode: data.modeKey === "2" ? "ONLINE" : "OFFLINE",
  });
  if (!sealed.ok) return { ok: false, error: sealed.reason };

  const rawBudget = (data.budgetKey && BUDGET_MAP[data.budgetKey]) ? BUDGET_MAP[data.budgetKey] : { min: 4500, max: 4650 };
  const budget = realisticTightBudget({
    id: `${normalizedPhone || "parent"}-${classLevel}`,
    classLevel,
    budgetMin: rawBudget.min,
    budgetMax: rawBudget.max,
  }) ?? { min: 4500, max: 4650 };
  const junior = isTill8thClass(classLevel);
  const mode = junior ? "OFFLINE" : (data.modeKey ? modeToLeadMode(data.modeKey) : "OFFLINE");

  const subjects = leadSubjectsForClass(classLevel, data.subjects || []);
  if (subjects.length === 0) return { ok: false, error: "Valid academic subjects are required" };

  const locRes = validateAndCleanLocality(data.area || data.city, data.city, true);
  const city = locRes.isValid ? locRes.city : (locRes.city || data.city || "Delhi");
  const area = extractPublicLocality(locRes.isValid ? locRes.area : data.area, city) || (locRes.isValid ? locRes.area : undefined);
  if (!area) return { ok: false, error: "A locality is required" };

  const parentName = data.parentName || data.name || "Parent";
  const studentName = data.studentName || parentName;

  // Resolve coordinates for accurate geographical matching and radius calculations
  const coords = resolveLocationCoordinates(`${area || ""} ${city || ""}`);

  // Generate inquiry number
  const inquiryNumber = Math.floor(100000 + Math.random() * 900000);

  try {
    let user =
      (await findPrimaryUserForWhatsApp(prisma, data.phone || phone)) ??
      (email ? await prisma.user.findUnique({ where: { email } }) : null);

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: parentName || user.name,
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          ...((!user.email || user.email.startsWith("wa_")) && email && !email.startsWith("wa_") ? { email } : {}),
          ...(!(user as any).signupSource || (user as any).signupSource === "WEBSITE" ? { signupSource: "WHATSAPP" } : {}),
        },
      });
      await ensureCanonicalPhoneOnUser(prisma, user.id, data.phone || phone);
    } else {
      user = await prisma.user.create({
        data: {
          name: parentName,
          email,
          phone: normalizedPhone || null,
          role: "PARENT",
          isActive: true,
          signupSource: "WHATSAPP",
        },
      });
    }

    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        city,
        address: area,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      },
      update: {
        city,
        address: area,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      },
    });

    // Create student profile
    const student = await prisma.studentProfile.create({
      data: {
        parentProfileId: parentProfile.id,
        name: studentName,
        classLevel: sealed.classLevel,
        subjects: sealed.subjects,
      },
    });

    // Create lead with coordinates and canonical taxonomy
    const lead = await prisma.lead.create({
      data: {
        inquiryNumber,
        parentProfileId: parentProfile.id,
        studentProfileId: student.id,
        subjects: sealed.subjects,
        classLevel: sealed.classLevel,
        mode: sealed.mode,
        city,
        area: sealed.area,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        timingPreference: data.timing,
        budgetMin: budget.min,
        budgetMax: budget.max,
        status: "ACTIVE",
        coinCost: getLeadPointCost(classLevel, budget.min, budget.max),
        maxTutors: 3,
        radiusKm: 15,
      },
    });

    // Dispatch lead matching so nearby matching tutors receive instant notifications
    try {
      await dispatchLeadMatching(lead.id);
    } catch (dispErr) {
      console.warn("[auto-register] dispatchLeadMatching notification warning:", dispErr);
    }

    return { ok: true, inquiryNumber, leadId: lead.id };
  } catch (err) {
    console.error("[auto-register] parent registration failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}
