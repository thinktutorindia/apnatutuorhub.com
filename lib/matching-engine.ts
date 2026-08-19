import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
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
  kycStatus: KycStatus;
  isVerified: boolean;
  profileScore: number;
  averageRating: number;
  totalReviews: number;
  introVideoUrl: string | null;
  subscriptionPlan?: string | null;
  user: { name: string | null; email: string };
};

/** A tutor that passed all 6 filters, with computed distance. */
export type MatchedTutor = CandidateTutor & {
  distanceKm: number | null; // null when mode is ONLINE or coords missing
};

// ── Filter helpers ───────────────────────────────────────────────────────────

/** Normalizes class level representations into standard comparable buckets */
export function normalizeClassLevel(raw: string): string {
  const s = raw.trim();
  if (/^class\s*([1-5])$/i.test(s) || /^([1-5])(st|nd|rd|th)?\s*grade$/i.test(s) || /^([1-5])(st|nd|rd|th)?$/i.test(s) || /class\s*1\s*-\s*5/i.test(s)) return "Class 1-5";
  if (/^class\s*([6-8])$/i.test(s) || /^([6-8])(th)?\s*grade$/i.test(s) || /^([6-8])(th)?$/i.test(s) || /class\s*6\s*-\s*8/i.test(s)) return "Class 6-8";
  if (/^class\s*(9|10)$/i.test(s) || /^(9|10)(th)?\s*grade$/i.test(s) || /^(9|10)(th)?$/i.test(s) || /class\s*9\s*-\s*10/i.test(s)) return "Class 9-10";
  if (/^class\s*(11|12)$/i.test(s) || /^(11|12)(th)?\s*grade$/i.test(s) || /^(11|12)(th)?$/i.test(s) || /class\s*11\s*-\s*12/i.test(s)) return "Class 11-12";
  if (/jee|iit/i.test(s)) return "JEE";
  if (/neet|medical/i.test(s)) return "NEET";
  if (/coding|computer|python|programming/i.test(s)) return "Coding";
  if (/ca|commerce/i.test(s)) return "CA";
  if (/art|music|dance|drawing/i.test(s)) return "Arts";
  if (/language|french|german|spoken|sanskrit/i.test(s)) return "Languages";
  return s;
}

/** Filter 1: Subject intersection check with root-word and substring awareness. */
export function hasSubjectOverlap(tutorSubjects: string[], leadSubjects: string[]): boolean {
  if (!tutorSubjects.length || !leadSubjects.length) return false;

  const leadSet = new Set(leadSubjects.map((s) => s.trim().toLowerCase()));

  return tutorSubjects.some((ts) => {
    const cleanTs = ts.trim().toLowerCase();
    // Direct match
    if (leadSet.has(cleanTs)) return true;

    // Word and category matching
    return leadSubjects.some((ls) => {
      const cleanLs = ls.trim().toLowerCase();
      if (cleanTs.includes(cleanLs) || cleanLs.includes(cleanTs)) return true;

      // Common subject root stems
      if ((cleanLs.includes("math") || cleanLs.includes("algebra") || cleanLs.includes("calculus")) && cleanTs.includes("math")) return true;
      if (cleanLs.includes("physic") && cleanTs.includes("physic")) return true;
      if (cleanLs.includes("chem") && cleanTs.includes("chem")) return true;
      if (cleanLs.includes("bio") && cleanTs.includes("bio")) return true;
      if ((cleanLs.includes("code") || cleanLs.includes("programm") || cleanLs.includes("computer") || cleanLs.includes("python") || cleanLs.includes("java")) &&
          (cleanTs.includes("code") || cleanTs.includes("programm") || cleanTs.includes("computer") || cleanTs.includes("python") || cleanTs.includes("java"))) return true;
      if (cleanLs.includes("english") && cleanTs.includes("english")) return true;
      if (cleanLs.includes("hindi") && cleanTs.includes("hindi")) return true;
      if (cleanLs.includes("account") && (cleanTs.includes("account") || cleanTs.includes("commerce"))) return true;
      if (cleanLs.includes("economic") && (cleanTs.includes("economic") || cleanTs.includes("commerce"))) return true;
      if (cleanLs.includes("all subject") && cleanTs.includes("all subject")) return true;

      return false;
    });
  });
}

/** Filter 2: Class level match with band compatibility. */
export function coversClassLevel(tutorClassLevels: string[], leadClassLevel: string): boolean {
  if (!tutorClassLevels.length || !leadClassLevel) return false;

  // Direct string equality
  if (tutorClassLevels.includes(leadClassLevel)) return true;

  const normLead = normalizeClassLevel(leadClassLevel);
  const normTutors = tutorClassLevels.map(normalizeClassLevel);

  if (normTutors.includes(normLead)) return true;

  // Substring / cross-tier check
  return tutorClassLevels.some((tc) => {
    const normTc = normalizeClassLevel(tc);
    return (
      normTc === normLead ||
      tc.toLowerCase().includes(leadClassLevel.toLowerCase()) ||
      leadClassLevel.toLowerCase().includes(tc.toLowerCase())
    );
  });
}

/** Filter 3: Teaching mode compatibility. */
export function isModeCompatible(tutorMode: TeachingMode, leadMode: TeachingMode): boolean {
  if (tutorMode === "EITHER" || leadMode === "EITHER") return true;
  // Online classes are location-independent: any registered tutor who can teach the subject can take online classes
  if (leadMode === "ONLINE") return true;
  return tutorMode === leadMode;
}

/** Filter 4: Budget compatibility — tutor's minimum fee <= lead's max budget. */
export function isBudgetCompatible(
  tutorFeeMin: number | null,
  leadBudgetMax: number | null
): boolean {
  // Permissive if not specified
  if (tutorFeeMin == null || leadBudgetMax == null) return true;
  return tutorFeeMin <= leadBudgetMax;
}

/**
 * Filter 5: Distance filter (for OFFLINE / EITHER modes).
 * Returns distance in km, or `null` when mode is ONLINE or coordinates unavailable.
 */
export function computeDistance(
  tutor: CandidateTutor,
  lead: MatchableLead
): { passes: boolean; distanceKm: number | null } {
  // Online leads don't require physical proximity — match all subject teachers nationwide
  if (lead.mode === "ONLINE") {
    return { passes: true, distanceKm: null };
  }

  // If both parties have GPS coordinates, calculate exact haversine distance
  if (
    tutor.latitude != null &&
    tutor.longitude != null &&
    lead.latitude != null &&
    lead.longitude != null
  ) {
    const distanceKm = haversineDistanceKm(
      tutor.latitude,
      tutor.longitude,
      lead.latitude,
      lead.longitude
    );

    const effectiveRadius = Math.max(tutor.teachingRadius || 10, lead.radiusKm || 10);
    return { passes: distanceKm <= effectiveRadius, distanceKm: Math.round(distanceKm * 10) / 10 };
  }

  // Fallback: If coordinates missing, check city match
  if (tutor.city && lead.city) {
    const cityMatch = tutor.city.trim().toLowerCase() === lead.city.trim().toLowerCase();
    return { passes: cityMatch, distanceKm: null };
  }

  // Permissive fallback
  return { passes: true, distanceKm: null };
}

/** Filter 6: KYC must be APPROVED. */
export function isKycApproved(kycStatus: KycStatus): boolean {
  return kycStatus === "APPROVED";
}

// ── Main matching function ───────────────────────────────────────────────────

/**
 * Finds all tutors eligible for a given lead by applying the 6-filter matching pipeline.
 *
 * @returns Array of matched tutors with distance metadata.
 */
export async function findMatchingTutors(
  lead: MatchableLead
): Promise<MatchedTutor[]> {
  // Guard: don't match closed/expired/completed leads
  if (["CLOSED", "EXPIRED", "COMPLETED"].includes(lead.status)) {
    return [];
  }

  // Guard: already at max tutors capacity
  if (lead.purchaseCount >= lead.maxTutors) {
    return [];
  }

  // Fetch already-purchased tutor IDs to exclude
  const existingPurchases = await prisma.leadPurchase.findMany({
    where: { leadId: lead.id },
    select: { tutorProfileId: true },
  });
  const purchasedTutorIds = new Set(existingPurchases.map((p) => p.tutorProfileId));

  // Coarse DB pre-filter: Fetch all KYC-approved tutors to avoid Postgres array string mismatch
  const candidates = await prisma.tutorProfile.findMany({
    where: {
      kycStatus: "APPROVED",
    },
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

  for (const tutor of candidates) {
    // Skip tutors who already purchased this lead
    if (purchasedTutorIds.has(tutor.id)) continue;

    // Filter 1: Subject match
    if (!hasSubjectOverlap(tutor.subjects, lead.subjects)) continue;

    // Filter 2: Class level match
    if (!coversClassLevel(tutor.classLevels, lead.classLevel)) continue;

    // Filter 3: Mode compatibility
    if (!isModeCompatible(tutor.teachingMode, lead.mode)) continue;

    // Filter 4: Budget compatibility
    if (!isBudgetCompatible(tutor.feeMin, lead.budgetMax)) continue;

    // Filter 5: Distance & Location filter
    const { passes: distancePasses, distanceKm } = computeDistance(tutor, lead);
    if (!distancePasses) continue;

    // Filter 6: KYC verification
    if (!isKycApproved(tutor.kycStatus)) continue;

    matched.push({ ...tutor, distanceKm });
  }

  return matched;
}

