import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { expandToIndividualClasses } from "@/lib/dummy-campaign-types";
import { isTill8thClass } from "@/lib/lead-utils";
import { geocodeAddressWithGemini } from "@/lib/gemini-geocoder";
import { parseGradeNumbers } from "@/lib/subject-taxonomy";
import type { TeachingMode, KycStatus } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal lead shape needed by the matching engine. */
export type MatchableLead = {
  id: string;
  subjects: string[];
  classLevel: string;
  mode: TeachingMode;
  budgetMin: number | null;
  budgetMax: number | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  city?: string | null;
  area?: string | null;
  genderPreference?: string | null;
  tutorGenderPref?: string | null;
  status: string;
  maxTutors: number;
  purchaseCount: number;
};

/** Tutor row shape returned from the DB query. */
type CandidateTutor = {
  id: string;
  userId: string;
  subjects: string[];
  classLevels: string[];
  teachingMode: TeachingMode;
  teachingRadius: number;
  feeMin: number | null;
  feeMax: number | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  gender?: string | null;
  kycStatus: KycStatus;
  isVerified: boolean;
  profileScore: number;
  averageRating: number;
  totalReviews: number;
  introVideoUrl: string | null;
  subscriptionPlan?: string | null;
  user: { name: string | null; email: string };
};

/** A tutor that passed all filters, with computed distance. */
export type MatchedTutor = CandidateTutor & {
  distanceKm: number | null; // null when mode is ONLINE or coords missing
};

// ── Clean & Normalize Helpers ────────────────────────────────────────────────

export function cleanSubjectName(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/\bmaths\b/i, "Mathematics");
  clean = clean.replace(
    /\s*(?:for|-|\(|\/|–|—|,)?\s*(?:class|grade|std|standard)\s*(?:[0-9]{1,2}|[ivx]+)(?:\s*(?:to|-|–|&|and)\s*(?:class|grade|std|standard)?\s*(?:[0-9]{1,2}|[ivx]+))?\s*(?:st|nd|rd|th)?\s*\)?/gi,
    ""
  );
  clean = clean.replace(/\s+(?:[0-9]{1,2}|[ivx]+)\s*(?:st|nd|rd|th)?\s*(?:grade|class|std)?$/i, "");
  clean = clean.replace(/\s*\([^)]*(?:class|grade|std|standard|[0-9]{1,2}|[ivx]+)[^)]*\)/gi, "");
  clean = clean.replace(/^[-–—:,/]+|[-–—:,/]+$/g, "").trim();
  return clean || raw.trim();
}

const ROMAN_NUMERALS: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};

export function extractGradeNumber(s: string): number | null {
  if (!s) return null;
  const trimmed = s.trim();

  // Check Roman numerals: "Class VI", "VI", "Class 6"
  const romanMatch = trimmed.match(/\b(XII|XI|VIII|VII|VI|IV|IX|III|II|X|V|I)\b/i);
  if (romanMatch) {
    const r = romanMatch[1].toUpperCase();
    if (ROMAN_NUMERALS[r]) return ROMAN_NUMERALS[r];
  }

  // Check digits: "6th", "Class 6", "6 Std", "Grade 6", "6th Std", "11th"
  const digitMatch = trimmed.match(/(\b1[0-2]|\b[1-9])(?:\s*(?:st|nd|rd|th))?(?!\d)/i);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return null;
}

/** Normalizes class level representations into standard comparable buckets */
export function normalizeClassLevel(raw: string): string {
  const s = raw.trim();
  if (/jee|iit/i.test(s)) return "JEE";
  if (/neet|medical/i.test(s)) return "NEET";
  if (/coding|computer|python|programming/i.test(s)) return "Coding";
  if (/ca|commerce/i.test(s)) return "CA";
  if (/art|music|dance|drawing/i.test(s)) return "Arts";
  if (/language|french|german|spoken|sanskrit/i.test(s)) return "Languages";

  const grade = extractGradeNumber(s);
  if (grade !== null) {
    if (grade <= 5) return "Class 1-5";
    if (grade <= 8) return "Class 6-8";
    if (grade <= 10) return "Class 9-10";
    if (grade <= 12) return "Class 11-12";
  }

  if (/class\s*1\s*-\s*5|1\s*to\s*5/i.test(s)) return "Class 1-5";
  if (/class\s*6\s*-\s*8|6\s*to\s*8/i.test(s)) return "Class 6-8";
  if (/class\s*9\s*-\s*10|9\s*to\s*10/i.test(s)) return "Class 9-10";
  if (/class\s*11\s*-\s*12|11\s*to\s*12/i.test(s)) return "Class 11-12";

  return s;
}

// ── Filter 1: Subject Match ──────────────────────────────────────────────────

export function hasSubjectOverlap(tutorSubjects: string[], leadSubjects: string[]): boolean {
  if (!tutorSubjects.length || !leadSubjects.length) return false;

  const cleanedLeadSubjects = leadSubjects.map(cleanSubjectName);
  const leadSet = new Set(cleanedLeadSubjects.map((s) => s.toLowerCase()));

  for (const rawTs of tutorSubjects) {
    const ts = cleanSubjectName(rawTs).toLowerCase();
    if (!ts) continue;

    if (leadSet.has(ts)) return true;

    // "All Subjects" tutor matches any core school subjects
    if (ts.includes("all subject")) return true;

    for (const rawLs of leadSubjects) {
      const ls = cleanSubjectName(rawLs).toLowerCase();
      if (!ls) continue;

      if (ls.includes("all subject")) return true;
      if (ts.includes(ls) || ls.includes(ts)) return true;

      // Maths stem
      if (
        (ls.includes("math") || ls.includes("algebra") || ls.includes("calculus") || ls.includes("geometry")) &&
        (ts.includes("math") || ts.includes("algebra") || ts.includes("calculus") || ts.includes("geometry"))
      ) return true;

      // Science stem
      if (
        (ls.includes("science") || ls.includes("evs") || ls.includes("general science")) &&
        (ts.includes("science") || ts.includes("evs") || ts.includes("general science"))
      ) return true;

      // Physics / Chemistry / Biology
      if (ls.includes("physic") && ts.includes("physic")) return true;
      if (ls.includes("chem") && ts.includes("chem")) return true;
      if (ls.includes("bio") && ts.includes("bio")) return true;

      // Social Science / SST
      if (
        (ls.includes("social") || ls.includes("sst") || ls.includes("history") || ls.includes("geography") || ls.includes("civics")) &&
        (ts.includes("social") || ts.includes("sst") || ts.includes("history") || ts.includes("geography") || ts.includes("civics"))
      ) return true;

      // English & Spoken English
      if (ls.includes("english") && ts.includes("english")) return true;

      // Hindi
      if (ls.includes("hindi") && ts.includes("hindi")) return true;

      // Languages (Indian Regional & Foreign)
      const langKeywords = [
        "sanskrit", "french", "german", "spanish", "punjabi", "bengali", "urdu",
        "marathi", "gujarati", "tamil", "telugu", "kannada", "malayalam", "arabic",
        "japanese", "chinese", "mandarin", "russian", "italian", "korean", "odia", "assamese"
      ];
      for (const lk of langKeywords) {
        if (ls.includes(lk) && ts.includes(lk)) return true;
      }

      // Commerce / Accounts
      if (
        (ls.includes("account") || ls.includes("commerce") || ls.includes("business") || ls.includes("bst")) &&
        (ts.includes("account") || ts.includes("commerce") || ts.includes("business") || ts.includes("bst"))
      ) return true;

      // Economics
      if (ls.includes("economic") && ts.includes("economic")) return true;

      // Computer / Coding
      if (
        (ls.includes("code") || ls.includes("programm") || ls.includes("computer") || ls.includes("python") || ls.includes("java") || ls.includes("it")) &&
        (ts.includes("code") || ts.includes("programm") || ts.includes("computer") || ts.includes("python") || ts.includes("java") || ts.includes("it"))
      ) return true;
    }
  }

  return false;
}

// ── Filter 2: Class Level Match ──────────────────────────────────────────────

export function coversClassLevel(tutorClassLevels: string[], leadClassLevel: string): boolean {
  if (!tutorClassLevels.length || !leadClassLevel) return false;

  if (tutorClassLevels.includes(leadClassLevel)) return true;

  const leadGrade = extractGradeNumber(leadClassLevel);
  const normLead = normalizeClassLevel(leadClassLevel);

  for (const tc of tutorClassLevels) {
    if (tc.trim() === leadClassLevel.trim()) return true;

    const normTc = normalizeClassLevel(tc);
    if (normTc === normLead) return true;

    // Check individual grade match (e.g. 6 === 6)
    const tutorGrade = extractGradeNumber(tc);
    if (leadGrade !== null && tutorGrade !== null && leadGrade === tutorGrade) return true;

    // Check if tutor class range covers lead grade
    if (leadGrade !== null) {
      // 1. Numeric ranges: e.g. "Class 1-5", "Class 11-12", "1 to 8", "9-10", "11–12"
      const rangeMatches = tc.matchAll(
        /(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–|—)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi
      );
      for (const rm of rangeMatches) {
        const start = parseInt(rm[1], 10);
        const end = parseInt(rm[2], 10);
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        if (leadGrade >= min && leadGrade <= max) return true;
      }

      // 2. Roman ranges: e.g. "Class XI-XII", "Class IX-X", "Class I-V", "Class VI-VIII"
      const romanRangeMatches = tc.matchAll(
        /(?:class\s*)?([ivx]+)\s*(?:to|-|–|—)\s*(?:class\s*)?([ivx]+)/gi
      );
      for (const rrm of romanRangeMatches) {
        const start = ROMAN_NUMERALS[rrm[1].toUpperCase()];
        const end = ROMAN_NUMERALS[rrm[2].toUpperCase()];
        if (start && end) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          if (leadGrade >= min && leadGrade <= max) return true;
        }
      }
    }

    if (
      (leadClassLevel.toLowerCase().includes("spoken") || leadClassLevel.toLowerCase().includes("beginner")) &&
      (tc.toLowerCase().includes("spoken") || tc.toLowerCase().includes("beginner") || tc.toLowerCase().includes("college") || tc.toLowerCase().includes("11") || tc.toLowerCase().includes("12"))
    ) {
      return true;
    }

    if (
      (leadGrade === null || tutorGrade === null) &&
      (tc.toLowerCase().includes(leadClassLevel.toLowerCase()) ||
      leadClassLevel.toLowerCase().includes(tc.toLowerCase()))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a tutor is qualified to teach the requested subjects at the requested class level.
 * Prevents cross-subject class leaks: e.g. a tutor who teaches Physics for Class XII and Maths for Class X
 * must NOT be matched for Class 10 Physics!
 * Standalone subjects (e.g. "Maths", "Science") inherit the tutor's class levels.
 * Class-bound subjects (e.g. "Maths for Class X") strictly require the lead grade to match the subject grade.
 */
export function isSubjectAndClassMatched(
  tutorSubjects: string[],
  tutorClassLevels: string[],
  leadSubjects: string[],
  leadClassLevel: string
): boolean {
  if (!tutorSubjects.length || !leadSubjects.length) return false;

  // Resolve effective lead class level: if leadClassLevel is empty, infer from lead subjects
  let effectiveLeadClass = leadClassLevel;
  if (!effectiveLeadClass) {
    for (const ls of leadSubjects) {
      const g = parseGradeNumbers(ls);
      if (g.length > 0) {
        effectiveLeadClass = `Class ${g[0]}`;
        break;
      }
    }
  }

  const effectiveTutorClasses =
    tutorClassLevels && tutorClassLevels.length > 0
      ? tutorClassLevels
      : expandToIndividualClasses(tutorSubjects);

  if (effectiveLeadClass && !coversClassLevel(effectiveTutorClasses, effectiveLeadClass)) {
    return false;
  }

  const leadGrade = effectiveLeadClass ? extractGradeNumber(effectiveLeadClass) : null;

  // Senior Stream Segregation (Class 11-12)
  if (leadGrade !== null && leadGrade >= 11) {
    const combinedLead = `${effectiveLeadClass || ""} ${leadSubjects.join(" ")}`.toLowerCase();
    const isHumanitiesLead = /humanit|arts?\b|history|political\s*sci|pol\s*sci|geograph|psycholog|sociolog/i.test(combinedLead);
    const isCommerceLead = /commerce|account|business|bst\b/i.test(combinedLead);
    const isScienceLead = /jee|neet|medical|physic|chem|bio\b|biolog/i.test(combinedLead);

    const combinedTutor = tutorSubjects.join(" ").toLowerCase();
    const tutorHasHumanities = /humanit|arts?\b|history|political\s*sci|pol\s*sci|geograph|psycholog|sociolog/i.test(combinedTutor);
    const tutorHasCommerce = /commerce|account|business|bst\b/i.test(combinedTutor);
    const tutorHasScience = /jee|neet|medical|physic|chem|bio\b|biolog/i.test(combinedTutor);
    const tutorHasMath = /math|calculus|algebra/i.test(combinedTutor);

    if (isHumanitiesLead && !tutorHasHumanities) return false;
    if (isCommerceLead && !tutorHasCommerce && !(tutorHasMath && combinedLead.includes("math"))) return false;
    if (isScienceLead && (tutorHasHumanities || tutorHasCommerce) && !tutorHasScience && !tutorHasMath) return false;
  }

  // Check each tutor subject: at least ONE must match a lead subject AND be valid for this class level
  for (const rawTs of tutorSubjects) {
    if (!hasSubjectOverlap([rawTs], leadSubjects)) continue;

    // Check if the tutor subject is class-bound (e.g. "Maths for Class X" -> [10])
    const subjectGrades = parseGradeNumbers(rawTs);
    if (subjectGrades.length > 0 && leadGrade !== null) {
      if (!subjectGrades.includes(leadGrade)) {
        // This specific tutor subject is for a different grade!
        continue;
      }
    }

    // Found a valid subject for this class level
    return true;
  }

  return false;
}

// ── Filter 3: Teaching Mode Compatibility ────────────────────────────────────

export function isModeCompatible(
  tutorMode: TeachingMode,
  leadMode: TeachingMode,
  classLevel?: string
): boolean {
  if (leadMode === "ONLINE" && classLevel && isTill8thClass(classLevel)) {
    return false;
  }
  if (tutorMode === "EITHER" || leadMode === "EITHER") return true;
  if (leadMode === "ONLINE") return true;
  return tutorMode === leadMode;
}

// ── Filter 4: Budget Compatibility ───────────────────────────────────────────

export function isBudgetCompatible(
  tutorFeeMin: number | null,
  leadBudgetMax: number | null
): boolean {
  if (tutorFeeMin == null || leadBudgetMax == null) return true;
  return tutorFeeMin <= leadBudgetMax;
}

// ── Filter 5: Gender Preference Compatibility ────────────────────────────────

export function isGenderCompatible(
  tutorGender?: string | null,
  leadGenderPref?: string | null
): boolean {
  if (!leadGenderPref) return true;
  const pref = leadGenderPref.toUpperCase().trim();
  if (pref === "ANY" || pref === "NO PREFERENCE" || pref === "" || pref.includes("ANY")) {
    return true;
  }

  const tGender = (tutorGender || "").toUpperCase().trim();
  if (pref.includes("FEMALE")) {
    return tGender === "FEMALE";
  }
  if (pref.includes("MALE")) {
    return tGender === "MALE";
  }
  return true;
}

// ── Filter 6: Strict 5 km Radius Distance Filter ─────────────────────────────

export const MAX_OFFLINE_RADIUS_KM = 5.0;

export function computeDistance(
  tutor: CandidateTutor,
  lead: MatchableLead
): { passes: boolean; distanceKm: number | null } {
  // Online leads don't require physical proximity
  if (lead.mode === "ONLINE") {
    return { passes: true, distanceKm: null };
  }

  // If coordinates exist, strictly enforce <= 5 km
  if (
    tutor.latitude != null &&
    tutor.longitude != null &&
    lead.latitude != null &&
    lead.longitude != null
  ) {
    const distanceKm = Math.round(
      haversineDistanceKm(
        tutor.latitude,
        tutor.longitude,
        lead.latitude,
        lead.longitude
      ) * 10
    ) / 10;

    return { passes: distanceKm <= MAX_OFFLINE_RADIUS_KM, distanceKm };
  }

  // Fallback: If coordinates missing, check city match
  if (tutor.city && lead.city) {
    const cityMatch = tutor.city.trim().toLowerCase() === lead.city.trim().toLowerCase();
    return { passes: cityMatch, distanceKm: null };
  }

  return { passes: true, distanceKm: null };
}

// ── Filter 7: KYC Verification Helper ────────────────────────────────────────

export function isKycApproved(kycStatus: KycStatus): boolean {
  return kycStatus === "APPROVED";
}

// ── Main Matching Pipeline ────────────────────────────────────────────────────

export async function findMatchingTutors(
  lead: MatchableLead
): Promise<MatchedTutor[]> {
  if (["CLOSED", "EXPIRED", "COMPLETED"].includes(lead.status)) {
    return [];
  }

  if (lead.purchaseCount >= lead.maxTutors) {
    return [];
  }

  if (lead.mode === "ONLINE" && isTill8thClass(lead.classLevel)) {
    console.info(`[matching-engine] Online classes disabled for ${lead.classLevel} — returning 0 matches.`);
    return [];
  }

  // Geocode lead coordinates via Gemini AI if missing and lead is offline
  let effectiveLeadLat = lead.latitude;
  let effectiveLeadLng = lead.longitude;
  if (lead.mode !== "ONLINE" && (effectiveLeadLat == null || effectiveLeadLng == null)) {
    const geocoded = await geocodeAddressWithGemini({
      address: lead.area,
      city: lead.city,
    });
    if (geocoded) {
      effectiveLeadLat = geocoded.lat;
      effectiveLeadLng = geocoded.lng;
    }
  }

  const effectiveLead: MatchableLead = {
    ...lead,
    latitude: effectiveLeadLat,
    longitude: effectiveLeadLng,
  };

  const existingPurchases = await prisma.leadPurchase.findMany({
    where: { leadId: lead.id },
    select: { tutorProfileId: true },
  });
  const purchasedTutorIds = new Set(existingPurchases.map((p) => p.tutorProfileId));

  const candidates = await prisma.tutorProfile.findMany({
    select: {
      id: true,
      userId: true,
      subjects: true,
      classLevels: true,
      teachingMode: true,
      teachingRadius: true,
      feeMin: true,
      feeMax: true,
      latitude: true,
      longitude: true,
      city: true,
      gender: true,
      kycStatus: true,
      isVerified: true,
      profileScore: true,
      averageRating: true,
      totalReviews: true,
      introVideoUrl: true,
      subscriptionPlan: true,
      user: { select: { name: true, email: true } },
    },
  });

  const matched: MatchedTutor[] = [];
  const genderPref = lead.genderPreference || lead.tutorGenderPref;

  for (const tutor of candidates) {
    if (purchasedTutorIds.has(tutor.id)) continue;

    // Filter 1: Gender Preference Check
    if (!isGenderCompatible(tutor.gender, genderPref)) continue;

    // Filter 2 & 3: Subject & Class Level Match (unified with grade boundary validation)
    if (!isSubjectAndClassMatched(tutor.subjects, tutor.classLevels, lead.subjects, lead.classLevel)) {
      continue;
    }

    // Filter 4: Mode Compatibility
    if (!isModeCompatible(tutor.teachingMode, lead.mode, lead.classLevel)) continue;

    // Filter 5: Budget Compatibility
    if (!isBudgetCompatible(tutor.feeMin, lead.budgetMax)) continue;

    // Filter 6: Distance & Location Filter (5 km max radius)
    let tutorWithCoords = tutor;
    if (
      effectiveLead.mode !== "ONLINE" &&
      (tutor.latitude == null || tutor.longitude == null) &&
      tutor.city
    ) {
      const tutorGeo = await geocodeAddressWithGemini({ city: tutor.city });
      if (tutorGeo) {
        tutorWithCoords = { ...tutor, latitude: tutorGeo.lat, longitude: tutorGeo.lng };
      }
    }

    const { passes: distancePasses, distanceKm } = computeDistance(tutorWithCoords, effectiveLead);
    if (!distancePasses) continue;

    matched.push({ ...tutorWithCoords, distanceKm });
  }

  return matched;
}


