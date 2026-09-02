"use client";

import React, { useActionState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginAction, type LoginFormState } from "@/app/actions/auth.actions";
import {
  Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Loader2,
  ArrowLeft, Eye, EyeOff, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { LogoBrand } from "@/components/brand/Logo";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

const initialState: LoginFormState = {
  success: false,
};

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
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.success, state.redirectTo, router]);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  const isLoading = isPending || redirecting || isGoogleLoading;

  return (
    <main className="w-full max-w-lg space-y-6">
      
      {/* Top Header with Centered Logo & Back Button */}
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        <LogoBrand heightClass="h-10 sm:h-11" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-600 text-gray-600 hover:text-[#1A3C5E] transition-all px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow shrink-0"
        >
          <ArrowLeft size={13} />
          <span className="hidden xs:inline">Back to home</span>
          <span className="xs:hidden">Home</span>
        </Link>
      </div>

      {/* Main Centered Card Container */}
      <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-10 space-y-6 relative overflow-hidden">
        
        {/* Card Header */}
        <div className="space-y-1">
          <h1
            className="text-2xl sm:text-3xl font-800 tracking-tight text-gray-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Sign in to post a requirement or see student enquiries.
          </p>
        </div>

        {/* Banners & Messages */}
        {justRegistered && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-emerald-900">Account created successfully!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Please sign in with your email and password below.
              </p>
            </div>
          </div>
        )}

        {state.success && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm font-700 text-emerald-900">
              Signed in! Redirecting to your dashboard...
            </p>
          </div>
        )}

        {errorParam === "suspended" && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-red-900">Account suspended</p>
              <p className="text-xs text-red-700 mt-0.5">
                Your account has been suspended. Please contact support for help.
              </p>
            </div>
          </div>
        )}

        {(errorParam === "Configuration" || errorParam === "OAuthCallback" || errorParam === "OAuthSignin") && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-amber-900">Google Sign-In Notice</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Google OAuth requires valid client credentials. Please log in with your email and password below, or configure Google OAuth in Google Cloud Console.
              </p>
            </div>
          </div>
        )}

        {state.error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-600 text-red-900">{state.error}</p>
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
          <span className="text-xs font-500 text-gray-400">or log in with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email Login Form */}
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="login-email" className="text-xs font-700 text-gray-700">
              Email address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="login-email"
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
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-700 text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-600 text-[#1A3C5E] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-13 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-700 text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Register Secondary Link */}
        <p className="text-center text-sm text-gray-600 pt-3 border-t border-gray-100">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-700 text-[#1A3C5E] hover:underline">
            Create account →
          </Link>
        </p>
        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I need help logging in.")}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs font-700 text-emerald-800 hover:underline"
        >
          WhatsApp support {SUPPORT_PHONE_DISPLAY}
        </a>

      </div>

      {/* Truthful Trust Points */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-600 text-gray-500">
        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#2D9E6B]" /> Identity Verification</span>
        <span>•</span>
        <span>Home &amp; Online Classes</span>
        <span>•</span>
        <span>100% Free for Parents</span>
      </div>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-lg p-8 text-center text-xs font-600 text-gray-500">Loading sign in page...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

