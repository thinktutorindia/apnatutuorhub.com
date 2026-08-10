import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Sparkles, BookOpen, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookingCard from "@/components/booking/BookingCard";
import type { ExistingReview } from "@/app/actions/review.actions";

export const metadata = {
  title: "My Bookings | ApnaTutorHub",
  description: "Track your class bookings, trial sessions, and schedules.",
};

const STATUS_TABS = [
  { key: "ALL", label: "All Classes" },
  { key: "ACTIVE", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

type TabKey = (typeof STATUS_TABS)[number]["key"];

export default async function TutorBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [session, sp] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) redirect("/login");

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) redirect("/tutor/dashboard");

  const tab = (sp.tab ?? "ALL") as TabKey;

  const bookings = await prisma.booking.findMany({
    where: { tutorProfileId: tutorProfile.id },
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
    COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
    CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  const displayedBookings =
    tab === "ALL"
      ? bookings
      : tab === "ACTIVE"
        ? bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.status))
        : tab === "COMPLETED"
          ? bookings.filter((b) => b.status === "COMPLETED")
          : bookings.filter((b) => b.status === "CANCELLED");

  const pendingCount = bookings.filter((b) => b.status === "REQUESTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider text-[#2D9E6B] bg-[#2D9E6B]/10 px-2.5 py-0.5 rounded-full mb-1">
          <BookOpen size={12} /> Schedule &amp; Classes
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight">
            Classes &amp; Bookings
          </h1>
          {pendingCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-700 bg-amber-100 text-amber-900 border border-amber-200">
              ⚡ {pendingCount} Pending Request{pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Confirm booking requests, share video class links, and manage your teaching schedule.
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="p-1 rounded-2xl bg-gray-100/80 border border-gray-200/80 inline-flex flex-wrap gap-1">
        {STATUS_TABS.map((t) => {
          const count = counts[t.key as keyof typeof counts];
          const isActive = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/tutor/bookings?tab=${t.key}`}
              className={`px-4 py-2 rounded-xl text-xs font-700 transition-all ${
                isActive
                  ? "bg-white text-[#1A3C5E] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </Link>
          );
        })}
      </div>

      {/* Booking list container */}
      {displayedBookings.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white border border-gray-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Calendar size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-800 text-gray-900">No classes in this section</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              When parents confirm classes and schedule sessions with you, they will appear here.
            </p>
          </div>
          <Link
            href="/tutor/leads"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-700 transition-colors shadow-2xs"
          >
            Browse Student Requirements →
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
              viewerRole="TUTOR"
              hasReview={reviewMap.has(booking.id)}
              existingReview={reviewMap.get(booking.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
