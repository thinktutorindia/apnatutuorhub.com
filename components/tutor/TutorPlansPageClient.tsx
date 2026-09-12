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
    q: "How does the flexible class lead system work?",
    a: "Every membership plan gives you a lead allowance scaled to that tier: Bronze (10 Leads*), Silver (15 Leads*), Gold (20 Leads*), and Platinum VIP (30 Leads*). Leads can be unlocked across ANY class grade. Since higher classes have greater tuition value, unlocking primary (Class 1–5) gives the full count, while senior secondary or entrance preparation scales proportionally. You can mix and match classes freely!",
  },
  {
    q: "Can I unlock leads for any class in Bronze, Silver, Gold, or Platinum?",
    a: "Yes, 100%! All 4 membership plans allow you to unlock leads across all classes (Class 1–12, Entrance, Boards, and all subjects). The difference between the plans is the lead volume and tutor competition level: Bronze (10 leads • max 5 tutors), Silver (15 leads • max 3 tutors), Gold (20 leads • max 2 tutors), and Platinum VIP (30 leads • 100% Solo Exclusive).",
  },
  {
    q: "What is the validity period for each plan?",
    a: "Bronze Plan is valid for 1 Month, Silver Plan is valid for 2 Months, Gold Plan is valid for 2 Months, and Platinum VIP Plan is valid for 3 Months.",
  },
  {
    q: "How does the Platinum 100% Solo Exclusivity Lock work?",
    a: "When a Platinum VIP tutor unlocks a lead, the lead is immediately closed and locked against all other tutors. No other tutor can view parent contact details or send proposals. You get 100% exclusive 1-on-1 access to the parent for maximum conversion without competition.",
  },
  {
    q: "How do tutor competition caps work for Bronze, Silver, and Gold?",
    a: "To ensure high conversion rates: Bronze leads are shared with up to 5 verified tutors; Silver leads are limited to max 3 tutors; Gold leads are semi-exclusive with max 2 tutors. Platinum VIP is 100% solo exclusive (1 tutor only).",
  },
  {
    q: "Are parent phone numbers and addresses verified?",
    a: "Parent inquiries are posted by signed-in accounts with a registered mobile number. We do not currently run SMS OTP. If a number is found unreachable, full coin refund protection applies under our terms.",
  },
];

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
      <div className="relative overflow-hidden rounded-3xl pt-10 pb-14 px-5 sm:px-10 shadow-2xl" style={{background: 'linear-gradient(135deg, #0A0F1E 0%, #0F2540 40%, #0D1F35 70%, #070D1A 100)'}}>
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
            Unlock student inquiries across ANY class.
            <span className="text-amber-300 font-bold"> Bronze</span> (10 leads • 5 tutors • 1M) ·
            <span className="text-slate-200 font-bold"> Silver</span> (15 leads • 3 tutors • 2M) ·
            <span className="text-yellow-300 font-bold"> Gold</span> (20 leads • 2 tutors • 2M) ·
            <span className="text-amber-400 font-bold"> Platinum VIP</span> (30 leads · 👑 Solo Exclusive · 3M)
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


        {/* 🎉 Festival Season ₹99 First-Time Pass Hero Card */}
        {currentPlan === "NONE" && (
          <div className="relative overflow-hidden rounded-3xl p-[2px] mb-2 shadow-2xl" style={{background: 'linear-gradient(135deg, #F97316, #FBBF24, #F97316)'}}>
            <div className="relative overflow-hidden rounded-[22px] p-5 sm:p-7" style={{background: 'linear-gradient(135deg, #1A0A00 0%, #2D1200 40%, #1A0800 100%)'}}>
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)', transform: 'translate(20%, -20%)'}} />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', transform: 'translate(-20%, 20%)'}} />

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                {/* Left content */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black text-white" style={{background: 'linear-gradient(90deg, #F97316, #EA580C)'}}>
                      🔥 LIMITED FESTIVAL OFFER
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black text-yellow-300 border" style={{background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)'}}>
                      🌟 First-Time Tutor Welcome Pass
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight" style={{fontFamily: "'Poppins', sans-serif"}}>
                      Get Your First Lead for{' '}
                      <span style={{background: 'linear-gradient(90deg, #F97316, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>₹99</span>{' '}
                      <span className="text-sm font-bold text-slate-500 line-through">₹999</span>
                    </h2>
                    <p className="text-[13px] text-slate-300 mt-1">One verified lead of ANY class, ANY location — this festival season!</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: '✅', text: '1 Verified Lead' },
                      { icon: '📚', text: 'Any Class (1–12)' },
                      { icon: '📍', text: 'Any Location' },
                      { icon: '💰', text: '30% Commission (1st Month)' },
                    ].map(item => (
                      <span key={item.text} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-orange-200 border" style={{background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.25)'}}>
                        {item.icon} {item.text}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">*30% commission from first month fee once tuition confirmed. Festival discounts on next plans.</p>
                </div>

                {/* Right CTA */}
                <div className="flex flex-col items-center gap-3 shrink-0 sm:min-w-[160px]">
                  <div className="text-center">
                    <div className="text-5xl font-black" style={{fontFamily: "'Poppins', sans-serif", background: 'linear-gradient(90deg, #F97316, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>₹99</div>
                    <div className="text-[11px] font-black text-orange-300 uppercase tracking-widest mt-0.5">90% OFF · Festival</div>
                    <div className="text-[10px] text-slate-500 line-through">Regular ₹999</div>
                    <div className="text-[10px] text-emerald-400 font-bold">✅ No GST</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout('STARTER')}
                    disabled={isLoading || ['STARTER','BRONZE','SILVER','GOLD','PLATINUM'].includes(currentPlan.toUpperCase())}
                    className="w-full px-6 py-3.5 rounded-xl font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{background: 'linear-gradient(135deg, #F97316, #FBBF24)', color: '#1A0800', boxShadow: '0 8px 32px rgba(249,115,22,0.4)'}}
                  >
                    {['STARTER','BRONZE','SILVER','GOLD','PLATINUM'].includes(currentPlan.toUpperCase()) ? '✅ Plan Active' : '🎉 Grab This — ₹99'}
                  </button>
                  <p className="text-[9px] text-slate-600 text-center">No hidden charges · Instant activation</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 Plans Grid — unified dark glassmorphism theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pt-4">

          {/* ── BRONZE ── */}
          <div className="rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{background: 'linear-gradient(160deg, #1C1408 0%, #2A1E08 50%, #1A1206 100%)', border: '1.5px solid rgba(217,119,6,0.4)'}}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(217,119,6,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)'}} />
            <div className="p-5 space-y-4 relative z-10">
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{background: 'rgba(217,119,6,0.2)', color: '#FBBF24', border: '1px solid rgba(217,119,6,0.4)'}}>🥉 Bronze Tier</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background: 'linear-gradient(90deg, #16A34A, #15803D)', color: '#fff'}}>50% OFF</span>
                </div>
                <h3 className="text-xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>Bronze Plan</h3>
                <p className="text-[11px] text-amber-200/60">Essential entry tier for all subjects</p>
              </div>
              {/* Competition badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.25)', color: '#FCD34D'}}>
                <Users size={13} className="shrink-0" />
                <span>👥 Shared — max 5 tutors</span>
              </div>
              {/* Pricing */}
              <div className="py-3 space-y-1" style={{borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>₹2,999</span>
                  <span className="text-sm font-bold line-through" style={{color: 'rgba(251,191,36,0.4)'}}>₹6,000</span>
                </div>
                <p className="text-[10px] text-amber-200/50">+ ₹{getGstAmount(2999).toLocaleString('en-IN')} GST = <strong className="text-amber-200/80">₹{getPriceWithGst(2999).toLocaleString('en-IN')} total</strong></p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold" style={{background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)'}}>⚡ 10 Leads*</span>
                  <span className="text-[10px]" style={{color: 'rgba(251,191,36,0.5)'}}>• 1 Month</span>
                </div>
              </div>
              {/* Features */}
              <ul className="space-y-2">
                {['10 Verified Leads* included','Shared with up to 5 tutors','Any class or subject','Full Parent Contact','Distance Matching 10km','24/7 Support Desk'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px]" style={{color: 'rgba(253,230,138,0.75)'}}>
                    <span className="mt-0.5 shrink-0 text-amber-400">✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* CTA */}
            <div className="p-5 pt-0 relative z-10">
              <button type="button" disabled={isLoading || currentPlan === 'BRONZE'} onClick={() => handleOpenCheckout('BRONZE')}
                className="w-full py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={currentPlan === 'BRONZE' ? {background: 'rgba(255,255,255,0.05)', color: '#92400E', border: '1px solid rgba(217,119,6,0.3)'} : {background: 'linear-gradient(135deg, #D97706, #FBBF24)', color: '#1C0F00', boxShadow: '0 4px 20px rgba(217,119,6,0.35)'}}>
                {currentPlan === 'BRONZE' ? '✅ Active Plan' : 'Select Bronze Plan'}
              </button>
            </div>
          </div>

          {/* ── SILVER ── */}
          <div className="rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{background: 'linear-gradient(160deg, #0D1520 0%, #162030 50%, #0A1218 100%)', border: '1.5px solid rgba(99,102,241,0.45)'}}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)'}} />
            <div className="p-5 space-y-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.4)'}}>🥈 Silver Tier</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background: 'linear-gradient(90deg, #16A34A, #15803D)', color: '#fff'}}>25% OFF</span>
                </div>
                <h3 className="text-xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>Silver Plan</h3>
                <p className="text-[11px]" style={{color: 'rgba(165,180,252,0.6)'}}>Low competition for steady leads</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC'}}>
                <UserCheck size={13} className="shrink-0" />
                <span>👥 Low Competition — max 3 tutors</span>
              </div>
              <div className="py-3 space-y-1" style={{borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>₹6,750</span>
                  <span className="text-sm font-bold line-through" style={{color: 'rgba(165,180,252,0.4)'}}>₹9,000</span>
                </div>
                <p className="text-[10px]" style={{color: 'rgba(165,180,252,0.5)'}}>+ ₹{getGstAmount(6750).toLocaleString('en-IN')} GST = <strong style={{color: 'rgba(165,180,252,0.8)'}}>₹{getPriceWithGst(6750).toLocaleString('en-IN')} total</strong></p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold" style={{background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)'}}>⚡ 15 Leads*</span>
                  <span className="text-[10px]" style={{color: 'rgba(165,180,252,0.5)'}}>• 2 Months</span>
                </div>
              </div>
              <ul className="space-y-2">
                {['15 Verified Leads* included','Max 3 Tutors per Lead','Any class or subject','Direct Parent Call & Chat','Expanded Radius 15km','Priority Feed +1,500 Boost'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px]" style={{color: 'rgba(199,210,254,0.75)'}}>
                    <span className="mt-0.5 shrink-0" style={{color: '#818CF8'}}>✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 pt-0 relative z-10">
              <button type="button" disabled={isLoading || currentPlan === 'SILVER'} onClick={() => handleOpenCheckout('SILVER')}
                className="w-full py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={currentPlan === 'SILVER' ? {background: 'rgba(255,255,255,0.05)', color: '#4F46E5', border: '1px solid rgba(99,102,241,0.3)'} : {background: 'linear-gradient(135deg, #4F46E5, #818CF8)', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,0.4)'}}>
                {currentPlan === 'SILVER' ? '✅ Active Plan' : 'Select Silver Plan'}
              </button>
            </div>
          </div>

          {/* ── GOLD — Most Popular ── */}
          <div className="rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{background: 'linear-gradient(160deg, #1A1400 0%, #2A2000 50%, #150F00 100%)', border: '2px solid rgba(251,191,36,0.7)', boxShadow: '0 0 40px rgba(251,191,36,0.12)'}}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black tracking-wider uppercase whitespace-nowrap z-20" style={{background: 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)', color: '#1A0F00', boxShadow: '0 4px 12px rgba(251,191,36,0.5)'}}>🔥 Most Popular</div>

            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[70px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)', transform: 'translate(30%, -30%)'}} />
            <div className="p-5 pt-7 space-y-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{background: 'rgba(251,191,36,0.2)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.4)'}}>🥇 Gold Tier</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background: 'linear-gradient(90deg, #16A34A, #15803D)', color: '#fff'}}>25% OFF</span>
                </div>
                <h3 className="text-xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>Gold Plan</h3>
                <p className="text-[11px]" style={{color: 'rgba(253,230,138,0.6)'}}>Semi-exclusive for busy tutors</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#FCD34D'}}>
                <Lock size={13} className="shrink-0" />
                <span>🔒 Semi-Exclusive — max 2 tutors</span>
              </div>
              <div className="py-3 space-y-1" style={{borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>₹9,000</span>
                  <span className="text-sm font-bold line-through" style={{color: 'rgba(251,191,36,0.4)'}}>₹12,000</span>
                </div>
                <p className="text-[10px]" style={{color: 'rgba(253,230,138,0.5)'}}>+ ₹{getGstAmount(9000).toLocaleString('en-IN')} GST = <strong style={{color: 'rgba(253,230,138,0.8)'}}>₹{getPriceWithGst(9000).toLocaleString('en-IN')} total</strong></p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold" style={{background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)'}}>⚡ 20 Leads*</span>
                  <span className="text-[10px]" style={{color: 'rgba(253,230,138,0.5)'}}>• 2 Months</span>
                </div>
              </div>
              <ul className="space-y-2">
                {['20 Verified Leads* included','Semi-Exclusive: Max 2 Tutors (2× conversion)','Any class or subject','High Priority Feed +3,000 Boost','Instant WhatsApp Alerts','🪙 +50 Bonus Wallet Coins'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px]" style={{color: 'rgba(253,230,138,0.75)'}}>
                    <span className="mt-0.5 shrink-0 text-yellow-400">✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 pt-0 relative z-10">
              <button type="button" disabled={isLoading || currentPlan === 'GOLD'} onClick={() => handleOpenCheckout('GOLD')}
                className="w-full py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={currentPlan === 'GOLD' ? {background: 'rgba(255,255,255,0.05)', color: '#92400E', border: '1px solid rgba(251,191,36,0.3)'} : {background: 'linear-gradient(135deg, #F59E0B, #FBBF24, #F59E0B)', color: '#1A0F00', boxShadow: '0 4px 24px rgba(251,191,36,0.45)'}}>
                {currentPlan === 'GOLD' ? '✅ Active Plan' : 'Select Gold Plan'}
              </button>
            </div>
          </div>

          {/* ── PLATINUM VIP ── */}
          <div className="rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{background: 'linear-gradient(160deg, #0D0800 0%, #1A1000 40%, #120B00 100%)', border: '2px solid rgba(245,166,35,0.6)', boxShadow: '0 0 50px rgba(245,166,35,0.1)'}}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black tracking-wider uppercase whitespace-nowrap z-20 flex items-center gap-1.5" style={{background: 'linear-gradient(90deg, #F5A623, #FBBF24, #F5A623)', color: '#0D0800', boxShadow: '0 4px 16px rgba(245,166,35,0.6)'}}>
              <Sparkles size={10} />
              <span>VIP 100% Solo Lock 👑</span>
            </div>
            <div className="absolute top-0 right-0 w-52 h-52 rounded-full blur-[80px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(245,166,35,0.3) 0%, transparent 70%)', transform: 'translate(25%, -25%)'}} />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)', transform: 'translate(-25%, 25%)'}} />

            <div className="p-5 pt-7 space-y-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{background: 'rgba(245,166,35,0.2)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.5)'}}>👑 Platinum VIP</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background: 'linear-gradient(90deg, #16A34A, #15803D)', color: '#fff'}}>25% OFF</span>
                </div>
                <h3 className="text-xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>Platinum VIP Plan</h3>
                <p className="text-[11px]" style={{color: 'rgba(245,166,35,0.65)'}}>100% Solo Exclusivity — all classes</p>
              </div>

              {/* Solo lock callout */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)'}}>
                <Crown size={16} className="shrink-0 mt-0.5" style={{color: '#F5A623'}} />
                <div>
                  <div className="text-[11px] font-black" style={{color: '#FBBF24'}}>👑 100% Exclusive Solo Lead</div>
                  <div className="text-[10px] mt-0.5" style={{color: 'rgba(245,166,35,0.65)'}}>Lead locks instantly — zero tutor competition!</div>
                </div>
              </div>

              <div className="py-3 space-y-1" style={{borderTop: '1px solid rgba(245,166,35,0.15)', borderBottom: '1px solid rgba(245,166,35,0.15)'}}>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white" style={{fontFamily: "'Poppins', sans-serif"}}>₹18,000</span>
                  <span className="text-sm font-bold line-through" style={{color: 'rgba(245,166,35,0.4)'}}>₹24,000</span>
                </div>
                <p className="text-[10px]" style={{color: 'rgba(245,166,35,0.5)'}}>+ ₹{getGstAmount(18000).toLocaleString('en-IN')} GST = <strong style={{color: 'rgba(245,166,35,0.85)'}}>₹{getPriceWithGst(18000).toLocaleString('en-IN')} total</strong></p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold" style={{background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)'}}>⚡ 30 Leads*</span>
                  <span className="text-[10px]" style={{color: 'rgba(245,166,35,0.5)'}}>• 3 Months</span>
                </div>
              </div>

              <ul className="space-y-2">
                {['30 High-Value Leads* included','👑 100% Exclusive Solo Lead (Zero competition)','Any class, board, or entrance exam','🥇 #1 Priority Access +10,000 Boost','🪙 +100 Bonus Wallet Coins','📞 24/7 VIP Phone & WhatsApp Helpline'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px]" style={{color: 'rgba(245,166,35,0.8)'}}>
                    <span className="mt-0.5 shrink-0" style={{color: '#F5A623'}}>✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 pt-0 relative z-10">
              <button type="button" disabled={isLoading || currentPlan === 'PLATINUM'} onClick={() => handleOpenCheckout('PLATINUM')}
                className="w-full py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={currentPlan === 'PLATINUM' ? {background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)'} : {background: 'linear-gradient(135deg, #F5A623, #FBBF24, #F5A623)', color: '#0D0800', boxShadow: '0 4px 28px rgba(245,166,35,0.55)'}}>
                {currentPlan === 'PLATINUM' ? '✅ Active VIP' : '👑 Upgrade to Platinum VIP'}
              </button>
            </div>
          </div>
        </div>

        {/* Asterisk Footnote */}
        <div className="text-center pt-4 text-xs font-semibold text-slate-500 max-w-3xl mx-auto">
          *Lead count scales with each plan: <strong>Bronze (10 Leads)</strong>, <strong>Silver (15 Leads)</strong>, <strong>Gold (20 Leads)</strong>, and <strong>Platinum VIP (30 Leads)</strong>. Lead quota dynamically adapts when unlocking higher secondary / entrance preparation classes or mixed combinations.
        </div>

        {/* ── CLASS-WISE LEAD QUANTITIES ALLOCATION SECTION ── */}
        <div className="mt-14 bg-gradient-to-b from-slate-900 via-[#0F2540] to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="max-w-3xl space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <Layers size={13} className="text-emerald-400" />
              <span>Dynamic Lead Unlock Capacity</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Class Grade Lead Delivery Schedule
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
              Every plan provides a flexible quota that adapts to the classes you choose to unlock. Higher classes have greater subject depth and fee potential, so unlock counts scale accordingly across single or mixed classes.
            </p>
          </div>

          {/* 4 Class Breakdown Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
            {CLASS_LEAD_DISTRIBUTION.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/10 border border-white/15 rounded-2xl p-5 backdrop-blur-md hover:bg-white/15 hover:border-white/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 font-mono uppercase tracking-wider">
                      Tier {idx + 1}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-yellow-400 text-yellow-950 text-xs font-black shadow-sm">
                      {idx === 0 ? "10–30 Leads" : idx === 1 ? "8–24 Leads" : idx === 2 ? "6–18 Leads" : "4–12 Leads"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-yellow-300 transition-colors">
                      {item.classLevel}
                    </h3>
                    <p className="text-xs font-bold text-slate-300">
                      {item.gradeRange}
                    </p>
                  </div>

                  <p className="text-xs font-normal text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Subjects Covered
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.popularSubjects.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10"
                      >
                        {sub}
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
                <strong>💡 Mixed Class Support:</strong> You can mix and match classes freely (e.g. 5 primary leads + 2 senior secondary leads).
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

        {/* ── FEATURE COMPARISON MATRIX TABLE ── */}
        <div className="mt-14 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-[#0F2540]">Plan Feature Matrix Comparison</h2>
            <p className="text-xs font-semibold text-slate-500">Compare competition caps, lead allowances, and VIP benefits</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#0F2540] font-black">
                  <th className="py-3.5 px-4">Feature / Benefit</th>
                  <th className="py-3.5 px-4 text-center">Bronze <span className="text-green-600">₹2,999</span> <span className="text-slate-400 line-through text-[10px]">₹6k</span></th>
                  <th className="py-3.5 px-4 text-center">Silver <span className="text-green-600">₹6,750</span> <span className="text-slate-400 line-through text-[10px]">₹9k</span></th>
                  <th className="py-3.5 px-4 text-center bg-yellow-50/50 text-amber-950">Gold <span className="text-green-600">₹9,000</span> <span className="text-slate-400 line-through text-[10px]">₹12k</span></th>
                  <th className="py-3.5 px-4 text-center bg-amber-50/50 text-amber-950">Platinum VIP <span className="text-green-600">₹18,000</span> <span className="text-slate-400 line-through text-[10px]">₹24k</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Lead Unlock Allowance</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">10 Leads*</td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-700">15 Leads*</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-800 bg-yellow-50/30">20 Leads*</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">30 Leads* (Solo Lock)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Plan Validity</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700">1 Month</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700">2 Months</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700 bg-yellow-50/30">2 Months</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">3 Months</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Class Access &amp; Subjects</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">All Classes (1–12, Entrance)</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">All Classes (1–12, Entrance)</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 bg-yellow-50/30">All Classes (1–12, Entrance)</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">All Classes (1–12, Entrance)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Lead Competition Cap</td>
                  <td className="py-3.5 px-4 text-center text-slate-600 font-bold">👥 Max 5 Tutors</td>
                  <td className="py-3.5 px-4 text-center text-blue-700 font-bold">👥 Max 3 Tutors</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-800 bg-yellow-50/30">🔒 Max 2 Tutors</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">👑 1 Tutor (100% Solo Lock)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Client Lead Priority</td>
                  <td className="py-3.5 px-4 text-center text-slate-500">Standard</td>
                  <td className="py-3.5 px-4 text-center text-slate-500">+1,500 Boost</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700 bg-yellow-50/30">High (+3,000 Boost)</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">🥇 1st Priority (+10,000 Boost)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Matching Radius</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">10 km</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">15 km</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-800 bg-yellow-50/30">25 km</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">🌐 Unlimited City &amp; Online</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Parent Phone &amp; Address</td>
                  <td className="py-3.5 px-4 text-center"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-amber-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">WhatsApp Instant Alerts</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-emerald-600" /></td>
                  <td className="py-3.5 px-4 text-center bg-amber-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">⭐ Featured Search Placement</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center bg-yellow-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
                  <td className="py-3.5 px-4 text-center bg-amber-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">🪙 Free Bonus Wallet Coins</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center font-black text-amber-700 bg-yellow-50/30">+50 Coins</td>
                  <td className="py-3.5 px-4 text-center font-black text-amber-700 bg-amber-50/30">+100 Coins</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Dedicated Support &amp; VIP Helpline</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-300 bg-yellow-50/30">—</td>
                  <td className="py-3.5 px-4 text-center bg-amber-50/30"><Check size={16} className="mx-auto text-amber-600 font-bold" /></td>
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
              All lead allowances (<strong>Bronze: 10 leads</strong>, <strong>Silver: 15 leads</strong>, <strong>Gold: 20 leads</strong>, <strong>Platinum: 30 leads</strong>), validity durations (Bronze: 1 mo, Silver: 2 mo, Gold: 2 mo, Platinum: 3 mo), and the 1-to-1 Solo Exclusivity Guarantee are governed by our platform terms.
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
