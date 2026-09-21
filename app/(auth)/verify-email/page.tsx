"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmailOtpAction, resendEmailOtpAction } from "@/app/actions/auth.actions";
import {
  Mail, ShieldCheck, ArrowRight, AlertCircle, CheckCircle, Loader2, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { AuthShell, AUTH_LABEL } from "@/components/auth/AuthShell";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const roleParam = searchParams.get("role") || "tutor";

  const [email] = useState<string>(emailParam);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus the first empty digit input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    setError(null);
    setResendSuccess(null);

    // Handle paste of whole 6-digit OTP
    if (val.length > 1) {
      const pasteNums = val.replace(/\D/g, "").slice(0, 6);
      if (pasteNums.length > 0) {
        const nextDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = pasteNums[i] || "";
        }
        setDigits(nextDigits);
        const focusIdx = Math.min(pasteNums.length, 5);
        inputRefs.current[focusIdx]?.focus();

        if (pasteNums.length === 6) {
          triggerVerification(pasteNums);
        }
        return;
      }
    }

    // Single digit input
    const cleanChar = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleanChar;
    setDigits(nextDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = nextDigits.join("");
    if (fullCode.length === 6) {
      triggerVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const triggerVerification = async (code: string) => {
    if (!email) {
      setError("Email address is missing. Please sign up again.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await verifyEmailOtpAction(email, code);
      if (res.success) {
        setIsVerified(true);
        setTimeout(() => {
          router.push(res.redirectTo || "/tutor/onboarding");
          router.refresh();
        }, 1000);
      } else {
        setError(res.error || "Verification failed. Please try again.");
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }
    triggerVerification(fullCode);
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!email) {
      setError("Email address is missing.");
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      const res = await resendEmailOtpAction(email);
      if (res.success) {
        setResendSuccess("A new 6-digit code has been sent to your email.");
        setCooldown(60);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.error || "Could not resend OTP. Please try again.");
      }
    } catch {
      setError("Failed to resend verification code. Check your network.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell variant={roleParam === "tutor" ? "tutor" : "parent"}>
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-800 uppercase tracking-wide text-emerald-700">
            <ShieldCheck size={16} />
            Email Verification
          </div>
          <h2
            className="mt-2 text-2xl font-800 text-[#0F2540] sm:text-[28px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Check your email
          </h2>
          <p className="mt-2 text-[15px] font-500 leading-relaxed text-[#64748B]">
            We sent a 6-digit verification code to:
            <br />
            <strong className="font-700 text-[#0F2540]">{email || "your email address"}</strong>
          </p>
        </div>

        {isVerified && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle size={22} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[15px] font-700 text-emerald-900">Email verified successfully!</p>
              <p className="text-sm font-500 text-emerald-700">Taking you to your tutor portal…</p>
            </div>
          </div>
        )}

        {resendSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <Mail size={20} className="mt-0.5 shrink-0 text-blue-600" />
            <p className="text-[14px] font-600 text-blue-900">{resendSuccess}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-[14px] font-600 text-red-900">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`${AUTH_LABEL} mb-3 block text-center`}>
              Enter 6-digit verification code
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={isVerifying || isVerified}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-11 sm:h-16 sm:w-13 rounded-2xl border-2 border-[#CBD5E1] bg-[#F8FAFC] text-center text-2xl font-800 text-[#0F2540] transition-all focus:border-[#2D9E6B] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2D9E6B]/15 disabled:opacity-50"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || isVerified || digits.join("").length !== 6}
            className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] text-base font-800 text-white shadow-md transition-all hover:bg-[#238155] focus:outline-none focus:ring-4 focus:ring-[#2D9E6B]/30 disabled:opacity-50 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Verifying code…
              </>
            ) : (
              <>
                Verify & Activate Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#E2E8F0] pt-5 text-center">
          <p className="text-sm font-500 text-slate-500">
            Didn&apos;t receive the code?{" "}
            {cooldown > 0 ? (
              <span className="font-700 text-slate-400">
                Resend in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-700 text-[#2D9E6B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isResending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                Resend code
              </button>
            )}
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-600 text-slate-400">
            <Link href="/register?role=tutor" className="hover:text-slate-600 hover:underline">
              Wrong email address?
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-600 hover:underline">
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
