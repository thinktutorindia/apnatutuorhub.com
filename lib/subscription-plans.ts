export type SubscriptionPlanId = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  priceInr: number;
  monthlyLeads: number;
  priorityLabel: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  popular?: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
  BRONZE: {
    id: "BRONZE",
    name: "Bronze Plan",
    priceInr: 6000,
    monthlyLeads: 20,
    priorityLabel: "Standard Priority",
    badge: "Bronze Tier",
    badgeBg: "bg-amber-100 border-amber-300",
    badgeText: "text-amber-950",
    cardBorder: "border-slate-200",
    features: [
      "20 Verified Leads / month",
      "Full Parent Contact Info (Phone & Address)",
      "Distance Radius Matching (up to 10 km)",
      "Standard Client Feed Access",
      "24/7 Support Desk",
    ],
  },
  SILVER: {
    id: "SILVER",
    name: "Silver Plan",
    priceInr: 9000,
    monthlyLeads: 30,
    priorityLabel: "Standard Priority",
    badge: "Silver Tier",
    badgeBg: "bg-slate-200 border-slate-400",
    badgeText: "text-slate-900",
    cardBorder: "border-slate-300",
    features: [
      "30 Verified Leads / month",
      "Full Parent Contact Info (Phone & Address)",
      "Expanded Matching Radius (up to 15 km)",
      "Direct Parent Chat & Call",
      "Verified Tutor Badge on Profile",
    ],
  },
  GOLD: {
    id: "GOLD",
    name: "Gold Plan",
    priceInr: 12000,
    monthlyLeads: 40,
    priorityLabel: "High Priority",
    badge: "Most Popular 🔥",
    badgeBg: "bg-yellow-100 border-yellow-400",
    badgeText: "text-yellow-950 font-black",
    cardBorder: "border-yellow-400 shadow-lg ring-2 ring-yellow-400/20",
    popular: true,
    features: [
      "40 Verified Leads / month",
      "High Priority Application Feed",
      "Instant WhatsApp Notifications for New Leads",
      "Full Parent Contact Info (Phone & Address)",
      "Highlighted Profile in Search Results",
    ],
  },
  PLATINUM: {
    id: "PLATINUM",
    name: "Platinum VIP Plan",
    priceInr: 24000,
    monthlyLeads: 50,
    priorityLabel: "🥇 First Priority Client Leads",
    badge: "VIP First Priority 👑",
    badgeBg: "bg-purple-100 border-purple-400",
    badgeText: "text-purple-950 font-black",
    cardBorder: "border-purple-500 shadow-xl ring-2 ring-purple-500/30",
    features: [
      "50 Verified Leads / month",
      "🥇 First Priority Access to New Client Leads",
      "VIP Fast-Track Parent Matching",
      "Top #1 Position on Search & Recommendation Lists",
      "Dedicated Relationship Manager & Support",
      "Exclusive Premium Home & Online Leads",
    ],
  },
};

export function getSubscriptionPlan(id: string): SubscriptionPlanConfig | null {
  const key = id.toUpperCase() as SubscriptionPlanId;
  return SUBSCRIPTION_PLANS[key] ?? null;
}
