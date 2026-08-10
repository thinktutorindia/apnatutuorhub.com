"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check, ShieldCheck, Zap, Crown, ArrowLeft, Loader2, Award, Sparkles,
  Phone, MessageSquare, Star, ChevronDown, ChevronUp, Lock, RefreshCw
} from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/subscription-plans";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { LogoBrand } from "@/components/brand/Logo";

interface Props {
  currentPlan: string;
  expiresAt: string | null;
  leadsUsedThisMonth: number;
}

const FAQ_ITEMS = [
  {
    q: "How does the monthly lead limit work?",
    a: "Every month on your billing date, your lead quota resets automatically. For example, Platinum members receive 50 fresh verified parent leads every month (600 leads / year).",
  },
  {
    q: "What does Platinum 'First Priority Client Leads' mean?",
    a: "When a parent posts a new tuition requirement, Platinum VIP tutors receive the notification first and are ranked at the #1 top position on the candidate list before other tutors.",
  },
  {
    q: "Can I upgrade my plan mid-year?",
    a: "Yes! You can upgrade from Bronze, Silver, or Gold to Platinum anytime. The remaining balance of your current plan will be credited towards your upgrade.",
  },
  {
    q: "Are parent phone numbers and addresses verified?",
    a: "Yes, 100%. All student leads posted on ApnaTutorHub undergo OTP verification and location checks before appearing in your feed.",
  },
];

export function TutorPlansPageClient({ currentPlan, expiresAt, leadsUsedThisMonth }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activePlanKey = currentPlan.toUpperCase() as SubscriptionPlanId;
  const activePlanConfig = SUBSCRIPTION_PLANS[activePlanKey] ?? null;

  const handleSubscribe = async (planId: SubscriptionPlanId) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/tutor/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription order");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "ApnaTutorHub",
        description: `${SUBSCRIPTION_PLANS[planId].name} Annual Membership`,
        order_id: data.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/tutor/subscribe/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId,
            }),
          });

          if (verifyRes.ok) {
            window.location.href = "/tutor/dashboard?subscription=activated";
          } else {
            setErrorMessage("Payment verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#2D9E6B",
        },
      };

      const razorpayWindow = (window as any).Razorpay;
      if (razorpayWindow) {
        const rzp = new razorpayWindow(options);
        rzp.open();
      } else {
        alert(`Razorpay Checkout initialized for ${SUBSCRIPTION_PLANS[planId].name} (₹${SUBSCRIPTION_PLANS[planId].priceInr})`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <ActionOverlay
        isOpen={isLoading}
        title="Securing Your Membership"
        subtitle="Connecting to Razorpay secure payment gateway..."
      />

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden bg-[#0F2540] text-white rounded-3xl pt-10 pb-14 px-6 sm:px-10 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-gradient-to-br from-purple-500/20 via-emerald-500/20 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-gradient-to-tr from-amber-500/20 via-blue-500/20 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-yellow-300 text-xs font-black backdrop-blur-md shadow-sm">
            <Crown size={15} className="text-yellow-400 animate-pulse" />
            <span>Annual Membership Plans</span>
          </div>

          <h1
            className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Choose Your Growth Plan &amp; Win <span className="text-yellow-400">High-Value Leads</span>
          </h1>

          <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Get instant access to verified home tuition &amp; online student enquiries in your city. Upgrade to <strong className="text-purple-300 font-extrabold">Platinum VIP</strong> for <span className="underline decoration-yellow-400 underline-offset-4">🥇 #1 First Priority Client Leads</span>.
          </p>

          {/* Active Subscription Status Banner */}
          {activePlanConfig && (
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white/10 border border-emerald-400/40 backdrop-blur-md text-xs font-bold text-white mt-4 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Active Plan:</span>
                <span className="font-extrabold text-emerald-300 text-sm">{activePlanConfig.name}</span>
              </div>
              <div className="h-4 w-px bg-white/20 hidden sm:block" />
              <div className="text-slate-200">
                Leads Used: <strong className="text-white">{leadsUsedThisMonth}</strong> / {activePlanConfig.monthlyLeads} leads this month
              </div>
              {expiresAt && (
                <>
                  <div className="h-4 w-px bg-white/20 hidden sm:block" />
                  <div className="text-slate-300 text-[11px]">
                    Renews: {new Date(expiresAt).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Cards Container */}
      <div className="max-w-7xl mx-auto px-1 sm:px-2 pt-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-xl mx-auto mb-6">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-950 text-xs font-bold shadow-sm">
              {errorMessage}
            </div>
          </div>
        )}

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-4">
          {/* BRONZE PLAN */}
          <div className="rounded-3xl bg-white p-6 border-2 border-slate-200 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative group">
            <div className="space-y-5">
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 border border-amber-300 text-amber-950">
                  Bronze Tier
                </span>
                <h3 className="text-2xl font-black text-[#0F2540]">Bronze Plan</h3>
                <p className="text-xs font-bold text-slate-500">Essential entry tier for new tutors</p>
              </div>

              <div className="border-y border-slate-100 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹6,000</span>
                  <span className="text-xs font-extrabold text-slate-500">/ year</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                  <Zap size={13} className="text-[#2D9E6B]" />
                  <span>20 Verified Leads / month</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>20 Student Leads / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Full Parent Contact Details</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Distance Matching (up to 10 km)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Standard Support Desk</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "BRONZE"}
                onClick={() => handleSubscribe("BRONZE")}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md ${
                  currentPlan === "BRONZE"
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {currentPlan === "BRONZE" ? "Active Membership" : "Select Bronze Plan"}
              </button>
            </div>
          </div>

          {/* SILVER PLAN */}
          <div className="rounded-3xl bg-white p-6 border-2 border-slate-300 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative group">
            <div className="space-y-5">
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-slate-200 border border-slate-400 text-slate-900">
                  Silver Tier
                </span>
                <h3 className="text-2xl font-black text-[#0F2540]">Silver Plan</h3>
                <p className="text-xs font-bold text-slate-500">For steady local tuition leads</p>
              </div>

              <div className="border-y border-slate-100 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹9,000</span>
                  <span className="text-xs font-extrabold text-slate-500">/ year</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 text-xs font-extrabold border border-blue-200">
                  <Zap size={13} className="text-blue-600" />
                  <span>30 Verified Leads / month</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>30 Student Leads / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Direct Parent Call &amp; Chat</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Expanded Matching Radius (up to 15 km)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Check size={11} />
                  </div>
                  <span>Verified Tutor Badge</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "SILVER"}
                onClick={() => handleSubscribe("SILVER")}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md ${
                  currentPlan === "SILVER"
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {currentPlan === "SILVER" ? "Active Membership" : "Select Silver Plan"}
              </button>
            </div>
          </div>

          {/* GOLD PLAN */}
          <div className="rounded-3xl bg-white p-6 border-2 border-yellow-400 shadow-xl ring-4 ring-yellow-400/20 transition-all flex flex-col justify-between relative group">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 text-[11px] font-black tracking-wider uppercase shadow-md">
              Most Popular 🔥
            </div>

            <div className="space-y-5 pt-2">
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-yellow-100 border border-yellow-300 text-yellow-950">
                  Gold Tier
                </span>
                <h3 className="text-2xl font-black text-[#0F2540]">Gold Plan</h3>
                <p className="text-xs font-bold text-slate-500">Accelerated lead volume for busy tutors</p>
              </div>

              <div className="border-y border-slate-100 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹12,000</span>
                  <span className="text-xs font-extrabold text-slate-500">/ year</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-extrabold border border-amber-300">
                  <Zap size={13} className="text-amber-600" />
                  <span>40 Verified Leads / month</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>40 Student Leads / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>High Priority Candidate Feed</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Instant WhatsApp Alerts</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Highlighted Profile Badge</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "GOLD"}
                onClick={() => handleSubscribe("GOLD")}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg ${
                  currentPlan === "GOLD"
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-yellow-950 font-black shadow-amber-200"
                }`}
              >
                {currentPlan === "GOLD" ? "Active Membership" : "Select Gold Plan"}
              </button>
            </div>
          </div>

          {/* PLATINUM VIP PLAN */}
          <div className="rounded-3xl bg-gradient-to-b from-purple-950 via-[#130E26] to-[#0D091B] p-6 border-2 border-purple-500/80 shadow-2xl ring-4 ring-purple-500/30 transition-all flex flex-col justify-between relative group text-white">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white text-[11px] font-black tracking-wider uppercase shadow-lg flex items-center gap-1.5">
              <Sparkles size={13} className="text-yellow-300 animate-spin" />
              <span>VIP First Priority 👑</span>
            </div>

            <div className="space-y-5 pt-2">
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-purple-500/20 border border-purple-400/40 text-purple-300">
                  Platinum VIP Tier
                </span>
                <h3 className="text-2xl font-black text-white">Platinum Plan</h3>
                <p className="text-xs font-bold text-purple-200">First Priority Client Leads &amp; Maximum Volume</p>
              </div>

              {/* Special Priority Callout */}
              <div className="p-3 rounded-2xl bg-purple-900/60 border border-purple-400/50 text-xs font-black text-yellow-300 flex items-center gap-2 shadow-inner">
                <Award size={18} className="text-yellow-400 shrink-0" />
                <span>🥇 Ranked #1 First Priority on All Client Leads</span>
              </div>

              <div className="border-y border-purple-800/50 py-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">₹24,000</span>
                  <span className="text-xs font-extrabold text-purple-300">/ year</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/30 text-purple-200 text-xs font-extrabold border border-purple-400/30">
                  <Zap size={13} className="text-yellow-400" />
                  <span>50 Verified Leads / month</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-purple-100">
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>50 Student Leads / month</strong> (600/yr)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>🥇 First Priority Lead Delivery</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>VIP Fast-Track Parent Matching</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Dedicated Support Manager</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "PLATINUM"}
                onClick={() => handleSubscribe("PLATINUM")}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xl ${
                  currentPlan === "PLATINUM"
                    ? "bg-purple-900/50 text-purple-400 border border-purple-800 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 hover:opacity-95 text-white font-black shadow-purple-500/30 hover:scale-[1.02]"
                }`}
              >
                {currentPlan === "PLATINUM" ? "Active VIP Membership" : "Upgrade to Platinum VIP"}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="mt-16 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-[#0F2540]">Plan Feature Matrix Comparison</h2>
            <p className="text-xs font-semibold text-slate-500">Compare all 4 plans at a glance</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#0F2540] font-black">
                  <th className="py-3.5 px-4">Feature</th>
                  <th className="py-3.5 px-4 text-center">Bronze (₹6k)</th>
                  <th className="py-3.5 px-4 text-center">Silver (₹9k)</th>
                  <th className="py-3.5 px-4 text-center bg-yellow-50/50 text-amber-950">Gold (₹12k)</th>
                  <th className="py-3.5 px-4 text-center bg-purple-50/50 text-purple-950">Platinum VIP (₹24k)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Monthly Leads Quota</td>
                  <td className="py-3.5 px-4 text-center font-bold">20 leads</td>
                  <td className="py-3.5 px-4 text-center font-bold">30 leads</td>
                  <td className="py-3.5 px-4 text-center font-bold bg-yellow-50/30">40 leads</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-purple-700 bg-purple-50/30">50 leads</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Client Lead Priority</td>
                  <td className="py-3.5 px-4 text-center text-slate-500">Standard</td>
                  <td className="py-3.5 px-4 text-center text-slate-500">Standard</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700 bg-yellow-50/30">High Priority</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-purple-700 bg-purple-50/30">🥇 1st Priority (#1 Rank)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Parent Phone &amp; Address</td>
                  <td className="py-3.5 px-4 text-center"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-purple-50/30"><Check size={16} className="mx-auto text-purple-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">WhatsApp Instant Alerts</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-purple-50/30"><Check size={16} className="mx-auto text-purple-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Dedicated Support Manager</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300 bg-yellow-50/30">—</td>
                  <td className="py-3.5 px-4 text-center bg-purple-50/30"><Check size={16} className="mx-auto text-purple-600 font-bold" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Why Upgrade Section */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center mx-auto">
              <Zap size={20} />
            </div>
            <h4 className="text-sm font-black text-[#0F2540]">Fast Lead Matching</h4>
            <p className="text-xs font-semibold text-slate-500">Connect with nearby parents within minutes of posting.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <Phone size={20} />
            </div>
            <h4 className="text-sm font-black text-[#0F2540]">Verified Contacts</h4>
            <p className="text-xs font-semibold text-slate-500">Direct phone numbers and home addresses of parents.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <Crown size={20} />
            </div>
            <h4 className="text-sm font-black text-[#0F2540]">Platinum Priority</h4>
            <p className="text-xs font-semibold text-slate-500">Ranked #1 on search and recommendation feeds.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Lock size={20} />
            </div>
            <h4 className="text-sm font-black text-[#0F2540]">Secure Payments</h4>
            <p className="text-xs font-semibold text-slate-500">Encrypted annual subscriptions via Razorpay.</p>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div className="mt-12 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-[#0F2540]">Frequently Asked Questions</h2>
            <p className="text-xs font-semibold text-slate-500">Got questions about our tutor plans?</p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left text-xs font-extrabold text-[#0F2540] flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 text-xs font-semibold text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
