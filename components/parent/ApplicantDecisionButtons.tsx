"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  shortlistApplicantAction,
  rejectApplicantAction,
} from "@/app/actions/leads.actions";

type Props = {
  purchaseId: string;
  isShortlisted: boolean;
  isRejected: boolean;
};

export function ApplicantDecisionButtons({
  purchaseId,
  isShortlisted,
  isRejected,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: (id: string) => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn(purchaseId);
      if (!res.success) {
        setError(res.error || "Could not update this applicant.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(shortlistApplicantAction)}
          className={`px-4 py-2 text-xs font-800 rounded-2xl border transition-all disabled:opacity-60 ${
            isShortlisted
              ? "bg-emerald-100 text-emerald-950 border-emerald-300"
              : "bg-white text-slate-800 border-slate-300 hover:bg-emerald-50"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Check size={13} />
            {isShortlisted ? "Shortlisted" : "Shortlist"}
          </span>
        </button>
        <button
          type="button"
          disabled={pending || isRejected}
          onClick={() => run(rejectApplicantAction)}
          className={`px-4 py-2 text-xs font-800 rounded-2xl border transition-all disabled:opacity-60 ${
            isRejected
              ? "bg-rose-100 text-rose-950 border-rose-300"
              : "bg-white text-slate-800 border-slate-300 hover:bg-rose-50"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <X size={13} />
            {isRejected ? "Rejected" : "Reject"}
          </span>
        </button>
      </div>
      {error && <p className="text-[10px] font-700 text-rose-700">{error}</p>}
    </div>
  );
}
