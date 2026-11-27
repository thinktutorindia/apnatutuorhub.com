import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Search,
  Wallet,
  ShieldCheck,
  Star,
  BookOpen,
  CheckCircle2,
  MapPin,
  Clock,
  PhoneCall,
  Crown,
  Sparkles,
  HelpCircle,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
import { formatLeadBudget, getInquiryDisplayCode, publicTutorSlots } from "@/lib/lead-utils";
import { haversineDistanceKm } from "@/lib/haversine";
import { INDIAN_CITY_COORDINATES, resolveLocationCoordinates } from "@/lib/geocoding";
import { hasSubjectOverlap, extractGradeNumber } from "@/lib/feed-matching";
import { COMMISSION_PLAN, commissionPlanCoinsText } from "@/lib/subscription-plans";
import { isGenderCompatible } from "@/lib/matching-engine";
import {
  cleanClassLevelDisplay,
  sanitizeSubjectsForClassLevel,
} from "@/lib/dummy-campaign-types";
import { resolveParentContactForLead } from "@/lib/lead-contact-generator";
import { DashboardQuickPrefTrigger } from "@/components/tutor/DashboardQuickPrefTrigger";
import { SeniorDashboardClient, SeniorLeadItem } from "@/components/tutor/SeniorDashboardClient";

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TutorDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isJustActivated =
    resolvedSearchParams?.subscription === "activated" || resolvedSearchParams?.activated === "1";
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  let tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wallet: { select: { balance: true, totalSpent: true } },
      availability: true,
      _count: { select: { purchases: true, reviews: true, bookings: true } },
    },
  });

  if (!tutorProfile) {
    try {
      const created = await prisma.tutorProfile.create({
        data: { userId: session.user.id },
      });
      await prisma.wallet.create({
        data: { tutorProfileId: created.id },
      });
      tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          wallet: { select: { balance: true, totalSpent: true } },
          availability: true,
          _count: { select: { purchases: true, reviews: true, bookings: true } },
        },
      });
    } catch {
      redirect("/login");
    }
  }

  if (tutorProfile && tutorProfile.onboardingStep < 7) {
    if (tutorProfile.city && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
      prisma.tutorProfile
        .update({
          where: { id: tutorProfile.id },
          data: { onboardingStep: 7 },
        })
        .catch(() => { });
    } else {
      redirect("/tutor/onboarding");
    }
  }

  const walletBalance = tutorProfile?.wallet?.balance ?? 0;
  const kycStatus = tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const isKycApproved = kycStatus === "APPROVED";

  const scoreBreakdown = tutorProfile
    ? calcProfileScore({ ...tutorProfile, availability: tutorProfile.availability })
    : null;

  const firstName = session.user.name?.split(" ")[0] || "Teacher";

  const isSubscriptionActive = Boolean(
    tutorProfile?.subscriptionPlan &&
    tutorProfile.subscriptionExpiresAt &&
    new Date(tutorProfile.subscriptionExpiresAt) > new Date()
  );

  const tutorSubjects = tutorProfile?.subjects ?? [];
  const tutorClasses = tutorProfile?.classLevels ?? [];
  let tutorLat = tutorProfile?.latitude;
  let tutorLng = tutorProfile?.longitude;
  const tutorCity = tutorProfile?.city?.trim().toLowerCase();
  const tutorGender = tutorProfile?.gender || null;

  // Resolve lat/lng from address or city if missing
  if ((tutorLat == null || tutorLng == null) && (tutorProfile?.address || tutorProfile?.city)) {
    const resolvedTutor = resolveLocationCoordinates(
      `${tutorProfile.address || ""} ${tutorProfile.city || ""}`
    );
    if (resolvedTutor) {
      tutorLat = resolvedTutor.lat;
      tutorLng = resolvedTutor.lng;
      prisma.tutorProfile
        .update({
          where: { id: tutorProfile.id },
          data: { latitude: resolvedTutor.lat, longitude: resolvedTutor.lng },
        })
        .catch(() => { });
    }
  }

  const NEARBY_KM = 5;
  const nearbyNames =
    tutorLat != null && tutorLng != null
      ? Object.entries(INDIAN_CITY_COORDINATES)
        .filter(
          ([, point]) => haversineDistanceKm(tutorLat!, tutorLng!, point.lat, point.lng) <= NEARBY_KM
        )
        .map(([name]) => name)
        .filter((name) => name.length >= 4)
        .slice(0, 12)
      : [];
  const latPad = NEARBY_KM / 111;
  const lngPad =
    tutorLat != null ? NEARBY_KM / (111 * Math.max(0.2, Math.cos((tutorLat * Math.PI) / 180))) : 0.05;

  const offlineLocationFilter =
    tutorLat != null && tutorLng != null
      ? {
          latitude: { gte: tutorLat - latPad, lte: tutorLat + latPad },
          longitude: { gte: tutorLng - lngPad, lte: tutorLng + lngPad },
        }
      : nearbyNames.length > 0
        ? {
            OR: nearbyNames.map((name) => ({
              area: { contains: name, mode: "insensitive" as const },
            })),
          }
        : tutorCity
          ? { city: { contains: tutorCity, mode: "insensitive" as const } }
          : {};

  const dashboardLeadSelect = {
    id: true,
    inquiryNumber: true,
    parentProfileId: true,
    classLevel: true,
    subjects: true,
    mode: true,
    city: true,
    area: true,
    latitude: true,
    longitude: true,
    budgetMin: true,
    budgetMax: true,
    notes: true,
    timingPreference: true,
    tutorGenderPref: true,
    createdAt: true,
    purchaseCount: true,
    maxTutors: true,
  } as const;

  const candidateLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      // Online enquiries have no fixed locality — always eligible.
      // Offline leads still have to fall inside the tutor's radius / city.
      OR: [
        { mode: "ONLINE" },
        { mode: { not: "ONLINE" }, ...offlineLocationFilter },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 800,
    select: dashboardLeadSelect,
  });

  // Online enquiries without a fixed locality can be older than the latest 800
  // offline leads, so fetch them separately and merge them into the pool.
  const onlineLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      mode: "ONLINE",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: dashboardLeadSelect,
  });
  const existingIds = new Set(candidateLeads.map((l) => l.id));
  const allCandidateLeads = [
    ...candidateLeads,
    ...onlineLeads.filter((l) => !existingIds.has(l.id)),
  ];

  type DashboardLead = (typeof candidateLeads)[number] & {
    distanceKm: number | null;
    isStrictNearby: boolean;
    isOnline: boolean;
    classMatched: boolean;
    subjectMatched: boolean;
  };

  function isTutorClassCompatible(tutorClassesList: string[], leadClass: string): boolean {
    if (!tutorClassesList || tutorClassesList.length === 0) return true;
    const leadNum = extractGradeNumber(leadClass);
    const cleanLead = cleanClassLevelDisplay(leadClass).toLowerCase().trim();

    if (leadNum !== null) {
      for (const tc of tutorClassesList) {
        const tcNum = extractGradeNumber(tc);
        if (tcNum === leadNum) return true;
        const tcLower = tc.toLowerCase();
        if ((tcLower.includes("1-5") || tcLower.includes("1 to 5") || tcLower.includes("primary")) && leadNum <= 5) {
          return true;
        }
        if ((tcLower.includes("6-8") || tcLower.includes("6 to 8") || tcLower.includes("middle")) && leadNum >= 6 && leadNum <= 8) {
          return true;
        }
        if ((tcLower.includes("9-10") || tcLower.includes("9 to 10") || tcLower.includes("secondary")) && leadNum >= 9 && leadNum <= 10) {
          return true;
        }
        if ((tcLower.includes("11-12") || tcLower.includes("11 to 12") || tcLower.includes("senior")) && leadNum >= 11 && leadNum <= 12) {
          return true;
        }
        if ((tcLower.includes("all class") || tcLower.includes("all subjects")) && leadNum <= 8) {
          return true;
        }
      }
      return false;
    }

    for (const tc of tutorClassesList) {
      const cleanTc = cleanClassLevelDisplay(tc).toLowerCase().trim();
      if (cleanTc === cleanLead || cleanLead.includes(cleanTc) || cleanTc.includes(cleanLead)) {
        return true;
      }
    }
    return false;
  }

  const processedLeads: DashboardLead[] = [];

  for (const lead of allCandidateLeads) {
    if (tutorGender && !isGenderCompatible(tutorGender, lead.tutorGenderPref)) {
      continue;
    }

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
      distanceKm = Math.round(haversineDistanceKm(tutorLat, tutorLng, leadLat, leadLng) * 10) / 10;
    }

    const isOnline = lead.mode === "ONLINE";
    const isStrictNearby = distanceKm !== null && distanceKm <= NEARBY_KM;
    const classMatched = isTutorClassCompatible(tutorClasses, lead.classLevel);
    const subjectMatched =
      tutorSubjects.length > 0 ? hasSubjectOverlap(tutorSubjects, lead.subjects) : true;

    processedLeads.push({
      ...lead,
      distanceKm,
      isStrictNearby,
      isOnline,
      classMatched,
      subjectMatched,
    });
  }

  // Deduplicate and prioritize strictly nearby leads matching tutor profile
  const strictNearbyAll = processedLeads.filter((l) => !l.isOnline && l.isStrictNearby);
  const strictClassSubject = strictNearbyAll.filter((l) => l.classMatched && l.subjectMatched);
  const strictClassOnly = strictNearbyAll.filter((l) => l.classMatched);

  const basePool =
    strictClassSubject.length >= 4
      ? strictClassSubject
      : strictClassOnly.length >= 4
        ? strictClassOnly
        : strictNearbyAll;
  const onlineMatched = processedLeads.filter(
    (l) => l.isOnline && l.classMatched && l.subjectMatched
  );
  const pool = [...basePool, ...onlineMatched];

  // Sort pool by distance and recency (leads within 0.4km sorted by freshness)
  const sortedPool = [...pool].sort((a, b) => {
    const distA = a.distanceKm ?? 999;
    const distB = b.distanceKm ?? 999;
    const diff = distA - distB;
    if (Math.abs(diff) > 0.4) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Extract neighborhood/colony to strictly prevent repeating the same locality
  function extractColony(area: string | null): string {
    if (!area) return "delhi ncr";
    const parts = area.split(",").map((p) => p.trim()).filter(Boolean);
    const nonCityParts = parts.filter(
      (p) => !/^(delhi|new delhi|noida|gurgaon|faridabad|ghaziabad|india)$/i.test(p)
    );
    if (nonCityParts.length > 0) {
      return nonCityParts[nonCityParts.length - 1].toLowerCase();
    }
    return (parts[0] || "delhi").toLowerCase();
  }

  // Diversify landmarks & classes so results are distinct, authentic, and never repetitive
  const diverseLeads: DashboardLead[] = [];
  const usedColonys = new Set<string>();
  const usedLandmarks = new Set<string>();
  const usedClasses = new Set<string>();

  // Pass 1: Unique colony AND unique class level
  for (const lead of sortedPool) {
    const colonyKey = extractColony(lead.area);
    const landmarkKey = (lead.area || lead.city || "").trim().toLowerCase();
    const classKey = cleanClassLevelDisplay(lead.classLevel).toLowerCase();

    if (!usedColonys.has(colonyKey) && !usedClasses.has(classKey)) {
      usedColonys.add(colonyKey);
      usedLandmarks.add(landmarkKey);
      usedClasses.add(classKey);
      diverseLeads.push(lead);
      if (diverseLeads.length >= 8) break;
    }
  }

  // Pass 2: Unique colony (allow repeating class level if needed)
  if (diverseLeads.length < 8) {
    for (const lead of sortedPool) {
      if (diverseLeads.some((d) => d.id === lead.id)) continue;
      const colonyKey = extractColony(lead.area);
      const landmarkKey = (lead.area || lead.city || "").trim().toLowerCase();

      if (!usedColonys.has(colonyKey)) {
        usedColonys.add(colonyKey);
        usedLandmarks.add(landmarkKey);
        diverseLeads.push(lead);
        if (diverseLeads.length >= 8) break;
      }
    }
  }

  // Pass 3: Unique landmark (allow same general colony but ensure distinct address/landmark)
  if (diverseLeads.length < 8) {
    for (const lead of sortedPool) {
      if (diverseLeads.some((d) => d.id === lead.id)) continue;
      const landmarkKey = (lead.area || lead.city || "").trim().toLowerCase();

      if (!usedLandmarks.has(landmarkKey)) {
        usedLandmarks.add(landmarkKey);
        diverseLeads.push(lead);
        if (diverseLeads.length >= 8) break;
      }
    }
  }

  // Pass 4: Fill any remaining slots
  if (diverseLeads.length < 8) {
    for (const lead of sortedPool) {
      if (!diverseLeads.some((d) => d.id === lead.id)) {
        diverseLeads.push(lead);
        if (diverseLeads.length >= 8) break;
      }
    }
  }

  // Always show a few online enquiries too — they have no fixed locality,
  // so a pure distance sort would otherwise push them off the dashboard.
  const seenLeadIds = new Set<string>();
  const displayLeads = [
    ...diverseLeads.filter((l) => !l.isOnline).slice(0, 6),
    ...diverseLeads.filter((l) => l.isOnline).slice(0, 2),
    ...diverseLeads,
  ]
    .filter((l) => {
      if (seenLeadIds.has(l.id)) return false;
      seenLeadIds.add(l.id);
      return true;
    })
    .slice(0, 8);

  const allPurchases = tutorProfile
    ? await prisma.leadPurchase.findMany({
      where: { tutorProfileId: tutorProfile.id },
      include: {
        lead: {
          include: {
            parentProfile: {
              include: {
                user: {
                  select: { name: true, phone: true, email: true, role: true },
                },
              },
            },
          },
        },
      },
    })
    : [];

  const purchasedMap: Record<
    string,
    {
      parentName?: string;
      parentPhone?: string;
      purchaseId?: string;
      purchasedAt?: string;
      parentProfileId?: string;
    }
  > = {};
  for (const p of allPurchases) {
    const resolvedContact = p.lead ? resolveParentContactForLead(p.lead) : null;
    purchasedMap[p.leadId] = {
      parentName: resolvedContact?.name || "Verified Parent",
      parentPhone: resolvedContact?.phone || "",
      purchaseId: p.id,
      purchasedAt: p.createdAt.toISOString(),
      parentProfileId: p.lead?.parentProfileId || undefined,
    };
  }

  const displayLeadItems: SeniorLeadItem[] = displayLeads.map((l) => {
    const isPurchased = Boolean(purchasedMap[l.id]);
    const details = purchasedMap[l.id];
    return {
      id: l.id,
      inquiryNumber: l.inquiryNumber ?? 1001,
      classLevel: l.classLevel,
      subjects: l.subjects,
      mode: l.mode,
      city: l.city,
      area: l.area,
      budgetMin: l.budgetMin,
      budgetMax: l.budgetMax,
      timingPreference: l.timingPreference,
      distanceKm: l.distanceKm,
      isPurchased,
      parentName: details?.parentName || null,
      parentPhone: details?.parentPhone || null,
      parentProfileId: details?.parentProfileId || l.parentProfileId || null,
      purchaseId: details?.purchaseId || null,
      purchasedAt: details?.purchasedAt || null,
    };
  });

  const purchasedLeadItems: SeniorLeadItem[] = allPurchases
    .filter((p) => p.lead && !displayLeads.some((d) => d.id === p.leadId))
    .map((p) => {
      const l = p.lead;
      const resolvedContact = resolveParentContactForLead(l);
      return {
        id: l.id,
        inquiryNumber: l.inquiryNumber ?? 1001,
        classLevel: l.classLevel,
        subjects: l.subjects,
        mode: l.mode,
        city: l.city,
        area: l.area,
        budgetMin: l.budgetMin,
        budgetMax: l.budgetMax,
        timingPreference: l.timingPreference,
        distanceKm: null,
        isPurchased: true,
        parentName: resolvedContact.name || "Verified Parent",
        parentPhone: resolvedContact.phone || null,
        parentProfileId: l.parentProfileId || null,
        purchaseId: p.id,
        purchasedAt: p.createdAt.toISOString(),
      };
    });

  const seniorLeadItems: SeniorLeadItem[] = [...displayLeadItems, ...purchasedLeadItems];

  return (
    <div className="space-y-6">
      {/* ── CELEBRATION BANNER (Shown upon instant plan activation) ── */}
      {isJustActivated && (
        <div className="rounded-3xl p-6 bg-emerald-700 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-emerald-500">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🎉</span>
            <div>
              <h3 className="text-xl font-black text-white">
                Payment Successful! Your Membership is Active.
              </h3>
              <p className="text-sm text-emerald-100 font-semibold mt-0.5">
                Commission Based Plan is active for <strong>{COMMISSION_PLAN.validityText}</strong> with{" "}
                <strong>{commissionPlanCoinsText()}</strong> credited.
              </p>
            </div>
          </div>
          <Link
            href="/tutor/leads"
            className="px-6 py-3.5 rounded-2xl bg-white text-emerald-950 font-black text-sm shadow hover:bg-emerald-50 transition-all shrink-0"
          >
            See Student Leads →
          </Link>
        </div>
      )}

      <SeniorDashboardClient
        tutorName={(firstName || "Teacher").replace(/\s+ji$/i, "").trim()}
        walletBalance={walletBalance}
        initialUnlockedCount={allPurchases.length}
        ongoingBookingsCount={tutorProfile?._count?.bookings ?? 0}
        leads={seniorLeadItems}
        tutorSubjectsCount={tutorSubjects.length}
        isSubscriptionActive={isSubscriptionActive}
      />
    </div>
  );
}
