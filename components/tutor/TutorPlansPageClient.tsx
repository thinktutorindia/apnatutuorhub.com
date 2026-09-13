"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check, ShieldCheck, Zap, Crown, ArrowLeft, Loader2, Award, Sparkles,
  Phone, MessageSquare, Star, ChevronDown, ChevronUp, Lock, RefreshCw,
  Users, UserCheck, CheckCircle2, AlertCircle, ArrowRight, BookOpen,
  GraduationCap, Layers, Tag, Ticket, X, Wallet, Clock
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
    q: "How does the tuition fee structure lead allocation work on the ₹999 Plan?",
    a: "On the ₹999 Growth Plan, leads are dynamically unlocked based on student tuition fees: Lower fee leads (under ₹3,000/month) give you up to 6 leads; standard fee leads (₹3,000 to ₹5,000/month) give you up to 3 leads; higher fee leads (above ₹5,000/month) give you up to 2 high-earning leads. You can also mix and match freely across classes and fees using your 60 plan points!",
  },
  {
    q: "Is there any platform commission on the ₹999 Growth Plan?",
    a: "Zero commission! On the ₹999 Growth Plan, there is 0% platform commission. You keep 100% of all tuition fees you collect from students and parents directly.",
  },
  {
    q: "Can I unlock leads for any class or subject?",
    a: "Yes, 100%! The ₹999 Growth Membership allows you to unlock leads across all classes (Class 1–12, Entrance exams like JEE/NEET, Boards, and all subjects) in your chosen localities or online.",
  },
  {
    q: "What is the validity period of the ₹999 Growth Plan?",
    a: "The ₹999 Growth Plan is valid for 30 Days from activation, giving you full access to unlock students throughout the month.",
  },
  {
    q: "How does the tutor competition cap work?",
    a: "To ensure high conversion and genuine parent response, the ₹999 Growth Plan leads are limited to a maximum of 3 verified tutors only (low competition).",
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
  const [showSpecialOffer, setShowSpecialOffer] = useState(false);

  // Check URL for special retargeting offer flag (e.g. ?offer=99 or ?deal=99)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("offer") === "99" || params.get("deal") === "99" || params.get("deal") === "special") {
        setShowSpecialOffer(true);
      }
    }
  }, []);

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
            Unlock premium verified tuition leads with our <span className="text-emerald-300 font-bold">₹999 Growth Membership</span> — 60 Points, 0% platform commission, and leads delivered by student fee structure!
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

        {/* ⏰ Special Retargeting ₹99 Trial Pass — only shown via special deal link or if currently on STARTER */}
        {(showSpecialOffer || currentPlan === "STARTER") && (
          <div className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-white to-orange-500/10 p-6 sm:p-8 mb-8 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              {/* Left content */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white bg-amber-600 shadow-2xs">
                    ⏰ LIMITED TIME DEAL
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-950 bg-amber-100 border border-amber-300">
                    🎯 Exclusive Retargeting Offer
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540] leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Get 1 Verified Trial Lead for{" "}
                    <span className="text-amber-600">₹99</span>{" "}
                    <span className="text-sm font-semibold text-slate-400 line-through">₹999</span>
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                    One verified lead of ANY class, ANY location · <strong>50% Commission</strong> on 1st month tuition fee.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { icon: '✅', text: '1 Verified Lead' },
                    { icon: '📚', text: 'Any Class (1–12 & Entrance)' },
                    { icon: '📍', text: 'Any Location' },
                    { icon: '🤝', text: '50% Commission on 1st Month Fee' },
                  ].map(item => (
                    <span key={item.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 shadow-2xs">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">*Limited-Time Retargeting Deal: 50% commission applies on the first month tuition fee collected from the parent.</p>
              </div>

              {/* Right CTA */}
              <div className="flex flex-col items-center sm:items-end gap-3 shrink-0 w-full sm:w-auto text-center sm:text-right">
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-[#0F2540]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    ₹99
                  </div>
                  <div className="text-xs font-black text-amber-600 uppercase tracking-wider mt-0.5">
                    Limited Deal · 50% Commission
                  </div>
                  <div className="text-xs text-slate-400 line-through font-medium">Regular ₹999</div>
                  <div className="text-xs text-emerald-600 font-bold mt-0.5">✅ No GST on ₹99 Plan</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCheckout('STARTER')}
                  disabled={isLoading || ['STARTER','BRONZE','SILVER','GOLD','PLATINUM'].includes(currentPlan.toUpperCase())}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm bg-[#0F2540] hover:bg-[#1A3C5E] text-white shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {['STARTER','BRONZE','SILVER','GOLD','PLATINUM'].includes(currentPlan.toUpperCase()) ? '✅ Plan Active' : '🎉 Grab ₹99 Deal'}
                </button>
                <p className="text-[10px] text-slate-400">Exclusive retargeting pass · Instant activation</p>
              </div>
            </div>
          </div>
        )}

        {/* ── ₹999 Growth Membership Plan Card (Primary Active Plan) ── */}
        <div className="max-w-3xl mx-auto w-full rounded-3xl bg-white border-2 border-emerald-400 shadow-xl p-6 sm:p-9 relative ring-4 ring-emerald-400/15 transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black tracking-wide text-white bg-[#0F2540] shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles size={13} className="text-amber-400" />
            <span>PRIMARY TUTOR MEMBERSHIP · 67% OFF</span>
          </div>

          <div className="space-y-6 pt-2">
            {/* Header & Pricing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                    🚀 Growth Plan
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    67% OFF
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0F2540] mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  ₹999 Plan — Leads by Fee Structure
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                  Dynamic lead allocation tailored around parent tuition fees
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="flex items-baseline gap-2 sm:justify-end">
                  <span className="text-4xl sm:text-5xl font-black text-[#0F2540]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    ₹999
                  </span>
                  <span className="text-sm font-semibold text-slate-400 line-through">₹2,999</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  + ₹{getGstAmount(999).toLocaleString('en-IN')} GST = ₹{getPriceWithGst(999).toLocaleString('en-IN')} total
                </div>
                <div className="text-xs font-black text-emerald-700 mt-0.5">
                  🎉 0% Platform Commission
                </div>
              </div>
            </div>

            {/* Fee Structure Quota Allocation Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-600" />
                  Lead Allocation by Parent Monthly Fee
                </span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total 60 Plan Points
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FEE_STRUCTURE_DISTRIBUTION.map((band, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Tier {idx + 1}</span>
                      <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                        {band.badge}
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-[#0F2540]">{band.monthlyRange}</div>
                    <p className="text-[11px] text-slate-600 font-medium leading-snug">{band.feeBand}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                *Lower fee inquiries take 10 points (up to 6 leads), standard ₹3k–₹5k fees take 20 points (up to 3 leads), higher fees take 30 points (up to 2 leads). Mix &amp; match freely!
              </p>
            </div>

            {/* Key Badges & Exclusivity */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                <UserCheck size={14} className="text-blue-600 shrink-0" />
                <span>👥 Low Competition (Max 3 Tutors per Lead)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                <Clock size={14} className="text-slate-500 shrink-0" />
                <span>📅 Valid for 30 Days</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Full Phone &amp; Locality Unlocked</span>
              </span>
            </div>

            {/* Features List */}
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-700">
                {[
                  'Up to 6 Verified Leads by fee structure',
                  'Low Competition: Max 3 Tutors per Lead',
                  '0% Commission — Keep 100% of Student Fees',
                  'Unlock across any class, subject, or location',
                  'Direct Parent WhatsApp & Phone Number',
                  'Expanded Matching Radius (up to 15 km)',
                  'Verified Tutor Badge on Profile',
                  '24/7 Dedicated Support Desk',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <button
                type="button"
                disabled={isLoading || currentPlan === 'BRONZE'}
                onClick={() => handleOpenCheckout('BRONZE')}
                className="w-full py-4 rounded-2xl text-base font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#0F2540] hover:bg-[#1A3C5E] text-white shadow-lg active:scale-98 flex items-center justify-center gap-2"
              >
                {currentPlan === 'BRONZE' ? '✅ Plan Active (Growth Plan)' : '🎉 Select Growth Plan — ₹999'}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
                Instant activation upon payment verification · Low competition guarantee
              </p>
            </div>
          </div>
        </div>

        {/* Asterisk Footnote */}
        <div className="text-center pt-6 text-xs font-semibold text-slate-500 max-w-3xl mx-auto">
          *Lead quota on the ₹999 Growth Plan dynamically adapts based on parent tuition fee budget: <strong>Lower fee tuition (&lt; ₹3,000/mo: up to 6 leads)</strong>, <strong>Standard tuition (₹3,000–₹5,000/mo: up to 3 leads)</strong>, and <strong>Higher tuition (&gt; ₹5,000/mo: up to 2 high-earning leads)</strong>. You can mix and match classes freely using your 60 plan points.
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
              On the ₹999 Growth Plan, leads are dynamically unlocked based on the student requirement&apos;s monthly tuition fee. Lower fee inquiries give you up to 6 leads, while higher fee inquiries give you high-earning student tuitions.
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
              {showSpecialOffer ? "Plan Feature Matrix Comparison" : "₹999 Growth Membership Details & Benefits"}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {showSpecialOffer ? "Compare our Limited-Time Trial Deal and the Flagship Growth Membership" : "Complete specifications and verified lead guarantee of the ₹999 Growth Plan"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#0F2540] font-black">
                  <th className="py-3.5 px-4">Feature / Benefit</th>
                  {showSpecialOffer && (
                    <th className="py-3.5 px-4 text-center">Trial Pass <span className="text-orange-600 font-black">₹99</span> <span className="text-slate-400 line-through text-[10px]">₹999</span></th>
                  )}
                  <th className="py-3.5 px-4 text-center bg-emerald-50/60 text-emerald-950 font-black">Growth Plan <span className="text-emerald-700 font-black">₹999</span> <span className="text-slate-400 line-through text-[10px]">₹2,999</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Total Lead Allocation</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">1 Verified Lead (Any class)</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-800 bg-emerald-50/20">Up to 6 Leads* (by fee structure)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Lower Fee Leads (&lt; ₹3,000/mo)</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">1 Lead</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-black text-emerald-700 bg-emerald-50/20">Up to 6 Leads (10 pts/lead)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Standard Fee Leads (₹3,000–₹5,000/mo)</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">1 Lead</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-black text-emerald-700 bg-emerald-50/20">Up to 3 Leads (20 pts/lead)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Higher Fee Leads (&gt; ₹5,000/mo)</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">1 Lead</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-black text-emerald-700 bg-emerald-50/20">Up to 2 Leads (30 pts/lead)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Platform Commission</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-black text-amber-700">🤝 50% Commission</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-black text-emerald-600 bg-emerald-50/20">🎉 0% (Keep 100% Fees)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Lead Competition Cap</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center text-slate-600 font-bold">👥 Max 5 Tutors</td>
                  )}
                  <td className="py-3.5 px-4 text-center text-blue-700 font-bold bg-emerald-50/20">👥 Low Competition (Max 3 Tutors)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Plan Validity</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">30 Days</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 bg-emerald-50/20">30 Days</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Parent Phone &amp; Locality</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  )}
                  <td className="py-3.5 px-4 text-center bg-emerald-50/20"><Check size={16} className="mx-auto text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Matching Radius</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">10 km</td>
                  )}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 bg-emerald-50/20">15 km</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Support Assistance</td>
                  {showSpecialOffer && (
                    <td className="py-3.5 px-4 text-center text-slate-600">Standard Support</td>
                  )}
                  <td className="py-3.5 px-4 text-center text-emerald-700 font-bold bg-emerald-50/20">Dedicated 24/7 Support Desk</td>
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
              All lead allowances (<strong>Growth Plan: up to 6 leads by fee structure</strong>), 0% platform commission terms, validity (30 days), and the low-competition tutor cap (max 3 tutors) are governed by our platform terms.
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
