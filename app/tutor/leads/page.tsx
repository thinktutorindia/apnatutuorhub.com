import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { LeadFeedClient, type FeedLead } from "@/components/tutor/LeadFeedClient";

export const metadata = { title: "Student Requirements | ApnaTutorHub" };

export default async function TutorLeadsPage() {
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
      wallet: { select: { balance: true } },
    },
  });

  if (!tutorProfile) redirect("/tutor/dashboard");

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

  // DB pre-filter: active leads with subject overlap
  const rawLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      subjects: { hasSome: tutorProfile.subjects },
      expiresAt: { gt: new Date() },
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

  // In-memory filters
  const feedLeads: FeedLead[] = [];

  for (const lead of rawLeads) {
    if (lead.purchaseCount >= lead.maxTutors && !purchasedMap.has(lead.id)) continue;
    if (!tutorProfile.classLevels.includes(lead.classLevel)) continue;

    const tm = tutorProfile.teachingMode;
    const lm = lead.mode;
    if (tm !== "EITHER" && lm !== "EITHER" && tm !== lm) continue;

    if (tutorProfile.feeMin !== null && lead.budgetMax !== null) {
      if (tutorProfile.feeMin > lead.budgetMax) continue;
    }

    let distanceKm: number | null = null;
    if (lead.mode !== "ONLINE") {
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

        // Respect the tutor's own teaching radius exactly — no override.
        // The matching engine uses Math.max(tutor.radius, lead.radiusKm) when
        // a parent's search radius is wider, but the tutor's cap is honored here.
        if (distanceKm > tutorProfile.teachingRadius) continue;
      }
    }

    const purchaseInfo = purchasedMap.get(lead.id);
    const isPurchased = Boolean(purchaseInfo);

    feedLeads.push({
      id: lead.id,
      parentProfileId: lead.parentProfileId,
      subjects: lead.subjects,
      classLevel: lead.classLevel,
      mode: lead.mode,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider text-[#2D9E6B] bg-[#2D9E6B]/10 px-2.5 py-0.5 rounded-full mb-1">
            <Sparkles size={12} /> Student Enquiries
          </div>
          <h1 className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight">
            Find Student Requirements
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Matched with your subjects, teaching mode, and city location.
          </p>
        </div>

        {/* Coin Balance Pill */}
        <Link
          href="/tutor/wallet"
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 hover:bg-amber-100/70 transition-all shadow-xs shrink-0"
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-amber-700" />
            <span className="text-xs font-600 text-amber-900">Coin Balance:</span>
            <span className="text-sm font-800 text-amber-950">{walletBalance} 🪙</span>
          </div>
          <span className="text-xs font-700 text-[#2D9E6B]">Top Up →</span>
        </Link>
      </div>

      <LeadFeedClient
        leads={feedLeads}
        walletBalance={walletBalance}
        tutorSubjects={tutorProfile.subjects}
      />
    </div>
  );
}
