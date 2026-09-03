"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth.actions";
import { AuthShell, AUTH_INPUT, AUTH_LABEL } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await requestPasswordResetAction(email);
      if (res.success) {
        setIsSubmitted(true);
      } else {
        setError(res.error || "Could not send the email. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell variant="login">
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        {isSubmitted ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F7F0]">
              <CheckCircle size={28} className="text-[#2D9E6B]" />
            </div>
            <h2 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Check your email
            </h2>
            <p className="text-[16px] font-500 leading-relaxed text-[#64748B]">
              If an account exists for <strong className="text-[#0F2540]">{email}</strong>, we sent a reset link.
            </p>
            <Link
              href="/login"
              className="flex h-13 min-h-13 items-center justify-center rounded-xl border-2 border-[#E2E8F0] text-base font-800 text-[#0F2540]"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Forgot password?
              </h2>
              <p className="mt-1 text-[16px] font-500 text-[#64748B]">
                Enter your email. We will send a reset link.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-700 text-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className={AUTH_LABEL}>Email</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${AUTH_INPUT} pl-11`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] text-base font-800 !text-white hover:bg-[#238357] disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : (
                  <>
                    Send reset link
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[16px]">
              <Link href="/login" className="font-800 text-[#0F2540] underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
