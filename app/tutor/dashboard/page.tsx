import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Wallet,
  Compass,
  ShieldAlert,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function TutorDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch tutor profile, wallet, and lead purchases from Supabase
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wallet: true,
      leadPurchases: {
        include: {
          lead: true,
        },
      },
    },
  });

  const walletBalance = tutorProfile?.wallet?.balance || 0;

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="neu-card p-6 md:p-8 bg-[#DCFCE7] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Sparkles size={14} className="text-amber-500" />
            Tutor Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Welcome back, {session.user.name || "Tutor"}! 🎓
          </h1>
          <p className="text-sm font-semibold text-slate-700">
            Browse matched student requirements, unlock parent contacts using coins, and schedule classes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/tutor/wallet"
            className="neu-btn neu-btn-yellow py-3 px-5 text-sm flex items-center gap-2"
          >
            <Wallet size={18} />
            <span>Wallet: {walletBalance} Coins</span>
          </a>
        </div>
      </div>

      {/* KYC Alert if not verified */}
      {tutorProfile?.kycStatus !== "APPROVED" && (
        <div className="neu-card p-5 bg-[#FEF3C7] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-sm md:text-base">
                KYC Verification Pending
              </h3>
              <p className="text-xs font-semibold text-slate-700">
                Complete your KYC verification to get the Verified Tutor Badge and boost your lead ranking by +500 points!
              </p>
            </div>
          </div>
          <a
            href="/tutor/profile"
            className="neu-btn neu-btn-primary text-xs px-4 py-2 flex-shrink-0"
          >
            Submit KYC
          </a>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Coin Balance",
            value: `${walletBalance} Coins`,
            icon: Wallet,
            bg: "#FEF3C7",
          },
          {
            label: "Unlocked Leads",
            value: tutorProfile?.leadPurchases.length || 0,
            icon: Compass,
            bg: "#E0F2FE",
          },
          {
            label: "Average Rating",
            value: tutorProfile?.averageRating
              ? `${tutorProfile.averageRating.toFixed(1)} ⭐`
              : "New Tutor",
            icon: Star,
            bg: "#FCE7F3",
          },
          {
            label: "Verification Status",
            value: tutorProfile?.isVerified ? "Verified ✅" : "Unverified",
            icon: ShieldCheck,
            bg: "#DCFCE7",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="neu-card p-5 space-y-2"
            style={{ backgroundColor: stat.bg }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700">
                {stat.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#0F172A] flex items-center justify-center">
                <stat.icon size={16} className="text-[#0F172A]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0F172A]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Available Leads Feed CTA */}
      <div className="neu-card p-8 bg-white space-y-4 text-center md:text-left md:flex md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#0F172A]">
            Browse Available Tuition Leads
          </h2>
          <p className="text-sm font-semibold text-slate-600">
            View parents actively looking for tutors in your subjects and teaching radius.
          </p>
        </div>

        <a
          href="/tutor/leads"
          className="neu-btn neu-btn-primary py-3.5 px-6 text-sm flex items-center justify-center gap-2"
        >
          <Compass size={18} />
          <span>Explore Matched Leads Feed</span>
          <ArrowRight size={18} />
        </a>
      </div>
    </div>
  );
}
