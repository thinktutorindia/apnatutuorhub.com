"use client";

import { useActionState, useEffect, useRef } from "react";
import { Link2, X } from "lucide-react";
import { addClassLinkAction } from "@/app/actions/booking.actions";

type Props = {
  bookingId: string;
  currentLink: string;
  onClose: () => void;
};

const initial: { success: boolean; error?: string } = { success: false };

export default function ClassLinkModal({ bookingId, currentLink, onClose }: Props) {
  const [state, formAction, isPending] = useActionState(addClassLinkAction, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="neu-card w-full max-w-md space-y-5 bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0F172A]">Share Class Link</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Paste your Google Meet or Zoom link below
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-[#0F172A] p-1.5 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form ref={ref} action={formAction} className="space-y-4">
          <input type="hidden" name="bookingId" value={bookingId} />

          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#0F172A]" htmlFor="meetLink-input">
              Class Meeting Link
            </label>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <Link2 size={15} className="shrink-0 text-slate-400" />
              <input
                id="meetLink-input"
                name="meetLink"
                type="url"
                defaultValue={currentLink}
                placeholder="https://meet.google.com/abc-defg-hij"
                required
                className="w-full bg-transparent py-3 text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {state.error && (
            <p className="rounded-xl border-2 border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-xs font-semibold text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="neu-btn neu-btn-primary flex-1 py-3 text-sm"
            >
              {isPending ? "Sharing…" : "Share Link"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white px-5 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
