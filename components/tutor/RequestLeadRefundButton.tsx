"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { requestLeadRefundAction } from "@/app/actions/wallet.actions";

const REFUND_REASONS = [
  "Phone number switched off / unreachable / invalid",
  "Parent already hired another tutor / Requirement closed",
  "Location or subject mismatch / Incorrect details",
  "Parent budget too low or tuition cancelled",
  "Fake requirement / Not interested in tuition",
  "Other issue",
] as const;

export function RequestLeadRefundButton({
  purchaseId,
  purchasedAt,
}: {
  purchaseId: string;
  purchasedAt?: string | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(REFUND_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const withinWindow =
    !purchasedAt ||
    Date.now() - new Date(purchasedAt).getTime() <= 48 * 60 * 60 * 1000;

  if (!withinWindow) {
    return null;
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
        <CheckCircle2 size={11} className="text-amber-600 shrink-0" />
        <span>Refund Under Review</span>
      </span>
    );
  }

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await requestLeadRefundAction(purchaseId, selectedReason, notes);
      if (!res.success) {
        setMessage(res.error || "Could not submit refund request.");
        return;
      }
      setDone(true);
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
      >
        <Flag size={11} className="shrink-0 text-rose-500" />
        <span>Report Lead / Refund Coins</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Flag size={16} />
                  </div>
                  <h3 className="text-base font-extrabold text-[#0F2540]">
                    Report Lead & Request Refund
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  If this lead was unreachable or non-genuine, tell us what went wrong. Our quality team audits every request within 24 hours to credit your coins.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {message && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{message}</span>
              </div>
            )}

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Why was this lead invalid? <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REFUND_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? "bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refund_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Additional Notes / Call Details (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Called parent twice at 3 PM, phone was switched off."
                rows={2}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Refund Guarantee Info */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              💡 <strong>Coin Refund Policy:</strong> You have up to 48 hours from purchase to submit feedback. Once verified by telecalling logs, 100% of the coins will be restored to your wallet balance.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Submitting Report…</span>
                  </>
                ) : (
                  <span>Submit & Request Refund</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
