"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveParentContext } from "@/lib/parent-context";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import { formString, formInt } from "@/lib/form-data";
import { evaluateTutorMilestones } from "@/lib/milestone-tracker";
import { logActivity, ActivityEvent } from "@/lib/activity-logger";
import { createNotification } from "@/lib/notification-engine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingState = ActionResult<{ bookingId: string }>;
export type BookingUpdateState = ActionResult<{ updated: true }>;

// Two-hour window before class start — cannot cancel past this point.
const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;

// ── Revalidate helpers ────────────────────────────────────────────────────────

function revalidateBookingPaths(leadId?: string) {
  revalidatePath("/parent/bookings");
  revalidatePath("/tutor/bookings");
  if (leadId) revalidatePath(`/parent/my-leads/${leadId}/applicants`);
}

// ────────────────────────────────────────────────────────────────────────────
// createBookingAction — Parent books a trial or regular class with a tutor
// ────────────────────────────────────────────────────────────────────────────

export async function createBookingAction(
  _prevState: BookingState,
  formData: FormData
): Promise<BookingState> {
  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  const leadId = formString(formData, "leadId");
  const tutorProfileId = formString(formData, "tutorProfileId");
  const isTrial = formData.get("isTrial") === "true";
  const startDateRaw = formString(formData, "startDate");
  const classFrequency = formString(formData, "classFrequency");
  const agreedFee = formInt(formData, "agreedFee");
  const notes = formString(formData, "notes");

  if (!leadId || !tutorProfileId) {
    return actionError("Missing booking details. Please try again.");
  }

  // Verify the lead belongs to this parent
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, parentProfileId: auth.context.parentProfileId },
    select: {
      id: true,
      subjects: true,
      classLevel: true,
      mode: true,
    },
  });

  if (!lead) return actionError("Requirement not found or access denied.");

  // Verify the tutor has purchased this lead (they must have unlocked contact)
  const purchase = await prisma.leadPurchase.findFirst({
    where: { leadId, tutorProfileId },
    select: { id: true },
  });

  if (!purchase) {
    return actionError("This tutor has not unlocked your requirement yet.");
  }

  // Completed trials must not block a regular hire. Cancelled bookings never block.
  const existing = await prisma.booking.findFirst({
    where: {
      leadId,
      tutorProfileId,
      status: { notIn: ["CANCELLED"] },
    },
    select: { id: true, status: true, isTrial: true },
  });

  if (existing && existing.status !== "COMPLETED") {
    return actionError(
      "A booking with this tutor already exists for this requirement."
    );
  }

  if (existing?.status === "COMPLETED" && isTrial) {
    return actionError(
      "A trial with this tutor is already completed. Hire them for regular classes instead."
    );
  }

  // Resolve tutor name for denormalized storage
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    select: { userId: true, user: { select: { name: true } } },
  });

  if (!tutorProfile) return actionError("Tutor not found.");

  // Resolve parent name
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { id: auth.context.parentProfileId },
    select: { user: { select: { name: true } } },
  });

  const startDate = startDateRaw ? new Date(startDateRaw) : null;

  const booking = await prisma.booking.create({
    data: {
      leadId,
      tutorProfileId,
      parentName: parentProfile?.user.name ?? null,
      tutorName: tutorProfile.user.name ?? null,
      subject: lead.subjects.join(", "),
      classLevel: lead.classLevel,
      mode: lead.mode,
      isTrial,
      startDate,
      classFrequency: classFrequency ?? null,
      agreedFee: agreedFee ?? null,
      venueAddress: notes ?? null, // notes stored as venue/extra info for now
      status: "REQUESTED",
    },
    select: { id: true },
  });

  // Notify the tutor via notification engine
  void createNotification({
    userId: tutorProfile.userId,
    type: "BOOKING_REQUESTED",
    priority: "HIGH",
    title: isTrial ? "📅 Trial Class Requested!" : "📚 Hire Request Received!",
    message: `A parent has requested a ${isTrial ? "trial class" : "regular class"} with you for ${lead.subjects.join(", ")} (${lead.classLevel}).`,
    actionUrl: "/tutor/bookings",
  });

  revalidateBookingPaths(leadId);

  return actionSuccess({ bookingId: booking.id });
}

// ────────────────────────────────────────────────────────────────────────────
// confirmBookingAction — Tutor confirms an incoming booking request
// ────────────────────────────────────────────────────────────────────────────

export async function confirmBookingAction(
  bookingId: string,
  meetLink?: string,
  venueAddress?: string
): Promise<BookingUpdateState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tutorProfileId: auth.context.tutorProfileId },
    select: {
      id: true,
      leadId: true,
      status: true,
      lead: {
        select: { parentProfile: { select: { userId: true, user: { select: { name: true } } } } },
      },
      subject: true,
    },
  });

  if (!booking) return actionError("Booking not found or access denied.");

  if (booking.status !== "REQUESTED" && booking.status !== "RESCHEDULED") {
    return actionError("Only REQUESTED or RESCHEDULED bookings can be confirmed.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      ...(meetLink ? { meetLink } : {}),
      ...(venueAddress ? { venueAddress } : {}),
    },
  });

  // Notify parent
  void createNotification({
    userId: booking.lead.parentProfile.userId,
    type: "BOOKING_CONFIRMED",
    priority: "HIGH",
    title: "✅ Booking Confirmed!",
    message: `Your ${booking.subject} class booking has been confirmed by the tutor.${meetLink ? " A Meet link has been shared." : ""}`,
    actionUrl: "/parent/bookings",
  });

  revalidateBookingPaths(booking.leadId);
  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────────────────────────────────
// addClassLinkAction — Tutor shares a Google Meet / Zoom link
// ────────────────────────────────────────────────────────────────────────────

export async function addClassLinkAction(
  _prevState: BookingUpdateState,
  formData: FormData
): Promise<BookingUpdateState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  const bookingId = formString(formData, "bookingId");
  const meetLink = formString(formData, "meetLink");

  if (!bookingId) return actionError("Missing booking ID.");
  if (!meetLink) return actionError("Please enter a valid meet link.");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tutorProfileId: auth.context.tutorProfileId },
    select: {
      id: true,
      leadId: true,
      status: true,
      subject: true,
      lead: {
        select: { parentProfile: { select: { userId: true } } },
      },
    },
  });

  if (!booking) return actionError("Booking not found or access denied.");

  if (booking.status !== "CONFIRMED") {
    return actionError("Only CONFIRMED bookings can have a meet link added.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { meetLink },
  });

  // Notify parent
  void createNotification({
    userId: booking.lead.parentProfile.userId,
    type: "CLASS_LINK_SHARED",
    title: "🔗 Class Link Shared!",
    message: `Your tutor has shared a Google Meet link for the ${booking.subject} class.`,
    actionUrl: "/parent/bookings",
  });

  revalidateBookingPaths(booking.leadId);
  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────────────────────────────────
// rescheduleBookingAction — Either side proposes a new date/time
// ────────────────────────────────────────────────────────────────────────────

export async function rescheduleBookingAction(
  _prevState: BookingUpdateState,
  formData: FormData
): Promise<BookingUpdateState> {
  const bookingId = formString(formData, "bookingId");
  const newDateRaw = formString(formData, "newDate");

  if (!bookingId || !newDateRaw) {
    return actionError("Missing booking ID or new date.");
  }

  const newDate = new Date(newDateRaw);
  if (isNaN(newDate.getTime())) {
    return actionError("Invalid date format.");
  }

  // Try tutor auth first, then parent auth
  const tutorAuth = await resolveTutorContext();
  const parentAuth = await resolveParentContext();

  const isFromTutor = tutorAuth.ok;
  const isFromParent = !isFromTutor && parentAuth.ok;

  if (!isFromTutor && !isFromParent) {
    return actionError("You must be logged in as a tutor or parent.");
  }

  // Safe extraction — guarded by the check above
  const tutorProfileId = isFromTutor ? tutorAuth.context.tutorProfileId : undefined;
  const parentProfileId = !isFromTutor && parentAuth.ok ? parentAuth.context.parentProfileId : undefined;

  // Fetch booking scoped to the viewer's identity
  const booking = isFromTutor
    ? await prisma.booking.findFirst({
        where: {
          id: bookingId,
          tutorProfileId: tutorProfileId!,
        },
        select: {
          id: true,
          leadId: true,
          status: true,
          subject: true,
          lead: {
            select: { parentProfile: { select: { userId: true } } },
          },
          tutorProfile: { select: { userId: true } },
        },
      })
    : await prisma.booking.findFirst({
        where: {
          id: bookingId,
          lead: { parentProfileId: parentProfileId! },
        },
        select: {
          id: true,
          leadId: true,
          status: true,
          subject: true,
          lead: {
            select: { parentProfile: { select: { userId: true } } },
          },
          tutorProfile: { select: { userId: true } },
        },
      });

  if (!booking) return actionError("Booking not found or access denied.");

  if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
    return actionError("Cannot reschedule a completed or cancelled booking.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "RESCHEDULED", startDate: newDate },
  });

  // Notify the OTHER party
  const notifyUserId = isFromTutor
    ? booking.lead.parentProfile.userId
    : booking.tutorProfile.userId;

  void createNotification({
    userId: notifyUserId,
    type: "BOOKING_RESCHEDULED",
    priority: "NORMAL",
    title: "🔄 Booking Rescheduled",
    message: `The ${booking.subject} class has been rescheduled to ${newDate.toLocaleDateString("en-IN", { dateStyle: "long" })}. Please confirm the new time.`,
    actionUrl: isFromTutor ? "/parent/bookings" : "/tutor/bookings",
  });

  revalidateBookingPaths(booking.leadId);
  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────────────────────────────────
// cancelBookingAction — Either side cancels; 2-hour cutoff enforced
// ────────────────────────────────────────────────────────────────────────────

export async function cancelBookingAction(
  _prevState: BookingUpdateState,
  formData: FormData
): Promise<BookingUpdateState> {
  const bookingId = formString(formData, "bookingId");
  const cancelReason = formString(formData, "cancelReason");

  if (!bookingId) return actionError("Missing booking ID.");

  const tutorAuth2 = await resolveTutorContext();
  const parentAuth2 = await resolveParentContext();

  const isFromTutor = tutorAuth2.ok;
  const isFromParent = !isFromTutor && parentAuth2.ok;

  if (!isFromTutor && !isFromParent) {
    return actionError("You must be logged in as a tutor or parent.");
  }

  // Safe extraction after ok guard
  const tutorProfileId2 = isFromTutor ? tutorAuth2.context.tutorProfileId : undefined;
  const parentProfileId2 = !isFromTutor && parentAuth2.ok ? parentAuth2.context.parentProfileId : undefined;
  const callerUserId = isFromTutor
    ? tutorAuth2.context.userId
    : parentAuth2.ok
      ? parentAuth2.context.userId
      : undefined;

  const booking = isFromTutor
    ? await prisma.booking.findFirst({
        where: {
          id: bookingId,
          tutorProfileId: tutorProfileId2!,
        },
        select: {
          id: true,
          leadId: true,
          status: true,
          subject: true,
          startDate: true,
          lead: {
            select: { parentProfile: { select: { userId: true } } },
          },
          tutorProfile: { select: { userId: true } },
        },
      })
    : await prisma.booking.findFirst({
        where: {
          id: bookingId,
          lead: { parentProfileId: parentProfileId2! },
        },
        select: {
          id: true,
          leadId: true,
          status: true,
          subject: true,
          startDate: true,
          lead: {
            select: { parentProfile: { select: { userId: true } } },
          },
          tutorProfile: { select: { userId: true } },
        },
      });

  if (!booking) return actionError("Booking not found or access denied.");

  if (booking.status === "COMPLETED") {
    return actionError("Cannot cancel a completed class.");
  }

  if (booking.status === "CANCELLED") {
    return actionError("This booking is already cancelled.");
  }

  // 2-hour cutoff guard
  if (booking.startDate) {
    const msTillStart = booking.startDate.getTime() - Date.now();
    if (msTillStart > 0 && msTillStart < CANCEL_CUTOFF_MS) {
      return actionError(
        "Bookings cannot be cancelled within 2 hours of the class start time."
      );
    }
  }

  const cancelledBy = callerUserId ?? "unknown";

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledBy,
      cancelReason: cancelReason ?? null,
    },
  });

  const notifyUserId = isFromTutor
    ? booking.lead.parentProfile.userId
    : booking.tutorProfile.userId;

  void createNotification({
    userId: notifyUserId,
    type: "BOOKING_CANCELLED",
    priority: "HIGH",
    title: "❌ Booking Cancelled",
    message: `The ${booking.subject} class booking has been cancelled.${cancelReason ? ` Reason: ${cancelReason}` : ""}`,
    actionUrl: isFromTutor ? "/parent/bookings" : "/tutor/bookings",
  });

  revalidateBookingPaths(booking.leadId);
  return actionSuccess({ updated: true as const });
}

// ────────────────────────────────────────────────────────────────────────────
// completeBookingAction — Tutor marks class as completed
// ────────────────────────────────────────────────────────────────────────────

export async function completeBookingAction(
  bookingId: string
): Promise<BookingUpdateState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tutorProfileId: auth.context.tutorProfileId },
    select: {
      id: true,
      leadId: true,
      status: true,
      subject: true,
      tutorProfileId: true,
      lead: {
        select: { parentProfile: { select: { userId: true } } },
      },
    },
  });

  if (!booking) return actionError("Booking not found or access denied.");

  if (booking.status !== "CONFIRMED" && booking.status !== "RESCHEDULED") {
    return actionError("Only CONFIRMED or RESCHEDULED bookings can be completed.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Prompt parent to review
  void createNotification({
    userId: booking.lead.parentProfile.userId,
    type: "BOOKING_COMPLETED",
    priority: "HIGH",
    title: "⭐ Class Completed! Leave a Review",
    message: `Your ${booking.subject} class is complete. Please leave a review for your tutor — it helps other parents!`,
    actionUrl: "/parent/bookings",
    referenceId: bookingId,
  });

  // ── Enterprise Upgrade: Milestone Evaluation (Phase 12) ──────────────────
  // Previously MISSING — evaluateTutorMilestones() was defined but never called.
  // Now fires asynchronously after response returns to avoid blocking the UI.
  after(() => evaluateTutorMilestones(booking.tutorProfileId));

  // ── Enterprise Upgrade: Activity Logging (Phase 13) ──────────────────────
  after(() =>
    logActivity({
      userId: auth.context.userId,
      event: ActivityEvent.BOOKING_COMPLETED,
      metadata: { bookingId, tutorProfileId: booking.tutorProfileId },
    })
  );

  revalidateBookingPaths(booking.leadId);
  return actionSuccess({ updated: true as const });
}
