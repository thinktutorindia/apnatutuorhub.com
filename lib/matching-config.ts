import {
  getNumericSettings,
  type PlatformSettingKey,
} from "@/lib/platform-settings";

// ── Matching configuration weights ──────────────────────────────────────────
// All values are pulled from the `platform_settings` DB table via
// `getNumericSettings()`.  Hardcoded fallbacks in `PLATFORM_SETTING_DEFAULTS`
// apply until an admin overrides them in Phase 10.

const MATCHING_KEYS = [
  "WEIGHT_KYC_VERIFIED",
  "WEIGHT_MAX_DISTANCE",
  "WEIGHT_BAYESIAN_RATING",
  "WEIGHT_PROFILE_COMPLETION",
  "RADIUS_EXPANSION_STEP_KM",
  "RADIUS_EXPANSION_INTERVAL_HOURS",
  "LEAD_EXPIRY_HOURS",
  "MAX_TUTORS_PER_LEAD",
] as const satisfies readonly PlatformSettingKey[];

export type MatchingWeights = {
  kycVerified: number;       // default 500
  maxDistance: number;        // default 300
  bayesianRating: number;    // default 200
  profileCompletion: number; // default 100
};

export type MatchingConfig = MatchingWeights & {
  radiusExpansionStepKm: number;
  radiusExpansionIntervalHours: number;
  leadExpiryHours: number;
  maxTutorsPerLead: number;
};

/**
 * Loads the full matching configuration from the database.
 * Safe to call from Server Actions, workers, or RSC pages.
 */
export async function loadMatchingConfig(): Promise<MatchingConfig> {
  const s = await getNumericSettings(MATCHING_KEYS);

  return {
    kycVerified: s.WEIGHT_KYC_VERIFIED,
    maxDistance: s.WEIGHT_MAX_DISTANCE,
    bayesianRating: s.WEIGHT_BAYESIAN_RATING,
    profileCompletion: s.WEIGHT_PROFILE_COMPLETION,
    radiusExpansionStepKm: s.RADIUS_EXPANSION_STEP_KM,
    radiusExpansionIntervalHours: s.RADIUS_EXPANSION_INTERVAL_HOURS,
    leadExpiryHours: s.LEAD_EXPIRY_HOURS,
    maxTutorsPerLead: s.MAX_TUTORS_PER_LEAD,
  };
}

/** Convenience accessor for ranking weights only. */
export async function loadMatchingWeights(): Promise<MatchingWeights> {
  const cfg = await loadMatchingConfig();
  return {
    kycVerified: cfg.kycVerified,
    maxDistance: cfg.maxDistance,
    bayesianRating: cfg.bayesianRating,
    profileCompletion: cfg.profileCompletion,
  };
}
