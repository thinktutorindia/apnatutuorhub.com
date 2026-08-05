import { getCachedSettings, type PlatformSettingKey } from "@/lib/settings-cache";

// ── Matching configuration weights ──────────────────────────────────────────
// Values are pulled from the in-memory settings cache (10-min TTL backed by
// `platform_settings` DB table). This eliminates the hot-loop SQL query that
// previously fired on every individual match calculation.
// Call `invalidateSettingsCache()` after admin saves settings changes.

export type MatchingWeights = {
  kycVerified: number;       // default 500
  maxDistance: number;       // default 300
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
 * Loads the full matching configuration from the in-memory settings cache.
 * Cache TTL is 10 minutes — call `invalidateSettingsCache()` after admin
 * updates to force an immediate DB refresh.
 */
export async function loadMatchingConfig(): Promise<MatchingConfig> {
  const s = await getCachedSettings();

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

// Re-export cache invalidation so admin actions can call it directly
export { invalidateSettingsCache } from "@/lib/settings-cache";

// Re-export PlatformSettingKey for callers that previously imported it here
export type { PlatformSettingKey } from "@/lib/platform-settings";
