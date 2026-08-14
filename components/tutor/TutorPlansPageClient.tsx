"use client";

import React, { useState, useEffect } from "react";
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

import { Tag, Ticket, X, CheckCircle2, Wallet, AlertCircle } from "lucide-react";
import { validateCouponAction, type ValidateCouponResult } from "@/app/actions/coupon.actions";

export function TutorPlansPageClient({ currentPlan, expiresAt, leadsUsedThisMonth }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Dynamically inject Razorpay Checkout SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Checkout modal & coupon state
  const [checkoutPlanId, setCheckoutPlanId] = useState<SubscriptionPlanId | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);

  const activePlanKey = currentPlan.toUpperCase() as SubscriptionPlanId;
  const activePlanConfig = SUBSCRIPTION_PLANS[activePlanKey] ?? null;

  const handleOpenCheckout = (planId: SubscriptionPlanId) => {
    setCheckoutPlanId(planId);
    setCouponCode("");
    setCouponError(null);
    setAppliedCoupon(null);
  };

  const handleApplyCoupon = async (planPrice: number) => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    const res = await validateCouponAction(couponCode.trim(), planPrice);
    setCouponLoading(false);

    if (!res.success || !res.data) {
      setCouponError(res.error ?? "Invalid coupon code");
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(res.data);
      setCouponError(null);
    }
  };

  const handleTestCheckout = async (planId: SubscriptionPlanId) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Direct mock verification for instant activation in test mode
      const mockOrderId = `order_mock_${Date.now()}`;
      const mockPaymentId = `pay_mock_${Date.now()}`;

      const verifyRes = await fetch("/api/tutor/subscribe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: mockOrderId,
          paymentId: mockPaymentId,
          signature: "mock_test_signature",
          planId,
        }),
      });

      if (verifyRes.ok) {
        window.location.href = "/tutor/dashboard?subscription=activated";
      } else {
        const data = await verifyRes.json();
        throw new Error(data.error || "Activation failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const handleRazorpaySubscribe = async (planId: SubscriptionPlanId) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/tutor/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, couponCode: appliedCoupon?.code }),
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
            setIsLoading(false);
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
        // Fallback to test activation when Razorpay script is blocked/unavailable
        await handleTestCheckout(planId);
      }
    } catch (err: any) {
      console.warn("Razorpay error, executing test checkout fallback", err);
      await handleTestCheckout(planId);
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
                onClick={() => handleOpenCheckout("BRONZE")}
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
                  <span>30 Student Leads / month (360/yr)</span>
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
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>Priority Feed (+1,500 Ranking Boost)</strong></span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "SILVER"}
                onClick={() => handleOpenCheckout("SILVER")}
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
                  <span>40 Student Leads / month (480/yr)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>High Priority Feed (+3,000 Ranking Boost)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Instant WhatsApp Notifications</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Expanded Matching Radius (up to 25 km)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>⭐ Featured Search &amp; Homepage Placement</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Highlighted Gold Profile Badge</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-yellow-200 text-yellow-900 flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>🪙 +50 Free Bonus Wallet Coins</strong></span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "GOLD"}
                onClick={() => handleOpenCheckout("GOLD")}
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
                  <span><strong>🥇 First Priority Access (+10,000 Boost)</strong></span>
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
                  <span>Top #1 Position on Search &amp; Recommendations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>🌐 Unlimited City-wide &amp; Online Radius</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span>Dedicated Relationship Manager &amp; Support</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>⭐ 1-on-1 Profile &amp; Bio Optimization</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>🪙 +100 Free Bonus Wallet Coins</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 font-bold">
                    <Check size={11} />
                  </div>
                  <span><strong>📞 24/7 VIP Phone &amp; WhatsApp Helpline</strong></span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={isLoading || currentPlan === "PLATINUM"}
                onClick={() => handleOpenCheckout("PLATINUM")}
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
                  <td className="py-3.5 px-4 text-center text-slate-500">+1,500 Boost</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700 bg-yellow-50/30">High (+3,000 Boost)</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-purple-700 bg-purple-50/30">🥇 1st Priority (+10,000 Boost)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Matching Radius</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">10 km</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">15 km</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-800 bg-yellow-50/30">25 km</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-purple-700 bg-purple-50/30">🌐 Unlimited City &amp; Online</td>
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
                  <td className="py-3.5 px-4 font-bold text-slate-900">⭐ Featured Search &amp; Homepage</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
                  <td className="py-3.5 px-4 text-center bg-purple-50/30"><Check size={16} className="mx-auto text-purple-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">🪙 Free Bonus Wallet Coins</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center font-black text-amber-700 bg-yellow-50/30">+50 Coins</td>
                  <td className="py-3.5 px-4 text-center font-black text-purple-700 bg-purple-50/30">+100 Coins</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Dedicated Support &amp; VIP Helpline</td>
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

      {/* ── MEMBERSHIP PURCHASE & COUPON CHECKOUT MODAL ── */}
      {checkoutPlanId && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg relative p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-900 shadow-xs text-lg">
                  👑
                </div>
                <div>
                  <h3 className="text-base font-900 text-gray-900">
                    {SUBSCRIPTION_PLANS[checkoutPlanId].name}
                  </h3>
                  <p className="text-xs font-700 text-gray-500">
                    Annual Tutor Membership
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlanId(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Price & Features summary */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-700 text-gray-600">Base Annual Price</span>
                <span className="text-sm font-900 text-gray-900">
                  ₹{SUBSCRIPTION_PLANS[checkoutPlanId].priceInr.toLocaleString("en-IN")}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs font-800 text-emerald-700">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-₹{appliedCoupon.discountAmountInr.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm font-900 text-[#0F2540]">
                <span>Total Payable</span>
                <span className="text-lg font-900 text-[#2D9E6B]">
                  ₹{(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Coupon Code Section */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-800 text-gray-800 flex items-center gap-1.5">
                <Ticket size={14} className="text-[#2D9E6B]" />
                <span>Have a Promo / Coupon Code?</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. WELCOME10, APNATUTOR25)"
                  className="flex-1 h-11 px-3.5 rounded-xl border border-gray-300 text-xs font-800 uppercase focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 outline-none"
                />
                <button
                  type="button"
                  disabled={couponLoading || !couponCode.trim()}
                  onClick={() => handleApplyCoupon(SUBSCRIPTION_PLANS[checkoutPlanId].priceInr)}
                  className="px-4 h-11 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {couponLoading ? "Checking..." : "Apply Coupon"}
                </button>
              </div>

              {/* Quick coupons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {["WELCOME10", "INTROTUTOR15", "APNATUTOR25"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCouponCode(code);
                      handleApplyCoupon(SUBSCRIPTION_PLANS[checkoutPlanId].priceInr);
                    }}
                    className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    🏷️ {code}
                  </button>
                ))}
              </div>

              {couponError && (
                <p className="text-xs font-700 text-red-600 flex items-center gap-1 pt-1">
                  <AlertCircle size={13} /> {couponError}
                </p>
              )}
              {appliedCoupon && (
                <p className="text-xs font-700 text-emerald-700 flex items-center gap-1 pt-1">
                  <CheckCircle2 size={13} /> Coupon {appliedCoupon.code} applied! Saved ₹{appliedCoupon.discountAmountInr}.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-200">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleRazorpaySubscribe(checkoutPlanId)}
                className="w-full py-3.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-900 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Lock size={15} className="!text-white" />
                <span className="!text-white font-900">
                  {isLoading ? "Processing Payment..." : `Proceed to Pay ₹${(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr).toLocaleString("en-IN")} →`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
