"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Phone, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { completePhoneNumberAction } from "@/app/actions/auth.actions";
import { AuthShell } from "@/components/auth/AuthShell";

export default function CompletePhonePage() {
  const { data: session, update } = useSession();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (session?.user?.phone && session.user.phone.trim().length >= 10) {
      const dest = session.user.role === "TUTOR" ? "/tutor/dashboard" : "/parent/dashboard";
      window.location.href = dest;
    }
  }, [session]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length <= 10) {
      setPhone(digitsOnly);
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await completePhoneNumberAction(phone);
      if (res.success && res.redirectTo) {
        try {
          await update({ phone });
        } catch {
          // Continue if update throws
        }
        window.location.href = res.redirectTo;
      } else {
        setError(res.error || "Could not save mobile number. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <AuthShell variant={session?.user?.role === "TUTOR" ? "tutor" : "parent"}>
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#2D9E6B]">
            <Phone size={24} />
          </div>
          <h2
            className="text-2xl font-800 text-[#0F2540] sm:text-[28px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {firstName ? `Welcome, ${firstName}!` : "One Final Step"}
          </h2>
          <p className="mt-1.5 text-sm font-500 leading-relaxed text-[#64748B]">
            ApnaTutorHub delivers verified student enquiries, trial demo schedules, and teacher matches directly via WhatsApp &amp; SMS. Please provide your 10-digit mobile number to activate your account.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] font-bold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mobile / WhatsApp Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-500 select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="98765 43210"
                autoFocus
                className="w-full rounded-2xl border-2 border-slate-200 pl-16 pr-4 py-3.5 text-base font-bold text-slate-900 outline-none focus:border-[#2D9E6B] transition-colors"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-slate-500">
              Must be a 10-digit Indian number starting with 6, 7, 8, or 9.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#2D9E6B] shrink-0 mt-0.5" />
            <p className="text-[12px] font-medium text-slate-600 leading-snug">
              Your contact number is kept private and secure. It is only shared when a tuition demo is confirmed.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || phone.length !== 10}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2D9E6B] px-6 py-4 text-base font-bold text-white shadow-md hover:bg-[#238357] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying &amp; Entering...</span>
              </>
            ) : (
              <>
                <span>Continue to Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

