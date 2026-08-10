import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAnalyticsData } from "@/app/actions/analytics.actions";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";
import { AnalyticsRangePicker } from "@/components/admin/AnalyticsRangePicker";
import { BarChart3, Users, ShieldCheck, Zap, IndianRupee, Star, Percent } from "lucide-react";

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
    <div className="space-y-8 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB] shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Advanced Platform Analytics &amp; Cohorts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-600">
              Deep financial trends, lead matching velocity, subject demand, and tutor performance
            </p>
          </div>
        </div>

        {/* Smooth Date Range Picker */}
        <AnalyticsRangePicker currentRange={range} />
      </div>

      {/* Advanced KPI Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Estimated Revenue */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <IndianRupee size={15} className="text-[#2D9E6B]" />
            <span>Est. Revenue</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>
            ₹{data.totals.estimatedRevenueInr.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            {data.totals.totalCoins.toLocaleString("en-IN")} Coins Volume
          </p>
        </div>

        {/* Total Registered Users */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <Users size={15} className="text-[#2563EB]" />
            <span>Total Users</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#2563EB]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {data.totals.totalUsers.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            {data.totals.totalTutors} Tutors · {data.totals.totalParents} Parents
          </p>
        </div>

        {/* Lead Conversion Rate */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <Percent size={15} className="text-[#7C3AED]" />
            <span>Conversion Rate</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#7C3AED]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {data.totals.conversionRate}%
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            {data.totals.totalBookings} Booked / {data.totals.totalLeads} Leads
          </p>
        </div>

        {/* Tutor KYC Verification Rate */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <ShieldCheck size={15} className="text-[#D97706]" />
            <span>Tutor Verification</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#D97706]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {data.totals.tutorVerificationRate}%
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            {data.totals.verifiedTutors} Verified Tutors
          </p>
        </div>

        {/* Total Leads Posted */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <Zap size={15} className="text-[#EA580C]" />
            <span>Leads Posted</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#EA580C]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {data.totals.totalLeads.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            Total Requirements
          </p>
        </div>

        {/* Average Tutor Rating */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-800">
            <Star size={15} className="text-[#DB2777]" />
            <span>Avg Rating</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#DB2777]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {data.totals.avgRating > 0 ? `${data.totals.avgRating.toFixed(1)} ⭐` : "—"}
          </p>
          <p className="text-[11px] font-700 text-slate-600">
            Verified Reviews
          </p>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <AdminAnalyticsCharts data={data} range={range} />
    </div>
  );
}
