import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExistingReview } from "@/app/actions/review.actions";
import { TutorBookingsClient } from "@/components/tutor/TutorBookingsClient";

export const metadata = {
  title: "My Bookings | ApnaTutorHub",
  description: "Track your class bookings, trial sessions, and schedules.",
};

type TabKey = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

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

  const reviewMapObj: Record<string, ExistingReview> = {};
  myReviews.forEach((r) => {
    reviewMapObj[r.bookingId] = {
      id: r.id,
      overallRating: r.overallRating,
      teachingRating: r.teachingRating,
      communicationRating: r.communicationRating,
      punctualityRating: r.punctualityRating,
      comment: r.comment,
      isEditable: r.isEditable,
      editLockedAt: r.editLockedAt,
    };
  });

  const myLeadPurchases = await prisma.leadPurchase.findMany({
    where: { tutorProfileId: tutorProfile.id },
    select: { id: true, leadId: true, createdAt: true, coinsSpent: true },
    orderBy: { createdAt: "desc" },
  });
  const purchaseByLead: Record<
    string,
    { purchaseId: string; purchasedAt: string; coinsSpent: number }
  > = {};
  for (const pur of myLeadPurchases) {
    if (!purchaseByLead[pur.leadId]) {
      purchaseByLead[pur.leadId] = {
        purchaseId: pur.id,
        purchasedAt: pur.createdAt.toISOString(),
        coinsSpent: pur.coinsSpent,
      };
    }
  }

  return (
    <TutorBookingsClient
      tab={tab}
      counts={counts}
      pendingCount={pendingCount}
      displayedBookings={displayedBookings.map((b) => ({
        ...b,
        startDate: b.startDate ? b.startDate.toISOString() : null,
        completedAt: b.completedAt ? b.completedAt.toISOString() : null,
      }))}
      reviewMapObj={reviewMapObj}
      purchaseByLead={purchaseByLead}
    />
  );
}
