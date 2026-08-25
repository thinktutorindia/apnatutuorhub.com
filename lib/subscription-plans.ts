export type SubscriptionPlanId = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface ClassLeadQuota {
  classLevel: string;
  gradeRange: string;
  leadsCount: number;
  description: string;
  popularSubjects: string[];
  pointCost: number;
}

export const TOTAL_PLAN_LEAD_POINTS = 120; // Default fallback for Bronze

export function getPlanTotalPoints(planId?: string | null): number {
  if (!planId) return 120;
  const key = planId.toUpperCase();
  if (key === "PLATINUM") return 360; // 30 Class 1-5 leads, 24 Class 6-8, 18 Class 9-10, 12 Class 11-12
  if (key === "GOLD") return 240;     // 20 Class 1-5 leads, 16 Class 6-8, 12 Class 9-10, 8 Class 11-12
  if (key === "SILVER") return 180;   // 15 Class 1-5 leads, 12 Class 6-8, 9 Class 9-10, 6 Class 11-12
  return 120;                         // 10 Class 1-5 leads, 8 Class 6-8, 6 Class 9-10, 4 Class 11-12 (Bronze)
}

export const CLASS_LEAD_DISTRIBUTION: ClassLeadQuota[] = [
  {
    classLevel: "Class 1–5",
    gradeRange: "Primary & Foundation",
    leadsCount: 10,
    pointCost: 12,
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

export function getLeadPointCost(classGrade?: string | null): number {
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
  return 12;
}

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  priceInr: number;
  totalLeads: number;
  totalPoints: number;
  monthlyLeads: number; // Kept for backwards compatibility
  validityDays: number;
  validityText: string;
  maxTutorsPerLead: number;
  competitionLabel: string;
  exclusivityType: "SHARED_5" | "SHARED_3" | "SEMI_EXCLUSIVE_2" | "EXCLUSIVE_1";
  exclusivityBadge: string;
  priorityLabel: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  popular?: boolean;
  features: string[];
  classBreakdown: ClassLeadQuota[];
  termsNote: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
  BRONZE: {
    id: "BRONZE",
    name: "Bronze Plan",
    priceInr: 6000,
    totalLeads: 10,
    totalPoints: 120,
    monthlyLeads: 10,
    validityDays: 30,
    validityText: "Valid for 1 Month",
    maxTutorsPerLead: 5,
    competitionLabel: "Shared Leads (Sent to max 5 tutors)",
    exclusivityType: "SHARED_5",
    exclusivityBadge: "👥 Shared (Max 5 Tutors)",
    priorityLabel: "Standard Priority",
    badge: "Bronze Tier",
    badgeBg: "bg-amber-100 border-amber-300",
    badgeText: "text-amber-950",
    cardBorder: "border-slate-200",
    termsNote: "10 Verified Leads* (Class 1–5: 10, 6–8: 8, 9–10: 6, 11–12: 4, or mix). Valid for 1 month. Leads shared with max 5 tutors.",
    features: [
      "10 Verified Leads*",
      "Valid for 1 Month",
      "👥 Shared with up to 5 tutors",
      "Unlock across all classes & subjects",
      "Full Parent Contact Info (Direct Phone & Address)",
      "Distance Radius Matching (up to 10 km)",
      "Standard Client Feed Access",
      "24/7 Support Desk",
    ],
    classBreakdown: CLASS_LEAD_DISTRIBUTION,
  },
  SILVER: {
    id: "SILVER",
    name: "Silver Plan",
    priceInr: 9000,
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
    priceInr: 12000,
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
    popular: true,
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
    priceInr: 24000,
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
