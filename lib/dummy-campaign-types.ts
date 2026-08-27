/**
 * lib/dummy-campaign-types.ts
 * Client-safe types, constants, and fee benchmark definitions for Dummy Campaigns.
 */

// ─── Class-wise Benchmark Fee Structure (Market-aligned with attractive AI premium) ───

export const CLASS_FEE_RATES = {
  "1-5": {
    label: "Class 1 to 5",
    hourlyMin: 300,
    hourlyMax: 450,
    monthlyMin: 3500,
    monthlyMax: 5500,
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Nursery", "KG", "LKG", "UKG", "Primary"],
  },
  "6-8": {
    label: "Class 6 to 8",
    hourlyMin: 400,
    hourlyMax: 600,
    monthlyMin: 5000,
    monthlyMax: 7500,
    classes: ["Class 6", "Class 7", "Class 8", "Middle School"],
  },
  "9-10": {
    label: "Class 9 to 10",
    hourlyMin: 550,
    hourlyMax: 800,
    monthlyMin: 7000,
    monthlyMax: 11000,
    classes: ["Class 9", "Class 10", "Secondary"],
  },
  "11-12": {
    label: "Class 11 to 12",
    hourlyMin: 750,
    hourlyMax: 1200,
    monthlyMin: 10500,
    monthlyMax: 18000,
    classes: ["Class 11", "Class 12", "Senior Secondary", "JEE", "NEET", "IIT-JEE"],
  },
};

export type FeeBandKey = keyof typeof CLASS_FEE_RATES;

export function parseClassNumber(label: string): number | null {
  const m = String(label).match(/(?:class\s*)?(\d{1,2})\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n : null;
}

export function expandToIndividualClasses(inputClasses?: string[] | null): string[] {
  if (!inputClasses || inputClasses.length === 0) {
    return Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
  }

  const nums = new Set<number>();

  for (const raw of inputClasses) {
    if (!raw) continue;
    const str = String(raw).trim();

    const rangeMatches = str.matchAll(
      /(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–|—)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi
    );
    let matchedRange = false;
    for (const match of rangeMatches) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start >= 1 && end <= 12 && start <= end) {
        matchedRange = true;
        for (let i = start; i <= end; i++) nums.add(i);
      }
    }
    if (matchedRange) continue;

    const nurseryRangeMatch = str.match(
      /(?:nursery|kg|lkg|ukg|primary)\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/i
    );
    if (nurseryRangeMatch) {
      const end = parseInt(nurseryRangeMatch[1], 10);
      if (end >= 1 && end <= 12) {
        for (let i = 1; i <= end; i++) nums.add(i);
        continue;
      }
    }

    const uptoMatch = str.match(/(?:till|upto|up to)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/i);
    if (uptoMatch) {
      const end = parseInt(uptoMatch[1], 10);
      if (end >= 1 && end <= 12) {
        for (let i = 1; i <= end; i++) nums.add(i);
        continue;
      }
    }

    const singleMatches = [...str.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi)];
    let foundSingle = false;
    for (const sMatch of singleMatches) {
      const num = parseInt(sMatch[1], 10);
      if (num >= 1 && num <= 12) {
        nums.add(num);
        foundSingle = true;
      }
    }
    if (foundSingle) continue;

    const lower = str.toLowerCase();
    if (lower.includes("nursery") || lower.includes("kg") || lower.includes("lkg") || lower.includes("ukg")) {
      nums.add(1);
      nums.add(2);
    } else if (lower.includes("primary")) {
      [1, 2, 3, 4, 5].forEach((n) => nums.add(n));
    } else if (lower.includes("middle")) {
      [6, 7, 8].forEach((n) => nums.add(n));
    } else if (lower.includes("senior") || lower.includes("jee") || lower.includes("neet") || lower.includes("entrance")) {
      nums.add(11);
      nums.add(12);
    } else if (lower.includes("secondary")) {
      nums.add(9);
      nums.add(10);
    }
  }

  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 0) return ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  return sorted.map((n) => `Class ${n}`);
}

export function pickClassForDay(inputClasses: string[] | null | undefined, seed: number, stable = false): string {
  const pool = expandToIndividualClasses(inputClasses);
  const dayNum = stable ? 0 : Math.floor(Date.now() / 86400000);
  return pool[(dayNum + seed) % pool.length];
}

export function feeBandKeyForClass(classLevel: string): FeeBandKey {
  const n = parseClassNumber(classLevel) ?? 7;
  if (n <= 5) return "1-5";
  if (n <= 8) return "6-8";
  if (n <= 10) return "9-10";
  return "11-12";
}

const METRO = /delhi|new delhi|noida|gurgaon|gurugram|mumbai|bangalore|bengaluru|hyderabad|chennai|pune|kolkata|ghaziabad|faridabad/i;
const TIER2 = /jaipur|lucknow|ahmedabad|chandigarh|indore|bhopal|kochi|coimbatore|nagpur|surat|patna|kanpur/i;

export function areaFeeMultiplier(city?: string | null): number {
  const c = city || "";
  if (METRO.test(c)) return 1.12;
  if (TIER2.test(c)) return 1.02;
  return 0.96;
}

export function averageBudgetForLead(opts: {
  classLevel: string;
  isHourly: boolean;
  autoAdapt: boolean;
  campaignMin?: number;
  campaignMax?: number;
  tutorFeeMin?: number | null;
  tutorFeeMax?: number | null;
  city?: string | null;
  rng: () => number;
}): { min: number; max: number } {
  const band = CLASS_FEE_RATES[feeBandKeyForClass(opts.classLevel)];
  const bandMin = opts.isHourly ? band.hourlyMin : band.monthlyMin;
  const bandMax = opts.isHourly ? band.hourlyMax : band.monthlyMax;
  const bandAvg = (bandMin + bandMax) / 2;

  const parts = [bandAvg];

  if (!opts.autoAdapt && opts.campaignMin && opts.campaignMax && opts.campaignMin > 0 && opts.campaignMax >= opts.campaignMin) {
    parts.push((opts.campaignMin + opts.campaignMax) / 2);
  }

  if (opts.tutorFeeMin && opts.tutorFeeMax && opts.tutorFeeMax > 0) {
    let tMin = opts.tutorFeeMin;
    let tMax = opts.tutorFeeMax;
    const looksMonthly = tMax > 1500;
    if (opts.isHourly && looksMonthly) {
      tMin = Math.round(tMin / 24);
      tMax = Math.round(tMax / 24);
    } else if (!opts.isHourly && !looksMonthly) {
      tMin *= 20;
      tMax *= 20;
    }
    // Add realistic 15% premium to tutor's requested rate to make lead enticing
    parts.push(((tMin + tMax) / 2) * 1.15);
  }

  let avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  avg *= areaFeeMultiplier(opts.city);

  const step = opts.isHourly ? 50 : 500;
  const spread = opts.isHourly
    ? opts.rng() > 0.45 ? 100 : 50
    : opts.rng() > 0.45 ? 1000 : 500;
  const min = Math.max(step, Math.round((avg - spread / 2) / step) * step);
  const max = min + spread;
  return { min, max };
}

export type DummyCampaignCfg = {
  rateType: "HOURLY" | "MONTHLY";
  autoAdapt: boolean;
  emailFilter: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
};

const CFG_RE = /<!--ATH_CFG:([\s\S]*?)-->/;

export function serializeCampaignCfg(visible: string, cfg: DummyCampaignCfg): string {
  const body = (visible || "").replace(CFG_RE, "").trim();
  const tag = `<!--ATH_CFG:${JSON.stringify(cfg)}-->`;
  return body ? `${body}\n\n${tag}` : tag;
}

export function parseCampaignCfg(description?: string | null): DummyCampaignCfg {
  const fallback: DummyCampaignCfg = {
    rateType: "HOURLY",
    autoAdapt: true,
    emailFilter: "GENUINE_ONLY",
  };
  if (!description) return fallback;
  const m = description.match(CFG_RE);
  if (!m) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(m[1]) as Partial<DummyCampaignCfg>;
    return {
      rateType: parsed.rateType === "MONTHLY" ? "MONTHLY" : "HOURLY",
      autoAdapt: parsed.autoAdapt !== false,
      emailFilter:
        parsed.emailFilter === "DUMMY_ONLY" || parsed.emailFilter === "ALL"
          ? parsed.emailFilter
          : "GENUINE_ONLY",
    };
  } catch {
    return fallback;
  }
}

export function stripCampaignCfg(description?: string | null): string {
  return (description || "").replace(CFG_RE, "").trim();
}

export function dummyLeadActionPath(lead: DummyLead): string {
  const p = new URLSearchParams();
  p.set("claimed", "true");
  p.set("locality", lead.locality);
  if (lead.city) p.set("city", lead.city);
  p.set("subjects", lead.subjects.join(", "));
  p.set("class", lead.classLevel);
  p.set("budget", `${lead.budgetMin}-${lead.budgetMax}`);
  p.set("rate", lead.rateType);
  p.set("mode", lead.mode);
  p.set("days", lead.days);
  p.set("timing", lead.timing);
  return `/tutor/leads?${p.toString()}`;
}

export type DummyClaimedLeadInfo = {
  claimed: true;
  locality?: string;
  city?: string;
  subjects?: string;
  classLevel?: string;
  budgetMin?: number;
  budgetMax?: number;
  rateType?: "HOURLY" | "MONTHLY";
  mode?: string;
  days?: string;
  timing?: string;
};

export function parseDummyClaimedQuery(params: {
  claimed?: string;
  locality?: string;
  city?: string;
  subjects?: string;
  class?: string;
  budget?: string;
  rate?: string;
  mode?: string;
  days?: string;
  timing?: string;
}): DummyClaimedLeadInfo | null {
  if (params.claimed !== "true" && !params.locality) return null;
  const [minStr, maxStr] = (params.budget || "").split("-");
  const budgetMin = Number(minStr);
  const budgetMax = Number(maxStr);
  return {
    claimed: true,
    locality: params.locality,
    city: params.city,
    subjects: params.subjects,
    classLevel: params.class,
    budgetMin: Number.isFinite(budgetMin) && budgetMin > 0 ? budgetMin : undefined,
    budgetMax: Number.isFinite(budgetMax) && budgetMax > 0 ? budgetMax : undefined,
    rateType: params.rate === "MONTHLY" ? "MONTHLY" : params.rate === "HOURLY" ? "HOURLY" : undefined,
    mode: params.mode,
    days: params.days,
    timing: params.timing,
  };
}

// ─── DummyLead Type ───────────────────────────────────────────────────────────

export interface DummyLead {
  locality: string;
  city: string;
  distanceKm?: number;
  studentName: string;
  classLevel: string;
  board: string;
  subjects: string[];
  mode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  budgetMin: number;
  budgetMax: number;
  rateType: "HOURLY" | "MONTHLY";
  days: string;
  timing: string;
  isDummy: true;
  generatedAt: string;
}

// ─── Mode label helper ────────────────────────────────────────────────────────

export const modeLabel: Record<string, string> = {
  ONLINE:   "Online",
  OFFLINE:  "In-Person",
  EITHER:   "Online / In-Person",
  COACHING: "Coaching Institute",
};
