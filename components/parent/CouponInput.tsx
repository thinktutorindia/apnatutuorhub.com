"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, Tag } from "lucide-react";
import { validateCouponAction, type ValidateCouponResult } from "@/app/actions/coupon.actions";

interface CouponInputProps {
  orderAmountInr: number; // base price in Rupees
  onCouponApplied: (result: ValidateCouponResult | null) => void;
}

export function CouponInput({ orderAmountInr, onCouponApplied }: CouponInputProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    if (!code.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await validateCouponAction(code, orderAmountInr);
      if (res.success && res.data) {
        setAppliedCoupon(res.data);
        onCouponApplied(res.data);
        setError(null);
      } else {
        setAppliedCoupon(null);
        onCouponApplied(null);
        setError(res.error ?? "Failed to apply coupon");
      }
    });
  }

  function handleRemove() {
    setCode("");
    setAppliedCoupon(null);
    setError(null);
    onCouponApplied(null);
  }

  return (
    <div className="w-full">
      {!appliedCoupon ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter promo / coupon code"
                className="w-full rounded-xl px-4 py-2.5 text-sm uppercase outline-none transition-all placeholder:normal-case"
                style={{
                  background: "#F8FAFC",
                  border: error ? "1.5px solid #EF4444" : "1.5px solid #CBD5E1",
                  fontFamily: "'Fira Code', monospace",
                  color: "#0F172A",
                }}
              />
              <Tag size={16} className="absolute right-3 top-3 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || !code.trim()}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-md hover:shadow-slate-900/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <XCircle size={13} />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-between rounded-xl p-3.5"
          style={{ background: "rgba(34,197,94,0.08)", border: "1.5px dashed #22C55E" }}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-800" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {appliedCoupon.code}
                </span>
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  APPLIED
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                Saved ₹{appliedCoupon.discountAmountInr.toFixed(2)} on this order!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
