export type SubscriptionPlanId = "STARTER" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

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

export const TOTAL_PLAN_LEAD_POINTS = 60; // Default fallback for Growth Plan

export function getPlanTotalPoints(planId?: string | null): number {
  if (!planId) return 60;
  const key = planId.toUpperCase();
  if (key === "STARTER") return 50;   // 5 leads (10 pts each, 5 leads total)
  if (key === "BRONZE") return 60;    // Up to 6 leads (<₹3k: 6 leads, ₹3k-5k: 3 leads, >₹5k: 2 leads)
  if (key === "PLATINUM") return 360; // Legacy 30 Class 1-5 leads
  if (key === "GOLD") return 240;     // Legacy 20 Class 1-5 leads
  if (key === "SILVER") return 180;   // Legacy 15 Class 1-5 leads
  return 60;
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
 * Dynamic Lead Quota Breakdown by Tuition Fee Structure for ₹2,999 Growth Plan (60 pts total)
 * Lead unlock cost corresponds to fair ~5% of one month's student fee.
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

/** Hourly quotes are turned into one month before the 5% coin charge. */
export const HOURLY_CLASSES_PER_MONTH = 12;
/** ₹2,999 Growth Plan (No Commission) wallet. 5% of the fee is priced in these coins, never above the whole plan. */
export const GROWTH_PLAN_PRICE_INR = 2999;
export const GROWTH_PLAN_COINS = 60;

/**
 * Unlock coins are 5% of the tuition fee, priced inside the ₹2,999 plan (60 coins).
 * Hourly fees become a month first (rate × 12). One lead never costs more than 60 coins.
 * Class is used only when no fee amount is present.
 */
export function coinCostFromTuitionFee(opts: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: "MONTHLY" | "HOURLY";
  classLevel?: string | null;
}): number {
  const min = opts.budgetMin && opts.budgetMin > 0 ? opts.budgetMin : 0;
  const max = opts.budgetMax && opts.budgetMax > 0 ? opts.budgetMax : 0;
  const fee = min && max ? Math.round((min + max) / 2) : max || min;
  if (!fee) return coinCostFromClass(opts.classLevel);

  const rateType = opts.rateType ?? (fee < 2000 ? "HOURLY" : "MONTHLY");
  const monthly = rateType === "HOURLY" ? fee * HOURLY_CLASSES_PER_MONTH : fee;
  const coins = Math.round((monthly * 0.05 * GROWTH_PLAN_COINS) / GROWTH_PLAN_PRICE_INR);
  return Math.min(GROWTH_PLAN_COINS, Math.max(1, coins));
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
    return 30;
  }

  if (
    (gradeNum !== null && (gradeNum === 9 || gradeNum === 10)) ||
    gradeStr.includes("board") ||
    gradeStr.includes("secondary") ||
    gradeStr.includes("metric") ||
    gradeStr.includes("matric")
  ) {
    return 20;
  }

  return 10;
}

/**
 * Lead unlock cost. A fee amount wins: coins are 5% of that fee.
 * Class buckets apply only when the lead has no fee.
 */
export function getLeadPointCost(
  classGrade?: string | null,
  budgetMin?: number | null,
  budgetMax?: number | null
): number {
  if ((budgetMin && budgetMin > 0) || (budgetMax && budgetMax > 0)) {
    return coinCostFromTuitionFee({
      budgetMin,
      budgetMax,
      classLevel: classGrade,
    });
  }
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
    id: "STARTER",
    name: "Commission Based Plan",
    priceInr: 1257,
    originalPriceInr: 2500,
    festivalDiscountPct: 50,
    festivalBadge: "COMMISSION PLAN",
    totalLeads: 5,
    totalPoints: 50,
    monthlyLeads: 5,
    validityDays: 180,
    validityText: "Valid for 6 Months",
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
      "✅ 5 Verified Leads Unlock",
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
    termsNote: "₹1,257 registration fee. Valid for 6 months. Unlocks 5 verified leads. Platform commission: 50% on 1st month tuition fee, and 5% commission every month from 2nd month onwards.",
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
    totalLeads: 15,
    totalPoints: 60,
    monthlyLeads: 15,
    validityDays: 30,
    validityText: "Valid for 30 Days",
    maxTutorsPerLead: 3,
    competitionLabel: "Low Competition (Shared with max 3 tutors)",
    exclusivityType: "SHARED_3",
    exclusivityBadge: "👥 Low Competition (Max 3 Tutors)",
    priorityLabel: "Standard Priority",
    badge: "Zero Commission Tier 🚀",
    badgeBg: "bg-blue-100 border-blue-400",
    badgeText: "text-blue-950 font-black",
    cardBorder: "border-blue-400 shadow-xl ring-2 ring-blue-400/25",
    popular: true,
    isHidden: false,
    termsNote: "15 Verified Leads* unlocked with 0% platform commission. Valid for 30 days. Shared with max 3 tutors.",
    features: [
      "✅ 15 Verified Leads Unlock*",
      "🎉 0% Platform Commission (Keep 100% of student fees!)",
      "👥 Low Competition: Max 3 tutors per lead",
      "📅 Valid for 30 Days",
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
    totalLeads: 20,
    totalPoints: 240,
    monthlyLeads: 20,
    validityDays: 60,
    validityText: "Valid for 2 Months",
    maxTutorsPerLead: 2,
    competitionLabel: "Semi-Exclusive (Max 2 tutors per lead)",
    exclusivityType: "SEMI_EXCLUSIVE_2",
    exclusivityBadge: "🔒 Semi-Exclusive (Max 2 Tutors)",
    priorityLabel: "High Priority",
    badge: "Most Popular 🔥",
    badgeBg: "bg-yellow-100 border-yellow-400",
    badgeText: "text-yellow-950 font-black",
    cardBorder: "border-yellow-400 shadow-lg ring-2 ring-yellow-400/20",
    isHidden: false,
    termsNote: "20 Verified Leads* (Class 1–5: 20, 6–8: 16, 9–10: 12, 11–12: 8, or mix). Valid for 2 months. Semi-exclusive: Max 2 tutors.",
    features: [
      "20 Verified Leads*",
      "Valid for 2 Months",
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
    totalLeads: 30,
    totalPoints: 360,
    monthlyLeads: 30,
    validityDays: 90,
    validityText: "Valid for 3 Months",
    maxTutorsPerLead: 1,
    competitionLabel: "👑 100% Exclusive Solo Lead (1 Tutor Only — Closes Instantly)",
    exclusivityType: "EXCLUSIVE_1",
    exclusivityBadge: "👑 100% Exclusive Solo (1 Tutor Only)",
    priorityLabel: "🥇 First Priority Client Leads",
    badge: "VIP First Priority 👑",
    badgeBg: "bg-purple-100 border-purple-400",
    badgeText: "text-purple-950 font-black",
    cardBorder: "border-purple-500 shadow-xl ring-2 ring-purple-500/30",
    isHidden: false,
    termsNote: "30 High-Value Leads* (Class 1–5: 30, 6–8: 24, 9–10: 18, 11–12: 12, or mix). Valid for 3 months. 100% Exclusive Solo Lead Lock: Once unlocked by a Platinum VIP tutor, the lead is immediately closed and locked. No other tutor can contact the parent.",
    features: [
      "30 High-Value Leads*",
      "Valid for 3 Months",
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
