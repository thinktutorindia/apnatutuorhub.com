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
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] border-[3px] border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center mx-auto text-2xl">
          <CheckCircle size={32} className="text-[#22C55E]" />
        </div>
        <h1 className="text-2xl font-black text-[#0F172A]">
          Password Reset Complete!
        </h1>
        <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-sm mx-auto">
          Your password has been successfully updated. You can now log in with your new password.
        </p>
        <a
          href="/login"
          className="neu-btn neu-btn-primary w-full py-3.5 text-sm inline-flex items-center justify-center gap-2"
        >
          Go to Login <ArrowRight size={16} />
        </a>
      </div>
    );
  }

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-xs font-extrabold flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          <span>Invalid password reset link. Please request a new link.</span>
        </div>
        <a href="/forgot-password" className="neu-btn neu-btn-white w-full py-3 text-sm inline-flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Request New Reset Link
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
          Set New Password 🔐
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Enter a new secure password for <strong className="text-[#0F172A]">{email}</strong>
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
          <label htmlFor="new-password" className="block text-xs font-extrabold text-[#0F172A]">
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
              className="neu-input pl-11"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="block text-xs font-extrabold text-[#0F172A]">
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
    <Suspense fallback={<div className="text-center text-xs text-slate-500 py-12">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
