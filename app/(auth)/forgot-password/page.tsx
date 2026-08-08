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
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] border-[3px] border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center mx-auto text-2xl">
          📩
        </div>
        <h1 className="text-2xl font-black text-[#0F172A]">
          Check Your Email!
        </h1>
        <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-sm mx-auto">
          We&apos;ve sent a password reset link to <strong className="text-[#0F172A]">{email}</strong>.
        </p>
        <a
          href="/login"
          className="neu-btn neu-btn-white w-full py-3 text-sm inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Login
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
          Reset Password 🔑
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Enter your email and we&apos;ll send a recovery link
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-xs font-extrabold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="forgot-email" className="block text-xs font-extrabold text-[#0F172A]">
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
              className="neu-input pl-11"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm"
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

      <p className="text-center text-sm font-semibold text-slate-600">
        <a href="/login" className="font-extrabold text-[#0F172A] underline hover:text-[#22C55E] inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Login
        </a>
      </p>
    </div>
  );
}
