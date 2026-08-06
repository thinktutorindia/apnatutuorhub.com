"use client";

import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  registerAction,
  type RegisterFormState,
} from "@/app/actions/auth.actions";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  GraduationCap,
  Users,
} from "lucide-react";
import Link from "next/link";

const initialState: RegisterFormState = {
  success: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<string>("PARENT");
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [autoSigningIn, setAutoSigningIn] = React.useState(false);

  // After successful registration, auto sign-in and redirect to dashboard
  React.useEffect(() => {
    if (state.success) {
      // We don't have the password here from state, so redirect to login with success flag
      // (auto sign-in requires password which isn't available in state)
      const timer = setTimeout(() => {
        router.push("/login?registered=true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const isLoading = isPending || autoSigningIn;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
          Create Account 🚀
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Select your role and start your journey with ThinkTutor
        </p>
      </div>

      {/* Success Banner */}
      {state.success && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-[#22C55E] bg-[#DCFCE7] p-4">
          <CheckCircle size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-[#166534]">
              {state.role === "TUTOR" ? "🎓 Tutor Account Created!" : "👨‍👩‍👧 Parent Account Created!"}
            </p>
            <p className="text-xs font-semibold text-[#166534] mt-0.5">
              Redirecting you to sign in...
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-red-500 bg-red-50 p-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <span className="text-xs font-extrabold text-red-700">{state.error}</span>
        </div>
      )}

      {/* Role Selection Cards */}
      <div className="space-y-2">
        <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide">
          I am a...
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedRole("PARENT")}
            className={`rounded-2xl border-2 border-[#0F172A] p-4 text-center cursor-pointer transition-all focus:outline-none ${
              selectedRole === "PARENT"
                ? "bg-[#DCFCE7] shadow-[4px_4px_0px_0px_#0F172A] -translate-x-0.5 -translate-y-0.5"
                : "bg-white shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-50"
            }`}
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center">
              <Users size={20} className={selectedRole === "PARENT" ? "text-[#22C55E]" : "text-slate-500"} />
            </div>
            <div className="font-extrabold text-sm text-[#0F172A]">Parent</div>
            <div className="text-[11px] font-semibold text-slate-600">Find Tutors</div>
            {selectedRole === "PARENT" && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#22C55E] px-2 py-0.5 text-[10px] font-black text-white">
                ✓ Selected
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("TUTOR")}
            className={`rounded-2xl border-2 border-[#0F172A] p-4 text-center cursor-pointer transition-all focus:outline-none ${
              selectedRole === "TUTOR"
                ? "bg-[#FEF3C7] shadow-[4px_4px_0px_0px_#0F172A] -translate-x-0.5 -translate-y-0.5"
                : "bg-white shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-50"
            }`}
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center">
              <GraduationCap size={20} className={selectedRole === "TUTOR" ? "text-[#F59E0B]" : "text-slate-500"} />
            </div>
            <div className="font-extrabold text-sm text-[#0F172A]">Tutor</div>
            <div className="text-[11px] font-semibold text-slate-600">Teach &amp; Earn</div>
            {selectedRole === "TUTOR" && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-black text-white">
                ✓ Selected
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Currently selected role confirmation */}
      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        Registering as:{" "}
        <span className={`font-black ${selectedRole === "TUTOR" ? "text-[#D97706]" : "text-[#22C55E]"}`}>
          {selectedRole === "TUTOR" ? "🎓 Tutor (Teach & Earn)" : "👨‍👩‍👧 Parent (Find Tutors)"}
        </span>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="neu-btn neu-btn-white w-full py-3 text-sm flex items-center justify-center gap-3 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-[2px] bg-slate-200" />
        <span className="text-xs font-black uppercase text-slate-400">or</span>
        <div className="flex-1 h-[2px] bg-slate-200" />
      </div>

      {/* Field Errors */}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-3 space-y-1">
          {Object.entries(state.fieldErrors).map(([field, errors]) =>
            errors?.map((err, i) => (
              <p key={`${field}-${i}`} className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {err}
              </p>
            ))
          )}
        </div>
      )}

      {/* Register Form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value={selectedRole} />

        <div className="space-y-1">
          <label htmlFor="register-name" className="block text-xs font-extrabold text-[#0F172A]">
            Full Name
          </label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="register-name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              required
              autoComplete="name"
              className="neu-input pl-11 w-full"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="register-email" className="block text-xs font-extrabold text-[#0F172A]">
            Email Address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="neu-input pl-11 w-full"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="register-password" className="block text-xs font-extrabold text-[#0F172A]">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="Min 8 chars with uppercase & number"
              required
              autoComplete="new-password"
              className="neu-input pl-11 w-full"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm disabled:opacity-70"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Create {selectedRole === "TUTOR" ? "Tutor" : "Parent"} Account <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm font-semibold text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="font-extrabold text-[#0F172A] underline hover:text-[#22C55E]">
          Log In
        </Link>
      </p>
    </div>
  );
}
