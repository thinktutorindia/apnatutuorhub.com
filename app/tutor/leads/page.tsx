import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { LeadFeedClient, type FeedLead } from "@/components/tutor/LeadFeedClient";

export const metadata = { title: "Lead Feed | ApnaTutorHub" };

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
      <div className="space-y-6 py-4">
        <header className="neu-card flex flex-col gap-3 bg-[#FFEDD5] p-6 md:p-8">
          <div className="neu-badge w-fit bg-white text-[#0F172A]">
            <ShieldAlert size={14} className="text-orange-500" />
            KYC Required
          </div>
          <h1 className="text-3xl font-black text-[#0F172A]">
            Complete KYC to Browse Leads
          </h1>
          <p className="max-w-xl text-sm font-semibold text-slate-700">
            You need an approved KYC verification to view and unlock tuition
            leads. It only takes a few minutes!
          </p>
          <Link href="/tutor/profile" className="neu-btn neu-btn-primary w-fit px-6 py-3 text-sm">
            Complete KYC Now →
          </Link>
        </header>
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
    // Already at max capacity (and not purchased by this tutor — still show if purchased)
    if (
      lead.purchaseCount >= lead.maxTutors &&
      !purchasedMap.has(lead.id)
    )
      continue;

    // Class level match
    if (!tutorProfile.classLevels.includes(lead.classLevel)) continue;

    // Mode compatibility
    const tm = tutorProfile.teachingMode;
    const lm = lead.mode;
    if (tm !== "EITHER" && lm !== "EITHER" && tm !== lm) continue;

    // Budget compatibility
    if (tutorProfile.feeMin !== null && lead.budgetMax !== null) {
      if (tutorProfile.feeMin > lead.budgetMax) continue;
    }

    // Distance filter (only for offline/either leads)
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

        const effectiveRadius = Math.max(tutorProfile.teachingRadius, 50);
        if (distanceKm > effectiveRadius) continue;
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
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-3 bg-[#E0F2FE] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Compass size={14} />
          Lead Feed
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Matched Tuition Leads 🎯
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Showing requirements that match your subjects, class levels, teaching
          mode, and location. Unlock a lead with coins to view parent contact
          details.
        </p>
      </header>

      <LeadFeedClient
        leads={feedLeads}
        walletBalance={walletBalance}
        tutorSubjects={tutorProfile.subjects}
      />
    </div>
  );
}
