"use client";

import React from "react";
import Link from "next/link";

interface TermsAgreementCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

/** Mandatory pre-payment Terms & Conditions acceptance checkbox (no bank/UPI cash refunds; wallet coin credits only). */
export function TermsAgreementCheckbox({
  checked,
  onChange,
  id = "payment-terms-checkbox",
}: TermsAgreementCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors select-none ${
        checked
          ? "bg-emerald-50/70 border-emerald-300 text-slate-800"
          : "bg-amber-50/80 border-amber-200 text-slate-700"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer shrink-0"
      />
      <span className="font-semibold leading-relaxed">
        I have read and agree to the{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#0F2540] underline font-extrabold hover:text-[#2D9E6B]"
        >
          Terms &amp; Conditions
        </Link>
        . I understand there are{" "}
        <strong className="text-[#0F2540]">no cash/UPI/bank refunds</strong> and any valid lead issue is refunded as{" "}
        <strong className="text-[#0F2540]">coins in my wallet</strong>.
      </span>
    </label>
  );
}
