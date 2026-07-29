"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Link2,
  MapPin,
  MessageSquarePlus,
  RefreshCw,
  Video,
  XCircle,
} from "lucide-react";
import {
  cancelBookingAction,
  completeBookingAction,
  confirmBookingAction,
} from "@/app/actions/booking.actions";
import ClassLinkModal from "./ClassLinkModal";
import RescheduleModal from "./RescheduleModal";
import ParentReviewModal from "@/components/reviews/ParentReviewModal";
import TutorReviewModal from "@/components/reviews/TutorReviewModal";
import type { ExistingReview } from "@/app/actions/review.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BookingCardData = {
  id: string;
  subject: string;
  classLevel: string;
  mode: string;
  status: string;
  isTrial: boolean;
  startDate: Date | null;
  classFrequency: string | null;
  agreedFee: number | null;
  meetLink: string | null;
  venueAddress: string | null;
  cancelReason: string | null;
  completedAt: Date | null;
  parentName: string | null;
  tutorName: string | null;
  leadId: string;
};

type Role = "PARENT" | "TUTOR";

type Props = {
  booking: BookingCardData;
  viewerRole: Role;
  hasReview?: boolean;
  existingReview?: ExistingReview | null;
};

// ─── Status badge colours ─────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; emoji: string }
> = {
  REQUESTED: {
    label: "Awaiting Confirmation",
    bg: "#FEF3C7",
    text: "#92400E",
    emoji: "⏳",
  },
  CONFIRMED: {
    label: "Confirmed",
    bg: "#DCFCE7",
    text: "#166534",
    emoji: "✅",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    bg: "#E0F2FE",
    text: "#0369A1",
    emoji: "🔄",
  },
  COMPLETED: {
    label: "Completed",
    bg: "#F3E8FF",
    text: "#6B21A8",
    emoji: "⭐",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "#FEE2E2",
    text: "#991B1B",
    emoji: "❌",
  },
};

// ─── BookingCard ─────────────────────────────────────────────────────────────

export default function BookingCard({ booking, viewerRole, hasReview = false, existingReview }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const meta = STATUS_META[booking.status] ?? STATUS_META.REQUESTED;
  const isActive = !["COMPLETED", "CANCELLED"].includes(booking.status);
  const isTutor = viewerRole === "TUTOR";

  const canConfirm =
    isTutor && (booking.status === "REQUESTED" || booking.status === "RESCHEDULED");
  const canShareLink =
    isTutor && booking.status === "CONFIRMED" && booking.mode !== "OFFLINE";
  const canComplete = isTutor && booking.status === "CONFIRMED";
  const canReschedule =
    isActive && booking.status !== "COMPLETED" && booking.status !== "CANCELLED";
  const canCancel = isActive;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmBookingAction(booking.id);
      if (!res.success) setError(res.error ?? "Something went wrong.");
    });
  }

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const res = await completeBookingAction(booking.id);
      if (!res.success) setError(res.error ?? "Something went wrong.");
    });
  }

  const counterpartyName = isTutor ? booking.parentName : booking.tutorName;

  return (
    <>
      <div
        className={`neu-card space-y-4 bg-white p-5 transition-opacity ${
          booking.status === "CANCELLED" ? "opacity-60" : ""
        }`}
      >
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type badge */}
              <span className="neu-badge bg-[#F3E8FF] text-[11px]">
                {booking.isTrial ? "🧪 Trial" : "📚 Regular"}
              </span>
              {/* Status badge */}
              <span
                className="neu-badge text-[11px] font-black"
                style={{
                  backgroundColor: meta.bg,
                  color: meta.text,
                }}
              >
                {meta.emoji} {meta.label}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#0F172A]">
              {booking.subject}
            </h3>
            <p className="text-xs font-semibold text-slate-600">
              {booking.classLevel} · {booking.mode}
              {counterpartyName && ` · ${isTutor ? "Parent" : "Tutor"}: ${counterpartyName}`}
            </p>
          </div>

          {/* Fee */}
          {booking.agreedFee && (
            <div className="rounded-xl border-2 border-[#0F172A] bg-[#DCFCE7] px-3 py-1.5 text-sm font-black">
              ₹{booking.agreedFee}/hr
            </div>
          )}
        </div>

        {/* Date / frequency row */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          {booking.startDate && (
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {new Date(booking.startDate).toLocaleDateString("en-IN", {
                dateStyle: "long",
              })}{" "}
              {new Date(booking.startDate).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {booking.classFrequency && (
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {booking.classFrequency}
            </span>
          )}
          {booking.mode === "OFFLINE" && booking.venueAddress && (
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {booking.venueAddress}
            </span>
          )}
        </div>

        {/* Meet link */}
        {booking.meetLink && (
          <a
            href={booking.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border-2 border-[#0F172A] bg-[#E0F2FE] px-4 py-2.5 text-sm font-black text-[#0369A1] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all"
          >
            <Video size={15} />
            Join Online Class
            <ExternalLink size={12} className="ml-auto" />
          </a>
        )}

        {/* Cancel reason */}
        {booking.status === "CANCELLED" && booking.cancelReason && (
          <p className="rounded-xl border-2 border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-xs font-semibold text-red-700">
            Reason: {booking.cancelReason}
          </p>
        )}

        {/* Completion note */}
        {booking.status === "COMPLETED" && booking.completedAt && (
          <p className="text-xs font-semibold text-slate-500">
            Completed on{" "}
            {new Date(booking.completedAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            })}
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-xl border-2 border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        {/* Action buttons */}
        {isActive && (
          <div className="flex flex-wrap gap-2 border-t-2 border-[#E2E8F0] pt-3">
            {/* Tutor: Confirm */}
            {canConfirm && (
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="neu-btn neu-btn-primary px-4 py-2 text-xs"
              >
                <CheckCircle size={13} />
                {isPending ? "Confirming…" : "Confirm Booking"}
              </button>
            )}

            {/* Tutor: Share Meet Link */}
            {canShareLink && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="neu-btn bg-[#E0F2FE] px-4 py-2 text-xs text-[#0369A1]"
              >
                <Link2 size={13} />
                {booking.meetLink ? "Update Link" : "Share Meet Link"}
              </button>
            )}

            {/* Tutor: Mark Complete */}
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="neu-btn bg-[#F3E8FF] px-4 py-2 text-xs text-[#6B21A8]"
              >
                <CheckCircle size={13} />
                {isPending ? "Marking…" : "Mark Complete"}
              </button>
            )}

            {/* Both: Reschedule */}
            {canReschedule && (
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="neu-btn neu-btn-white px-4 py-2 text-xs"
              >
                <RefreshCw size={13} />
                Reschedule
              </button>
            )}

            {/* Both: Cancel */}
            {canCancel && (
              <form
                action={async (fd) => {
                  setError(null);
                  const res = await cancelBookingAction({ success: false }, fd);
                  if (!res.success) setError(res.error ?? "Something went wrong.");
                }}
              >
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="neu-btn bg-[#FEF2F2] px-4 py-2 text-xs text-red-600"
                >
                  <XCircle size={13} />
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}

        {/* Completed-booking actions: review */}
        {booking.status === "COMPLETED" && (
          <div className="flex flex-wrap gap-2 border-t-2 border-[#E2E8F0] pt-3">
            <button
              onClick={() => setShowReviewModal(true)}
              className={`neu-btn px-4 py-2 text-xs ${
                hasReview
                  ? "bg-[#FEF3C7] text-amber-800"
                  : "bg-[#DCFCE7] text-[#166534]"
              }`}
            >
              <MessageSquarePlus size={13} />
              {hasReview ? "View / Edit Review" : "Leave a Review"}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLinkModal && (
        <ClassLinkModal
          bookingId={booking.id}
          currentLink={booking.meetLink ?? ""}
          onClose={() => setShowLinkModal(false)}
        />
      )}
      {showRescheduleModal && (
        <RescheduleModal
          bookingId={booking.id}
          currentDate={booking.startDate ?? undefined}
          onClose={() => setShowRescheduleModal(false)}
        />
      )}
      {showReviewModal && viewerRole === "PARENT" && (
        <ParentReviewModal
          bookingId={booking.id}
          tutorName={booking.tutorName ?? "Tutor"}
          subject={booking.subject}
          existingReview={existingReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
      {showReviewModal && viewerRole === "TUTOR" && (
        <TutorReviewModal
          bookingId={booking.id}
          parentName={booking.parentName ?? "Student"}
          subject={booking.subject}
          existingReview={existingReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </>
  );
}
