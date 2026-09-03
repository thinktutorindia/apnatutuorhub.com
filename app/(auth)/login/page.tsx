"use client";

import React, { useActionState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginAction, type LoginFormState } from "@/app/actions/auth.actions";
import {
  Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Loader2, Eye, EyeOff,
} from "lucide-react";
import Link from "next/link";
import { AuthShell, AUTH_INPUT, AUTH_LABEL } from "@/components/auth/AuthShell";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

const initialState: LoginFormState = { success: false };

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const justRegistered = searchParams.get("registered") === "true";
  const errorParam = searchParams.get("error");
  const registerRole = searchParams.get("register");
  const redirecting = Boolean(state.success && state.redirectTo);

  React.useEffect(() => {
    if (registerRole === "parent" || registerRole === "tutor") {
      router.replace(`/register?role=${registerRole}`);
    }
  }, [registerRole, router]);

  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      const timer = setTimeout(() => {
        router.push(state.redirectTo!);
        router.refresh();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.success, state.redirectTo, router]);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  const isLoading = isPending || redirecting || isGoogleLoading;

  return (
    <AuthShell variant="login">
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        <div>
          <h2
            className="text-2xl font-800 text-[#0F2540] sm:text-[28px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Sign in
          </h2>
          <p className="mt-1 text-[16px] font-500 text-[#64748B]">
            Use the email and password you created.
          </p>
        </div>

        {justRegistered && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-[15px] font-700 text-emerald-900">
              Account created. Please sign in below.
            </p>
          </div>
        )}

        {state.success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-[15px] font-700 text-emerald-900">Signed in. Opening your page…</p>
          </div>
        )}

        {errorParam === "suspended" && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-[15px] font-700 text-red-900">
              This account is paused. WhatsApp support for help.
            </p>
          </div>
        )}

        {(errorParam === "Configuration" || errorParam === "OAuthCallback" || errorParam === "OAuthSignin") && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[15px] font-600 text-amber-900">
              Google sign-in is not available right now. Please use email and password.
            </p>
          </div>
        )}

        {state.error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-[15px] font-600 text-red-900">{state.error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex h-13 min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#E2E8F0] bg-white text-base font-700 text-[#0F2540] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          {isGoogleLoading ? <Loader2 size={18} className="animate-spin" /> : (
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
          <span className="text-sm font-600 text-slate-400">or email</span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="login-email" className={AUTH_LABEL}>Email</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="login-email" name="email" type="email" placeholder="you@email.com" required autoComplete="email" className={`${AUTH_INPUT} pl-11`} />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-[15px] font-700 text-[#0F2540]">Password</label>
              <Link href="/forgot-password" className="text-sm font-700 text-[#2D9E6B] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                required
                autoComplete="current-password"
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

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] text-base font-800 !text-white hover:bg-[#238357] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="grid grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-5 sm:grid-cols-2">
          <Link
            href="/register?role=parent"
            className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[#E2E8F0] px-3 text-center text-[15px] font-800 text-[#0F2540] hover:border-[#2D9E6B]"
          >
            New parent? Join free
          </Link>
          <Link
            href="/register?role=tutor"
            className="flex min-h-14 items-center justify-center rounded-xl border-2 border-[#E2E8F0] px-3 text-center text-[15px] font-800 text-[#0F2540] hover:border-[#2D9E6B]"
          >
            New teacher? Join free
          </Link>
        </div>

        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I need help logging in.")}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-700 text-[#2D9E6B]"
        >
          WhatsApp help {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-base text-slate-500">Loading…</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
