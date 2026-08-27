"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarDays, IndianRupee, X } from "lucide-react";
import { createBookingAction } from "@/app/actions/booking.actions";

type Props = {
  leadId: string;
  tutorProfileId: string;
  tutorName: string;
  subject: string;
  classLevel: string;
  defaultIsTrial?: boolean;
  feeLabel?: string;
  onClose: () => void;
};

const initial: { success: boolean; error?: string } = { success: false };

// Computed once at module load — modals are always freshly mounted so this stays accurate
function getMinDate(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}



const FREQUENCY_OPTIONS = [
  "1x per week",
  "2x per week",
  "3x per week",
  "4x per week",
  "5x per week",
  "6x per week",
  "Daily (7x per week)",
];

export default function BookingFormModal({
  leadId,
  tutorProfileId,
  tutorName,
  subject,
  classLevel,
  defaultIsTrial = true,
  feeLabel = "Agreed Fee per Hour",
  onClose,
}: Props) {
  const [state, formAction, isPending] = useActionState(createBookingAction, initial);
  const [isTrial, setIsTrial] = useState(defaultIsTrial);
  const formRef = useRef<HTMLFormElement>(null);

  const minDate = getMinDate();

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="neu-card w-full max-w-lg space-y-5 bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0F172A]">
              Book a Class with {tutorName}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {subject} · {classLevel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-[#0F172A] p-1.5 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Trial / Regular toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsTrial(true)}
            className={`flex-1 rounded-2xl border-2 border-[#0F172A] py-2.5 text-sm font-black transition-all ${
              isTrial
                ? "bg-[#0F172A] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,0.3)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50"
            }`}
          >
            🧪 Trial Class
          </button>
          <button
            type="button"
            onClick={() => setIsTrial(false)}
            className={`flex-1 rounded-2xl border-2 border-[#0F172A] py-2.5 text-sm font-black transition-all ${
              !isTrial
                ? "bg-[#0F172A] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,0.3)]"
                : "bg-white text-[#0F172A] hover:bg-slate-50"
            }`}
          >
            📚 Regular Hire
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="tutorProfileId" value={tutorProfileId} />
          <input type="hidden" name="isTrial" value={String(isTrial)} />

          {/* Start Date & Time */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-black text-[#0F172A]"
              htmlFor="booking-startDate"
            >
              {isTrial ? "Trial Date & Time" : "Start Date & Time"}
              <span className="ml-1 font-semibold text-slate-400">(optional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <CalendarDays size={15} className="shrink-0 text-slate-400" />
              <input
                id="booking-startDate"
                name="startDate"
                type="datetime-local"
                min={minDate}
                className="w-full bg-transparent py-3 text-sm font-semibold text-[#0F172A] focus:outline-none"
              />
            </div>
          </div>

          {/* Class Frequency (regular only) */}
          {!isTrial && (
            <div className="space-y-1.5">
              <label
                className="text-xs font-black text-[#0F172A]"
                htmlFor="booking-frequency"
              >
                Class Frequency
              </label>
              <select
                id="booking-frequency"
                name="classFrequency"
                className="w-full rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-3 py-3 text-sm font-semibold text-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
              >
                <option value="">Select frequency…</option>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Agreed Fee */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-black text-[#0F172A]"
              htmlFor="booking-fee"
            >
              {feeLabel}
              <span className="ml-1 font-semibold text-slate-400">(optional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <IndianRupee size={15} className="shrink-0 text-slate-400" />
              <input
                id="booking-fee"
                name="agreedFee"
                type="number"
                min={0}
                placeholder="e.g. 800"
                className="w-full bg-transparent py-3 text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-black text-[#0F172A]"
              htmlFor="booking-notes"
            >
              Notes / Venue (optional)
            </label>
            <textarea
              id="booking-notes"
              name="notes"
              rows={2}
              placeholder={
                isTrial
                  ? "Any specific topic to cover in the trial…"
                  : "Home address or any notes for the tutor…"
              }
              className="w-full rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
            />
          </div>

          {/* Error */}
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
              {isPending
                ? "Sending Request…"
                : isTrial
                  ? "Request Trial Class"
                  : "Send Hire Request"}
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
