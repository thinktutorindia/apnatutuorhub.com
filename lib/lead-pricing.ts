import {
  getNumericSettings,
  type PlatformSettingKey,
} from "@/lib/platform-settings";

// Coin cost tier per class level — see docs/Phases.md §6.2 and §7.
const COIN_COST_KEY_BY_CLASS_LEVEL: Record<string, PlatformSettingKey> = {
  "Class 1-5": "COIN_COST_CLASS_1_8",
  "Class 6-8": "COIN_COST_CLASS_1_8",
  "Class 9-10": "COIN_COST_CLASS_9_12",
  "Class 11-12": "COIN_COST_CLASS_9_12",
  JEE: "COIN_COST_COMPETITIVE_CODING",
  NEET: "COIN_COST_COMPETITIVE_CODING",
  CA: "COIN_COST_COMPETITIVE_CODING",
  Coding: "COIN_COST_COMPETITIVE_CODING",
  Arts: "COIN_COST_CLASS_1_8",
  Languages: "COIN_COST_CLASS_1_8",
};

export function coinCostSettingKey(classLevel: string): PlatformSettingKey {
  return COIN_COST_KEY_BY_CLASS_LEVEL[classLevel] ?? "COIN_COST_CLASS_1_8";
}

export type LeadCommercials = {
  coinCost: number;
  maxTutors: number;
  expiresAt: Date;
};

/** Resolves the coin price, competition cap and 48h expiry window for a new lead. */
export async function resolveLeadCommercials(
  classLevel: string
): Promise<LeadCommercials> {
  const coinCostKey = coinCostSettingKey(classLevel);
  const settings = await getNumericSettings([
    coinCostKey,
    "MAX_TUTORS_PER_LEAD",
    "LEAD_EXPIRY_HOURS",
  ] as const);

  return {
    coinCost: settings[coinCostKey],
    maxTutors: settings.MAX_TUTORS_PER_LEAD,
    expiresAt: new Date(Date.now() + settings.LEAD_EXPIRY_HOURS * 60 * 60 * 1000),
  };
}
