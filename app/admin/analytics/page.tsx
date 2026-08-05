import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminAnalyticsData } from "@/app/actions/analytics.actions";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform Analytics — Admin" };

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/admin/dashboard");
  }

  const data = await getAdminAnalyticsData();
  if (!data) redirect("/admin/dashboard");

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}
        >
          Platform Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Revenue trends, lead matching engine metrics, and subject demand insights.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Total Users", value: data.totals.totalUsers.toLocaleString("en-IN"), accent: "#3B82F6" },
          { label: "Total Leads", value: data.totals.totalLeads.toLocaleString("en-IN"), accent: "#A855F7" },
          { label: "Bookings", value: data.totals.totalBookings.toLocaleString("en-IN"), accent: "#22C55E" },
          { label: "Coins Sold", value: data.totals.totalCoins.toLocaleString("en-IN"), accent: "#F59E0B" },
          {
            label: "Avg Tutor Rating",
            value: `${data.totals.avgRating > 0 ? data.totals.avgRating.toFixed(1) : "—"} ⭐`,
            accent: "#FB923C",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl p-5"
            style={{
              background: "#0F172A",
              border: "1px solid #1E293B",
              boxShadow: `inset 0 1px 0 0 ${k.accent}22`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>
              {k.label}
            </p>
            <p
              className="mt-1 text-2xl font-bold"
              style={{ color: k.accent, fontFamily: "'Poppins', sans-serif" }}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Client charts component */}
      <AdminAnalyticsCharts
        monthlyRevenue={data.monthlyRevenue}
        leadFill={data.leadFill}
        subjectDemand={data.subjectDemand}
      />
    </div>
  );
}
