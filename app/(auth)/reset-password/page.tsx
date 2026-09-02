"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { resetPasswordWithTokenAction } from "@/app/actions/auth.actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordWithTokenAction(token, email, newPassword);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg bg-white ath-panel p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#E8F7F0] flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-[#2D9E6B]" />
        </div>
        <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Password updated
        </h1>
        <p className="text-[15px] font-500 text-[#64748B] leading-relaxed max-w-sm mx-auto">
          You can now log in with your new password.
        </p>
        <a
          href="/login"
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm inline-flex items-center justify-center gap-2 min-h-12"
        >
          Go to Login <ArrowRight size={16} />
        </a>
      </div>
    );
  }

  if (!token || !email) {
    return (
      <div className="w-full max-w-lg bg-white ath-panel p-8 text-center space-y-4">
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#B91C1C] text-sm font-700 flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          <span>This reset link is invalid. Please request a new one.</span>
        </div>
        <a href="/forgot-password" className="neu-btn neu-btn-white w-full py-3 text-sm inline-flex items-center justify-center gap-2 min-h-11">
          <ArrowLeft size={16} /> Request New Reset Link
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg bg-white ath-panel p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
          Set a new password
        </h1>
        <p className="text-[15px] font-500 text-[#64748B] mt-1">
          Enter a new password for <strong className="text-[#0F2540] break-all">{email}</strong>
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
          <label htmlFor="new-password" className="block text-xs font-800 text-[#0F2540]">
            New Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="neu-input pl-11 min-h-12"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="block text-xs font-800 text-[#0F2540]">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            <span>Updating password...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Update Password <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-[#64748B] py-12">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
