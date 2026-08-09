"use client";

import { useState, useTransition } from "react";
import { Plus, Ticket, AlertCircle, CheckCircle2 } from "lucide-react";
import { createCouponAction } from "@/app/actions/coupon.actions";

export function CreateCouponForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createCouponAction(formData);
      if (!res.success) {
        setErrorMsg(res.error ?? "Failed to create coupon");
      } else {
        setSuccessMsg(`🎉 Coupon "${res.data?.code}" created successfully!`);
        form.reset();
      }
    });
  };

  return (
    <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
      <div className="mb-5 flex items-center gap-2">
        <Plus size={18} className="text-emerald-400" />
        <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Create New Coupon
        </h2>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs font-bold text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-400">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">Coupon Code</label>
          <input
            name="code"
            type="text"
            required
            placeholder="e.g. WELCOME20 or FLAT100"
            className="w-full rounded-xl px-4 py-2.5 text-sm uppercase text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500"
            style={{ background: "#1E293B", border: "1px solid #334155", fontFamily: "'Fira Code', monospace" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Type</label>
            <select
              name="discountType"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Rate (₹)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Discount</label>
            <input
              name="discountAmount"
              type="number"
              step="any"
              required
              placeholder="20 (for 20% or ₹20)"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white">
              Max Cap (₹) <span className="text-slate-500">(pct only)</span>
            </label>
            <input
              name="maxDiscountInr"
              type="number"
              placeholder="e.g. 200"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Min Order (₹)</label>
            <input
              name="minOrderInr"
              type="number"
              placeholder="e.g. 500"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Usage Limit</label>
            <input
              name="usageLimit"
              type="number"
              placeholder="e.g. 100"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Expiry Date</label>
            <input
              name="expiresAt"
              type="date"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 15px rgba(34,197,94,0.3)" }}
        >
          <Ticket size={16} className={isPending ? "animate-spin" : ""} />
          <span>{isPending ? "Creating Coupon..." : "Create Coupon"}</span>
        </button>
      </form>
    </div>
  );
}
