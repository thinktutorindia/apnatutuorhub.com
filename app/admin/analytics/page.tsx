import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAnalyticsData } from "@/app/actions/analytics.actions";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";
import { BarChart3, TrendingUp, Users, ShieldCheck, Zap, IndianRupee, Star, Percent } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Advanced Analytics & Financial Cohorts — Admin" };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: "30d" | "90d" | "180d" | "1y" | "all" }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const range = params.range ?? "180d";

  const data = await getAdminAnalyticsData(range);
  if (!data) redirect("/admin/dashboard");

  return (
    <div className="space-y-8 color-[#F8FAFC]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.03em" }}>
              Advanced Platform Analytics & Cohorts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Deep financial trends, lead matching velocity, subject demand, and tutor performance
            </p>
          </div>
        </div>

        {/* Date Range Picker Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#0F172A] p-1.5 border border-[#1E293B]">
          {[
            { label: "30 Days", val: "30d" },
            { label: "90 Days", val: "90d" },
            { label: "6 Months", val: "180d" },
            { label: "1 Year", val: "1y" },
            { label: "All Time", val: "all" },
          ].map((r) => (
            <Link
              key={r.val}
              href={`/admin/analytics?range=${r.val}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                range === r.val
                  ? "bg-[#3B82F6] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Advanced KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Estimated Revenue */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(34,197,94,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <IndianRupee size={14} className="text-emerald-400" />
            <span>Est. Revenue</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            ₹{data.totals.estimatedRevenueInr.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            {data.totals.totalCoins.toLocaleString("en-IN")} Coins Sold
          </p>
        </div>

        {/* Total Registered Users */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(59,130,246,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <Users size={14} className="text-blue-400" />
            <span>Total Users</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {data.totals.totalUsers.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            {data.totals.totalTutors} Tutors · {data.totals.totalParents} Parents
          </p>
        </div>

        {/* Lead Conversion Rate */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(168,85,247,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <Percent size={14} className="text-purple-400" />
            <span>Conversion Rate</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {data.totals.conversionRate}%
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            {data.totals.totalBookings} Booked / {data.totals.totalLeads} Leads
          </p>
        </div>

        {/* Tutor KYC Verification Rate */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(245,158,11,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <ShieldCheck size={14} className="text-amber-400" />
            <span>Tutor Verification</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {data.totals.tutorVerificationRate}%
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            {data.totals.verifiedTutors} Verified Tutors
          </p>
        </div>

        {/* Total Leads Posted */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(251,146,60,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <Zap size={14} className="text-orange-400" />
            <span>Leads Posted</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-orange-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {data.totals.totalLeads.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            Total Requirements
          </p>
        </div>

        {/* Average Tutor Rating */}
        <div className="rounded-2xl bg-[#0F172A] p-4 border border-[#1E293B] shadow-[inset_0_1px_0_0_rgba(236,72,153,0.3)] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <Star size={14} className="text-pink-400" />
            <span>Avg Rating</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-pink-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {data.totals.avgRating > 0 ? `${data.totals.avgRating.toFixed(1)} ⭐` : "—"}
          </p>
          <p className="text-[10px] font-mono text-slate-500">
            Verified Tutor Reviews
          </p>
        </div>
      </div>

      {/* Advanced Client Charts & Tab Modules */}
      <AdminAnalyticsCharts
        monthlyRevenue={data.monthlyRevenue}
        leadFill={data.leadFill}
        subjectDemand={data.subjectDemand}
        classDemand={data.classDemand}
        modeBreakdown={data.modeBreakdown}
        cityDistribution={data.cityDistribution}
        ratingDistribution={data.ratingDistribution}
        subAdminActivity={data.subAdminActivity}
      />
    </div>
  );
}
