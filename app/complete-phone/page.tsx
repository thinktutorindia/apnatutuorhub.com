"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completePhoneNumberAction } from "@/app/actions/auth.actions";
import { Phone, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, AUTH_INPUT, AUTH_LABEL } from "@/components/auth/AuthShell";

export default function CompletePhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 10
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await completePhoneNumberAction(phone);
        if (res.success && res.redirectTo) {
          router.push(res.redirectTo);
          router.refresh();
        } else {
          setError(res.error || "Unable to save mobile number. Please try again.");
        }
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <AuthShell variant="generic">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2540] tracking-tight">
          Enter Mobile Number
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">
          A verified 10-digit Indian mobile number is mandatory to access student leads and tuition enquiries on ApnaTutorHub.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="phone" className={AUTH_LABEL}>
            10-Digit Mobile Number
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-500 font-bold text-sm pointer-events-none border-r border-slate-200 pr-2.5">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="9876543210"
              className={`${AUTH_INPUT} pl-[85px] tracking-wide font-mono`}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Student leads and instant WhatsApp tuition updates will be sent to this number.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || phone.length !== 10}
          className="w-full h-11 px-4 rounded-xl bg-[#0F2540] hover:bg-[#1b3b61] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#0F2540]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying & Saving...</span>
            </>
          ) : (
            <>
              <span>Continue to Dashboard</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>100% Privacy Protected · No Spam Calls</span>
        </div>
      </form>
    </AuthShell>
  );
}
