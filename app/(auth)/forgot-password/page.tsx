"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions/auth.actions";

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
        setError(res.error || "Failed to send reset email. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-lg bg-white ath-panel p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#E8F7F0] flex items-center justify-center mx-auto text-2xl">
          📩
        </div>
        <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Check your email
        </h1>
        <p className="text-[15px] font-500 text-[#64748B] leading-relaxed max-w-sm mx-auto">
          We&apos;ve sent a password reset link to <strong className="text-[#0F2540]">{email}</strong>.
        </p>
        <a
          href="/login"
          className="neu-btn neu-btn-white w-full py-3 text-sm inline-flex items-center justify-center gap-2 min-h-11"
        >
          <ArrowLeft size={16} />
          Back to Login
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg bg-white ath-panel p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
          Forgot your password?
        </h1>
        <p className="text-[15px] font-500 text-[#64748B] mt-1">
          Enter your email and we&apos;ll send a recovery link.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#B91C1C] text-sm font-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="forgot-email" className="block text-xs font-800 text-[#0F2540]">
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neu-input pl-11 min-h-12"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm min-h-12"
        >
          {isSubmitting ? (
            <span>Sending link...</span>
          ) : (
            <span className="flex items-center gap-2">
              Send Reset Link <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      <p className="text-center text-sm font-600 text-[#64748B]">
        <a href="/login" className="font-800 text-[#0F2540] hover:text-[#2D9E6B] inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Login
        </a>
      </p>
    </div>
  );
}
