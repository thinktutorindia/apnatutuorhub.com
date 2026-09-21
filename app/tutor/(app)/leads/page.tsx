import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPlan, getLeadPointCost, getPlanTotalPoints } from "@/lib/subscription-plans";
import { LeadFeedClient, type FeedLead } from "@/components/tutor/LeadFeedClient";
import { haversineDistanceKm } from "@/lib/haversine";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import { parseDummyClaimedQuery } from "@/lib/dummy-campaign-types";
import { sanitizeLeadNotes } from "@/lib/lead-sanitizer";

export const metadata = { title: "Student Requirements | ApnaTutorHub" };

interface Props {
  searchParams: Promise<{
    claimed?: string;
    locality?: string;
    subjects?: string;
    city?: string;
    class?: string;
    budget?: string;
    rate?: string;
    mode?: string;
    days?: string;
    timing?: string;
    inquiry?: string;
  }>;
}

export default async function TutorLeadsPage({ searchParams }: Props) {
  const params = await searchParams;
  const claimedBannerInfo = parseDummyClaimedQuery(params);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      subjects: true,
      classLevels: true,
      teachingMode: true,
      teachingRadius: true,
      feeMin: true,
      latitude: true,
      longitude: true,
      city: true,
      address: true,
      kycStatus: true,
      subscriptionPlan: true,
      subscriptionExpiresAt: true,
      leadsResetAt: true,
      leadsUsedThisMonth: true,
      wallet: { select: { balance: true } },
    },
  });

  if (!tutorProfile) redirect("/tutor/dashboard");


  // Fetch already-purchased lead metadata for this tutor
  const purchasedMap = new Map(
    (
      await prisma.leadPurchase.findMany({
        where: { tutorProfileId: tutorProfile.id },
        select: {
          id: true,
          leadId: true,
          createdAt: true,
          isShortlisted: true,
          isRejected: true,
          isHired: true,
        },
      })
    ).map((p) => [p.leadId, p])
  );

  // Fetch active student requirements
  const rawLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      inquiryNumber: true,
      parentProfileId: true,
      subjects: true,
      classLevel: true,
      mode: true,
      budgetMin: true,
      budgetMax: true,
      area: true,
      city: true,
      pincode: true,
      board: true,
      coinCost: true,
      purchaseCount: true,
      maxTutors: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      timingPreference: true,
      tutorGenderPref: true,
      languagePref: true,
      notes: true,
      status: true,
      parentProfile: {
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          user: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const targetedInquiryNum = params.inquiry ? parseInt(params.inquiry, 10) : undefined;
  if (targetedInquiryNum && !rawLeads.some((l) => l.inquiryNumber === targetedInquiryNum)) {
    const singleLead = await prisma.lead.findFirst({
      where: { inquiryNumber: targetedInquiryNum },
      select: {
        id: true,
        inquiryNumber: true,
        parentProfileId: true,
        subjects: true,
        classLevel: true,
        mode: true,
        budgetMin: true,
        budgetMax: true,
        area: true,
        city: true,
        pincode: true,
        board: true,
        coinCost: true,
        purchaseCount: true,
        maxTutors: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        timingPreference: true,
        tutorGenderPref: true,
        languagePref: true,
        notes: true,
        status: true,
        parentProfile: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            user: {
              select: {
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (singleLead) {
      rawLeads.unshift(singleLead);
    }
  }

  // In-memory format for feed
  const feedLeads: FeedLead[] = [];

  let tutorLat = tutorProfile.latitude;
  let tutorLng = tutorProfile.longitude;
  if ((tutorLat == null || tutorLng == null) && (tutorProfile.address || tutorProfile.city)) {
    const resolvedTutor = resolveLocationCoordinates(`${tutorProfile.address || ""} ${tutorProfile.city || ""}`);
    if (resolvedTutor) {
      tutorLat = resolvedTutor.lat;
      tutorLng = resolvedTutor.lng;
    }
  }

  for (const lead of rawLeads) {
    if (lead.purchaseCount >= lead.maxTutors && !purchasedMap.has(lead.id)) continue;

    let leadLat = lead.latitude;
    let leadLng = lead.longitude;
    if ((leadLat == null || leadLng == null) && (lead.area || lead.city)) {
      const resolvedLead = resolveLocationCoordinates(`${lead.area || ""} ${lead.city || ""}`);
      if (resolvedLead) {
        leadLat = resolvedLead.lat;
        leadLng = resolvedLead.lng;
      }
    }

    let distanceKm: number | null = null;
    if (
      tutorLat !== null &&
      tutorLat !== undefined &&
      tutorLng !== null &&
      tutorLng !== undefined &&
      leadLat !== null &&
      leadLat !== undefined &&
      leadLng !== null &&
      leadLng !== undefined
    ) {
      distanceKm = Math.round(haversineDistanceKm(
        tutorLat,
        tutorLng,
        leadLat,
        leadLng
      ) * 10) / 10;
    }

    const purchaseInfo = purchasedMap.get(lead.id);
    const isPurchased = Boolean(purchaseInfo);

    feedLeads.push({
      id: lead.id,
      inquiryNumber: lead.inquiryNumber,
      parentProfileId: lead.parentProfileId,
      subjects: lead.subjects,
      classLevel: lead.classLevel,
      mode: lead.mode,
      board: lead.board,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      area: lead.area,
      city: lead.city,
      coinCost: lead.coinCost,
      purchaseCount: lead.purchaseCount,
      maxTutors: lead.maxTutors,
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      createdAt: lead.createdAt.toISOString(),
      timingPreference: lead.timingPreference,
      tutorGenderPref: lead.tutorGenderPref,
      languagePref: lead.languagePref,
      notes: sanitizeLeadNotes(lead.notes, isPurchased),
      isPurchased,
      isShortlisted: purchaseInfo?.isShortlisted ?? false,
      isRejected: purchaseInfo?.isRejected ?? false,
      isHired: purchaseInfo?.isHired ?? false,
      purchaseId: purchaseInfo?.id ?? null,
      purchasedAt: purchaseInfo?.createdAt ? purchaseInfo.createdAt.toISOString() : null,
      status: lead.status,
      parentDetails: isPurchased
        ? {
            name: lead.parentProfile.user.name || "Parent",
            phone: lead.parentProfile.user.phone || null,
            email: lead.parentProfile.user.email || null,
            address: lead.parentProfile.address || null,
            city: lead.city || lead.parentProfile.city || null,
            state: lead.parentProfile.state || null,
            pincode: lead.pincode || lead.parentProfile.pincode || null,
            board: lead.board || null,
            tutorGenderPref: lead.tutorGenderPref || null,
            languagePref: lead.languagePref || null,
            notes: sanitizeLeadNotes(lead.notes, true),
          }
        : null,
    });
  }

  const now = new Date();
  const hasActivePlan = Boolean(
    tutorProfile.subscriptionPlan &&
    tutorProfile.subscriptionPlan !== "NONE" &&
    (!tutorProfile.subscriptionExpiresAt || tutorProfile.subscriptionExpiresAt > now)
  );
  const planConfig = hasActivePlan && tutorProfile.subscriptionPlan ? getSubscriptionPlan(tutorProfile.subscriptionPlan) : null;

  let quotaRemaining = 0;
  let remainingPoints = 0;
  let purchasesCount = 0;
  if (hasActivePlan && planConfig) {
    const resetDate = tutorProfile.leadsResetAt ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const planPurchases = await prisma.leadPurchase.findMany({
      where: {
        tutorProfileId: tutorProfile.id,
        createdAt: { gte: resetDate },
      },
      include: { lead: { select: { classLevel: true, budgetMin: true, budgetMax: true } } },
    });
    purchasesCount = planPurchases.length;
    const usedPoints = planPurchases.reduce(
      (acc, p) => acc + getLeadPointCost(p.lead?.classLevel, p.lead?.budgetMin, p.lead?.budgetMax),
      0
    );
    const planTotalPoints = getPlanTotalPoints(tutorProfile.subscriptionPlan);
    remainingPoints = Math.max(0, planTotalPoints - usedPoints);
    quotaRemaining = Math.max(0, Math.floor(remainingPoints / 10));
  }

  const walletBalance = tutorProfile.wallet?.balance ?? 0;

  return (
    <div className="py-1">
      <LeadFeedClient
        leads={feedLeads}
        walletBalance={walletBalance}
        tutorSubjects={tutorProfile.subjects}
        teachingRadius={tutorProfile.teachingRadius || 10}
        tutorClassLevels={tutorProfile.classLevels}
        tutorLocation={{
          city: tutorProfile.city,
          address: tutorProfile.address,
          lat: tutorProfile.latitude,
          lon: tutorProfile.longitude,
        }}
        subscriptionInfo={{
          planId: tutorProfile.subscriptionPlan,
          planName: planConfig?.name ?? null,
          badge: planConfig?.badge ?? null,
          monthlyQuota: planConfig?.totalLeads ?? 10,
          quotaUsed: purchasesCount,
          quotaRemaining,
          remainingPoints,
          hasActivePlan,
        }}
        claimedBannerInfo={claimedBannerInfo}
        kycStatus={tutorProfile.kycStatus}
        initialInquiryNumber={targetedInquiryNum}
      />
    </div>
  );
}
