/**
 * lib/whatsapp-bot/auto-register.ts
 * Creates User + TutorProfile (for tutors) or User + ParentProfile + Lead (for parents)
 * from the data collected during the chatbot conversation.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import {
  TUTOR_CLASS_MAP,
  TEACHING_MODE_MAP,
  CLASS_MAP,
  BUDGET_MAP,
} from "./messages";
import { validateAndCleanLocality, validateAndAlignSubjects } from "./subject-rules";
import { dispatchLeadMatching } from "@/lib/matching-dispatcher";

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

      // Check for ranges e.g. "Class 1 to 8", "1-8", "6 to 8", "9-10", "11th and 12th", "11 & 12"
      const rangeMatches = c.matchAll(
        /(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–|—|and|&)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi
      );
      let matchedRange = false;
      for (const match of rangeMatches) {
        matchedRange = true;
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (start >= 1 && end <= 12) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            classSet.add(`Class ${i}`);
            grades.add(i);
          }
        }
      }

      // Check for Roman ranges e.g. "XI - XII", "VI to VIII"
      const romanRangeMatches = c.matchAll(
        /(?:class\s*)?([ivx]+)\s*(?:to|-|–|—|and|&)\s*(?:class\s*)?([ivx]+)/gi
      );
      for (const match of romanRangeMatches) {
        const start = REVERSE_ROMAN[match[1].toLowerCase()];
        const end = REVERSE_ROMAN[match[2].toLowerCase()];
        if (start && end && start >= 1 && end <= 12) {
          matchedRange = true;
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            classSet.add(`Class ${i}`);
            grades.add(i);
          }
        }
      }

      // Extract all individual numbers
      const allNumbers = [...c.matchAll(/\b(\d{1,2})\b/g)];
      for (const m of allNumbers) {
        const g = parseInt(m[1], 10);
        if (g >= 1 && g <= 12) {
          classSet.add(`Class ${g}`);
          grades.add(g);
          if (/upto|till|below/i.test(c)) {
            for (let i = 1; i <= g; i++) {
              classSet.add(`Class ${i}`);
              grades.add(i);
            }
          }
        }
      }

      // Extract individual Roman numerals e.g. "XI", "XII", "X", "IX", "VIII"
      const romanMatches = [...c.matchAll(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/gi)];
      for (const rm of romanMatches) {
        const g = REVERSE_ROMAN[rm[1].toLowerCase()];
        if (g && g >= 1 && g <= 12) {
          classSet.add(`Class ${g}`);
          grades.add(g);
        }
      }
    }

    // Add standard bucket tags based on covered grades
    if ([...grades].some((g) => g <= 5)) classSet.add("Class 1-5");
    if ([...grades].some((g) => g >= 6 && g <= 8)) classSet.add("Class 6-8");
    if ([...grades].some((g) => g <= 8)) classSet.add("Class 1-8");
    if ([...grades].some((g) => g >= 9 && g <= 10)) classSet.add("Class 9-10");
    if ([...grades].some((g) => g >= 11 && g <= 12)) classSet.add("Class 11-12");
  }

  // 2. Expand Subjects strictly based on what tutor teaches across their grades
  const subjectSet = new Set<string>();
  const rawSubs = input.rawSubjects || [];

  const isAllSubjects =
    rawSubs.length === 0 ||
    rawSubs.some((s) => /all\s*subject|all|combo|any|every|general/i.test(s));

  // Tutors teaching till 8th class must always have "All Subjects" and "All Subjects (Class 1-8)" in taxonomy
  const coversTill8th =
    [...grades].some((g) => g <= 8) ||
    classInput.some((c) => /1\s*[-–to]\s*8|class\s*1-8|primary|middle|till\s*8/i.test(c));

  if (coversTill8th) {
    subjectSet.add("All Subjects");
    subjectSet.add("All Subjects (Class 1-8)");
    if ([...grades].some((g) => g <= 5)) subjectSet.add("All Subjects (Class 1-5)");
    if ([...grades].some((g) => g >= 6 && g <= 8)) subjectSet.add("All Subjects (Class 6-8)");
  }

  if (isAllSubjects) {
    // Add combo subjects for each covered grade
    grades.forEach((g) => {
      if (COMBO_SUBJECTS_BY_GRADE[g]) {
        subjectSet.add(COMBO_SUBJECTS_BY_GRADE[g]);
      }
      const rom = ROMAN_MAP[g];
      if (rom) {
        // Grade-appropriate core subjects
        if (g >= 3 && g <= 12) subjectSet.add(`Maths for Class ${rom}`);
        if (g <= 5) subjectSet.add("Science upto Class V");
        else if (g <= 10) subjectSet.add(`Science for Class ${rom}`);
        if (g >= 6 && g <= 10) subjectSet.add(`Social Studies for Class ${rom}`);
        if (g <= 5) {
          subjectSet.add("English upto V");
          subjectSet.add("Hindi for Class upto V");
        } else if (g <= 8) {
          subjectSet.add("English for VI to VIII");
          subjectSet.add("Hindi for Class VI to VIII");
        } else if (g <= 10) {
          subjectSet.add("English for IX - X");
          subjectSet.add("Hindi for Class IX or X");
        }
      }
    });

    subjectSet.add("All Subjects");
    subjectSet.add("All Subjects (Class 1-8)");
    if ([...grades].some((g) => g >= 6 && g <= 8)) subjectSet.add("Science & Maths");
    if ([...grades].some((g) => g <= 5)) {
      subjectSet.add("All Subjects for Preparatory");
      subjectSet.add("All Subjects For KG (Kindergarten)");
      subjectSet.add("EVS");
    }
  } else {
    // Detect specific teaching domains from raw subjects
    const teachesMath = rawSubs.some((s) => /math|algebra|calculus|geometry/i.test(s));
    const teachesScience = rawSubs.some((s) => /(?<!computer\s)(?<!comp\s)\bscience\b|general\s*science/i.test(s) && !/social/i.test(s));
    const teachesPhysics = rawSubs.some((s) => /physic/i.test(s));
    const teachesChemistry = rawSubs.some((s) => /chem/i.test(s));
    const teachesBiology = rawSubs.some((s) => /bio/i.test(s));
    const teachesEnglish = rawSubs.some((s) => /english/i.test(s));
    const teachesHindi = rawSubs.some((s) => /hindi/i.test(s));
    const teachesSST = rawSubs.some((s) => /social|sst|history|geography|civics/i.test(s));
    const teachesEVS = rawSubs.some((s) => /evs|environmental/i.test(s));
    const teachesCommerce = rawSubs.some((s) => /commerce|account|business|economic/i.test(s));
    const teachesCS = rawSubs.some((s) => /computer|coding|python|java|information\s*tech|\bIT\b/i.test(s));

    // For every grade the tutor teaches, add the exact canonical class-specific subjects
    const targetGrades = grades.size > 0 ? Array.from(grades) : [6, 7, 8, 9, 10];

    for (const g of targetGrades) {
      const rom = ROMAN_MAP[g];
      if (!rom) continue;

      if (teachesMath) {
        if (g >= 3 && g <= 12) subjectSet.add(`Maths for Class ${rom}`);
        if (g >= 11) subjectSet.add("Maths for IITJEE");
      }

      if (teachesScience) {
        if (g <= 5) subjectSet.add("Science upto Class V");
        else if (g <= 10) subjectSet.add(`Science for Class ${rom}`);
        // CRITICAL: CBSE / ICSE do not have standalone Physics/Chem/Bio for Class 8 or below.
        if (g >= 9 && g <= 10) {
          subjectSet.add(`Physics For Class ${rom}`);
          subjectSet.add(`Chemistry For Class ${rom}`);
          subjectSet.add(`Biology for Class ${rom}`);
        } else if (g >= 11) {
          subjectSet.add(`Physics For Class ${rom}`);
          subjectSet.add(`Chemistry For Class ${rom}`);
        }
      }

      if (teachesPhysics) {
        // Senior science only for Class 9 and above
        if (g >= 9 && g <= 12) subjectSet.add(`Physics For Class ${rom}`);
        if (g >= 11) {
          subjectSet.add("Physics for IITJEE");
          subjectSet.add("Physics for NEET");
        }
      }

      if (teachesChemistry) {
        if (g >= 9 && g <= 12) subjectSet.add(`Chemistry For Class ${rom}`);
        if (g >= 11) {
          subjectSet.add("Chemistry for IITJEE");
          subjectSet.add("Chemistry for NEET");
        }
      }

      if (teachesBiology) {
        if (g >= 9 && g <= 12) subjectSet.add(`Biology for Class ${rom}`);
        if (g >= 11) {
          subjectSet.add("Biology for NEET");
          subjectSet.add("Biology for Medical Entrance");
        }
      }

      if (teachesEnglish) {
        if (g <= 5) subjectSet.add("English upto V");
        else if (g <= 8) subjectSet.add("English for VI to VIII");
        else if (g <= 10) subjectSet.add("English for IX - X");
        else if (g <= 12) subjectSet.add("English for XI - XII");
      }

      if (teachesHindi) {
        if (g <= 5) subjectSet.add("Hindi for Class upto V");
        else if (g <= 8) subjectSet.add("Hindi for Class VI to VIII");
        else if (g <= 10) subjectSet.add("Hindi for Class IX or X");
        else if (g <= 12) subjectSet.add("Hindi for Class XI or XII");
      }

      if (teachesSST) {
        if (g >= 6 && g <= 10) subjectSet.add(`Social Studies for Class ${rom}`);
        else if (g >= 11) {
          subjectSet.add("History for Class XI - XII");
          subjectSet.add("Geography for Class XI - XII");
        }
      }

      if (teachesEVS && g <= 5) {
        subjectSet.add("Environmental Studies(EVS)");
        subjectSet.add("EVS");
      }

      if (teachesCommerce && g >= 11) {
        subjectSet.add("Accountancy");
        subjectSet.add("Business Studies");
        subjectSet.add("Economics");
      }

      if (teachesCS) {
        // Class-specific Computer Science / IT subjects
        if (g <= 5) {
          subjectSet.add("Computer Science");
        } else if (g <= 8) {
          subjectSet.add(`Computer Science for Class ${rom}`);
          subjectSet.add("Information Technology");
        } else if (g <= 10) {
          subjectSet.add(`Computer Science for Class ${rom}`);
          subjectSet.add(`Information Technology for Class ${rom}`);
        } else if (g >= 11) {
          subjectSet.add(`Computer Science for Class ${rom}`);
          subjectSet.add("Computer Science for Class XI - XII");
          subjectSet.add("Information Technology");
        }
      }
    }

    // Add standard platform category search roots for filters
    const hasSeniorClasses = targetGrades.some((g) => g >= 9);
    if (teachesMath) subjectSet.add("Mathematics");
    if (teachesScience) subjectSet.add("Science");
    if (teachesEnglish) subjectSet.add("English");
    if (teachesHindi) subjectSet.add("Hindi");
    if (teachesSST) subjectSet.add("Social Studies");
    if (teachesMath && teachesScience) subjectSet.add("Science & Maths");
    if (teachesCS) subjectSet.add("Computer Science");

    // Only add senior science root filters if tutor actually teaches Class 9 or above!
    if (hasSeniorClasses) {
      if (teachesPhysics) subjectSet.add("Physics");
      if (teachesChemistry) subjectSet.add("Chemistry");
      if (teachesBiology) subjectSet.add("Biology");
    } else {
      // For Class 1 to 8 tutors, ensure foundational Science & All Subjects are present
      subjectSet.add("Science");
      subjectSet.add("All Subjects");
      subjectSet.add("All Subjects (Class 1-8)");
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

  // Universally clean and validate area & city
  const locRes = validateAndCleanLocality(data.area, data.city);
  const city = locRes.isValid ? locRes.city : (data.city || "Delhi");
  const area = locRes.isValid ? locRes.area : (data.area || "Delhi NCR");

  // Validate and align subjects to canonical taxonomy (enforces Class 1-8 rules)
  const subRes = validateAndAlignSubjects(data.subjects, data.classLevel || (data.classLevels ? data.classLevels[0] : undefined));
  const rawSubjects = subRes.isValid ? subRes.subjects : data.subjects;

  // Fully expand subjects and class levels so matching algorithms and notifications match all relevant leads
  const expanded = expandTutorSubjectsAndClasses({
    rawSubjects,
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

    // First find user by phone (primary identity on WhatsApp)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
          ...(rawTargetPhone ? [{ phone: rawTargetPhone }] : []),
        ],
      },
    });

    // If not found by phone, check if a user exists with this email
    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (user) {
      let emailToUpdate: string | undefined = undefined;
      if (email && !email.startsWith("wa_") && email !== user.email) {
        const existingEmailUser = await prisma.user.findUnique({ where: { email } });
        if (!existingEmailUser || existingEmailUser.id === user.id) {
          emailToUpdate = email;
        } else {
          console.warn(`[auto-register] Cannot update email to ${email} for user ${user.id} — email owned by ${existingEmailUser.id}`);
        }
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name || user.name,
          role: user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "TUTOR",
          ...(!user.phone && normalizedPhone ? { phone: normalizedPhone } : {}),
          ...(emailToUpdate ? { email: emailToUpdate } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          // Mark as WHATSAPP
          signupSource: "WHATSAPP",
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: data.name || "Tutor",
          email,
          phone: normalizedPhone,
          passwordHash: passwordHash || null,
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
  const normalizedPhone = normalizeIndiaWhatsApp(data.phone || phone) ?? rawTargetPhone;
  const email = data.email && data.email.includes("@") ? data.email.trim().toLowerCase() : phoneToEmail(normalizedPhone);
  const budget = (data.budgetKey && BUDGET_MAP[data.budgetKey]) ? BUDGET_MAP[data.budgetKey] : { min: 4000, max: 8000 };
  const classLevel = data.classLevel || (data.classKey && CLASS_MAP[data.classKey]) || "Class 10";
  const mode = data.modeKey ? modeToLeadMode(data.modeKey) : "OFFLINE";

  // Validate and align subjects to platform taxonomy (strictly enforcing Class 1-8 rules)
  const subRes = validateAndAlignSubjects(data.subjects, classLevel);
  const subjects = subRes.isValid && subRes.subjects.length > 0
    ? subRes.subjects
    : (data.subjects && data.subjects.length > 0 ? data.subjects : ["All Subjects"]);

  // Universally validate and clean area & city
  const locRes = validateAndCleanLocality(data.area, data.city);
  const city = locRes.isValid ? locRes.city : (data.city || "Delhi");
  const area = locRes.isValid ? locRes.area : (data.area || "Delhi NCR");

  const parentName = data.parentName || data.name || "Parent";
  const studentName = data.studentName || parentName;

  // Resolve coordinates for accurate geographical matching and radius calculations
  const coords = resolveLocationCoordinates(`${area || ""} ${city || ""}`);

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
          ...(!(user as any).signupSource || (user as any).signupSource === "WEBSITE" ? { signupSource: "WHATSAPP" } : {}),
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
        classLevel,
        subjects,
      },
    });

    // Create lead with coordinates and canonical taxonomy
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
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        timingPreference: data.timing,
        budgetMin: budget.min,
        budgetMax: budget.max,
        status: "ACTIVE",
        coinCost: 10,
        maxTutors: 5,
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
