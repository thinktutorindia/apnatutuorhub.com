"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formString, formInt } from "@/lib/form-data";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReviewState = ActionResult<{ reviewId: string }>;

export type ExistingReview = {
  id: string;
  overallRating: number;
  teachingRating: number | null;
  communicationRating: number | null;
  punctualityRating: number | null;
  comment: string | null;
  isEditable: boolean;
  editLockedAt: Date | null;
};

// 48-hour edit window
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

// ─── Helper: recalculate tutor aggregate rating ───────────────────────────────

async function recalcTutorRating(tutorProfileId: string) {
  const agg = await prisma.review.aggregate({
    where: { tutorProfileId, reviewerRole: "PARENT" },
    _avg: { overallRating: true },
    _count: { id: true },
  });

  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: {
      averageRating: agg._avg.overallRating ?? 0,
      totalReviews: agg._count.id,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// submitReviewAction — Parent or Tutor submits / updates a review
// ────────────────────────────────────────────────────────────────────────────

export async function submitReviewAction(
  _prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError("Your session has expired. Please log in again.");
  }

  const bookingId = formString(formData, "bookingId");
  const overallRating = formInt(formData, "overallRating");
  const teachingRating = formInt(formData, "teachingRating") ?? null;
  const communicationRating = formInt(formData, "communicationRating") ?? null;
  const punctualityRating = formInt(formData, "punctualityRating") ?? null;
  const comment = formString(formData, "comment") ?? null;

  if (!bookingId) return actionError("Missing booking reference.");
  if (!overallRating || overallRating < 1 || overallRating > 5) {
    return actionError("Please select an overall star rating (1–5).");
  }

  // Load the booking to verify access & status
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      tutorProfileId: true,
      tutorProfile: { select: { userId: true } },
      lead: {
        select: {
          parentProfile: { select: { userId: true } },
        },
      },
    },
  });

  if (!booking) return actionError("Booking not found.");

  // Guard: only COMPLETED bookings can be reviewed
  if (booking.status !== "COMPLETED") {
    return actionError("Reviews can only be submitted for completed classes.");
  }

  // Guard: reviewer must be either the parent or the tutor on this booking
  const parentUserId = booking.lead.parentProfile.userId;
  const tutorUserId = booking.tutorProfile.userId;
  const isParent = session.user.id === parentUserId;
  const isTutor = session.user.id === tutorUserId;

  if (!isParent && !isTutor) {
    return actionError("You are not a participant in this booking.");
  }

  const reviewerRole = isParent ? "PARENT" : ("TUTOR" as const);

  // Check for existing review
  const existing = await prisma.review.findUnique({
    where: {
      bookingId_reviewerUserId: {
        bookingId,
        reviewerUserId: session.user.id,
      },
    },
    select: { id: true, isEditable: true, editLockedAt: true },
  });

  if (existing) {
    // Guard: 48-hour edit window
    if (!existing.isEditable) {
      return actionError(
        "The 48-hour edit window for this review has closed. Reviews cannot be changed after that."
      );
    }
    if (existing.editLockedAt && existing.editLockedAt < new Date()) {
      // Lock the review and block
      await prisma.review.update({
        where: { id: existing.id },
        data: { isEditable: false },
      });
      return actionError(
        "The 48-hour edit window for this review has just closed."
      );
    }

    // Update existing review
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: {
        overallRating,
        teachingRating,
        communicationRating,
        punctualityRating,
        comment,
      },
      select: { id: true },
    });

    if (isParent) await recalcTutorRating(booking.tutorProfileId);
    revalidatePaths(booking.tutorProfileId);
    return actionSuccess({ reviewId: updated.id });
  }

  // Create new review
  const editLockedAt = new Date(Date.now() + EDIT_WINDOW_MS);

  const review = await prisma.review.create({
    data: {
      bookingId,
      tutorProfileId: booking.tutorProfileId,
      reviewerUserId: session.user.id,
      reviewerRole,
      overallRating,
      teachingRating,
      communicationRating,
      punctualityRating,
      comment,
      editLockedAt,
      isEditable: true,
    },
    select: { id: true },
  });

  if (isParent) await recalcTutorRating(booking.tutorProfileId);
  revalidatePaths(booking.tutorProfileId);
  return actionSuccess({ reviewId: review.id });
}

// ────────────────────────────────────────────────────────────────────────────
// getMyReviewForBooking — RSC helper: fetch reviewer's own review for a booking
// ────────────────────────────────────────────────────────────────────────────

export async function getMyReviewForBooking(
  bookingId: string,
  userId: string
): Promise<ExistingReview | null> {
  const review = await prisma.review.findUnique({
    where: {
      bookingId_reviewerUserId: { bookingId, reviewerUserId: userId },
    },
    select: {
      id: true,
      overallRating: true,
      teachingRating: true,
      communicationRating: true,
      punctualityRating: true,
      comment: true,
      isEditable: true,
      editLockedAt: true,
    },
  });

  if (!review) return null;

  // Auto-lock expired edit windows
  if (review.isEditable && review.editLockedAt && review.editLockedAt < new Date()) {
    await prisma.review.update({
      where: { bookingId_reviewerUserId: { bookingId, reviewerUserId: userId } },
      data: { isEditable: false },
    });
    return { ...review, isEditable: false };
  }

  return review;
}

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidatePaths(tutorProfileId: string) {
  revalidatePath(`/tutor/${tutorProfileId}`);
  revalidatePath("/parent/bookings");
  revalidatePath("/tutor/bookings");
}
