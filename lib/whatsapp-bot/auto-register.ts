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
  email?: string;
  phone?: string;
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

export function expandTutorSubjectsAndClasses(input: {
  rawSubjects?: string[];
  rawClassLevels?: string[];
  rawClassLevel?: string;
  rawClassKeys?: string[];
}): { subjects: string[]; classLevels: string[] } {
  // 1. Expand Class Levels
  const classInput: string[] = [
    ...(input.rawClassLevels || []),
    ...(input.rawClassLevel ? [input.rawClassLevel] : []),
  ];

  if (input.rawClassKeys && input.rawClassKeys.length > 0) {
    if (input.rawClassKeys.includes("6")) {
      classInput.push(...Object.values(TUTOR_CLASS_MAP).slice(0, 5));
    } else {
      classInput.push(...input.rawClassKeys.map((k) => TUTOR_CLASS_MAP[k] ?? k));
    }
  }

  const classSet = new Set<string>();
  const grades = new Set<number>();

  if (classInput.length === 0 || classInput.some((c) => /all|general|any/i.test(c))) {
    // Default to Class 1 to 10
    for (let i = 1; i <= 10; i++) {
      classSet.add(`Class ${i}`);
      grades.add(i);
    }
    classSet.add("Class 1-5");
    classSet.add("Class 6-8");
    classSet.add("Class 9-10");
  } else {
    for (const c of classInput) {
      classSet.add(c);
      // Check for ranges e.g. "Class 1 to 8", "1-8", "6 to 8", "9-10", "1 to 10"
      const rangeMatch = c.match(/(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (start <= end && start >= 1 && end <= 12) {
          for (let i = start; i <= end; i++) {
            classSet.add(`Class ${i}`);
            grades.add(i);
          }
        }
      } else {
        const singleMatch = c.match(/\b(\d{1,2})\b/);
        if (singleMatch) {
          const g = parseInt(singleMatch[1], 10);
          if (g >= 1 && g <= 12) {
            classSet.add(`Class ${g}`);
            grades.add(g);
            // If primary or middle school tutor specifies e.g. "Class 8" or "upto Class 8", also expand preceding grades
            if (/upto|till|below|to/i.test(c)) {
              for (let i = 1; i <= g; i++) {
                classSet.add(`Class ${i}`);
                grades.add(i);
              }
            }
          }
        }
      }
    }

    // Add standard bucket tags based on covered grades
    if ([...grades].some((g) => g <= 5)) classSet.add("Class 1-5");
    if ([...grades].some((g) => g >= 6 && g <= 8)) classSet.add("Class 6-8");
    if ([...grades].some((g) => g >= 9 && g <= 10)) classSet.add("Class 9-10");
    if ([...grades].some((g) => g >= 11 && g <= 12)) classSet.add("Class 11-12");
  }

  // 2. Expand Subjects
  const subjectSet = new Set<string>();
  const rawSubs = input.rawSubjects || [];

  const isAllSubjects =
    rawSubs.length === 0 ||
    rawSubs.some((s) => /all\s*subject|all|combo|any|every|general/i.test(s));

  if (isAllSubjects) {
    // Add all core subjects
    CORE_SUBJECTS.forEach((s) => subjectSet.add(s));
    subjectSet.add("All Subjects");
    subjectSet.add("Science & Maths");

    // Add taxonomy combo subjects for every grade the tutor teaches
    grades.forEach((g) => {
      if (COMBO_SUBJECTS_BY_GRADE[g]) {
        subjectSet.add(COMBO_SUBJECTS_BY_GRADE[g]);
      }
    });

    if ([...grades].some((g) => g <= 5)) {
      subjectSet.add("All Subjects for Preparatory");
      subjectSet.add("All Subjects For KG (Kindergarten)");
    }
  } else {
    for (const s of rawSubs) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      subjectSet.add(trimmed);

      const lower = trimmed.toLowerCase();
      if (lower.includes("math")) subjectSet.add("Mathematics");
      if (lower.includes("sci") && !lower.includes("social")) {
        subjectSet.add("Science");
        if (grades.has(11) || grades.has(12)) {
          subjectSet.add("Physics");
          subjectSet.add("Chemistry");
        }
      }
      if (lower.includes("physic")) subjectSet.add("Physics");
      if (lower.includes("chem")) subjectSet.add("Chemistry");
      if (lower.includes("bio")) subjectSet.add("Biology");
      if (lower.includes("eng")) subjectSet.add("English");
      if (lower.includes("hindi")) subjectSet.add("Hindi");
      if (lower.includes("social") || lower.includes("sst")) subjectSet.add("Social Studies");
      if (lower.includes("evs")) subjectSet.add("EVS");
      if (lower.includes("commerce") || lower.includes("account")) {
        subjectSet.add("Accountancy");
        subjectSet.add("Business Studies");
        subjectSet.add("Economics");
      }
      if (lower.includes("computer") || lower.includes("coding")) {
        subjectSet.add("Computer Science");
      }
    }
  }

  return {
    subjects: Array.from(subjectSet),
    classLevels: Array.from(classSet),
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
  const rawTargetPhone = (data.phone || phone).replace(/\D/g, "");
  const normalizedPhone = normalizeIndiaWhatsApp(data.phone || phone) ?? rawTargetPhone;
  const email = data.email && data.email.includes("@") ? data.email.trim().toLowerCase() : phoneToEmail(normalizedPhone);

  // Fully expand subjects and class levels so matching algorithms and notifications match all relevant leads
  const expanded = expandTutorSubjectsAndClasses({
    rawSubjects: data.subjects,
    rawClassLevels: data.classLevels,
    rawClassLevel: data.classLevel,
    rawClassKeys: data.classKeys,
  });

  const classLevels = expanded.classLevels;
  const subjects = expanded.subjects;
  const teachingMode = data.modeKey ? modeToTeachingMode(data.modeKey) : "EITHER";
  const city = data.city || "Delhi";
  const area = data.area || "Delhi NCR";

  try {
    // Check if user already exists by phone OR email to prevent unique constraint errors
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
          ...(rawTargetPhone ? [{ phone: rawTargetPhone }] : []),
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name || user.name,
          role: user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "TUTOR",
          ...(!user.phone && normalizedPhone ? { phone: normalizedPhone } : {}),
          ...((!user.email || user.email.startsWith("wa_")) && email && !email.startsWith("wa_") ? { email } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: data.name || "Tutor",
          email,
          phone: normalizedPhone,
          role: "TUTOR",
          isActive: true,
        },
      });
    }

    // Create TutorProfile if not already present
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
    let profileId: string;

    if (existing) {
      profileId = existing.id;
      await prisma.tutorProfile.update({
        where: { id: existing.id },
        data: {
          city,
          address: area,
          subjects,
          classLevels,
          teachingMode,
          experience: data.experience || existing.experience || 2,
        },
      });
    } else {
      const profile = await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          city,
          address: area,
          subjects,
          classLevels,
          teachingMode,
          experience: data.experience || 2,
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
  const normalizedPhone = normalizeIndiaWhatsApp(data.phone || phone) ?? rawTargetPhone;
  const email = data.email && data.email.includes("@") ? data.email.trim().toLowerCase() : phoneToEmail(normalizedPhone);
  const budget = (data.budgetKey && BUDGET_MAP[data.budgetKey]) ? BUDGET_MAP[data.budgetKey] : { min: 4000, max: 8000 };
  const classLevel = data.classLevel || (data.classKey && CLASS_MAP[data.classKey]) || "Class 10";
  const mode = data.modeKey ? modeToLeadMode(data.modeKey) : "OFFLINE";
  const subjects = data.subjects && data.subjects.length > 0 ? data.subjects : ["All Subjects"];
  const city = data.city || "Delhi";
  const area = data.area || "Delhi NCR";
  const parentName = data.parentName || data.name || "Parent";
  const studentName = data.studentName || parentName;

  // Generate inquiry number
  const inquiryNumber = Math.floor(100000 + Math.random() * 900000);

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
          ...(rawTargetPhone ? [{ phone: rawTargetPhone }] : []),
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: parentName || user.name,
          ...(!user.phone && normalizedPhone ? { phone: normalizedPhone } : {}),
          ...((!user.email || user.email.startsWith("wa_")) && email && !email.startsWith("wa_") ? { email } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: parentName,
          email,
          phone: normalizedPhone,
          role: "PARENT",
          isActive: true,
        },
      });
    }

    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, city },
      update: { city },
    });

    // Create student profile
    const student = await prisma.studentProfile.create({
      data: {
        parentProfileId: parentProfile.id,
        name: studentName,
        classLevel,
        subjects,
      },
    });

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        inquiryNumber,
        parentProfileId: parentProfile.id,
        studentProfileId: student.id,
        subjects,
        classLevel,
        mode,
        city,
        area,
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
