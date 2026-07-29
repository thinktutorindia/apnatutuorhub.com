"use client";

import { useActionState, useEffect } from "react";
import { Star, X } from "lucide-react";
import { submitReviewAction } from "@/app/actions/review.actions";
import StarRating from "./StarRating";
import type { ExistingReview } from "@/app/actions/review.actions";

type Props = {
  bookingId: string;
  tutorName: string;
  subject: string;
  existingReview?: ExistingReview | null;
  onClose: () => void;
};

const initial = { success: false, error: undefined as string | undefined };

export default function ParentReviewModal({
  bookingId,
  tutorName,
  subject,
  existingReview,
  onClose,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    submitReviewAction,
    initial
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  const isLocked = existingReview && !existingReview.isEditable;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="neu-card w-full max-w-lg space-y-5 bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Star size={18} className="fill-amber-400 text-amber-400" />
              <h2 className="text-xl font-black text-[#0F172A]">
                {existingReview ? "Edit Your Review" : "Rate Your Tutor"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {tutorName} · {subject}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-[#0F172A] p-1.5 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Locked notice */}
        {isLocked && (
          <div className="rounded-2xl border-2 border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-red-700">
            ⏰ The 48-hour edit window has closed for this review. It can no longer be changed.
          </div>
        )}

        {/* Review form */}
        {!isLocked && (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="bookingId" value={bookingId} />

            <StarRating
              name="teachingRating"
              label="Teaching Quality"
              defaultValue={existingReview?.teachingRating ?? 0}
            />
            <StarRating
              name="communicationRating"
              label="Communication"
              defaultValue={existingReview?.communicationRating ?? 0}
            />
            <StarRating
              name="punctualityRating"
              label="Punctuality"
              defaultValue={existingReview?.punctualityRating ?? 0}
            />
            <StarRating
              name="overallRating"
              label="Overall Experience"
              defaultValue={existingReview?.overallRating ?? 0}
              required
            />

            {/* Comment */}
            <div className="space-y-1.5">
              <label
                htmlFor="parent-review-comment"
                className="text-xs font-black text-[#0F172A]"
              >
                Written Review{" "}
                <span className="font-semibold text-slate-400">(optional)</span>
              </label>
              <textarea
                id="parent-review-comment"
                name="comment"
                rows={3}
                defaultValue={existingReview?.comment ?? ""}
                placeholder="Share your experience with this tutor…"
                className="w-full rounded-2xl border-2 border-[#0F172A] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
              />
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
                {isPending
                  ? "Submitting…"
                  : existingReview
                    ? "Update Review"
                    : "Submit Review"}
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
        )}

        {isLocked && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Teaching", value: existingReview?.teachingRating },
                { label: "Communication", value: existingReview?.communicationRating },
                { label: "Punctuality", value: existingReview?.punctualityRating },
                { label: "Overall", value: existingReview?.overallRating },
              ].map(({ label, value }) =>
                value ? (
                  <div
                    key={label}
                    className="rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] px-3 py-1.5 text-xs font-black"
                  >
                    {label}: {"★".repeat(value)}{"☆".repeat(5 - value)}
                  </div>
                ) : null
              )}
            </div>
            {existingReview?.comment && (
              <blockquote className="rounded-xl border-l-4 border-amber-400 bg-[#FFFBEB] p-3 text-xs font-semibold italic text-slate-700">
                &quot;{existingReview.comment}&quot;
              </blockquote>
            )}
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white w-full py-3 text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
