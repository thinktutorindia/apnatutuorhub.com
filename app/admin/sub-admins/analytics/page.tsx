import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSubAdminAnalyticsData } from "@/app/actions/subadmin-analytics.actions";
import { SubAdminAnalyticsDashboard } from "@/components/admin/SubAdminAnalyticsDashboard";
import { Activity, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sub-Admin Activity Analytics — ApnaTutorHub Admin" };

export default async function SubAdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  const data = await getSubAdminAnalyticsData();

  if (!data) redirect("/admin/dashboard");

  return (
    <div className="space-y-7 text-slate-900">
      {/* Page Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-[#E8F1FB] flex items-center justify-center text-[#2563EB] shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">
              Operations
            </span>
            <h1
              className="text-2xl font-800 text-[#0F2540] tracking-tight mt-0.5"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Staff Analytics
            </h1>
            <p className="text-xs text-slate-600 font-600 mt-1">
              Audit logs, action breakdowns, KPIs, and department performance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/admin/sub-admins"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-[#0F2540] font-800 text-xs hover:bg-slate-50"
          >
            <Users size={15} />
            Team &amp; Roles
          </Link>
          <Link
            href="/admin/audit-logs"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F2540] text-white font-800 text-xs hover:bg-[#1A3C5E]"
          >
            <Activity size={15} />
            Audit Logs
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {data.subAdmins.length === 0 ? (
        <div className="ath-panel p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto">
            <Users size={28} className="text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0F2540]">No Sub-Admin Staff Yet</h2>
            <p className="text-sm text-slate-500 font-semibold mt-1">
              Create sub-admin accounts from the Staff Management page to track their activity.
            </p>
          </div>
          <Link
            href="/admin/sub-admins"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2D9E6B] text-white font-black text-sm hover:bg-[#238357] transition-all shadow-lg"
          >
            <Users size={16} />
            Go to Staff Management
          </Link>
        </div>
      ) : (
        <SubAdminAnalyticsDashboard data={data} />
      )}
    </div>
  );
}
