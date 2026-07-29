import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookingCard from "@/components/booking/BookingCard";
import type { ExistingReview } from "@/app/actions/review.actions";

export const metadata = {
  title: "My Bookings | ThinkTutor",
  description: "View and manage your class bookings and trial sessions.",
};

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Upcoming" },
  { key: "TRIAL", label: "Trials" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

type TabKey = (typeof STATUS_TABS)[number]["key"];

export default async function ParentBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [session, sp] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) redirect("/login");

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!parentProfile) redirect("/parent/dashboard");

  const tab = ((sp.tab ?? "ALL") as TabKey);

  // Build status filter
  type WhereStatus =
    | { status: "COMPLETED" }
    | { status: "CANCELLED" }
    | { status: { notIn: ("COMPLETED" | "CANCELLED")[] } }
    | { isTrial: boolean }
    | undefined;

  let statusFilter: WhereStatus;

  if (tab === "ACTIVE") {
    statusFilter = { status: { notIn: ["COMPLETED", "CANCELLED"] } };
  } else if (tab === "COMPLETED") {
    statusFilter = { status: "COMPLETED" };
  } else if (tab === "CANCELLED") {
    statusFilter = { status: "CANCELLED" };
  } else if (tab === "TRIAL") {
    statusFilter = { isTrial: true };
  }

  const bookings = await prisma.booking.findMany({
    where: {
      lead: { parentProfileId: parentProfile.id },
      ...(statusFilter ?? {}),
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      subject: true,
      classLevel: true,
      mode: true,
      status: true,
      isTrial: true,
      startDate: true,
      classFrequency: true,
      agreedFee: true,
      meetLink: true,
      venueAddress: true,
      cancelReason: true,
      completedAt: true,
      parentName: true,
      tutorName: true,
      leadId: true,
    },
  });

  // Batch-fetch existing reviews for completed bookings
  const completedBookingIds = bookings
    .filter((b) => b.status === "COMPLETED")
    .map((b) => b.id);

  const myReviews = completedBookingIds.length
    ? await prisma.review.findMany({
        where: {
          bookingId: { in: completedBookingIds },
          reviewerUserId: session.user.id,
        },
        select: {
          id: true,
          bookingId: true,
          overallRating: true,
          teachingRating: true,
          communicationRating: true,
          punctualityRating: true,
          comment: true,
          isEditable: true,
          editLockedAt: true,
        },
      })
    : [];

  const reviewMap = new Map<string, ExistingReview>(
    myReviews.map((r) => [
      r.bookingId,
      {
        id: r.id,
        overallRating: r.overallRating,
        teachingRating: r.teachingRating,
        communicationRating: r.communicationRating,
        punctualityRating: r.punctualityRating,
        comment: r.comment,
        isEditable: r.isEditable,
        editLockedAt: r.editLockedAt,
      },
    ])
  );

  const counts = {
    ALL: bookings.length,
    ACTIVE: bookings.filter(
      (b) => !["COMPLETED", "CANCELLED"].includes(b.status)
    ).length,
    TRIAL: bookings.filter((b) => b.isTrial).length,
    COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
    CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  const displayedBookings =
    tab === "ALL"
      ? bookings
      : tab === "ACTIVE"
        ? bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.status))
        : tab === "TRIAL"
          ? bookings.filter((b) => b.isTrial)
          : tab === "COMPLETED"
            ? bookings.filter((b) => b.status === "COMPLETED")
            : bookings.filter((b) => b.status === "CANCELLED");

  return (
    <div className="space-y-6 py-4">
      {/* Back link */}
      <Link
        href="/parent/my-leads"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#22C55E]"
      >
        <ArrowLeft size={15} />
        Back to requirements
      </Link>

      {/* Header */}
      <header className="neu-card flex flex-col gap-3 bg-[#F3E8FF] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Calendar size={14} />
          Bookings
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Your Class Bookings 📅
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Track trial classes, confirmed schedules, and hire sessions. Confirm
          new dates, cancel within the allowed window, or go back to your
          requirements to book more tutors.
        </p>
      </header>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const count = counts[t.key];
          const isActive = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/parent/bookings?tab=${t.key}`}
              className={`rounded-2xl border-2 border-[#0F172A] px-4 py-2 text-xs font-black transition-all ${
                isActive
                  ? "bg-[#0F172A] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,0.3)]"
                  : "bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive ? "bg-white/20" : "bg-[#E2E8F0]"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Booking list */}
      {displayedBookings.length === 0 ? (
        <div className="neu-card space-y-4 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#F3E8FF] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            📅
          </div>
          <p className="text-lg font-black text-[#0F172A]">
            No bookings yet in this category
          </p>
          <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
            Review your tutor applicants and click{" "}
            <strong>Schedule Trial</strong> or <strong>Hire</strong> to create
            your first booking.
          </p>
          <Link
            href="/parent/my-leads"
            className="neu-btn neu-btn-primary inline-flex px-6 py-3 text-sm"
          >
            View My Requirements
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={{
                ...booking,
                startDate: booking.startDate ? new Date(booking.startDate) : null,
                completedAt: booking.completedAt
                  ? new Date(booking.completedAt)
                  : null,
              }}
              viewerRole="PARENT"
              hasReview={reviewMap.has(booking.id)}
              existingReview={reviewMap.get(booking.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
