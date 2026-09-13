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
  if (key === "STARTER") return 30;   // 1 lead of any class (max 30 pts for Class 11-12/Entrance)
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
    classLevel: "Class 1–5",
    gradeRange: "Primary & Foundation",
    leadsCount: 10,
    pointCost: 10,
    description: "Unlock foundation leads for all primary subjects & phonics (10–30 leads by plan)",
    popularSubjects: ["All Subjects", "Maths", "English", "Science", "EVS"],
  },
  {
    classLevel: "Class 6–8",
    gradeRange: "Middle School",
    leadsCount: 8,
    pointCost: 15,
    description: "Unlock middle school leads for core academic subjects (8–24 leads by plan)",
    popularSubjects: ["Mathematics", "Science", "English", "Social Science", "Hindi"],
  },
  {
    classLevel: "Class 9–10",
    gradeRange: "Secondary & Board Prep",
    leadsCount: 6,
    pointCost: 20,
    description: "Unlock board examination preparation leads (6–18 leads by plan)",
    popularSubjects: ["Maths Standard/Basic", "Physics", "Chemistry", "Biology", "English"],
  },
  {
    classLevel: "Class 11–12 & Entrance",
    gradeRange: "Senior Secondary / JEE / NEET",
    leadsCount: 4,
    pointCost: 30,
    description: "Unlock high-ticket senior secondary, JEE, NEET & CUET leads (4–12 leads by plan)",
    popularSubjects: ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Economics"],
  },
];

/**
 * Dynamic Lead Quota Breakdown by Tuition Fee Structure for ₹999 Growth Plan (60 pts total)
 */
export const FEE_STRUCTURE_DISTRIBUTION: FeeStructureQuota[] = [
  {
    feeBand: "Lower Fee Leads",
    monthlyRange: "Under ₹3,000 / month",
    leadsCount: 6,
    pointCost: 10,
    description: "Unlock up to 6 foundation & primary tuition leads (Nursery, KG, Class 1–5, Single Subjects, or basic tuition)",
    popularClasses: ["Class 1–5", "Nursery / KG", "Spoken English", "Basic Maths"],
    badge: "⚡ Up to 6 Leads",
  },
  {
    feeBand: "Standard Fee Leads",
    monthlyRange: "₹3,000 – ₹5,000 / month",
    leadsCount: 3,
    pointCost: 20,
    description: "Unlock up to 3 standard middle & secondary tuition leads (Class 6–10 core academic subjects)",
    popularClasses: ["Class 6–8", "Class 9–10", "Board Preparation", "Science & Maths"],
    badge: "⚡ Up to 3 Leads",
  },
  {
    feeBand: "Higher / High-Ticket Leads",
    monthlyRange: "Above ₹5,000 / month",
    leadsCount: 2,
    pointCost: 30,
    description: "Unlock up to 2 high-ticket senior secondary & competitive exam leads (Class 11–12, JEE, NEET, CUET)",
    popularClasses: ["Class 11–12", "IIT-JEE / NEET", "Commerce / Accounts", "CUET Prep"],
    badge: "⚡ Up to 2 Leads",
  },
];

/**
 * Calculates lead point deduction based on student fee structure (budget) or class level fallback.
 */
export function getLeadPointCost(
  classGrade?: string | null,
  budgetMin?: number | null,
  budgetMax?: number | null
): number {
  // 1. If explicit monthly fee/budget is known, use fee-based pricing
  const effectiveBudget = (budgetMax && budgetMax > 0)
    ? budgetMax
    : (budgetMin && budgetMin > 0)
      ? budgetMin
      : null;

  if (effectiveBudget !== null) {
    if (effectiveBudget > 5000) return 30; // High ticket (> ₹5,000/mo)
    if (effectiveBudget >= 3000) return 20; // Medium / Standard (₹3,000 – ₹5,000/mo)
    return 10; // Low fee (< ₹3,000/mo)
  }

  // 2. Fallback to classGrade heuristic when fee is unspecified
  if (!classGrade) return 15;
  const lower = classGrade.toLowerCase();
  if (
    lower.includes("11") ||
    lower.includes("12") ||
    lower.includes("jee") ||
    lower.includes("neet") ||
    lower.includes("cuet") ||
    lower.includes("entrance") ||
    lower.includes("senior") ||
    lower.includes("iit")
  ) {
    return 30;
  }
  if (
    lower.includes("9") ||
    lower.includes("10") ||
    lower.includes("board") ||
    lower.includes("secondary") ||
    lower.includes("metric") ||
    lower.includes("matric")
  ) {
    return 20;
  }
  if (
    lower.includes("6") ||
    lower.includes("7") ||
    lower.includes("8") ||
    lower.includes("middle")
  ) {
    return 15;
  }
  // Class 1-5 / Primary / Nursery / Kindergarten
  return 10;
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
    name: "Limited-Time Trial Pass",
    priceInr: 99,
    originalPriceInr: 999,
    festivalDiscountPct: 90,
    festivalBadge: "SPECIAL DEAL",
    totalLeads: 1,
    totalPoints: 30,
    monthlyLeads: 1,
    validityDays: 30,
    validityText: "Valid for 30 Days",
    maxTutorsPerLead: 5,
    competitionLabel: "Shared Lead (max 5 tutors)",
    exclusivityType: "SHARED_5",
    exclusivityBadge: "👥 Shared (Max 5 Tutors)",
    priorityLabel: "Standard",
    badge: "⏰ Limited-Time Retargeting Deal",
    badgeBg: "bg-orange-100 border-orange-300",
    badgeText: "text-orange-950",
    cardBorder: "border-orange-400 shadow-xl ring-2 ring-orange-400/30",
    isStarterPass: true,
    noGst: true,
    isHidden: true,
    isSpecialRetargetingOffer: true,
    commissionNote: "50% Commission from 1st Month Tuition Fee",
    features: [
      "✅ 1 Verified Lead of Your Choice",
      "📚 ANY class: 1–12, Boards, Entrance",
      "📍 ANY location or Online",
      "Full Parent Contact Info (Phone & Address)",
      "🤝 50% Commission on 1st Month Fee",
      "Valid for 30 Days",
      "24/7 Support Desk",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
    feeBreakdown: FEE_STRUCTURE_DISTRIBUTION,
    termsNote: "1 Verified Lead for ANY class. 50% platform commission on 1st month tuition fee. Valid for 30 days.",
  },
  BRONZE: {
    id: "BRONZE",
    name: "Growth Plan",
    priceInr: 999,
    originalPriceInr: 2999,
    festivalDiscountPct: 67,
    festivalBadge: "67% OFF",
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
    badge: "Best Value Growth 🚀",
    badgeBg: "bg-blue-100 border-blue-300",
    badgeText: "text-blue-950 font-bold",
    cardBorder: "border-blue-400 shadow-xl ring-2 ring-blue-400/25",
    popular: true,
    termsNote: "Up to 6 Verified Leads allocated according to student fee structure (Fees < ₹3k: 6 leads, Fees ₹3k–₹5k: 3 leads, Fees > ₹5k: 2 leads, or mixed). Valid for 30 days. Shared with max 3 tutors.",
    features: [
      "✅ Up to 6 Verified Leads by fee structure",
      "💰 Fees < ₹3,000/mo: Up to 6 Leads",
      "📈 Fees ₹3,000–₹5,000/mo: Up to 3 Leads",
      "⭐ Fees > ₹5,000/mo: Up to 2 Leads",
      "🎉 0% Platform Commission (Keep 100%)",
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
    name: "Silver Plan",
    priceInr: 6750,
    originalPriceInr: 9000,
    festivalDiscountPct: 25,
    festivalBadge: "25% OFF",
    totalLeads: 15,
    totalPoints: 180,
    monthlyLeads: 15,
    validityDays: 60,
    validityText: "Valid for 2 Months",
    maxTutorsPerLead: 3,
    competitionLabel: "Low Competition (Shared with max 3 tutors)",
    exclusivityType: "SHARED_3",
    exclusivityBadge: "👥 Low Competition (Max 3 Tutors)",
    priorityLabel: "Standard Priority",
    badge: "Silver Tier",
    badgeBg: "bg-slate-200 border-slate-400",
    badgeText: "text-slate-900",
    cardBorder: "border-slate-300",
    isHidden: true,
    termsNote: "15 Verified Leads* (Class 1–5: 15, 6–8: 12, 9–10: 9, 11–12: 6, or mix). Valid for 2 months. Shared with max 3 tutors.",
    features: [
      "15 Verified Leads*",
      "Valid for 2 Months",
      "👥 Low Competition: Max 3 tutors per lead",
      "Unlock across all classes & subjects",
      "Full Parent Contact Info (Direct Phone & Address)",
      "Expanded Matching Radius (up to 15 km)",
      "Direct Parent Chat & Call Option",
      "Verified Tutor Badge on Profile",
      "Priority Feed Placement (+1,500 Ranking Boost)",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
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
    isHidden: true,
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
    isHidden: true,
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
