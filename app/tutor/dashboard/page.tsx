import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Compass,
  ShieldCheck,
  Sparkles,
  Star,
  UserCog,
  Wallet,
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

  if (!dbUser) {
    redirect("/login");
  }

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

  const stats = [
    {
      label: "Coin Balance",
      value: `${walletBalance} 🪙`,
      icon: Wallet,
      bg: "#FEF3C7",
      href: "/tutor/wallet",
    },
    {
      label: "Leads Unlocked",
      value: tutorProfile?._count.purchases ?? 0,
      icon: Compass,
      bg: "#E0F2FE",
      href: "/tutor/leads",
    },
    {
      label: "Avg Rating",
      value: tutorProfile?.averageRating
        ? `${tutorProfile.averageRating.toFixed(1)} ⭐`
        : "New",
      icon: Star,
      bg: "#FCE7F3",
      href: null,
    },
    {
      label: "Profile Score",
      value: `${scoreBreakdown?.total ?? 0}%`,
      icon: UserCog,
      bg: "#DCFCE7",
      href: "/tutor/profile",
    },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="neu-card flex flex-col items-start justify-between gap-6 bg-[#DCFCE7] p-6 md:flex-row md:items-center md:p-8">
        <div className="space-y-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Sparkles size={14} className="text-amber-500" />
            Tutor Dashboard
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
            Welcome back, {session.user.name || "Tutor"}! 🎓
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            Browse matched student requirements, unlock parent contacts using
            coins, and schedule classes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/tutor/wallet"
            className="neu-btn neu-btn-yellow shrink-0 px-5 py-3 text-sm"
          >
            <Wallet size={18} />
            <span>{walletBalance} Coins</span>
          </Link>
          {!isKycApproved && (
            <Link
              href="/tutor/profile"
              className="neu-btn neu-btn-primary shrink-0 px-5 py-3 text-sm"
            >
              <ShieldCheck size={18} />
              <span>Complete KYC</span>
            </Link>
          )}
        </div>
      </div>

      {/* Push Notification Opt-in Banner */}
      <EnablePushBanner userId={session.user.id} />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="neu-card space-y-2 p-5"
            style={{ backgroundColor: stat.bg }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">
                {stat.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0F172A] bg-white">
                <stat.icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{stat.value}</div>
            {stat.href && (
              <Link
                href={stat.href}
                className="text-[11px] font-extrabold text-[#22C55E] hover:underline"
              >
                View →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Widget */}
      {tutorProfile && <TutorAnalyticsWidget tutorProfileId={tutorProfile.id} />}

      {/* Profile completion ring */}
      {scoreBreakdown && scoreBreakdown.total < 100 && (
        <div className="neu-card flex flex-col gap-4 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#0F172A]">
              Profile {scoreBreakdown.total}% complete
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              A complete profile ranks higher in the matching engine and attracts
              more parents.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {scoreBreakdown.kyc === 0 && (
                <span className="neu-badge bg-[#FFEDD5] text-[10px]">
                  + KYC Verification (40 pts)
                </span>
              )}
              {scoreBreakdown.subjects < 15 && (
                <span className="neu-badge bg-[#DCFCE7] text-[10px]">
                  + Select 3+ Subjects ({15 - scoreBreakdown.subjects} pts)
                </span>
              )}
              {scoreBreakdown.classLevels < 10 && (
                <span className="neu-badge bg-[#DCFCE7] text-[10px]">
                  + Select 2+ Class Levels ({10 - scoreBreakdown.classLevels} pts)
                </span>
              )}
              {scoreBreakdown.bio === 0 && (
                <span className="neu-badge bg-[#E0F2FE] text-[10px]">
                  + Bio (20+ chars) (10 pts)
                </span>
              )}
              {scoreBreakdown.fees === 0 && (
                <span className="neu-badge bg-[#FEF3C7] text-[10px]">
                  + Set Fee Range (5 pts)
                </span>
              )}
              {scoreBreakdown.location === 0 && (
                <span className="neu-badge bg-[#FCE7F3] text-[10px]">
                  + Set City (5 pts)
                </span>
              )}
              {scoreBreakdown.availability === 0 && (
                <span className="neu-badge bg-[#F3E8FF] text-[10px]">
                  + Set Availability (3+ days) (10 pts)
                </span>
              )}
              {scoreBreakdown.introVideo === 0 && (
                <span className="neu-badge bg-[#DCFCE7] text-[10px]">
                  + Add Intro Video Link (5 pts)
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none" stroke="#E2E8F0" strokeWidth="3.2"
                />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none" stroke="#22C55E" strokeWidth="3.2"
                  strokeDasharray={`${scoreBreakdown.total} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base font-black text-[#0F172A]">
                {scoreBreakdown.total}%
              </span>
            </div>
            <Link
              href="/tutor/profile"
              className="neu-btn neu-btn-primary px-5 py-2.5 text-xs"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      )}

      {/* Leads CTA */}
      <div className="neu-card flex flex-col items-start justify-between gap-4 bg-white p-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#0F172A]">
            Browse Available Leads
          </h2>
          <p className="text-sm font-semibold text-slate-600">
            View parents actively looking for tutors in your subjects and radius.
          </p>
        </div>
        <Link
          href="/tutor/leads"
          className="neu-btn neu-btn-primary shrink-0 px-6 py-3.5 text-sm"
        >
          <Compass size={18} />
          <span>Explore Lead Feed</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
