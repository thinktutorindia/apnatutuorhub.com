import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import { LeadFeedClient, type FeedLead } from "@/components/tutor/LeadFeedClient";

export const metadata = { title: "Student Requirements | ApnaTutorHub" };

export default async function TutorLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ claimed?: string; locality?: string; subjects?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isClaimedParam = params.claimed === "true";
  const localityParam = params.locality;
  const subjectsParam = params.subjects;

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
      kycStatus: true,
      subscriptionPlan: true,
      wallet: { select: { balance: true } },
    },
  });

  if (!tutorProfile) redirect("/tutor/dashboard");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyPurchasesCount = await prisma.leadPurchase.count({
    where: {
      tutorProfileId: tutorProfile.id,
      createdAt: { gte: startOfMonth },
    },
  });

  // KYC gate
  if (tutorProfile.kycStatus !== "APPROVED") {
    return (
      <div className="space-y-5 py-2">
        <div className="rounded-3xl p-6 sm:p-8 bg-amber-50 border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-800 text-amber-950">Identity Verification Required</h1>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                You need to complete identity verification (KYC) before viewing and unlocking student requirements. It only takes 2 minutes.
              </p>
            </div>
          </div>
          <Link
            href="/tutor/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-700 transition-colors shadow"
          >
            <span>Complete Verification Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // Fetch already-purchased lead metadata for this tutor
  const purchasedMap = new Map(
    (
      await prisma.leadPurchase.findMany({
        where: { tutorProfileId: tutorProfile.id },
        select: {
          leadId: true,
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
    take: 200,
    select: {
      id: true,
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


  // In-memory format for feed
  const feedLeads: FeedLead[] = [];

  for (const lead of rawLeads) {
    if (lead.purchaseCount >= lead.maxTutors && !purchasedMap.has(lead.id)) continue;

    let distanceKm: number | null = null;
    if (
      tutorProfile.latitude !== null &&
      tutorProfile.longitude !== null &&
      lead.latitude !== null &&
      lead.longitude !== null
    ) {
      distanceKm = haversineDistanceKm(
        tutorProfile.latitude,
        tutorProfile.longitude,
        lead.latitude,
        lead.longitude
      );
    }

    const purchaseInfo = purchasedMap.get(lead.id);
    const isPurchased = Boolean(purchaseInfo);

    feedLeads.push({
      id: lead.id,
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
      notes: lead.notes,
      isPurchased,
      isShortlisted: purchaseInfo?.isShortlisted ?? false,
      isRejected: purchaseInfo?.isRejected ?? false,
      isHired: purchaseInfo?.isHired ?? false,
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
            notes: lead.notes || null,
          }
        : null,
    });
  }

  const walletBalance = tutorProfile.wallet?.balance ?? 0;
  const hasActivePlan = Boolean(tutorProfile.subscriptionPlan && tutorProfile.subscriptionPlan !== "NONE");
  const planConfig = hasActivePlan ? getSubscriptionPlan(tutorProfile.subscriptionPlan) : null;
  const monthlyLeadQuota = planConfig?.monthlyLeads ?? 0;
  const quotaRemaining = Math.max(0, monthlyLeadQuota - monthlyPurchasesCount);

  return (
    <div className="py-1">
      <LeadFeedClient
        leads={feedLeads}
        walletBalance={walletBalance}
        tutorSubjects={tutorProfile.subjects}
        subscriptionInfo={{
          planId: tutorProfile.subscriptionPlan,
          planName: planConfig?.name ?? null,
          badge: planConfig?.badge ?? null,
          monthlyQuota: monthlyLeadQuota,
          quotaUsed: monthlyPurchasesCount,
          quotaRemaining,
          hasActivePlan,
        }}
        claimedBannerInfo={
          isClaimedParam || Boolean(localityParam)
            ? { claimed: true, locality: localityParam, subjects: subjectsParam }
            : null
        }
      />
    </div>
  );
}
