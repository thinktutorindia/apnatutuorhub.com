import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Search, Wallet, ShieldCheck, ShieldAlert, Star, UserCog,
  BookOpen, CheckCircle2, MapPin, Clock, Calendar, Sparkles, MessageSquare,
  TrendingUp, Award, Zap, ChevronRight, UserCheck
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcProfileScore } from "@/lib/profile-score";
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

  const walletBalance = tutorProfile?.wallet?.balance ?? 0;
  const kycStatus = tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const isKycApproved = kycStatus === "APPROVED";

  const scoreBreakdown = tutorProfile
    ? calcProfileScore({ ...tutorProfile, availability: tutorProfile.availability })
    : null;

  const firstName = session.user.name?.split(" ")[0] || "Tutor";

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
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6 pb-8">

      {/* Push Notification Opt-In Banner */}
      <EnablePushBanner userId={session.user.id} />

      {/* Hero Welcome Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden text-white shadow-xl"
        style={{
          backgroundColor: "#0F2540",
          backgroundImage:
            "radial-gradient(ellipse at 80% 20%, rgba(45, 158, 107, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(245, 166, 35, 0.2) 0%, transparent 45%)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              {isKycApproved ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-700 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck size={14} /> Verified Tutor Profile
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-700 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <ShieldAlert size={14} /> Verification Required
                </span>
              )}
              {tutorProfile?.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-700 bg-amber-400 text-gray-900">
                  <Star size={12} fill="#111827" /> Featured Tutor
                </span>
              )}
            </div>

            <h1
              className="text-2xl sm:text-4xl font-800 !text-white tracking-tight drop-shadow-xs"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Welcome back, {firstName} 👋
            </h1>
            
            <p className="text-sm !text-gray-100 font-500 leading-relaxed">
              {isKycApproved
                ? "Your tutor profile is live. Explore student enquiries matching your subject and city."
                : "Complete your identity verification to start receiving direct student leads and parent messages."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              href="/tutor/leads"
              className="btn-shine px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-sm font-700 flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25"
            >
              <Search size={16} />
              <span className="!text-white font-800">Browse Student Leads</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/tutor/wallet"
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 !text-white text-sm font-600 flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:scale-105 active:scale-95 border border-white/20"
            >
              <Wallet size={16} className="text-[#F5A623]" />
              <span className="!text-white font-700">{walletBalance} Coins</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KYC Alert Box if not verified */}
      {!isKycApproved && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm ${
            kycStatus === "REJECTED"
              ? "bg-red-50 border-red-200 text-red-950"
              : "bg-amber-50 border-amber-200 text-amber-950"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                kycStatus === "REJECTED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              {kycStatus === "REJECTED" ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-800 !text-slate-900">
                {kycStatus === "PENDING"
                  ? "Identity Verification Pending Review"
                  : kycStatus === "REJECTED"
                    ? "Verification Rejected"
                    : "Identity Verification Required"}
              </h3>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed font-600">
                {kycStatus === "PENDING"
                  ? "Your submitted documents are being verified by our team (usually takes 24 hours)."
                  : kycStatus === "REJECTED"
                    ? "Your identity verification was rejected. Please re-upload corrected documents."
                    : "Complete verification to unlock student contact details and receive tuition leads."}
              </p>
            </div>
          </div>

          {kycStatus !== "PENDING" && (
            <Link
              href="/tutor/profile"
              className="btn-shine px-5 py-2.5 rounded-xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 shrink-0 text-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-md"
            >
              <span className="!text-white font-800">
                {kycStatus === "REJECTED" ? "Re-upload Documents →" : "Upload KYC Documents →"}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <Link
          href="/tutor/wallet"
          className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">Coin Balance</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-700 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              🪙
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight group-hover:text-[#2D9E6B] transition-colors">
              {walletBalance}
            </div>
            <p className="text-xs text-[#2D9E6B] font-600 mt-1 flex items-center gap-1">
              Top Up Coins <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </Link>

        {/* Connected Students */}
        <Link
          href="/tutor/leads"
          className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">Leads Unlocked</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-700 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <UserCog size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight group-hover:text-[#2D9E6B] transition-colors">
              {tutorProfile?._count.purchases ?? 0}
            </div>
            <p className="text-xs text-[#1A3C5E] font-600 mt-1 flex items-center gap-1">
              View All Leads <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </Link>

        {/* Bookings */}
        <Link
          href="/tutor/bookings"
          className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">Tuition Bookings</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-700 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <BookOpen size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight group-hover:text-[#2D9E6B] transition-colors">
              {tutorProfile?._count.bookings ?? 0}
            </div>
            <p className="text-xs text-blue-600 font-600 mt-1 flex items-center gap-1">
              Manage Classes <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </Link>

        {/* Reviews & Rating */}
        <div className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">Rating &amp; Reviews</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-700 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Star size={18} fill="#F5A623" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight group-hover:text-amber-600 transition-colors">
                {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0
                  ? tutorProfile.averageRating.toFixed(1)
                  : "N/A"}
              </span>
              {tutorProfile?.totalReviews && tutorProfile.totalReviews > 0 && (
                <span className="text-xs text-amber-600 font-700 flex items-center">
                  ★ ({tutorProfile.totalReviews})
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-500 mt-1">From verified parents</p>
          </div>
        </div>
      </div>

      {/* Profile Completeness Tracker (If < 100%) */}
      {profileScore < 100 && (
        <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-800 text-gray-900 flex items-center gap-2">
                Profile Completeness Score ({profileScore}%)
                {isKycApproved && (
                  <span className="text-xs font-700 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Complete your tutor profile to rank higher in student search results.
              </p>
            </div>
            <Link
              href="/tutor/profile"
              className="btn-shine px-4 py-2.5 rounded-xl bg-[#1A3C5E] hover:bg-[#0F2540] !text-white text-xs font-800 shrink-0 text-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow"
            >
              <span className="!text-white font-800">Complete Profile →</span>
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden p-0.5 border border-gray-200">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#2D9E6B] to-emerald-400"
              style={{ width: `${profileScore}%` }}
            />
          </div>

          {/* Checklist Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {completionItems.map((item, idx) => (
              <span
                key={idx}
                className={`text-xs px-3 py-1 rounded-full font-600 flex items-center gap-1.5 transition-transform hover:scale-105 ${
                  item.done
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {item.done ? <CheckCircle2 size={12} className="text-emerald-600" /> : "+"} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Active Leads Preview */}
      <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-800 text-gray-900 flex items-center gap-2">
              <Zap size={18} className="text-[#F5A623]" />
              Latest Student Enquiries
            </h2>
            <p className="text-xs text-gray-600">Fresh tuition requirements posted by parents</p>
          </div>
          <Link
            href="/tutor/leads"
            className="text-xs font-700 text-[#2D9E6B] hover:underline flex items-center gap-1 transition-transform hover:translate-x-1"
          >
            View All Enquiries <ArrowRight size={14} />
          </Link>
        </div>

        {recentLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="group p-4 rounded-2xl bg-gray-50/70 border border-gray-200/70 space-y-3 flex flex-col justify-between hover:bg-white hover:border-[#2D9E6B] hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-1"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-700 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2D9E6B]">
                      {lead.classLevel || "Tuition"}
                    </span>
                    <span className="text-[11px] font-600 text-gray-500">
                      {lead.mode === "ONLINE" ? "💻 Live Online" : "🏠 Home Tuition"}
                    </span>
                  </div>

                  <h3 className="text-sm font-800 text-gray-900 leading-snug group-hover:text-[#2D9E6B] transition-colors">
                    {(lead.subjects && lead.subjects.slice(0, 2).join(", ")) || "Multiple Subjects"}
                  </h3>

                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin size={13} className="text-amber-500 shrink-0" />
                    {lead.area ? `${lead.area}, ${lead.city}` : lead.city}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-xs font-800 text-[#1A3C5E]">
                    ₹{lead.budgetMin && lead.budgetMax ? `${lead.budgetMin}–${lead.budgetMax}/hr` : "Negotiable"}
                  </span>
                  <Link
                    href={`/tutor/leads`}
                    className="text-xs font-800 text-[#2D9E6B] hover:underline flex items-center gap-0.5"
                  >
                    Unlock Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-2">
            <p className="text-sm font-600 text-gray-700">No active student enquiries at the moment.</p>
            <p className="text-xs text-gray-500">Check back soon or update your teaching subjects in profile settings.</p>
          </div>
        )}
      </div>

      {/* Command Shortcuts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            title: "Find Students",
            sub: "Search tuition leads",
            icon: Search,
            href: "/tutor/leads",
            color: "bg-emerald-500 text-white",
          },
          {
            title: "My Tutor Profile",
            sub: "Edit subjects & bio",
            icon: UserCheck,
            href: "/tutor/profile",
            color: "bg-[#1A3C5E] text-white",
          },
          {
            title: "Wallet & Coins",
            sub: "Top up coin balance",
            icon: Wallet,
            href: "/tutor/wallet",
            color: "bg-amber-500 text-white",
          },
          {
            title: "Direct Messages",
            sub: "Chat with parents",
            icon: MessageSquare,
            href: "/chat",
            color: "bg-blue-600 text-white",
          },
        ].map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between space-y-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
              <item.icon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-800 text-gray-900 group-hover:text-[#2D9E6B] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Performance Analytics Widget */}
      {tutorProfile && <TutorAnalyticsWidget tutorProfileId={tutorProfile.id} />}

    </div>
  );
}
