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
import { useSeniorTutor } from "@/components/tutor/SeniorTutorContext";

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
    q: "Is the ₹2,999 Without-Commission / 0% Commission Plan still available?",
    a: "No. The without-commission (0% commission) plans have been officially closed and discontinued. All verified tutors join through the official Commission Based Plan (₹1,257), ensuring low upfront risk and long 6-month validity.",
  },
  {
    q: "Can I unlock leads for any class or subject on the Commission Plan?",
    a: "Yes, 100%! The ₹1,257 Commission Plan allows you to unlock leads across all classes (Class 1–12, Entrance exams like JEE/NEET, Boards, and all subjects) in your chosen localities or online.",
  },
  {
    q: "What is the validity period of the ₹1,257 Commission Plan?",
    a: "The Commission Based Plan is valid for a full 6 Months (180 Days) from activation, giving you ample time to connect with students and parents.",
  },
  {
    q: "How does the tutor competition cap work on leads?",
    a: "To ensure high conversion and genuine parent response, leads are limited to a maximum of 3 verified tutors only (low competition).",
  },
  {
    q: "Are parent phone numbers and addresses verified?",
    a: "Parent inquiries are posted by verified accounts with a registered mobile number. If a number is found unreachable, full lead credit protection applies under our platform terms.",
  },
];

export function TutorPlansPageClient({ currentPlan, expiresAt, leadsUsedThisMonth }: Props) {
  const { lang, t } = useSeniorTutor();
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

  // Celebratory Post-Payment Success Dialog State
  const [paymentSuccess, setPaymentSuccess] = useState<{
    orderId: string;
    paymentId: string;
    planName: string;
    amount: number;
    leads: number;
    expiresAt?: string;
  } | null>(null);

  const activePlanKey = currentPlan.toUpperCase() as SubscriptionPlanId;
  const activePlanConfig = SUBSCRIPTION_PLANS[activePlanKey] ?? null;
  const isPlanActive = Boolean(
    activePlanConfig &&
    expiresAt &&
    new Date(expiresAt) > new Date()
  );

  // Auto-open checkout if requested via URL param (e.g. from WhatsApp 1-click link)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("checkout") === "STARTER" && !isPlanActive) {
      handleOpenCheckout("STARTER");
    }
  }, [isPlanActive]);

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
        const verifyData = await verifyRes.json();
        setPaymentSuccess({
          orderId: mockOrderId,
          paymentId: mockPaymentId,
          planName: SUBSCRIPTION_PLANS[planId].name,
          amount: SUBSCRIPTION_PLANS[planId].priceInr,
          leads: SUBSCRIPTION_PLANS[planId].totalLeads,
          expiresAt: verifyData.expiresAt,
        });
        setCheckoutPlanId(null);
        setIsLoading(false);
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
      const codeToSend = appliedCoupon?.code || (couponCode.trim() ? couponCode.trim().toUpperCase() : undefined);
      const res = await fetch("/api/tutor/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, couponCode: codeToSend }),
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
            const verifyData = await verifyRes.json();
            setPaymentSuccess({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              planName: SUBSCRIPTION_PLANS[planId].name,
              amount: data.totalAmount ?? (appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[planId].priceInr),
              leads: SUBSCRIPTION_PLANS[planId].totalLeads,
              expiresAt: verifyData.expiresAt,
            });
            setCheckoutPlanId(null);
            setIsLoading(false);
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
        setPlanStep("qr_payment");
      }
    } catch (err: any) {
      console.warn("Razorpay error", err);
      setErrorMessage(err.message || "Could not open online payment gateway. You can also pay via UPI QR below.");
      setPlanStep("qr_payment");
    } finally {
      setIsLoading(false);
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
      <div className="relative overflow-hidden rounded-3xl pt-10 pb-14 px-5 sm:px-10 shadow-2xl text-white" style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0F2540 40%, #0D1F35 70%, #070D1A 100%)' }}>
        {/* Animated glow orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(16,185,129,0.08) 50%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-yellow-300 text-xs font-black backdrop-blur-md" style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)' }}>
            <Crown size={14} className="text-yellow-400" />
            <span>{lang === "hi" ? "सत्यापित लीड मेंबरशिप प्लान" : "Verified Lead Membership Plans"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {lang === "hi" ? (
              <>अपना प्लान चुनें और पाएं <span style={{ background: 'linear-gradient(90deg, #FBBF24, #F59E0B, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>एक्सक्लूसिव ट्यूशन लीड्स</span></>
            ) : (
              <>Choose Your Plan &amp; Win <span style={{ background: 'linear-gradient(90deg, #FBBF24, #F59E0B, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Exclusive Tuition Leads</span></>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            {lang === "hi" ? (
              <>हमारे आधिकारिक <span className="text-emerald-300 font-bold">कमीशन आधारित प्लान</span> के साथ सत्यापित छात्र लीड्स अनलॉक करें — 5 सत्यापित लीड्स, 6 महीने की वैधता, मात्र ₹1,257 पंजीकरण शुल्क और सीधे अभिभावक संपर्क!</>
            ) : (
              <>Start unlocking verified student leads with our official <span className="text-emerald-300 font-bold">Commission Based Plan</span> — 5 Verified Leads, 6 Months validity, low ₹1,257 registration, and direct parent contacts!</>
            )}
          </p>

          {activePlanConfig && isPlanActive && (
            <div className="inline-flex flex-wrap justify-center items-center gap-3 px-5 py-3 rounded-2xl border" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)' }}>
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                {lang === "hi" ? "सक्रिय प्लान:" : "Active Plan:"} <span className="text-emerald-300 font-extrabold">{activePlanConfig.name}</span>
              </div>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="text-xs text-slate-200 font-semibold">{lang === "hi" ? "5 लीड्स अनलॉक" : "5 Leads Unlocked"}</span>
              {expiresAt && (
                <>
                  <span className="text-slate-500 hidden sm:inline">·</span>
                  <span className="text-xs text-emerald-200 font-semibold">
                    {lang === "hi" ? "वैधता तिथि:" : "Valid Until:"} {new Date(expiresAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </>
              )}
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
                  <span>{lang === "hi" ? "कमीशन आधारित प्लान" : "COMMISSION BASED PLAN"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-emerald-950 bg-white/90 border border-emerald-300 shadow-2xs">
                  <Clock size={13} className="text-emerald-700" />
                  <span>{lang === "hi" ? "6 महीने की लंबी वैधता" : "6 Months Long Validity"}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-amber-900 bg-amber-100/90 border border-amber-300">
                  {lang === "hi" ? "⚡ पंजीकरण पर 50% छूट" : "⚡ 50% OFF REGISTRATION"}
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F2540] leading-tight tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {lang === "hi" ? "कमीशन आधारित प्लान — " : "Commission Based Plan — "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">₹1,257</span>{" "}
                  <span className="text-base sm:text-lg font-bold text-slate-400 line-through">₹2,500</span>
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                  {lang === "hi" ? (
                    <>
                      <strong className="text-emerald-900">5 सत्यापित छात्र लीड्स</strong> अनलॉक करने के लिए मात्र <strong className="text-emerald-900">₹1,257</strong> के कम पंजीकरण शुल्क और <strong className="text-slate-900">6 महीने की वैधता</strong> के साथ शुरुआत करें।
                      <br className="hidden sm:inline" /> प्लेटफ़ॉर्म कमीशन: <strong>पहले महीने के ट्यूशन शुल्क का 50%</strong>, और <strong>दूसरे महीने से प्रति माह 5% आवर्ती कमीशन</strong>।
                    </>
                  ) : (
                    <>
                      Start with a low upfront fee of <strong className="text-emerald-900">₹1,257</strong> for <strong className="text-slate-900">6 Months validity</strong> to unlock <strong className="text-emerald-900">5 verified student leads</strong>.
                      <br className="hidden sm:inline" /> Platform commission: <strong>50% of 1st month tuition fee</strong>, and <strong>5% recurring commission every month from 2nd month onwards</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* Feature Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {[
                  { icon: '✅', text: lang === "hi" ? '5 सत्यापित लीड्स अनलॉक' : '5 Verified Leads Unlock', color: 'bg-emerald-500/10 border-emerald-300 text-emerald-950' },
                  { icon: '📅', text: lang === "hi" ? '6 महीने (180 दिन)' : '6 Months (180 Days)', color: 'bg-blue-500/10 border-blue-300 text-blue-950' },
                  { icon: '🤝', text: lang === "hi" ? '50% पहले महीने का शुल्क' : '50% 1st Month Fee', color: 'bg-amber-500/10 border-amber-300 text-amber-950' },
                  { icon: '🔄', text: lang === "hi" ? '5% दूसरे माह से' : '5% Monthly from 2nd Mo', color: 'bg-teal-500/10 border-teal-300 text-teal-950' },
                  { icon: '📍', text: lang === "hi" ? '5 किमी नज़दीक या ऑनलाइन' : '5km Nearby or Online', color: 'bg-sky-500/10 border-sky-300 text-sky-950' },
                  { icon: '📞', text: lang === "hi" ? 'सीधा अभिभावक संपर्क' : 'Direct Parent Contact', color: 'bg-purple-500/10 border-purple-300 text-purple-950' },
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
            {isPlanActive ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/95 border-2 border-emerald-500 shadow-xl text-center shrink-0 w-full lg:w-80 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-2xl shadow-inner">
                  👑
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    ✅ Your Membership is Active
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0F2540] mt-2">
                    Commission Plan
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">
                    5 Verified Leads Unlocked
                  </div>
                </div>

                <div className="w-full text-xs text-slate-600 font-semibold space-y-1.5 py-2 border-y border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-black text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valid Until:</span>
                    <span className="font-black text-slate-900">
                      {expiresAt ? new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "6 Months"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Available Leads:</span>
                    <span className="font-black text-emerald-700">5 Student Leads</span>
                  </div>
                </div>

                <Link
                  href="/tutor/leads"
                  className="w-full py-3.5 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-600/30 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Browse Student Leads</span>
                  <ArrowRight size={16} />
                </Link>
                <p className="text-[10px] text-slate-500 font-bold">Direct parent contact numbers ready to unlock</p>
              </div>
            ) : (
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
                  <span>🤝 Select Commission Plan</span>
                  <ArrowRight size={16} />
                </button>
                <p className="text-[10px] text-slate-400 font-semibold">Instant unlock for 5 verified student leads</p>
              </div>
            )}
          </div>
        </div>

        {/* ── NOTICE REGARDING ZERO-COMMISSION PLANS (DISCONTINUED) ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-6 text-center text-xs text-slate-600 max-w-xl mx-auto mb-10 shadow-xs">
          <p className="font-extrabold text-[#0F2540] flex items-center justify-center gap-1.5 text-sm">
            <span>🔒</span>
            <span>Prepaid Zero-Commission Plans are Closed</span>
          </p>
          <p className="mt-2 leading-relaxed text-slate-500">
            Platform par bina commission wale prepaid tiers band kar diye gaye hain. Sabhi verified teachers exclusively official <strong>Commission Based Plan (₹1,257)</strong> se start kar sakte hain jisme 6 Months validity aur 5 verified student leads milti hain.
          </p>
        </div>
        {/* If Membership is already Active: Show Clean High-Satisfaction Active Member View */}
        {isPlanActive ? (
          <div className="space-y-8 mt-6">
            {/* Quick 4-Step Senior Teacher Guide */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {lang === "hi" ? "चरण-दर-चरण मार्गदर्शिका" : "Step-by-Step Guide"}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F2540] mt-2">
                  {lang === "hi" ? "विद्यार्थी लीड्स कैसे अनलॉक करें? (4 आसान चरण)" : "How to Unlock Student Leads? (4 Simple Steps)"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {lang === "hi" 
                    ? "आपके पास 5 सत्यापित छात्र लीड अनलॉक करने का कोटा है। अभिभावकों से संपर्क करने के आसान चरण:"
                    : "You have a quota to unlock 5 verified student leads. Simple steps to connect with parents:"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                    1
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    {lang === "hi" ? "1. छात्र आवश्यकताएं देखें" : "1. View Student Inquiries"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === "hi" ? "अपने विषय और 5 किमी के दायरे में नए छात्रों की जरूरतें देखें।" : "Check student requirements in your subjects and within 5 km."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm">
                    2
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    {lang === "hi" ? "2. अभिभावक नंबर अनलॉक करें" : "2. Unlock Parent Contact"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === "hi" ? "'View Parent Contact Details' दबाएं, अभिभावक का फोन नंबर और पता तुरंत दिखेगा।" : "Click 'View Parent Contact Details'. Direct phone number & address appear instantly."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-sm">
                    3
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    {lang === "hi" ? "3. अभिभावक को कॉल करें" : "3. Call Parent Directly"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === "hi" ? "सीधा कॉल या व्हाट्सएप करें, बात करें और मुफ्त डेमो क्लास तय करें।" : "Call or WhatsApp directly, discuss student needs, and schedule a demo class."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center text-sm">
                    4
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    {lang === "hi" ? "4. पढ़ाना शुरू करें" : "4. Start Tutoring"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === "hi" ? "सफल डेमो के बाद ट्यूशन शुरू करें और मासिक फीस प्राप्त करें।" : "Start regular classes after demo and earn your monthly tuition fees."}
                  </p>
                </div>
              </div>

              {/* Dedicated Support Card */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                    📞
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900">
                      {lang === "hi" ? "समर्पित ट्यूटर समन्वयक सहायता" : "Dedicated Tutor Coordinator Support"}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {lang === "hi" ? "कोई भी परेशानी हो, सीधा व्हाट्सएप पर संपर्क करें: +91 93191 93109" : "Need help? Reach out directly on WhatsApp: +91 93191 93109"}
                    </p>
                  </div>
                </div>
                <a
                  href="https://wa.me/919319193109?text=Namaste%2C%20main%20verified%20tutor%20hoon%20ApnaTutorHub%20par.%20Mujhe%20madad%20chahiye."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-black shrink-0 inline-flex items-center gap-2 shadow-sm"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp Coordinator</span>
                </a>
              </div>
            </div>

            {/* Active Tutors FAQ */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-slate-900">
                {lang === "hi" ? "सत्यापित शिक्षकों के लिए सामान्य प्रश्न" : "Common Questions for Verified Tutors"}
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900">
                    {lang === "hi" ? "मेरे 5 लीड्स खत्म होने के बाद क्या होगा?" : "What happens after my 5 leads are used?"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {lang === "hi" ? "5 सत्यापित लीड्स का उपयोग करने के बाद, आप कॉइन वॉलेट से तुरंत नए लीड्स अनलॉक कर सकते हैं या रिन्यू कर सकते हैं।" : "Once your 5 verified leads are used, you can top up coins in your wallet to unlock more leads or renew your plan."}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900">
                    {lang === "hi" ? "यदि अभिभावक ने कॉल नहीं उठाया या लीड में समस्या हुई?" : "What if a parent does not answer or the lead has an issue?"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {lang === "hi" ? "लीड कार्ड पर 'Request Refund' का विकल्प होता है। हमारी टीम जांच करके आपका लीड क्रेडिट तुरंत वापस कर देती है।" : "Each lead card has a 'Request Refund' option. Our support team verifies and restores your lead credit promptly."}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900">
                    {lang === "hi" ? "कमीशन कब और कैसे देना होता है?" : "When and how is commission paid?"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {lang === "hi" ? "जब छात्र से पहले महीने की ट्यूशन फीस मिल जाती है, तब 50% कमीशन UPI द्वारा भेजा जाता है। दूसरे महीने से सिर्फ 5% प्लेटफॉर्म फीस होती है।" : "Platform commission (50%) is paid via UPI only after you receive the first month's student fees. From the 2nd month onwards, a small 5% recurring fee applies."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            {/* Transparent Terms Callout */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#0F2540] flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#2D9E6B]" />
                  <span>{lang === "hi" ? "पारदर्शी नियम और सत्यापित लीड गारंटी" : "Transparent Terms & Verified Lead Guarantee"}</span>
                </h4>
                <p className="text-xs font-medium text-slate-600 max-w-2xl leading-relaxed">
                  {lang === "hi"
                    ? "कमीशन प्लान में 5 सत्यापित लीड्स, 6 महीने की वैधता, और अधिकतम 3 शिक्षक प्रति लीड का नियम शामिल है।"
                    : "The Commission Plan includes 5 verified leads, 6 months validity, and low competition (maximum 3 tutors per lead)."}
                </p>
              </div>
              <Link
                href="/terms"
                className="px-5 py-2.5 rounded-xl bg-[#0F2540] hover:bg-[#1b3a60] !text-white text-xs font-black whitespace-nowrap transition-all shadow-md shrink-0 inline-flex items-center justify-center"
                style={{ color: "#ffffff" }}
              >
                {lang === "hi" ? "पूरे नियम और शर्तें देखें →" : "View Full Terms & Conditions →"}
              </Link>
            </div>
          </div>
        )}

        {/* ── FAQ ACCORDION SECTION ── */}
        <div className="mt-14 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-[#0F2540]">
              {lang === "hi" ? "अक्सर पूछे जाने वाले प्रश्न" : "Frequently Asked Questions"}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {lang === "hi" ? "लीड प्लान और वैधता के बारे में अक्सर पूछे जाने वाले सवाल" : "Got questions about our lead plans and validity?"}
            </p>
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

                                  {/* Action Buttons / Online Checkout & QR Payment Flow */}
                                  {planStep === "summary" && (
                                    <div className="pt-3 border-t border-gray-200 space-y-2.5">
                                      <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => handleRazorpaySubscribe(checkoutPlanId)}
                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 !text-white text-xs font-900 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                                      >
                                        <Zap size={15} className="!text-white" />
                                        <span className="!text-white font-900">
                                          Pay Online (Instant Activation) — ₹{(
                                            SUBSCRIPTION_PLANS[checkoutPlanId].noGst
                                              ? (appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr)
                                              : getPriceWithGst(appliedCoupon ? appliedCoupon.finalAmountInr : SUBSCRIPTION_PLANS[checkoutPlanId].priceInr)
                                          ).toLocaleString("en-IN")} →
                                        </span>
                                      </button>

                                      <div className="flex items-center gap-2 my-1">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setPlanStep("qr_payment")}
                                        className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                      >
                                        <Lock size={13} className="text-gray-500" />
                                        <span>Pay via Kotak UPI QR (Offline / Screenshot Transfer)</span>
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
                            {/* ── CELEBRATORY PAYMENT SUCCESS MODAL ── */}
                            {paymentSuccess && (
                              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
                                <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl w-full max-w-md relative p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
                                  {/* Glowing checkmark badge */}
                                  <div className="relative mx-auto w-20 h-20">
                                    <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
                                      <CheckCircle2 size={42} strokeWidth={2.5} />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200">
                                      ✅ Payment Verified &amp; Captured
                                    </span>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight pt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                      Membership Activated! 🎉
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                                      Congratulations! You are now a <strong>Verified ApnaTutorHub Teacher</strong>. Your 5 student leads quota has been unlocked immediately.
                                    </p>
                                  </div>

                                  {/* Receipt Summary Card */}
                                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-bold text-slate-700 shadow-2xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                      <span className="text-slate-500">Plan:</span>
                                      <span className="text-slate-900 font-black">{paymentSuccess.planName}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                      <span className="text-slate-500">Amount Paid:</span>
                                      <span className="text-emerald-700 font-black text-sm">₹{paymentSuccess.amount.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                      <span className="text-slate-500">Payment ID:</span>
                                      <span className="text-slate-900 font-mono text-[11px] select-all bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {paymentSuccess.paymentId}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                                      <span className="text-slate-500">Leads Unlocked:</span>
                                      <span className="text-emerald-700 font-black">5 Verified Student Leads*</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-slate-500">Validity:</span>
                                      <span className="text-slate-900 font-black">
                                        {paymentSuccess.expiresAt
                                          ? new Date(paymentSuccess.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                          : "6 Months (180 Days)"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Call to Actions */}
                                  <div className="space-y-2 pt-1">
                                    <Link
                                      href="/tutor/leads"
                                      className="w-full py-3.5 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-98"
                                    >
                                      <span>Browse Your 5 Student Leads Now</span>
                                      <ArrowRight size={16} />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.location.href = "/tutor/dashboard?subscription=activated";
                                      }}
                                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      Go to Dashboard
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          );
}
