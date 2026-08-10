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

/** Filter 1: Subject intersection check. */
function hasSubjectOverlap(tutorSubjects: string[], leadSubjects: string[]): boolean {
  const leadSet = new Set(leadSubjects);
  return tutorSubjects.some((s) => leadSet.has(s));
}

/** Filter 2: Class level match. */
function coversClassLevel(tutorClassLevels: string[], leadClassLevel: string): boolean {
  return tutorClassLevels.includes(leadClassLevel);
}

/** Filter 3: Teaching mode compatibility. */
function isModeCompatible(tutorMode: TeachingMode, leadMode: TeachingMode): boolean {
  if (tutorMode === "EITHER" || leadMode === "EITHER") return true;
  return tutorMode === leadMode;
}

/** Filter 4: Budget compatibility — tutor's minimum fee ≤ lead's max budget. */
function isBudgetCompatible(
  tutorFeeMin: number | null,
  leadBudgetMax: number | null
): boolean {
  // If either party hasn't set a value, skip this filter (permissive).
  if (tutorFeeMin == null || leadBudgetMax == null) return true;
  return tutorFeeMin <= leadBudgetMax;
}

/**
 * Filter 5: Distance filter (for OFFLINE / EITHER modes only).
 * Returns distance in km, or `null` when the filter is not applicable.
 */
function computeDistance(
  tutor: CandidateTutor,
  lead: MatchableLead
): { passes: boolean; distanceKm: number | null } {
  // Online-only leads don't require geographic proximity.
  if (lead.mode === "ONLINE") {
    return { passes: true, distanceKm: null };
  }

  // If either party has no coordinates, we can't compute distance — be permissive.
  if (
    tutor.latitude == null ||
    tutor.longitude == null ||
    lead.latitude == null ||
    lead.longitude == null
  ) {
    return { passes: true, distanceKm: null };
  }

  const distanceKm = haversineDistanceKm(
    tutor.latitude,
    tutor.longitude,
    lead.latitude,
    lead.longitude
  );

  // Use the larger of: tutor's own teaching radius, or the lead's current
  // search radius (which gets expanded over time by the radius worker).
  const effectiveRadius = Math.max(tutor.teachingRadius, lead.radiusKm);

  return { passes: distanceKm <= effectiveRadius, distanceKm };
}

/** Filter 6: KYC must be APPROVED. */
function isKycApproved(kycStatus: KycStatus): boolean {
  return kycStatus === "APPROVED";
}

// ── Main matching function ───────────────────────────────────────────────────

/**
 * Finds all tutors eligible for a given lead by applying 6 sequential filters.
 *
 * The function fetches tutor candidates from the DB with a coarse pre-filter
 * (KYC approved + at least one overlapping subject via Prisma `hasSome`), then
 * refines in-memory with the remaining 5 filters.
 *
 * @returns Array of matched tutors with distance metadata, unsorted.
 *          Caller is responsible for ranking (see `lib/ranking-score.ts`).
 */
export async function findMatchingTutors(
  lead: MatchableLead
): Promise<MatchedTutor[]> {
  // Guard: don't match closed/expired/completed leads.
  if (["CLOSED", "EXPIRED", "COMPLETED"].includes(lead.status)) {
    return [];
  }

  // Guard: already at max tutors.
  if (lead.purchaseCount >= lead.maxTutors) {
    return [];
  }

  // Fetch already-purchased tutor IDs so we exclude them from results.
  const existingPurchases = await prisma.leadPurchase.findMany({
    where: { leadId: lead.id },
    select: { tutorProfileId: true },
  });
  const purchasedTutorIds = new Set(existingPurchases.map((p) => p.tutorProfileId));

  // Coarse DB pre-filter: KYC approved + subject overlap.
  // This dramatically reduces the in-memory candidate set.
  const candidates = await prisma.tutorProfile.findMany({
    where: {
      kycStatus: "APPROVED",
      subjects: { hasSome: lead.subjects },
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
    // Skip tutors who already purchased this lead.
    if (purchasedTutorIds.has(tutor.id)) continue;

    // Filter 1: Subject match (already pre-filtered, but re-verify).
    if (!hasSubjectOverlap(tutor.subjects, lead.subjects)) continue;

    // Filter 2: Class level match.
    if (!coversClassLevel(tutor.classLevels, lead.classLevel)) continue;

    // Filter 3: Mode compatibility.
    if (!isModeCompatible(tutor.teachingMode, lead.mode)) continue;

    // Filter 4: Budget compatibility.
    if (!isBudgetCompatible(tutor.feeMin, lead.budgetMax)) continue;

    // Filter 5: Distance filter.
    const { passes: distancePasses, distanceKm } = computeDistance(tutor, lead);
    if (!distancePasses) continue;

    // Filter 6: KYC (already pre-filtered, but explicit for safety).
    if (!isKycApproved(tutor.kycStatus)) continue;

    matched.push({ ...tutor, distanceKm });
  }

  return matched;
}
