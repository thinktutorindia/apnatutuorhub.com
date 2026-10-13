import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Search, Wallet, ShieldCheck, ShieldAlert, Star, UserCog,
  BookOpen, CheckCircle2, MapPin, MessageSquare, ChevronRight, UserCheck,
  Navigation, Globe, Crown,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
import { formatLeadBudget, getInquiryDisplayCode, publicTutorSlots } from "@/lib/lead-utils";
import { TutorAnalyticsWidget } from "@/components/tutor/TutorAnalyticsWidget";
import { EnablePushBanner } from "@/components/EnablePushBanner";
import { haversineDistanceKm } from "@/lib/haversine";
import { INDIAN_CITY_COORDINATES } from "@/lib/geocoding";
import { hasSubjectOverlap } from "@/lib/feed-matching";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import { isGenderCompatible } from "@/lib/matching-engine";
import {
  cleanClassLevelDisplay,
  sanitizeSubjectsForClassLevel,
} from "@/lib/dummy-campaign-types";
import { TutorLeadNotificationPopup } from "@/components/tutor/TutorLeadNotificationPopup";

export default async function TutorDashboardPage() {
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
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: { onboardingStep: 7 },
      }).catch(() => {});
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

  // Profile completion items
  const completionItems = [
    { done: (tutorProfile?.subjects?.length ?? 0) >= 3, label: "Add subjects (3+)" },
    { done: (tutorProfile?.classLevels?.length ?? 0) >= 2, label: "Select class levels (2+)" },
    { done: (tutorProfile?.bio?.length ?? 0) >= 20, label: "Write your bio" },
    { done: !!tutorProfile?.feeMin, label: "Set your tuition fee" },
    { done: !!tutorProfile?.city, label: "Set your city" },
    { done: isKycApproved, label: "Complete KYC verification (Optional)" },
  ];
  const profileScore = scoreBreakdown?.total ?? 0;

  const tutorSubjects = tutorProfile?.subjects ?? [];
  let tutorLat = tutorProfile?.latitude;
  let tutorLng = tutorProfile?.longitude;
  const tutorCity = tutorProfile?.city?.trim().toLowerCase();
  const tutorGender = tutorProfile?.gender || null;

  // If tutor latitude/longitude is missing, automatically resolve from locality/city
  if ((tutorLat == null || tutorLng == null) && (tutorProfile?.address || tutorProfile?.city)) {
    const resolvedTutor = resolveLocationCoordinates(`${tutorProfile.address || ""} ${tutorProfile.city || ""}`);
    if (resolvedTutor) {
      tutorLat = resolvedTutor.lat;
      tutorLng = resolvedTutor.lng;
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: { latitude: resolvedTutor.lat, longitude: resolvedTutor.lng },
      }).catch(() => {});
    }
  }

  const NEARBY_KM = 5;
  const nearbyNames =
    tutorLat != null && tutorLng != null
      ? Object.entries(INDIAN_CITY_COORDINATES)
          .filter(([, point]) => haversineDistanceKm(tutorLat!, tutorLng!, point.lat, point.lng) <= NEARBY_KM)
          .map(([name]) => name)
          .filter((name) => name.length >= 4)
          .slice(0, 12)
      : [];
  const latPad = NEARBY_KM / 111;
  const lngPad =
    tutorLat != null
      ? NEARBY_KM / (111 * Math.max(0.2, Math.cos((tutorLat * Math.PI) / 180)))
      : 0.05;

  const candidateLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] },
      mode: { not: "ONLINE" },
      ...(nearbyNames.length > 0 || (tutorLat != null && tutorLng != null)
        ? {
            OR: [
              ...(tutorLat != null && tutorLng != null
                ? [
                    {
                      latitude: { gte: tutorLat - latPad, lte: tutorLat + latPad },
                      longitude: { gte: tutorLng - lngPad, lte: tutorLng + lngPad },
                    },
                  ]
                : []),
              ...nearbyNames.map((name) => ({
                area: { contains: name, mode: "insensitive" as const },
              })),
            ],
          }
        : tutorCity
          ? { city: { contains: tutorCity, mode: "insensitive" as const } }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      inquiryNumber: true,
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
    },
  });

  type DashboardLead = (typeof candidateLeads)[number] & {
    distanceKm: number | null;
    isStrictNearby: boolean;
    isOnline: boolean;
    subjectMatched: boolean;
  };

  const processedLeads: DashboardLead[] = [];

  for (const lead of candidateLeads) {
    // Gender compatibility filter (e.g. female-only leads don't match male tutors)
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

    // Strict subject matching: lead must match subjects the teacher teaches
    const subjectMatched =
      tutorSubjects.length > 0 ? hasSubjectOverlap(tutorSubjects, lead.subjects) : true;

    processedLeads.push({
      ...lead,
      distanceKm,
      isStrictNearby,
      isOnline,
      subjectMatched,
    });
  }

  // Deduplicate identical inquiries from feed
  const seenSignatures = new Set<string>();
  const deduplicatedProcessed: DashboardLead[] = [];
  for (const pl of processedLeads) {
    const cleanArea = (pl.area || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanClass = (pl.classLevel || "").toLowerCase();
    const cleanSubs = pl.subjects.slice().sort().join("_").toLowerCase();
    const sig = `${cleanArea}_${cleanClass}_${cleanSubs}_${pl.budgetMin ?? 0}`;
    if (seenSignatures.has(sig)) continue;
    seenSignatures.add(sig);
    deduplicatedProcessed.push(pl);
  }

  const subjectMatchedLeads = deduplicatedProcessed.filter((l) => l.subjectMatched);

  // Home-tuition classes inside 5 km. Subject match first, then any class in that radius.
  const withinFiveKm = (l: DashboardLead) => !l.isOnline && l.isStrictNearby;
  const nearbyBySubject = subjectMatchedLeads.filter(withinFiveKm);
  const nearbyAnyClass = deduplicatedProcessed.filter(withinFiveKm);
  const strictNearbyLeads = (nearbyBySubject.length > 0 ? nearbyBySubject : nearbyAnyClass).sort(
    (a, b) => {
      const distA = a.distanceKm ?? 999;
      const distB = b.distanceKm ?? 999;
      if (distA !== distB) return distA - distB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  );

  const recentLeads: DashboardLead[] = strictNearbyLeads.slice(0, 3);

  const purchasedLeadIds = new Set(
    tutorProfile
      ? (
          await prisma.leadPurchase.findMany({
            where: {
              tutorProfileId: tutorProfile.id,
              leadId: { in: recentLeads.map((l) => l.id) },
            },
            select: { leadId: true },
          })
        ).map((p) => p.leadId)
      : []
  );

  return (
    <div className="space-y-6 pb-8 text-slate-900">
      <EnablePushBanner userId={session.user.id} />

      {/* ── Modern Attractive Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07131F] via-[#0B1E33] to-[#0D253A] p-6 sm:p-9 text-white border border-white/10 shadow-2xl shadow-slate-900/10">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-xl min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isKycApproved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-2xs">
                  <ShieldCheck size={14} className="text-emerald-400" /> Verified Teacher
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-2xs">
                  <ShieldAlert size={14} className="text-amber-400" /> Identity Verification (Optional)
                </span>
              )}
              {tutorProfile?.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-400 text-[#0F2540] shadow-sm">
                  <Star size={12} fill="#0F2540" /> Featured Tutor
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Namaste {firstName}! 🎓
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              {isKycApproved
                ? "Verified student inquiries are live near you. Unlock a lead whenever you're ready to start a tuition demo."
                : "Explore instant student leads below. You can start unlocking immediately with wallet coins or an active membership plan!"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link
              href="/tutor/leads"
              className="min-h-12 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-xl shadow-emerald-700/25 hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Search size={16} />
              <span>Explore Student Leads</span>
            </Link>
            <Link
              href="/tutor/wallet"
              className="min-h-12 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Wallet size={16} />
              <span>{walletBalance} Coins</span>
            </Link>
            <Link
              href="/tutor/plans"
              className="min-h-12 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black inline-flex items-center justify-center gap-1.5 border border-white/20 backdrop-blur-md hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Crown size={15} className="text-amber-300" />
              <span>Membership</span>
            </Link>
          </div>
        </div>
      </div>

      {!isKycApproved && (
        <div
          className={`ath-panel p-5.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 shadow-xs transition-all ${
            kycStatus === "REJECTED" ? "border-red-200 bg-red-50/70" : "border-amber-200/80 bg-amber-50/60"
          }`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                kycStatus === "REJECTED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              {kycStatus === "REJECTED" ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#0F2540]">
                {kycStatus === "PENDING"
                  ? "Documents under review"
                  : kycStatus === "REJECTED"
                    ? "Please re-upload your documents"
                    : "Identity verification (Optional)"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5 leading-relaxed font-medium">
                {kycStatus === "PENDING"
                  ? "Our team usually finishes this within 24 hours. You will receive an instant WhatsApp update when approved."
                  : kycStatus === "REJECTED"
                    ? "Your last upload could not be verified. Please upload a clear photo of your Aadhaar card and selfie."
                    : "Upload Aadhaar and a selfie anytime to earn your Verified Teacher badge. You can still unlock leads right now with coins or a plan!"}
              </p>
            </div>
          </div>

          {kycStatus !== "PENDING" && (
            <Link
              href="/tutor/profile"
              className="min-h-11 px-5 py-2.5 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-black shrink-0 text-center shadow-md transition-all"
            >
              {kycStatus === "REJECTED" ? "Re-upload Documents" : "Upload Documents"}
            </Link>
          )}
        </div>
      )}

      {/* ── 4 Quick Stat Cards ── */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/tutor/wallet"
          className="rounded-3xl p-5 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-2 border-amber-200/90 shadow-md hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all flex flex-col justify-between min-w-0 group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900">Wallet Coins</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors shadow-2xs">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#0F2540] tracking-tight">{walletBalance}</div>
            <p className="text-xs text-amber-700 font-bold mt-1 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Top up coins <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <Link
          href="/tutor/leads"
          className="rounded-3xl p-5 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 border-2 border-emerald-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all flex flex-col justify-between min-w-0 group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">Leads Unlocked</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs">
              <UserCog size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#0F2540] tracking-tight">
              {tutorProfile?._count.purchases ?? 0}
            </div>
            <p className="text-xs text-emerald-700 font-bold mt-1 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View leads <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <Link
          href="/tutor/bookings"
          className="rounded-3xl p-5 bg-gradient-to-br from-sky-50/60 via-white to-sky-50/30 border-2 border-sky-200/90 shadow-md hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all flex flex-col justify-between min-w-0 group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-sky-900">Classes Booked</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 group-hover:bg-sky-200 text-sky-700 flex items-center justify-center transition-colors shadow-2xs">
              <BookOpen size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#0F2540] tracking-tight">
              {tutorProfile?._count.bookings ?? 0}
            </div>
            <p className="text-xs text-sky-700 font-bold mt-1 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Manage classes <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-purple-50/60 via-white to-purple-50/30 border-2 border-purple-200/90 shadow-md hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-purple-900">Parent Rating</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
              <Star size={18} fill="#A855F7" className="text-purple-600" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0F2540] tracking-tight">
                {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0
                  ? tutorProfile.averageRating.toFixed(1)
                  : "5.0 ★"}
              </span>
              {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0 && (
                <span className="text-xs text-purple-900 font-bold">({tutorProfile.totalReviews} reviews)</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Verified Parent Reviews</p>
          </div>
        </div>
      </div>

      {profileScore < 100 && (
        <div className="ath-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-800 text-[#0F2540] flex items-center gap-2 flex-wrap" style={{ fontFamily: "Poppins, sans-serif" }}>
                Profile {profileScore}% complete
                {isKycApproved && (
                  <span className="ath-verified">Verified</span>
                )}
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                A complete profile helps parents choose you faster.
              </p>
            </div>
            <Link
              href="/tutor/profile"
              className="min-h-11 px-4 py-2.5 rounded-xl bg-[#0F2540] text-white text-sm font-800 shrink-0 text-center"
            >
              Complete profile
            </Link>
          </div>
          <div className="w-full h-3 rounded-full bg-[#E8F0F7] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2D9E6B]"
              style={{ width: `${profileScore}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {completionItems.map((item, idx) => (
              <span
                key={idx}
                className={`text-xs px-3 py-1.5 rounded-full font-700 inline-flex items-center gap-1.5 ${
                  item.done
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-900 border border-amber-200"
                }`}
              >
                {item.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : "+"} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ath-panel p-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Nearby classes within 5 km
              </h2>
              <span className="text-[11px] font-800 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                <Navigation size={11} className="text-[#2D9E6B]" /> Within 5 km
              </span>
            </div>
            <p className="text-sm text-[#64748B]">
              Home tuition requirements inside 5 km of your saved location.
            </p>
          </div>
          <Link href="/tutor/leads" className="text-sm font-800 text-[#2D9E6B] hover:text-[#238357] inline-flex items-center gap-1 shrink-0">
            View all leads <ArrowRight size={14} />
          </Link>
        </div>

        {recentLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentLeads.map((lead) => {
              const inquiryCode = getInquiryDisplayCode(lead);
              const spotsLeft = publicTutorSlots(lead.purchaseCount).left;
              return (
                <div
                  key={lead.id}
                  className="p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50/80 border-2 border-slate-200/90 hover:border-emerald-400/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 space-y-3.5 flex flex-col justify-between min-w-0"
                >
                  <div className="space-y-2.5">
                    {/* Inquiry Number & Mode / Distance */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-[11px] text-[#0F2540] bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        #{inquiryCode}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {lead.distanceKm !== null && lead.distanceKm <= 5 ? (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                            <Navigation size={10} className="text-[#238357]" /> {lead.distanceKm.toFixed(1)} km nearby
                          </span>
                        ) : lead.isOnline ? (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 inline-flex items-center gap-1 shadow-2xs">
                            <Globe size={10} className="text-sky-600" /> Online Mode
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            {lead.city || "Delhi"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-[#0F2540] text-white shadow-2xs">
                        {cleanClassLevelDisplay(lead.classLevel) || "Tuition"}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                        {lead.mode === "ONLINE" ? "💻 Online Class" : "🏡 Home Tuition"}
                      </span>
                      {spotsLeft > 0 && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ⚡ {spotsLeft} slot{spotsLeft > 1 ? "s" : ""} left
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-[#0F2540] leading-snug tracking-tight">
                      {(lead.subjects &&
                        sanitizeSubjectsForClassLevel(lead.subjects, lead.classLevel)
                          .slice(0, 3)
                          .join(", ")) ||
                        "Multiple subjects"}
                    </h3>

                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 min-w-0">
                      <MapPin size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{lead.area ? `${lead.area}, ${lead.city}` : lead.city || "Student Area"}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tuition Budget</span>
                      <span className="text-sm font-black text-[#0F2540]">{formatLeadBudget(lead)}</span>
                    </div>
                    <Link
                      href={purchasedLeadIds.has(lead.id) ? "/tutor/leads?tab=unlocked" : "/tutor/leads"}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-700/20 hover:scale-[1.02] active:scale-98"
                    >
                      <span>{purchasedLeadIds.has(lead.id) ? "View Unlocked" : "Unlock Lead"}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#E2E8F0] text-center space-y-2">
            <p className="text-sm font-700 text-[#0F2540]">No tuition requirements matching your subjects right now.</p>
            <p className="text-sm text-[#64748B]">Add more subjects and class levels in your profile so parents looking for tutors can match with you instantly.</p>
            <Link
              href="/tutor/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-800 mt-2"
            >
              Update Teaching Subjects
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: "Find students", sub: "Search tuition leads", icon: Search, href: "/tutor/leads", color: "bg-[#2D9E6B] text-white" },
          { title: "My profile", sub: "Subjects and bio", icon: UserCheck, href: "/tutor/profile", color: "bg-[#0F2540] text-white" },
          { title: "Wallet", sub: "Top up coins", icon: Wallet, href: "/tutor/wallet", color: "bg-[#F5A623] text-[#0F2540]" },
          { title: "Messages", sub: "Chat with parents", icon: MessageSquare, href: "/chat", color: "bg-[#1A3C5E] text-white" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="ath-panel p-5 flex flex-col justify-between space-y-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-800 text-[#0F2540]">{item.title}</h3>
              <p className="text-xs text-[#64748B] mt-0.5">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {tutorProfile && <TutorAnalyticsWidget tutorProfileId={tutorProfile.id} />}

      <TutorLeadNotificationPopup
        leads={(strictNearbyLeads.length > 0 ? strictNearbyLeads : recentLeads).slice(0, 5).map((l) => ({
          id: l.id,
          inquiryNumber: l.inquiryNumber,
          classLevel: l.classLevel,
          subjects: l.subjects,
          mode: l.mode,
          city: l.city,
          area: l.area,
          budgetMin: l.budgetMin,
          budgetMax: l.budgetMax,
          distanceKm: l.distanceKm,
        }))}
      />
    </div>
  );
}
