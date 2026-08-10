import type { MatchedTutor } from "@/lib/matching-engine";
import type { MatchingWeights } from "@/lib/matching-config";

// ── Ranking Score ────────────────────────────────────────────────────────────
//
// Computes a 0–1100 point ranking score for a matched tutor relative to a lead.
// The score is the sum of four independently weighted components:
//
//   Verified Badge ........... up to 500 pts
//   Distance Rank ............ up to 300 pts
//   Bayesian Rating .......... up to 200 pts
//   Profile Completion ....... up to 100 pts
//
// All weight maximums are loaded dynamically from `PlatformSetting` via
// `lib/matching-config.ts`.

// ── Bayesian prior constants ─────────────────────────────────────────────────
// C = minimum number of reviews before a tutor's own rating dominates.
// m = global prior mean (assumed 3.0 / 5).
const BAYESIAN_C = 5;
const BAYESIAN_PRIOR_MEAN = 3.0;

export type RankingScoreBreakdown = {
  total: number;
  verifiedBadge: number;
  distanceRank: number;
  bayesianRating: number;
  profileCompletion: number;
};

/**
 * Calculates the ranking score for a single matched tutor.
 *
 * @param tutor  - A tutor that already passed all 6 matching filters.
 * @param weights - Dynamic weights loaded from `loadMatchingWeights()`.
 * @returns A breakdown object with component scores and the total.
 */
export function calculateRankingScore(
  tutor: MatchedTutor,
  weights: MatchingWeights
): RankingScoreBreakdown {
  // ── 1. Verified Badge ──────────────────────────────────────────────────
  const verifiedBadge = tutor.kycStatus === "APPROVED" ? weights.kycVerified : 0;

  // ── 2. Distance Rank ───────────────────────────────────────────────────
  // Closer tutors score higher.  Online-only matches (distanceKm === null)
  // get full points since distance is irrelevant.
  let distanceRank: number;
  if (tutor.distanceKm == null) {
    // Online mode or missing coordinates — award full distance points.
    distanceRank = weights.maxDistance;
  } else if (tutor.teachingRadius <= 0) {
    distanceRank = weights.maxDistance;
  } else {
    // Linear decay: 0 km = full points, teachingRadius km = 0 points.
    const ratio = Math.min(tutor.distanceKm / tutor.teachingRadius, 1);
    distanceRank = Math.max(0, Math.round(weights.maxDistance * (1 - ratio)));
  }

  // ── 3. Bayesian Weighted Rating ────────────────────────────────────────
  // Bayesian average: (C × m + Σratings) / (C + n)
  // We approximate Σratings as averageRating × totalReviews.
  const n = tutor.totalReviews;
  const bayesianAvg =
    n > 0
      ? (BAYESIAN_C * BAYESIAN_PRIOR_MEAN + tutor.averageRating * n) /
        (BAYESIAN_C + n)
      : BAYESIAN_PRIOR_MEAN;

  // Scale from 0–5 star range to 0–maxPoints.
  const bayesianRating = Math.round((bayesianAvg / 5) * weights.bayesianRating);

  // ── 4. Profile Completion ──────────────────────────────────────────────
  // `profileScore` is 0–100; scale linearly to the weight maximum.
  const profileCompletion = Math.round(
    (tutor.profileScore / 100) * weights.profileCompletion
  );

  // ── 5. Subscription Plan Priority (Platinum VIP = #1 Priority) ────────
  let subscriptionBonus = 0;
  if (tutor.subscriptionPlan === "PLATINUM") {
    subscriptionBonus = 10000; // 🥇 Platinum VIP First Priority
  } else if (tutor.subscriptionPlan === "GOLD") {
    subscriptionBonus = 3000;
  } else if (tutor.subscriptionPlan === "SILVER") {
    subscriptionBonus = 1500;
  } else if (tutor.subscriptionPlan === "BRONZE") {
    subscriptionBonus = 500;
  }

  // ── Total ──────────────────────────────────────────────────────────────
  const total = verifiedBadge + distanceRank + bayesianRating + profileCompletion + subscriptionBonus;

  return {
    total,
    verifiedBadge,
    distanceRank,
    bayesianRating,
    profileCompletion,
  };
}
