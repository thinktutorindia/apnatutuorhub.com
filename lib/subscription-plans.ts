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
      "30 Verified Leads / month (360/yr)",
      "Full Parent Contact Info (Phone & Address)",
      "Expanded Matching Radius (up to 15 km)",
      "Direct Parent Chat & Call",
      "Verified Tutor Badge on Profile",
      "Priority Feed Placement (+1,500 Ranking Boost)",
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
      "40 Verified Leads / month (480/yr)",
      "High Priority Candidate Feed (+3,000 Ranking Boost)",
      "Instant WhatsApp Notifications for New Leads",
      "Expanded Matching Radius (up to 25 km)",
      "⭐ Featured Tutor Search & Homepage Placement",
      "Highlighted Gold Profile Badge",
      "🪙 +50 Free Bonus Wallet Coins",
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
      "50 Verified Leads / month (600/yr)",
      "🥇 First Priority Access on All Client Leads (+10,000 Ranking Boost)",
      "VIP Fast-Track Parent Matching",
      "Top #1 Position on Search & Recommendation Lists",
      "🌐 Unlimited City-wide & Online Tuition Radius",
      "Dedicated Relationship Manager & Support",
      "⭐ 1-on-1 Profile Optimization & Bio Polish",
      "🪙 +100 Free Bonus Wallet Coins",
      "📞 24/7 VIP Phone & WhatsApp Helpline",
    ],
  },
};

export function getSubscriptionPlan(id: string): SubscriptionPlanConfig | null {
  const key = id.toUpperCase() as SubscriptionPlanId;
  return SUBSCRIPTION_PLANS[key] ?? null;
}
