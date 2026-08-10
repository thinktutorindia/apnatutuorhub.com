import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, PlusCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookingCard from "@/components/booking/BookingCard";
import type { ExistingReview } from "@/app/actions/review.actions";

export const metadata = {
  title: "My Bookings | ApnaTutorHub",
  description: "View and manage your class bookings and trial sessions.",
};

const STATUS_TABS = [
  { key: "ALL", label: "All Classes" },
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
          createdAt: true,
          tutorProfileId: true,
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
        isEditable: Date.now() - r.createdAt.getTime() < 48 * 60 * 60 * 1000,
        editLockedAt: new Date(r.createdAt.getTime() + 48 * 60 * 60 * 1000),
      },
    ])
  );

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Tuition Schedules</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Class Bookings &amp; Trial Sessions
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Track confirmed classes, join online Google Meet rooms, and review completed tutor sessions
          </p>
        </div>
        <Link
          href="/parent/post-requirement"
          className="px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 shadow-md transition-all flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle size={16} />
          <span>Book New Class</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/parent/bookings?tab=${t.key}`}
              className={`px-4 py-2.5 rounded-2xl text-xs font-800 transition-all border ${
                isActive
                  ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 bg-white border border-slate-200 text-center shadow-xs">
          <Calendar size={44} className="text-slate-400" />
          <h3 className="text-base font-800 text-[#0F2540]">No bookings found</h3>
          <p className="text-xs font-600 text-slate-600 max-w-sm">
            When you hire a tutor from your requirement post, class schedules and meet links will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              viewerRole="PARENT"
              existingReview={reviewMap.get(booking.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
