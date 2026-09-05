"use client";

import React, { useActionState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerAction, type RegisterFormState } from "@/app/actions/auth.actions";
import {
  User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Loader2,
  GraduationCap, Users, Eye, EyeOff, Phone, Check,
} from "lucide-react";
import Link from "next/link";
import { AuthShell, AUTH_INPUT, AUTH_LABEL } from "@/components/auth/AuthShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

const initialState: RegisterFormState = { success: false };

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole = roleParam === "tutor" ? "TUTOR" : "PARENT";
  const [selectedRole, setSelectedRole] = React.useState<string>(initialRole);
  const [prevRoleParam, setPrevRoleParam] = React.useState<string | null>(roleParam);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showReferral, setShowReferral] = React.useState(Boolean(searchParams.get("ref")));
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  if (roleParam !== prevRoleParam) {
    setPrevRoleParam(roleParam);
    if (roleParam === "tutor") setSelectedRole("TUTOR");
    else if (roleParam === "parent") setSelectedRole("PARENT");
  }

  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      const timer = setTimeout(() => {
        router.push(state.redirectTo!);
        router.refresh();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.success, state.redirectTo, router]);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const callback = selectedRole === "TUTOR" ? "/tutor/onboarding" : "/parent/post-requirement";
    try {
      document.cookie = `intended_role=${selectedRole}; path=/; max-age=600; SameSite=Lax`;
    } catch {
      // ignore
    }
    signIn("google", { callbackUrl: callback });
  };

  const isLoading = isPending || isGoogleLoading;
  const isTutor = selectedRole === "TUTOR";

  function pickRole(role: "PARENT" | "TUTOR") {
    setSelectedRole(role);
    const url = role === "TUTOR" ? "/register?role=tutor" : "/register?role=parent";
    router.replace(url);
  }

  return (
    <AuthShell variant={isTutor ? "tutor" : "parent"}>
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-800 uppercase tracking-wide text-[#2D9E6B]">
            {isTutor ? "Tutor signup" : "Parent signup"}
          </p>
          <h2
            className="mt-1 text-2xl font-800 text-[#0F2540] sm:text-[28px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Create your account
          </h2>
          <p className="mt-1 text-[16px] font-500 text-[#64748B]">
            {isTutor
              ? "Free to join. You only spend coins when you unlock a parent number."
              : "Free for parents. No subscription. No hidden fee."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => pickRole("PARENT")}
            aria-pressed={!isTutor}
            className={`flex min-h-[96px] items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
              !isTutor
                ? "border-emerald-600 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${!isTutor ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[17px] font-extrabold text-[#0F2540]">
                  I am a Parent
                </span>
                {!isTutor && (
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Selected ✓
                  </span>
                )}
              </div>
              <span className="mt-1 block text-xs font-semibold text-slate-600 leading-snug">
                Looking for a home or online tutor for my child
              </span>
              <span className="mt-1.5 inline-block text-[11px] font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                100% Free · No Charges
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pickRole("TUTOR")}
            aria-pressed={isTutor}
            className={`flex min-h-[96px] items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
              isTutor
                ? "border-emerald-600 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${isTutor ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <GraduationCap size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[17px] font-extrabold text-[#0F2540]">
                  I am a Teacher
                </span>
                {isTutor && (
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Selected ✓
                  </span>
                )}
              </div>
              <span className="mt-1 block text-xs font-semibold text-slate-600 leading-snug">
                Want to teach students near my home or online
              </span>
              <span className="mt-1.5 inline-block text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                Zero Commission · Keep 100% Fees
              </span>
            </div>
          </button>
        </div>

        {state.success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-[15px] font-700 text-emerald-900">
              Account created. Taking you inside…
            </p>
          </div>
        )}

        {state.error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-[15px] font-600 text-red-900">{state.error}</p>
          </div>
        )}

        {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
          <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-4">
            {Object.entries(state.fieldErrors).map(([field, errors]) =>
              errors?.map((err, i) => (
                <p key={`${field}-${i}`} className="flex items-center gap-1.5 text-sm font-600 text-red-700">
                  <AlertCircle size={14} />
                  {err}
                </p>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex h-13 min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#E2E8F0] bg-white text-base font-700 text-[#0F2540] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-sm font-600 text-slate-400">or use email</span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="role" value={selectedRole} />

          <div>
            <label htmlFor="register-name" className={AUTH_LABEL}>Your full name</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="register-name" name="name" type="text" placeholder="e.g. Sunita Sharma" required autoComplete="name" className={`${AUTH_INPUT} pl-11`} />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className={AUTH_LABEL}>Email</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="register-email" name="email" type="email" placeholder="you@email.com" required autoComplete="email" className={`${AUTH_INPUT} pl-11`} />
            </div>
          </div>

          <div>
            <label htmlFor="register-phone" className={AUTH_LABEL}>Mobile number (WhatsApp)</label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-sm font-700 text-slate-500">
                <Phone size={16} className="text-slate-400" />
                +91
              </div>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                autoComplete="tel"
                className={`${AUTH_INPUT} pl-[4.5rem]`}
              />
            </div>
            <p className="mt-1 text-sm font-500 text-slate-500">10-digit Indian number. Tutors / parents will reach you here.</p>
          </div>

          <div>
            <label htmlFor="register-password" className={AUTH_LABEL}>Password</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 letters, with 1 capital and 1 number"
                required
                autoComplete="new-password"
                className={`${AUTH_INPUT} pl-11 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-slate-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {showReferral ? (
            <div>
              <label htmlFor="register-referral" className={AUTH_LABEL}>
                Referral code <span className="font-500 text-slate-400">(optional)</span>
              </label>
              <input
                id="register-referral"
                name="referralCode"
                type="text"
                defaultValue={searchParams.get("ref") ?? ""}
                placeholder="If a teacher or friend gave you a code"
                autoComplete="off"
                className={`${AUTH_INPUT} uppercase`}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReferral(true)}
              className="text-sm font-700 text-[#2D9E6B] hover:underline"
            >
              I have a referral code
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] text-base font-800 !text-white hover:bg-[#238357] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                {isTutor ? "Create teacher account" : "Create parent account"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          By continuing you agree to our{" "}
          <Link href="/terms" className="font-700 text-[#0F2540] underline">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="font-700 text-[#0F2540] underline">Privacy Policy</Link>.
        </p>

        <p className="border-t border-[#E2E8F0] pt-4 text-center text-[16px] text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-800 text-[#0F2540] underline">
            Sign in
          </Link>
        </p>

        <a
          href={getWhatsAppSupportLink(
            isTutor
              ? "Hi, I am a teacher and need help signing up."
              : "Hi, I am a parent and need help signing up."
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-700 text-[#2D9E6B] lg:hidden"
        >
          Need help? WhatsApp {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-base text-slate-500">Loading…</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
