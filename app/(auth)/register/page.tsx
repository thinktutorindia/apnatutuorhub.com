"use client";

import React, { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerAction, type RegisterFormState } from "@/app/actions/auth.actions";
import {
  User, Mail, Lock, ArrowRight,
  AlertCircle, CheckCircle, Loader2,
  GraduationCap, Users, ArrowLeft,
  Eye, EyeOff, ShieldCheck, Check, Sparkles, Phone, HelpCircle, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { LogoBrand } from "@/components/brand/Logo";

const initialState: RegisterFormState = { success: false };

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  // Synchronize role with URL parameter
  const initialRole = roleParam === "tutor" ? "TUTOR" : "PARENT";
  const [selectedRole, setSelectedRole] = React.useState<string>(initialRole);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (roleParam === "tutor") {
      setSelectedRole("TUTOR");
    } else if (roleParam === "parent") {
      setSelectedRole("PARENT");
    }
  }, [roleParam]);

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/login?registered=true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  const isLoading = isPending || isGoogleLoading;
  const isTutor = selectedRole === "TUTOR";

  return (
    <div className="w-full max-w-lg space-y-6">
      
      {/* Top Header with Centered Logo & Back Button */}
      <div className="flex items-center justify-between w-full">
        <LogoBrand heightClass="h-10 sm:h-16" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-600 text-gray-600 hover:text-[#1A3C5E] transition-all px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow"
        >
          <ArrowLeft size={13} /> Back to home
        </Link>
      </div>

      {/* Main Centered Card Container */}
      <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-10 space-y-6 relative overflow-hidden">
        
        {/* Segmented Role Switcher Pill */}
        <div className="p-1 rounded-2xl bg-gray-100/80 border border-gray-200 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedRole("PARENT")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-700 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isTutor
                ? "bg-white text-[#1A3C5E] shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Users size={16} className={!isTutor ? "text-[#2D9E6B]" : "text-gray-400"} />
            <span>I&apos;m a Parent</span>
            {!isTutor && <Check size={14} className="text-[#2D9E6B]" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("TUTOR")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-700 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isTutor
                ? "bg-white text-[#1A3C5E] shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <GraduationCap size={16} className={isTutor ? "text-[#2D9E6B]" : "text-gray-400"} />
            <span>I&apos;m a Tutor</span>
            {isTutor && <Check size={14} className="text-[#2D9E6B]" />}
          </button>
        </div>

        {/* Dynamic Card Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider text-[#2D9E6B] bg-[#2D9E6B]/10 px-2.5 py-0.5 rounded-full mb-1">
            <Sparkles size={12} />
            {isTutor ? "Tutor Registration" : "Parent Registration"}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-800 tracking-tight text-gray-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {isTutor ? "Teach & Earn on ApnaTutorHub" : "Find the Right Tutor for Your Child"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-600">
            {isTutor
              ? "If you have amazing teaching talent, we have amazing Online & Offline tutoring opportunities for you. Set your own rate, get paid fast, and make a difference."
              : "Post requirements, browse verified tutors, and connect directly with top educators near you."}
          </p>
        </div>

        {/* WhatsApp Support Helpline Banner for Tutors */}
        {isTutor && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-700">
              <span className="text-base">💬</span>
              <span>Need help registering? Contact Tutor Support</span>
            </div>
            <a
              href="https://wa.me/919911699699?text=Hi!%20I'm%20a%20tutor%20inquiring%20about%20registration%20on%20ApnaTutorHub"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] !text-white font-800 shrink-0 transition-transform hover:scale-105"
            >
              WhatsApp →
            </a>
          </div>
        )}

        {/* Banners & Messages */}
        {state.success && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-emerald-900">
                {state.role === "TUTOR" ? "Tutor account created!" : "Account created!"}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">Redirecting to login page...</p>
            </div>
          </div>
        )}

        {state.error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-600 text-red-900">{state.error}</p>
          </div>
        )}

        {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1">
            {Object.entries(state.fieldErrors).map(([field, errors]) =>
              errors?.map((err, i) => (
                <p key={`${field}-${i}`} className="text-xs font-600 text-red-700 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  {err}
                </p>
              ))
            )}
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-12 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-600 text-sm flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 size={18} className="animate-spin text-gray-600" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-500 text-gray-400">or register with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email Registration Form */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="role" value={selectedRole} />

          <div className="space-y-1">
            <label htmlFor="register-name" className="text-xs font-700 text-gray-700">
              Full name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                required
                autoComplete="name"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="register-email" className="text-xs font-700 text-gray-700">
              Email address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="register-phone" className="text-xs font-700 text-gray-700">
              WhatsApp / Mobile number
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-gray-500 font-600 text-xs">
                <Phone size={16} className="text-gray-400" />
                <span>+91</span>
              </div>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                placeholder="98765 43210"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                autoComplete="tel"
                className="w-full h-12 pl-16 pr-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-500 font-500">
              10-digit Indian mobile number for instant WhatsApp lead notifications.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="register-password" className="text-xs font-700 text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, uppercase & number"
                required
                autoComplete="new-password"
                className="w-full h-12 pl-11 pr-11 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 font-500">
              Must be at least 8 characters, with an uppercase letter and a number.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-shine w-full h-13 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white font-800 text-sm flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span className="!text-white font-800">Creating account...</span>
              </>
            ) : (
              <>
                <span className="!text-white font-800">Create {isTutor ? "Tutor" : "Parent"} Account &amp; Get Started</span>
                <ArrowRight size={18} className="!text-white" />
              </>
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-800">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-gray-800">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 pt-3 border-t border-gray-100">
          Already registered?{" "}
          <Link href="/login" className="font-700 text-[#1A3C5E] hover:underline">
            Sign In Here →
          </Link>
        </p>

      </div>

      {/* Truthful Trust Points */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-600 text-gray-500">
        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#2D9E6B]" /> Identity Verification</span>
        <span>•</span>
        <span>Home &amp; Online Classes</span>
        <span>•</span>
        <span>100% Free for Parents</span>
      </div>

      {/* Competitor-Inspired Tutor FAQ Section */}
      {isTutor && (
        <div className="w-full bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <HelpCircle size={18} className="text-[#2D9E6B]" />
            <h2 className="text-base font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Frequently Asked Questions for Tutors
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                q: "1. What subjects can I tutor on ApnaTutorHub?",
                a: "You can tutor any subject! We support Classes 1–12 (CBSE, ICSE, IB, State Boards), JEE/NEET Entrance Prep, Coding & Computer Science, Commerce, and Foreign Languages.",
              },
              {
                q: "2. How do I get started?",
                a: "Create your free tutor account, complete your teaching preferences (subjects, city, hourly rate), and upload your government ID for 100% KYC verification.",
              },
              {
                q: "3. How do I get hired by clients & parents?",
                a: "Once verified, your profile ranks at the top of parent search results. You receive instant WhatsApp alerts when new tuition requirements matching your subject and city are posted.",
              },
              {
                q: "4. How do tutor payments work?",
                a: "You set your own hourly or monthly tuition rates and get paid directly by parents. There are no hidden middleman commissions deducted from your teaching earnings.",
              },
            ].map((faq, i) => (
              <details key={i} className="group rounded-2xl bg-gray-50/80 border border-gray-200/80 p-4 font-700 cursor-pointer">
                <summary className="flex items-center justify-between text-gray-900 font-800 list-none group-open:text-[#2D9E6B]">
                  <span className="flex-1 min-w-0 pr-2">{faq.q}</span>
                  <ChevronDown size={14} className="text-gray-400 transition-transform group-open:rotate-180 shrink-0" />
                </summary>
                <p className="text-gray-600 font-500 mt-2.5 leading-relaxed pt-2 border-t border-gray-200/60">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
