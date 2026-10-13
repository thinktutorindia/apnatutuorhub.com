"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check, ShieldCheck, Zap, Crown, ArrowLeft, Loader2, Award, Sparkles,
  Phone, MessageSquare, Star, ChevronDown, ChevronUp, Lock, RefreshCw,
  Users, UserCheck, CheckCircle2, AlertCircle, ArrowRight, BookOpen,
  GraduationCap, Layers, Tag, Ticket, X, Wallet, Clock, Handshake
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  CLASS_LEAD_DISTRIBUTION,
  FEE_STRUCTURE_DISTRIBUTION,
  type SubscriptionPlanId,
  type SubscriptionPlanConfig,
  getPriceWithGst,
  getGstAmount,
} from "@/lib/subscription-plans";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { validateCouponAction, type ValidateCouponResult } from "@/app/actions/coupon.actions";
import { UpiQrPaymentCard } from "@/components/payment/UpiQrPaymentCard";

interface Props {
  currentPlan: string;
  expiresAt: string | null;
  leadsUsedThisMonth: number;
}

const FAQ_ITEMS = [
  {
    q: "How does the ₹1,257 Commission Based Plan work?",
    a: "The Commission Based Plan requires a one-time registration fee of ₹1,257 with 6 Months validity. You get to unlock 5 verified parent leads. Our platform commission is 50% on the first month's student fee, and 5% recurring platform commission every month from the 2nd month onwards.",
  },
  {
    q: "How does the ₹2,999 Silver Plan work?",
    a: "The ₹2,999 Silver Plan gives you 15 Verified Leads with 30 Days validity. Lead unlock cost is 0% platform commission, meaning you keep 100% of all tuition fees you collect from students directly.",
  },
  {
    q: "Is there any platform commission on the ₹2,999 Silver Plan?",
    a: "Zero commission! On the ₹2,999 Silver Plan, there is 0% platform commission. You keep 100% of all tuition fees you collect from students and parents directly.",
  },
  {
    q: "Can I unlock leads for any class or subject on the Silver Plan?",
    a: "Yes, 100%! The ₹2,999 Silver Membership allows you to unlock leads across all classes (Class 1–12, Entrance exams like JEE/NEET, Boards, and all subjects) in your chosen localities or online.",
  },
  {
    q: "What is the validity period of the ₹2,999 Silver Plan?",
    a: "The ₹2,999 Silver Plan is valid for 30 Days from activation, giving you full access to unlock students throughout the month.",
  },
  {
    q: "How does the tutor competition cap work on the Silver Plan?",
    a: "To ensure high conversion and genuine parent response, Silver Plan leads are limited to a maximum of 3 verified tutors only (low competition).",
  },
  {
    q: "Are parent phone numbers and addresses verified?",
    a: "Parent inquiries are posted by verified accounts with a registered mobile number. If a number is found unreachable, full coin refund protection applies under our platform terms.",
  },
];

export function TutorPlansPageClient({ currentPlan, expiresAt, leadsUsedThisMonth }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const showSpecialOffer = false;

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
  const [planStep, setPlanStep] = useState<"summary" | "qr_payment" | "submitted">("summary");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);

  const activePlanKey = currentPlan.toUpperCase() as SubscriptionPlanId;
  const activePlanConfig = SUBSCRIPTION_PLANS[activePlanKey] ?? null;

  const handleOpenCheckout = (planId: SubscriptionPlanId) => {
    setCheckoutPlanId(planId);
    setPlanStep("summary");
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
        description: `${SUBSCRIPTION_PLANS[planId].name} Lead Membership`,
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
        await handleTestCheckout(planId);
      }
    } catch (err: any) {
      console.warn("Razorpay error, executing test checkout fallback", err);
      await handleTestCheckout(planId);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <ActionOverlay
        isOpen={isLoading}
        title="Securing Your Membership"
        subtitle="Connecting to Razorpay secure payment gateway..."
      />

      {/* ── Google Fonts ── */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-3xl pt-10 pb-14 px-5 sm:px-10 shadow-2xl text-white" style={{background: 'linear-gradient(135deg, #0A0F1E 0%, #0F2540 40%, #0D1F35 70%, #070D1A 100%)'}}>
        {/* Animated glow orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(16,185,129,0.08) 50%, transparent 70%)', transform: 'translate(30%, -30%)'}} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)', transform: 'translate(-30%, 30%)'}} />

        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-yellow-300 text-xs font-black backdrop-blur-md" style={{background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)'}}>
            <Crown size={14} className="text-yellow-400" />
            <span>Verified Lead Membership Plans</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight" style={{fontFamily: "'Poppins', sans-serif"}}>
            Choose Your Plan &amp; Win{' '}
            <span style={{background: 'linear-gradient(90deg, #FBBF24, #F59E0B, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Exclusive Tuition Leads</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
            Unlock premium verified tuition leads with our <span className="text-emerald-300 font-bold">₹2,999 Silver Membership</span> — 15 Verified Leads, 0% platform commission, and direct parent contacts!
          </p>

          {activePlanConfig && (
            <div className="inline-flex flex-wrap justify-center items-center gap-3 px-5 py-3 rounded-2xl border" style={{background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)'}}>
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active: <span className="text-emerald-300 font-extrabold">{activePlanConfig.name}</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-xs text-slate-300 font-semibold">Used: <strong className="text-white">{leadsUsedThisMonth}</strong> leads</span>
              {expiresAt && <span className="text-xs text-slate-400">Expires: {new Date(expiresAt).toLocaleDateString()}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Main Cards Container */}
      <div className="max-w-7xl mx-auto px-1 sm:px-2">
        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-xl mx-auto mb-6">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-950 text-xs font-bold shadow-sm">
              {errorMessage}
            </div>
          </div>
        )}

        {/* 🤝 Official Commission Based Plan (₹1,257 Registration Fee · 6 Months Validity · 5 Leads) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-400/90 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 p-6 sm:p-9 mb-10 shadow-xl shadow-emerald-950/5 transition-all duration-300 hover:shadow-2xl hover:border-emerald-500">
          {/* Subtle decorative glow & pattern */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
            {/* Left Content Column */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-700/20">
                  <Handshake size={14} className="text-emerald-100" />
                  <span>COMMISSION BASED PLAN</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-emerald-950 bg-white/90 border border-emerald-300 shadow-2xs">
                  <Clock size={13} className="text-emerald-700" />
                  <span>6 Months Long Validity</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-amber-900 bg-amber-100/90 border border-amber-300">
                  ⚡ 50% OFF REGISTRATION
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F2540] leading-tight tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Commission Based Plan —{" "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">₹1,257</span>{" "}
                  <span className="text-base sm:text-lg font-bold text-slate-400 line-through">₹2,500</span>
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                  Start with a low upfront fee of <strong className="text-emerald-900">₹1,257</strong> for <strong className="text-slate-900">6 Months validity</strong> to unlock <strong className="text-emerald-900">5 verified student leads</strong>.
                  <br className="hidden sm:inline" /> Platform commission: <strong>50% of 1st month tuition fee</strong>, and <strong>5% recurring commission every month from 2nd month onwards</strong>.
                </p>
              </div>

              {/* Feature Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {[
                  { icon: '✅', text: '5 Verified Leads Unlock', color: 'bg-emerald-500/10 border-emerald-300 text-emerald-950' },
                  { icon: '📅', text: '6 Months (180 Days)', color: 'bg-blue-500/10 border-blue-300 text-blue-950' },
                  { icon: '🤝', text: '50% 1st Month Fee', color: 'bg-amber-500/10 border-amber-300 text-amber-950' },
                  { icon: '🔄', text: '5% Monthly from 2nd Mo', color: 'bg-teal-500/10 border-teal-300 text-teal-950' },
                  { icon: '📍', text: '5km Nearby or Online', color: 'bg-sky-500/10 border-sky-300 text-sky-950' },
                  { icon: '📞', text: 'Direct Parent Contact', color: 'bg-purple-500/10 border-purple-300 text-purple-950' },
                ].map(item => (
                  <div key={item.text} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border shadow-2xs backdrop-blur-xs ${item.color}`}>
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="truncate">{item.text}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                *Commission Terms: One-time ₹1,257 registration fee valid for 6 months. Unlocks 5 verified leads. Platform charges 50% commission from the 1st month student fee collected, and 5% monthly commission from 2nd month onwards.
              </p>
            </div>

            {/* Right Pricing & CTA Card */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/95 border-2 border-emerald-400/80 shadow-lg text-center shrink-0 w-full lg:w-72 space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Special Registration
                </span>
                <div className="text-4xl sm:text-5xl font-black text-[#0F2540] mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  ₹1,257
                </div>
                <div className="text-xs font-bold text-slate-400 line-through">Regular ₹2,500</div>
                <div className="text-xs font-black text-emerald-700 mt-0.5">Save ₹1,243 (50% OFF)</div>
              </div>

              <div className="w-full text-xs text-slate-600 font-semibold space-y-1 py-1 border-y border-slate-100">
                <div className="flex items-center justify-between">
                  <span>Validity:</span>
                  <span className="font-black text-slate-900">6 Months</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Leads:</span>
                  <span className="font-black text-emerald-700">5 Student Leads</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Competition:</span>
                  <span className="font-black text-slate-900">Max 3 Tutors</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCheckout('STARTER')}
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-600/30 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{activePlanKey === 'STARTER' ? '✅ Plan Active' : '🤝 Select Commission Plan'}</span>
                <ArrowRight size={16} />
              </button>
              <p className="text-[10px] text-slate-400 font-semibold">Instant unlock for 5 verified student leads</p>
            </div>
          </div>
        </div>

        {/* ── SUBSCRIPTION MEMBERSHIP PLANS (0% COMMISSION) ── */}
        <div className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-400/40 text-blue-900 text-xs font-black shadow-2xs">
              <Sparkles size={14} className="text-blue-600 animate-pulse" />
              <span>ZERO COMMISSION MEMBERSHIP PLANS (KEEP 100% OF TUITION FEES)</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F2540] tracking-tight">
              Subscription Membership Plans
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
              Never share monthly commissions with the platform. Keep 100% of all student tuition fees. Choose Silver, Gold, or Platinum VIP based on your target lead volume.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {(['SILVER', 'GOLD', 'PLATINUM'] as SubscriptionPlanId[]).map((tierKey) => {
              const tier = SUBSCRIPTION_PLANS[tierKey];
              const isCurrent = currentPlan === tierKey;
              const isPlatinum = tierKey === 'PLATINUM';
              const isGold = tierKey === 'GOLD';

              return (
                <div
                  key={tierKey}
                  className={`rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                    isGold
                      ? 'bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-white border-2 border-amber-400 ring-4 ring-amber-400/20 shadow-2xl shadow-amber-500/15 md:-translate-y-2'
                      : isPlatinum
                      ? 'bg-gradient-to-b from-purple-500/10 via-indigo-500/5 to-white border-2 border-purple-400 shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:border-purple-500 hover:-translate-y-1.5'
                      : 'bg-gradient-to-b from-sky-500/10 via-slate-50/60 to-white border-2 border-sky-300/90 shadow-xl shadow-sky-500/10 hover:shadow-2xl hover:border-sky-400 hover:-translate-y-1.5'
                  }`}
                >
                  {/* Popular Floating Badge for Gold */}
                  {isGold && (
                    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider py-1.5 text-center shadow-sm flex items-center justify-center gap-1.5">
                      <Sparkles size={12} />
                      <span>MOST POPULAR &amp; BEST VALUE</span>
                    </div>
                  )}

                  {/* Platinum Solo Lock Ribbon */}
                  {isPlatinum && (
                    <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 text-white text-[11px] font-black uppercase tracking-wider py-1.5 text-center shadow-sm flex items-center justify-center gap-1.5">
                      <Crown size={12} />
                      <span>👑 100% EXCLUSIVE SOLO LOCK</span>
                    </div>
                  )}

                  <div className={`p-6 sm:p-7 space-y-6 flex flex-col flex-1`}>
                    {/* Top Row: Tier Tag & Validity */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${tier.badgeBg} ${tier.badgeText}`}>
                        {tier.badge}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 bg-white/90 border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                        {tier.validityText}
                      </span>
                    </div>

                    {/* Title & Pricing */}
                    <div className="space-y-1.5">
                      <h3 className="text-2xl font-black text-[#0F2540] tracking-tight">{tier.name}</h3>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-4xl font-black text-[#0F2540]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                          ₹{tier.priceInr.toLocaleString('en-IN')}
                        </span>
                        {tier.originalPriceInr && (
                          <span className="text-sm font-bold text-slate-400 line-through">
                            ₹{tier.originalPriceInr.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          {tier.festivalBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        + ₹{getGstAmount(tier.priceInr).toLocaleString('en-IN')} GST = ₹{getPriceWithGst(tier.priceInr).toLocaleString('en-IN')} all-inclusive
                      </p>
                    </div>

                    {/* Leads Quota & Exclusivity Showcase Box */}
                    <div className={`p-4 rounded-2xl border space-y-2 backdrop-blur-xs ${
                      isGold
                        ? 'bg-amber-500/10 border-amber-300'
                        : isPlatinum
                        ? 'bg-purple-500/10 border-purple-300'
                        : 'bg-sky-500/10 border-sky-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Verified Leads Unlock:</span>
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg text-white ${
                          isGold ? 'bg-amber-600' : isPlatinum ? 'bg-purple-700' : 'bg-sky-700'
                        }`}>
                          {tier.totalLeads} Leads
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1 border-t border-slate-200/60">
                        <span>Lead Exclusivity:</span>
                        <span className="font-extrabold text-[#0F2540]">{tier.competitionLabel}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2.5 flex-1 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Included Perks:</p>
                      {tier.features.slice(0, 6).map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${
                            isGold ? 'bg-amber-500' : isPlatinum ? 'bg-purple-600' : 'bg-emerald-600'
                          }`}>
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isLoading || isCurrent}
                        onClick={() => handleOpenCheckout(tierKey)}
                        className={`w-full py-4 px-5 rounded-2xl font-black text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 ${
                          isPlatinum
                            ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:to-indigo-700 text-white shadow-purple-600/30'
                            : isGold
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/30'
                            : 'bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 hover:from-sky-700 hover:to-blue-700 text-white shadow-blue-500/25'
                        }`}
                      >
                        <span>{isCurrent ? '✅ Active Plan' : `Activate ${tier.name}`}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TUITION FEE STRUCTURE LEAD SCHEDULE SECTION ── */}
        <div className="mt-14 bg-gradient-to-b from-slate-900 via-[#0F2540] to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="max-w-3xl space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <Layers size={13} className="text-emerald-400" />
              <span>Dynamic Lead Unlock Capacity</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tuition Fee Structure Lead Delivery Schedule
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
              On the ₹2,999 Silver Plan, leads are dynamically unlocked based on universal class &amp; tuition fee structure. Lead unlock costs represent a fair ~5% of one month&apos;s student tuition fee across all grades &amp; subjects.
            </p>
          </div>

          {/* 3 Fee Structure Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
            {FEE_STRUCTURE_DISTRIBUTION.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md hover:bg-white/15 hover:border-white/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 font-mono uppercase tracking-wider">
                      Tier {idx + 1}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-yellow-400 text-yellow-950 text-xs font-black shadow-sm">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-yellow-300 transition-colors">
                      {item.monthlyRange}
                    </h3>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">
                      {item.feeBand}
                    </p>
                  </div>

                  <p className="text-xs font-normal text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Typical Classes &amp; Categories
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.popularClasses.map((cls, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic mix callout */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 flex items-center justify-between gap-4 flex-wrap relative z-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>💡 Mixed Tuition Support:</strong> You can mix and match fee tiers freely (e.g. 1 high-ticket lead + 1 standard lead + 1 lower-fee lead) using your 60 plan points.
              </span>
            </div>
            <Link
              href="/terms"
              className="text-yellow-400 hover:text-yellow-300 font-bold underline text-xs inline-flex items-center gap-1"
            >
              Read Lead Delivery &amp; Exclusivity Terms <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* ── FEATURE SPECIFICATION TABLE ── */}
        <div className="mt-14 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-[#0F2540]">
              {showSpecialOffer ? "Plan Feature Matrix Comparison" : "₹2,999 Silver Membership Details & Benefits"}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {showSpecialOffer ? "Compare our Commission Deal and the Flagship Silver Membership" : "Complete specifications and verified lead guarantee of the ₹2,999 Silver Plan (Zero Commission)"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#0F2540] font-black">
                  <th className="py-3.5 px-3">Feature / Benefit</th>
                  <th className="py-3.5 px-3 text-center bg-emerald-50/50 text-emerald-950 font-black">
                    Commission Plan<br />
                    <span className="text-emerald-700 font-extrabold text-sm">₹1,257</span>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-blue-50/60 text-blue-950 font-black ring-1 ring-blue-300/40">
                    Silver Plan (0%)<br />
                    <span className="text-emerald-700 font-extrabold text-sm">₹2,999</span>{" "}
                    <span className="text-slate-400 line-through text-[10px]">₹5,999</span>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-yellow-50/60 text-yellow-950 font-black">
                    Gold Plan<br />
                    <span className="text-yellow-900 font-extrabold text-sm">₹9,000</span>{" "}
                    <span className="text-slate-400 line-through text-[10px]">₹12,000</span>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-purple-50/70 text-purple-950 font-black">
                    Platinum VIP 👑<br />
                    <span className="text-purple-900 font-extrabold text-sm">₹18,000</span>{" "}
                    <span className="text-slate-400 line-through text-[10px]">₹24,000</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Total Lead Allocation</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-800 bg-emerald-50/30">5 Verified Leads</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-800 bg-blue-50/20">15 Verified Leads</td>
                  <td className="py-3.5 px-3 text-center font-black text-yellow-900 bg-yellow-50/20">20 Leads</td>
                  <td className="py-3.5 px-3 text-center font-black text-purple-900 bg-purple-50/30">30 High-Value Leads</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Platform Commission</td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-700 bg-emerald-50/30">50% 1st Mo + 5% Recurring</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-600 bg-blue-50/20">🎉 0% (Keep 100% Fees)</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-600 bg-yellow-50/20">🎉 0% (Keep 100% Fees)</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-600 bg-purple-50/30">🎉 0% (Keep 100% Fees)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Competition Level</td>
                  <td className="py-3.5 px-3 text-center font-bold text-emerald-900 bg-emerald-50/30">Max 3 Tutors</td>
                  <td className="py-3.5 px-3 text-center font-bold text-blue-900 bg-blue-50/20">Max 3 Tutors</td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-900 bg-yellow-50/20">🔒 Semi-Exclusive (Max 2)</td>
                  <td className="py-3.5 px-3 text-center font-black text-purple-900 bg-purple-50/30">👑 100% Solo Lock (1 Tutor Only)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Plan Validity</td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-800 bg-emerald-50/30">6 Months (180 Days)</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 bg-blue-50/20">30 Days (1 Month)</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 bg-yellow-50/20">60 Days (2 Months)</td>
                  <td className="py-3.5 px-3 text-center font-black text-purple-900 bg-purple-50/30">90 Days (3 Months)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Direct Parent Phone &amp; Locality</td>
                  <td className="py-3.5 px-3 text-center bg-emerald-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-3 text-center bg-blue-50/20"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-3 text-center bg-yellow-50/20"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-3 text-center bg-purple-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Matching Radius</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 bg-emerald-50/30">5 km / Online</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 bg-blue-50/20">15 km</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 bg-yellow-50/20">25 km</td>
                  <td className="py-3.5 px-3 text-center font-black text-purple-900 bg-purple-50/30">Unlimited City / Pan-India</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 font-bold text-slate-900">Placement &amp; Support</td>
                  <td className="py-3.5 px-3 text-center text-slate-600 bg-emerald-50/30">Demo Booking Support</td>
                  <td className="py-3.5 px-3 text-center text-slate-600 bg-blue-50/20">24/7 Support Desk + Verified Badge</td>
                  <td className="py-3.5 px-3 text-center text-yellow-900 font-bold bg-yellow-50/20">+3,000 Boost + WhatsApp Alerts</td>
                  <td className="py-3.5 px-3 text-center text-purple-900 font-black bg-purple-50/30">+10,000 VIP Boost + Dedicated RM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── LEGAL TRANSPARENCY & TERMS CALLOUT ── */}
        <div className="mt-14 p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-[#0F2540] flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#2D9E6B]" />
              <span>Transparent Terms &amp; Verified Lead Guarantee</span>
            </h4>
            <p className="text-xs font-medium text-slate-600 max-w-2xl leading-relaxed">
              All lead allowances (<strong>Silver Plan: 15 verified leads unlocked across all classes &amp; subjects</strong>), 0% platform commission terms, validity (30 days), and the low-competition tutor cap (max 3 tutors) are governed by our platform terms.
            </p>
          </div>
          <Link
            href="/terms"
            className="px-5 py-2.5 rounded-xl bg-[#0F2540] hover:bg-[#1b3a60] !text-white text-xs font-black whitespace-nowrap transition-all shadow-md shrink-0 inline-flex items-center justify-center"
            style={{ color: "#ffffff" }}
          >
            View Full Terms &amp; Conditions →
          </Link>
        </div>

        {/* ── FAQ ACCORDION SECTION ── */}
        <div className="mt-14 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-[#0F2540]">Frequently Asked Questions</h2>
            <p className="text-xs font-semibold text-slate-500">Got questions about our lead plans and validity?</p>
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
                    {SUBSCRIPTION_PLANS[checkoutPlanId].totalLeads} Verified Leads* • {SUBSCRIPTION_PLANS[checkoutPlanId].validityText}
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
                <span className="text-xs font-700 text-gray-600">
                  {SUBSCRIPTION_PLANS[checkoutPlanId].festivalBadge
                    ? `Festival Price (${SUBSCRIPTION_PLANS[checkoutPlanId].festivalBadge})`
                    : "Base Plan Price"}
                </span>
                <div className="flex items-center gap-1.5">
                  {SUBSCRIPTION_PLANS[checkoutPlanId].originalPriceInr && (
                    <span className="text-xs font-bold text-slate-400 line-through">
                      ₹{SUBSCRIPTION_PLANS[checkoutPlanId].originalPriceInr!.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span className="text-sm font-900 text-gray-900">
                    ₹{SUBSCRIPTION_PLANS[checkoutPlanId].priceInr.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Leads Included</span>
                <span>{SUBSCRIPTION_PLANS[checkoutPlanId].totalLeads} Verified Lead{SUBSCRIPTION_PLANS[checkoutPlanId].totalLeads > 1 ? "s" : ""}*</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Validity</span>
                <span>{SUBSCRIPTION_PLANS[checkoutPlanId].validityText}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Competition Model</span>
                <span>{SUBSCRIPTION_PLANS[checkoutPlanId].competitionLabel}</span>
              </div>
              {SUBSCRIPTION_PLANS[checkoutPlanId].commissionNote && (
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] font-bold text-orange-900">
                  💰 {SUBSCRIPTION_PLANS[checkoutPlanId].commissionNote}
                </div>
              )}

              {/* GST Breakdown — skipped for GST-exempt plans (e.g. STARTER ₹99) */}
              <div className="pt-2 border-t border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Base Amount</span>
                  <span>₹{(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr).toLocaleString("en-IN")}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs font-800 text-emerald-700">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₹{appliedCoupon.discountAmountInr.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {SUBSCRIPTION_PLANS[checkoutPlanId].noGst ? (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>GST</span>
                    <span>✅ Not applicable (Festival Offer)</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>GST @ 18%</span>
                    <span>₹{getGstAmount(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-900 text-[#0F2540] pt-1 border-t border-gray-200">
                  <span>Total Payable {!SUBSCRIPTION_PLANS[checkoutPlanId].noGst && <span className="text-[10px] font-bold text-slate-400">(incl. GST)</span>}</span>
                  <span className="text-lg font-900 text-[#2D9E6B]">
                    ₹{(
                      SUBSCRIPTION_PLANS[checkoutPlanId].noGst
                        ? (appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr)
                        : getPriceWithGst(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
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

            {/* Action Buttons / QR Payment Flow */}
            {planStep === "summary" && (
              <div className="pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setPlanStep("qr_payment")}
                  className="w-full py-3.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-900 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Lock size={15} className="!text-white" />
                  <span className="!text-white font-900">
                    Pay ₹{(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr).toLocaleString("en-IN")} via BharatPe UPI QR →
                  </span>
                </button>
              </div>
            )}

            {planStep === "qr_payment" && (
              <div className="pt-2">
                <UpiQrPaymentCard
                  type="PLAN_SUBSCRIPTION"
                  title="Tutor Membership Plan"
                  itemTitle={`${SUBSCRIPTION_PLANS[checkoutPlanId].name} • ${SUBSCRIPTION_PLANS[checkoutPlanId].totalLeads} Leads`}
                  plan={checkoutPlanId as any}
                  amountInr={appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr}
                  couponCode={appliedCoupon?.code}
                  discountInr={appliedCoupon?.discountAmountInr ?? 0}
                  onSuccess={() => setPlanStep("submitted")}
                  onCancel={() => setPlanStep("summary")}
                />
              </div>
            )}

            {planStep === "submitted" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center space-y-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                    Payment Verification Under Review
                  </span>
                  <h3 className="text-2xl font-black text-[#0F2540] mt-1">
                    Plan Payment Submitted! 🎉
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                    Your {SUBSCRIPTION_PLANS[checkoutPlanId].name} payment screenshot has been sent for admin verification. Once verified (usually within <strong>15–30 minutes</strong>), your membership and leads quota will be instantly activated.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutPlanId(null);
                    setPlanStep("summary");
                  }}
                  className="mt-4 px-8 py-3 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-extrabold shadow-md cursor-pointer transition-all"
                >
                  Done / Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
