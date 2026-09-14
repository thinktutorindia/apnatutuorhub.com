import { prisma } from "@/lib/prisma";

// Dynamic platform configuration — see docs/Phases.md §7.
// Values live in the `platform_settings` table; these are the fallbacks used
// until an admin overrides them in Phase 9.
export const PLATFORM_SETTING_DEFAULTS = {
  MAX_TUTORS_PER_LEAD: 3,          // Growth Plan standard: Low Competition (max 3 tutors per lead)
  LEAD_EXPIRY_HOURS: 48,
  RADIUS_EXPANSION_STEP_KM: 5,
  RADIUS_EXPANSION_INTERVAL_HOURS: 6,
  COIN_COST_CLASS_1_8: 10,         // < ₹3,000/mo budget bucket (up to 6 leads per ₹999 plan)
  COIN_COST_CLASS_9_12: 20,        // ₹3,000–₹5,000/mo budget bucket (up to 3 leads per ₹999 plan)
  COIN_COST_COMPETITIVE_CODING: 30, // > ₹5,000/mo budget bucket (up to 2 leads per ₹999 plan)
  WEIGHT_KYC_VERIFIED: 500,
  WEIGHT_MAX_DISTANCE: 300,
  WEIGHT_BAYESIAN_RATING: 200,
  WEIGHT_PROFILE_COMPLETION: 100,
} as const;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_DEFAULTS;

export async function getNumericSettings<K extends PlatformSettingKey>(
  keys: readonly K[]
): Promise<Record<K, number>> {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: keys as readonly string[] as string[] } },
    select: { key: true, value: true },
  });

  const overrides = new Map(rows.map((row) => [row.key, Number(row.value)]));

  return keys.reduce((resolved, key) => {
    const override = overrides.get(key);
    resolved[key] =
      override !== undefined && Number.isFinite(override)
        ? override
        : PLATFORM_SETTING_DEFAULTS[key];
    return resolved;
  }, {} as Record<K, number>);
}

export async function getNumericSetting(key: PlatformSettingKey): Promise<number> {
  const settings = await getNumericSettings([key]);
  return settings[key];
}
