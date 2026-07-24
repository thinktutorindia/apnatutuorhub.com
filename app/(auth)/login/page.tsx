"use client";

import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { loginAction, type LoginFormState } from "@/app/actions/auth.actions";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

const initialState: LoginFormState = {
  success: false,
};

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  // If user is already authenticated, redirect to their role dashboard
  React.useEffect(() => {
    if (session?.user) {
      const dest =
        session.user.role === "TUTOR"
          ? "/tutor/dashboard"
          : session.user.role === "SUPER_ADMIN" || session.user.role === "SUB_ADMIN"
          ? "/admin/dashboard"
          : "/parent/dashboard";
      router.push(dest);
      router.refresh();
    }
  }, [session, router]);

  // Redirect on successful form login submission
  React.useEffect(() => {
    if (state.success) {
      router.push("/");
      router.refresh();
    }
  }, [state.success, router]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
          Welcome Back! 👋
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Sign in to access your ThinkTutor dashboard
        </p>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="neu-btn neu-btn-white w-full py-3 text-sm flex items-center justify-center gap-3"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-[2px] bg-slate-200" />
        <span className="text-xs font-black uppercase text-slate-400">or</span>
        <div className="flex-1 h-[2px] bg-slate-200" />
      </div>

      {/* Error message */}
      {state.error && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-xs font-extrabold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {/* Login Form */}
      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="login-email" className="block text-xs font-extrabold text-[#0F172A]">
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="neu-input pl-11"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label htmlFor="login-password" className="block text-xs font-extrabold text-[#0F172A]">
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-xs font-extrabold text-[#22C55E] hover:underline"
            >
              Forgot Password?
            </a>
          </div>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="neu-input pl-11"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm"
        >
          {isPending ? (
            <span>Signing in...</span>
          ) : (
            <span className="flex items-center gap-2">
              Sign In <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm font-semibold text-slate-600">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-extrabold text-[#0F172A] underline hover:text-[#22C55E]">
          Create Account
        </a>
      </p>
    </div>
  );
}
