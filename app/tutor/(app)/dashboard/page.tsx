import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Search, Wallet, ShieldCheck, ShieldAlert, Star, UserCog,
  BookOpen, CheckCircle2, MapPin, MessageSquare, ChevronRight, UserCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
import { formatLeadBudget } from "@/lib/lead-utils";
import { TutorAnalyticsWidget } from "@/components/tutor/TutorAnalyticsWidget";
import { EnablePushBanner } from "@/components/EnablePushBanner";

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
    redirect("/tutor/onboarding");
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
    { done: !!tutorProfile?.feeMin, label: "Set your hourly fee" },
    { done: !!tutorProfile?.city, label: "Set your city" },
    { done: isKycApproved, label: "Complete KYC verification" },
  ];
  const profileScore = scoreBreakdown?.total ?? 0;

  // Fetch recent active student leads for preview
  const recentLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      classLevel: true,
      subjects: true,
      mode: true,
      city: true,
      area: true,
      budgetMin: true,
      budgetMax: true,
      notes: true,
      timingPreference: true,
      createdAt: true,
    },
  });

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

      <div className="relative overflow-hidden rounded-3xl bg-[#0F2540] p-6 sm:p-8 text-white">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-xl min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isKycApproved ? (
                <span className="ath-verified bg-white/10 text-emerald-200 border-emerald-400/40">
                  <ShieldCheck size={14} /> Verified Teacher
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-700 bg-amber-500/20 text-amber-200 border border-amber-400/40">
                  <ShieldAlert size={14} /> Complete verification
                </span>
              )}
              {tutorProfile?.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-800 bg-[#F5A623] text-[#0F2540]">
                  <Star size={12} fill="#0F2540" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Namaste {firstName}! Welcome back.
            </h1>
            <p className="text-[15px] text-slate-200 font-500 leading-relaxed">
              {isKycApproved
                ? "Parents near you are posting tuition requirements. Unlock a lead when you are ready to take the class."
                : "Finish a quick identity check so parents can see you as a verified teacher."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link
              href="/tutor/leads"
              className="min-h-12 px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800 inline-flex items-center justify-center gap-2"
            >
              <Search size={16} />
              View Student Leads
            </Link>
            <Link
              href="/tutor/wallet"
              className="min-h-12 px-5 py-3 rounded-2xl bg-[#F5A623] hover:bg-[#e69512] text-[#0F2540] text-[15px] font-800 inline-flex items-center justify-center gap-2"
            >
              <Wallet size={16} />
              {walletBalance} Coins
            </Link>
            <Link
              href="/tutor/plans"
              className="min-h-12 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[15px] font-800 inline-flex items-center justify-center border border-white/20"
            >
              Membership
            </Link>
          </div>
        </div>
      </div>

      {!isKycApproved && (
        <div
          className={`ath-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            kycStatus === "REJECTED" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                kycStatus === "REJECTED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              {kycStatus === "REJECTED" ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-800 text-[#0F2540]">
                {kycStatus === "PENDING"
                  ? "Documents under review"
                  : kycStatus === "REJECTED"
                    ? "Please re-upload your documents"
                    : "Identity check needed"}
              </h3>
              <p className="text-sm text-slate-700 mt-0.5 leading-relaxed font-500">
                {kycStatus === "PENDING"
                  ? "Our team usually finishes this within 24 hours. You will get a message when it is done."
                  : kycStatus === "REJECTED"
                    ? "Your last upload could not be verified. Please upload a clearer Aadhaar and selfie."
                    : "Upload Aadhaar and a selfie to unlock parent phone numbers and student leads."}
              </p>
            </div>
          </div>

          {kycStatus !== "PENDING" && (
            <Link
              href="/tutor/profile"
              className="min-h-12 px-5 py-2.5 rounded-xl bg-[#0F2540] text-white text-sm font-800 shrink-0 text-center"
            >
              {kycStatus === "REJECTED" ? "Re-upload documents" : "Upload documents"}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/tutor/wallet" className="ath-panel p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-800 uppercase tracking-wider text-[#64748B]">Coin balance</span>
            <Wallet size={18} className="text-[#F5A623]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight">{walletBalance}</div>
            <p className="text-xs text-[#2D9E6B] font-700 mt-1 inline-flex items-center gap-1">
              Top up coins <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <Link href="/tutor/leads" className="ath-panel p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-800 uppercase tracking-wider text-[#64748B]">Leads unlocked</span>
            <UserCog size={18} className="text-[#2D9E6B]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight">
              {tutorProfile?._count.purchases ?? 0}
            </div>
            <p className="text-xs text-[#1A3C5E] font-700 mt-1 inline-flex items-center gap-1">
              View leads <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <Link href="/tutor/bookings" className="ath-panel p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-800 uppercase tracking-wider text-[#64748B]">Classes booked</span>
            <BookOpen size={18} className="text-[#0F2540]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight">
              {tutorProfile?._count.bookings ?? 0}
            </div>
            <p className="text-xs text-[#2D9E6B] font-700 mt-1 inline-flex items-center gap-1">
              Manage classes <ChevronRight size={13} />
            </p>
          </div>
        </Link>

        <div className="ath-panel p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-800 uppercase tracking-wider text-[#64748B]">Parent reviews</span>
            <Star size={18} className="text-[#F5A623]" fill="#F5A623" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight">
                {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0
                  ? tutorProfile.averageRating.toFixed(1)
                  : "New"}
              </span>
              {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0 && (
                <span className="text-xs text-[#92400E] font-700">({tutorProfile.totalReviews})</span>
              )}
            </div>
            <p className="text-xs text-[#64748B] font-500 mt-1">From verified parents</p>
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
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              New tuition enquiries near you
            </h2>
            <p className="text-sm text-[#64748B]">Parents who just posted a requirement in your area</p>
          </div>
          <Link href="/tutor/leads" className="text-sm font-800 text-[#2D9E6B] inline-flex items-center gap-1 shrink-0">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 flex flex-col justify-between min-w-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-800 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#238357]">
                      {lead.classLevel || "Tuition"}
                    </span>
                    <span className="text-[11px] font-700 text-[#64748B]">
                      {lead.mode === "ONLINE" ? "Online" : "Home tuition"}
                    </span>
                  </div>
                  <h3 className="text-sm font-800 text-[#0F2540] leading-snug">
                    {(lead.subjects && lead.subjects.slice(0, 2).join(", ")) || "Multiple subjects"}
                  </h3>
                  <p className="text-xs text-[#64748B] flex items-center gap-1 min-w-0">
                    <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
                    <span className="truncate">{lead.area ? `${lead.area}, ${lead.city}` : lead.city}</span>
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <span className="text-xs font-800 text-[#0F2540]">{formatLeadBudget(lead)}</span>
                  <Link
                    href={purchasedLeadIds.has(lead.id) ? "/tutor/leads?tab=unlocked" : "/tutor/leads"}
                    className="text-xs font-800 text-[#2D9E6B]"
                  >
                    {purchasedLeadIds.has(lead.id) ? "Open unlocked" : "View lead"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#E2E8F0] text-center space-y-2">
            <p className="text-sm font-700 text-[#0F2540]">No new enquiries right now.</p>
            <p className="text-sm text-[#64748B]">Add more subjects and your area in your profile so parents can find you faster.</p>
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
    </div>
  );
}
