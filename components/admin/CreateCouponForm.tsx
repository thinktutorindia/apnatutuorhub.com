"use client";

import { useState, useTransition } from "react";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
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
    <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <Plus size={20} className="text-[#2D9E6B]" />
        <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Create New Coupon
        </h2>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-100 border border-red-300 p-3.5 text-xs font-800 text-red-950">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 border border-emerald-300 p-3.5 text-xs font-800 text-emerald-950">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-800 text-slate-900">Coupon Code</label>
          <input
            name="code"
            type="text"
            required
            placeholder="e.g. WELCOME20 or FLAT100"
            className="w-full h-11 rounded-2xl px-4 text-xs font-800 uppercase text-slate-900 placeholder:text-slate-400 border border-slate-300 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-800 text-slate-900">Discount Type</label>
            <select
              name="discountType"
              className="w-full h-11 rounded-2xl px-3 text-xs font-800 text-slate-900 bg-white border border-slate-300 outline-none"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Rate (₹)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-800 text-slate-900">Value</label>
            <input
              name="discountValue"
              type="number"
              required
              min="1"
              placeholder="e.g. 20"
              className="w-full h-11 rounded-2xl px-4 text-xs font-800 text-slate-900 border border-slate-300 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-800 text-slate-900">Usage Limit (Max Uses)</label>
          <input
            name="usageLimit"
            type="number"
            placeholder="Unlimited (Leave blank)"
            className="w-full h-11 rounded-2xl px-4 text-xs font-800 text-slate-900 border border-slate-300 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 transition-all shadow-md cursor-pointer"
        >
          {isPending ? "Generating Coupon..." : "Publish Coupon Code"}
        </button>
      </form>
    </div>
  );
}
