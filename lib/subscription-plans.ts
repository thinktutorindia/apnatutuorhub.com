export type SubscriptionPlanId = "STARTER" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

/**
 * SINGLE SOURCE OF TRUTH — ₹1,257 Commission Based Plan.
 *
 * Everything (bot replies, dashboard copy, wallet credit and plan metadata)
 * must read from this object. Unlock costs are FIXED by class band; tuition
 * fee never changes them. 60 coins = 6 primary OR 3 secondary OR 2 senior
 * unlocks, or any mix.
 */
export const COMMISSION_PLAN = {
  id: "STARTER" as const,
  priceInr: 1257,
  coins: 60,
  validityDays: 180,
  validityText: "6 Months",
  unlockCoins: {
    class1To8: 10,
    class9To10: 20,
    class11To12AndEntrance: 30,
  },
  coinSummary: "60 coins (6 primary / 3 secondary / 2 senior unlocks, or any mix)",
} as const;

/** One helper for every user-facing mention of the plan's coin allowance. */
export function commissionPlanCoinsText(): string {
  return COMMISSION_PLAN.coinSummary;
}

/** Wallet coins credited when a paid subscription is activated. */
export function planCoinCredit(planId?: string | null): number {
  const key = planId?.toUpperCase();
  if (key === COMMISSION_PLAN.id) return COMMISSION_PLAN.coins;
  if (key === "GOLD") return 50;
  if (key === "PLATINUM") return 100;
  return 0;
}

export interface ClassLeadQuota {
  classLevel: string;
  gradeRange: string;
  leadsCount: number;
  description: string;
  popularSubjects: string[];
  pointCost: number;
}

export interface FeeStructureQuota {
  feeBand: string;
  monthlyRange: string;
  leadsCount: number;
  pointCost: number;
  description: string;
  popularClasses: string[];
  badge: string;
}

export const TOTAL_PLAN_LEAD_POINTS = COMMISSION_PLAN.coins;

export function getPlanTotalPoints(planId?: string | null): number {
  if (!planId) return COMMISSION_PLAN.coins;
  const key = planId.toUpperCase();
  if (key === COMMISSION_PLAN.id) return COMMISSION_PLAN.coins; // 60 coins, fixed
  if (key === "BRONZE") return 60;    // Up to 6 leads (<₹3k: 6 leads, ₹3k-5k: 3 leads, >₹5k: 2 leads)
  if (key === "PLATINUM") return 1200; // 100 leads @ ~12 pts (Class 1–5 baseline)
  if (key === "GOLD") return 480;     // 40 leads @ ~12 pts
  if (key === "SILVER") return 120;   // 10 leads @ ~12 pts
  return COMMISSION_PLAN.coins;
}

export const GST_RATE = 0.18; // 18% GST applicable on digital / software services in India

/** Returns the GST amount (rounded to nearest rupee) for a given base price */
export function getGstAmount(basePrice: number): number {
  return Math.round(basePrice * GST_RATE);
}

/** Returns the GST-inclusive total (base + 18% GST) */
export function getPriceWithGst(basePrice: number): number {
  return basePrice + getGstAmount(basePrice);
}

export const CLASS_LEAD_DISTRIBUTION: ClassLeadQuota[] = [
  {
    classLevel: "Class 1–8",
    gradeRange: "Primary & Middle School",
    leadsCount: 6,
    pointCost: 10,
    description: "Unlock foundation & middle school leads (Monthly tuition about ₹3,600–₹4,800/mo)",
    popularSubjects: ["All Subjects", "Mathematics", "Science", "English", "Social Studies"],
  },
  {
    classLevel: "Class 9–10",
    gradeRange: "Secondary & Board Prep",
    leadsCount: 3,
    pointCost: 20,
    description: "Unlock secondary & board preparation leads (Hourly rate about ₹320–₹400/hr)",
    popularSubjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English"],
  },
  {
    classLevel: "Class 11–12 & Entrance",
    gradeRange: "Senior Secondary / JEE / NEET",
    leadsCount: 2,
    pointCost: 30,
    description: "Unlock senior secondary & competitive exam leads (Hourly rate about ₹450–₹620/hr)",
    popularSubjects: ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Coding"],
  },
];

/**
 * Lead quota breakdown. Unlock costs are FIXED by class band — the tuition
 * fee is display-only and never changes coin cost.
 */
export const FEE_STRUCTURE_DISTRIBUTION: FeeStructureQuota[] = [
  {
    feeBand: "Class 1–8 (Primary & Middle)",
    monthlyRange: "Monthly Tuition · about ₹6,000 – ₹7,600 / mo",
    leadsCount: 6,
    pointCost: 10,
    description: "Unlock up to 6 foundation & middle school leads (Class 1–8 all subjects, monthly billing)",
    popularClasses: ["Class 1–5", "Class 6–8", "All Subjects", "Foundation"],
    badge: "⚡ Up to 6 Leads",
  },
  {
    feeBand: "Class 9–10 (Secondary & Board)",
    monthlyRange: "Hourly Rate · about ₹700 – ₹850 / hr",
    leadsCount: 3,
    pointCost: 20,
    description: "Unlock up to 3 board exam preparation leads (Class 9 & 10 Maths, Science, English)",
    popularClasses: ["Class 9", "Class 10", "CBSE Board", "ICSE Board"],
    badge: "⚡ Up to 3 Leads",
  },
  {
    feeBand: "Class 11–12 & Competitive",
    monthlyRange: "Hourly Rate · about ₹850 – ₹1,050 / hr",
    leadsCount: 2,
    pointCost: 30,
    description: "Unlock up to 2 high-ticket senior secondary & entrance leads (Class 11–12 PCB/PCM, JEE, NEET, Coding)",
    popularClasses: ["Class 11–12", "IIT-JEE / NEET", "Commerce / Accounts", "Coding / Tech"],
    badge: "⚡ Up to 2 Leads",
  },
];

/** Kept for compatibility with admin fee displays; coin cost is no longer fee-derived. */
export const HOURLY_CLASSES_PER_MONTH = 12;
/** ₹2,999 Growth Plan (No Commission) wallet. */
export const GROWTH_PLAN_PRICE_INR = 2999;
export const GROWTH_PLAN_COINS = 60;

/**
 * DEPRECATED compatibility shim. Fee/budget never changes unlock cost.
 * Use getLeadPointCost(classLevel) for every new caller.
 */
export function coinCostFromTuitionFee(opts: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: "MONTHLY" | "HOURLY";
  classLevel?: string | null;
}): number {
  void opts.budgetMin;
  void opts.budgetMax;
  void opts.rateType;
  return getLeadPointCost(opts.classLevel);
}

function coinCostFromClass(classGrade?: string | null): number {
  const gradeStr = (classGrade || "").toLowerCase();
  const numMatch = gradeStr.match(/\b(\d{1,2})\b/);
  const gradeNum = numMatch ? parseInt(numMatch[1], 10) : null;

  if (
    (gradeNum !== null && gradeNum >= 11) ||
    gradeStr.includes("jee") ||
    gradeStr.includes("neet") ||
    gradeStr.includes("cuet") ||
    gradeStr.includes("entrance") ||
    gradeStr.includes("senior") ||
    gradeStr.includes("iit") ||
    gradeStr.includes("coding")
  ) {
    return COMMISSION_PLAN.unlockCoins.class11To12AndEntrance;
  }

  if (
    (gradeNum !== null && (gradeNum === 9 || gradeNum === 10)) ||
    gradeStr.includes("board") ||
    gradeStr.includes("secondary") ||
    gradeStr.includes("metric") ||
    gradeStr.includes("matric")
  ) {
    return COMMISSION_PLAN.unlockCoins.class9To10;
  }

  return COMMISSION_PLAN.unlockCoins.class1To8;
}

/**
 * Lead unlock cost — FIXED by class band, independent of fee/budget.
 * 1–8: 10 · 9–10: 20 · 11–12 / entrance: 30.
 */
export function getLeadPointCost(
  classGrade?: string | null,
  budgetMin?: number | null,
  budgetMax?: number | null
): number {
  // Universal published rates: Class 1-8 = 10, Class 9-10 = 20,
  // Class 11-12 / entrance = 30 coins. Budget never changes this.
  return coinCostFromClass(classGrade);
}

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  /** Discounted / festival price tutors will be charged */
  priceInr: number;
  /** Original (pre-discount) price for display strikethrough */
  originalPriceInr?: number;
  /** Festival discount percentage e.g. 90, 50, 25 */
  festivalDiscountPct?: number;
  /** Festival badge label e.g. "90% OFF" */
  festivalBadge?: string;
  totalLeads: number;
  totalPoints: number;
  monthlyLeads: number; // Kept for backwards compatibility
  validityDays: number;
  validityText: string;
  maxTutorsPerLead: number;
  competitionLabel: string;
  exclusivityType: "SHARED_5" | "SHARED_3" | "SEMI_EXCLUSIVE_2" | "EXCLUSIVE_1" | "SOLO_1";
  exclusivityBadge: string;
  priorityLabel: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  popular?: boolean;
  features: string[];
  classBreakdown: ClassLeadQuota[];
  feeBreakdown?: FeeStructureQuota[];
  termsNote: string;
  /** Whether this is the festival starter pass (₹99) */
  isStarterPass?: boolean;
  /** Commission terms note for starter pass */
  commissionNote?: string;
  /** If true, GST is not applicable on this plan (e.g. the ₹99 festival pass) */
  noGst?: boolean;
  /** If true, this tier is hidden from tutor-facing pricing displays */
  isHidden?: boolean;
  /** Whether this plan is an exclusive retargeting / follow-up offer */
  isSpecialRetargetingOffer?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
  STARTER: {
    id: COMMISSION_PLAN.id,
    name: "Commission Based Plan",
    priceInr: COMMISSION_PLAN.priceInr,
    originalPriceInr: 2500,
    festivalDiscountPct: 50,
    festivalBadge: "COMMISSION PLAN",
    totalLeads: COMMISSION_PLAN.coins / COMMISSION_PLAN.unlockCoins.class1To8,
    totalPoints: COMMISSION_PLAN.coins,
    monthlyLeads: COMMISSION_PLAN.coins / COMMISSION_PLAN.unlockCoins.class1To8,
    validityDays: COMMISSION_PLAN.validityDays,
    validityText: `Valid for ${COMMISSION_PLAN.validityText}`,
    maxTutorsPerLead: 3,
    competitionLabel: "Low Competition (Shared with max 3 tutors)",
    exclusivityType: "SHARED_3",
    exclusivityBadge: "👥 Low Competition (Max 3 Tutors)",
    priorityLabel: "Verified Priority",
    badge: "🤝 Commission Based Plan",
    badgeBg: "bg-emerald-100 border-emerald-300",
    badgeText: "text-emerald-950 font-black",
    cardBorder: "border-emerald-500 shadow-xl ring-2 ring-emerald-500/25",
    isStarterPass: false,
    noGst: true,
    isHidden: false,
    isSpecialRetargetingOffer: false,
    commissionNote: "50% Commission of 1st Month + 5% Every Month from 2nd Month onwards",
    features: [
      `✅ ${COMMISSION_PLAN.coinSummary} Unlock`,
      "📅 6 Months Validity (180 Days)",
      "🤝 50% Commission on 1st Month Tuition Fee",
      "🔄 5% Commission Every Month (from 2nd month onwards)",
      "📍 5km In-Person Nearby or Online Mode",
      "Full Parent Contact Info (Direct Phone & Address)",
      "Instant Demo Booking Support",
      "24/7 Dedicated Support Desk",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
    feeBreakdown: FEE_STRUCTURE_DISTRIBUTION,
    termsNote: `₹${COMMISSION_PLAN.priceInr} registration fee. Valid for ${COMMISSION_PLAN.validityText.toLowerCase()}. Credits ${COMMISSION_PLAN.coinSummary}. Platform commission: 50% on 1st month tuition fee, and 5% commission every month from 2nd month onwards.`,
  },
  BRONZE: {
    id: "BRONZE",
    name: "Growth Plan (0% Commission)",
    priceInr: 2999,
    originalPriceInr: 5999,
    festivalDiscountPct: 50,
    festivalBadge: "50% OFF",
    totalLeads: 6,
    totalPoints: 60,
    monthlyLeads: 6,
    validityDays: 30,
    validityText: "Valid for 30 Days",
    maxTutorsPerLead: 3,
    competitionLabel: "Low Competition (Shared with max 3 tutors)",
    exclusivityType: "SHARED_3",
    exclusivityBadge: "👥 Low Competition (Max 3 Tutors)",
    priorityLabel: "Standard Priority",
    badge: "Zero Commission Plan 🚀",
    badgeBg: "bg-blue-100 border-blue-300",
    badgeText: "text-blue-950 font-bold",
    cardBorder: "border-blue-400 shadow-xl ring-2 ring-blue-400/25",
    popular: false,
    isHidden: true,
    termsNote: "Up to 6 Verified Leads allocated by universal fee structure. Valid for 30 days. Shared with max 3 tutors. 0% platform commission.",
    features: [
      "✅ Up to 6 Verified Leads by fee structure",
      "🎉 0% Platform Commission (No commission — keep 100% of student fees!)",
      "👥 Low Competition: Max 3 tutors per lead",
      "Full Parent Contact Info (Direct Phone & Address)",
      "Expanded Matching Radius (up to 15 km)",
      "24/7 Dedicated Support Desk",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
    feeBreakdown: FEE_STRUCTURE_DISTRIBUTION,
  },
  SILVER: {
    id: "SILVER",
    name: "Silver Plan (0% Commission)",
    priceInr: 2999,
    originalPriceInr: 5999,
    festivalDiscountPct: 50,
    festivalBadge: "50% OFF",
    totalLeads: 10,
    totalPoints: 120,
    monthlyLeads: 10,
    validityDays: 90,
    validityText: "Valid for 90 Days",
    maxTutorsPerLead: 3,
    competitionLabel: "Low Competition (Shared with max 3 tutors)",
    exclusivityType: "SHARED_3",
    exclusivityBadge: "👥 Low Competition (Max 3 Tutors)",
    priorityLabel: "Standard Priority",
    badge: "Discontinued Plan",
    badgeBg: "bg-gray-100 border-gray-300",
    badgeText: "text-gray-600 font-bold",
    cardBorder: "border-gray-300 opacity-60",
    popular: false,
    isHidden: true,
    termsNote: "10 Verified Leads* unlocked with 0% platform commission. Valid for 90 days. Shared with max 3 tutors.",
    features: [
      "✅ 10 Verified Leads Unlock*",
      "🎉 0% Platform Commission (Keep 100% of student fees!)",
      "👥 Low Competition: Max 3 tutors per lead",
      "📅 Valid for 90 Days",
      "Unlock across all classes & subjects",
      "Full Parent Contact Info (Direct Phone & Address)",
      "Expanded Matching Radius (up to 15 km)",
      "Direct Parent Chat & Call Option",
      "Verified Tutor Badge on Profile",
      "24/7 Dedicated Support Desk",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
    feeBreakdown: FEE_STRUCTURE_DISTRIBUTION,
  },
  GOLD: {
    id: "GOLD",
    name: "Gold Plan",
    priceInr: 9000,
    originalPriceInr: 12000,
    festivalDiscountPct: 25,
    festivalBadge: "25% OFF",
    totalLeads: 40,
    totalPoints: 480,
    monthlyLeads: 40,
    validityDays: 120,
    validityText: "Valid for 120 Days",
    maxTutorsPerLead: 2,
    competitionLabel: "Semi-Exclusive (Max 2 tutors per lead)",
    exclusivityType: "SEMI_EXCLUSIVE_2",
    exclusivityBadge: "🔒 Semi-Exclusive (Max 2 Tutors)",
    priorityLabel: "High Priority",
    badge: "Discontinued Tier",
    badgeBg: "bg-gray-100 border-gray-300",
    badgeText: "text-gray-600 font-bold",
    cardBorder: "border-gray-300 opacity-60",
    isHidden: true,
    termsNote: "40 Verified Leads* (Class 1–5: 40, 6–8: 32, 9–10: 24, 11–12: 16, or mix). Valid for 120 days. Semi-exclusive: Max 2 tutors.",
    features: [
      "40 Verified Leads*",
      "Valid for 120 Days",
      "🔒 Semi-Exclusive: Max 2 tutors per lead",
      "Unlock across all classes & subjects",
      "High Priority Candidate Feed (+3,000 Ranking Boost)",
      "Instant WhatsApp Notifications for New Leads",
      "Expanded Matching Radius (up to 25 km)",
      "⭐ Featured Tutor Search Placement",
      "Highlighted Gold Profile Badge",
      "🪙 +50 Free Bonus Wallet Coins",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
  },
  PLATINUM: {
    id: "PLATINUM",
    name: "Platinum VIP Plan",
    priceInr: 18000,
    originalPriceInr: 24000,
    festivalDiscountPct: 25,
    festivalBadge: "25% OFF",
    totalLeads: 100,
    totalPoints: 1200,
    monthlyLeads: 100,
    validityDays: 180,
    validityText: "Valid for 180 Days",
    maxTutorsPerLead: 1,
    competitionLabel: "👑 100% Exclusive Solo Lead (1 Tutor Only — Closes Instantly)",
    exclusivityType: "EXCLUSIVE_1",
    exclusivityBadge: "👑 100% Exclusive Solo (1 Tutor Only)",
    priorityLabel: "🥇 First Priority Client Leads",
    badge: "Discontinued VIP Tier",
    badgeBg: "bg-gray-100 border-gray-300",
    badgeText: "text-gray-600 font-bold",
    cardBorder: "border-gray-300 opacity-60",
    isHidden: true,
    termsNote: "100 High-Value Leads* (Class 1–5: 100, 6–8: 80, 9–10: 60, 11–12: 40, or mix). Valid for 180 days. 100% Exclusive Solo Lead Lock: Once unlocked by a Platinum VIP tutor, the lead is immediately closed and locked. No other tutor can contact the parent.",
    features: [
      "100 High-Value Leads*",
      "Valid for 180 Days",
      "👑 100% Exclusive Solo Lead (1 Tutor Only — Closes instantly upon unlock)",
      "Unlock across all classes, boards & entrance tests",
      "🥇 First Priority Access on All Client Leads (+10,000 Ranking Boost)",
      "VIP Fast-Track Parent Matching & Top #1 Placement",
      "🌐 Unlimited City-wide & Online Tuition Radius",
      "Dedicated Relationship Manager & VIP Support",
      "⭐ 1-on-1 Profile Optimization & Bio Polish",
      "🪙 +100 Free Bonus Wallet Coins",
      "📞 24/7 VIP Phone & WhatsApp Helpline",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
  },
};

export function getSubscriptionPlan(id: string): SubscriptionPlanConfig | null {
  const key = id.toUpperCase() as SubscriptionPlanId;
  return SUBSCRIPTION_PLANS[key] ?? null;
}
