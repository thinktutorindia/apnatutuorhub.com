import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSearchEngineHealth } from "@/lib/search/health";
import { reindexSearchEngineAction } from "@/app/actions/search.actions";
import { Search, Database, Cpu, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const metadata = {
  title: "Search Engine Control Panel | ApnaTutorHub Admin",
};
export const dynamic = "force-dynamic";

export default async function AdminSearchPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  const health = await getSearchEngineHealth();

  return (
    <div className="space-y-6 text-slate-900">
      <AdminPageHeader
        eyebrow="Operations"
        title="Search Engine"
        description="Index health, document counts, Redis cache status, and background reindex jobs"
        icon={Search}
      />

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ath-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Engine Status</span>
            <Cpu size={16} className="text-[#2563EB]" />
          </div>
          <div className="flex items-center gap-2">
            {health.status === "HEALTHY" ? (
              <CheckCircle size={20} className="text-[#2D9E6B]" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500" />
            )}
            <span className="text-xl font-800 text-[#0F2540]">{health.status}</span>
          </div>
          <p className="text-xs font-600 text-slate-600">
            Active Engine: <strong className="text-slate-900">{health.connectedEngine}</strong>
          </p>
        </div>

        <div className="ath-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Indexed Documents</span>
            <Database size={16} className="text-[#2D9E6B]" />
          </div>
          <div className="text-2xl font-800 text-[#0F2540]">
            {health.documentCounts.tutors + health.documentCounts.leads}
          </div>
          <p className="text-xs font-600 text-slate-600">
            Tutors: {health.documentCounts.tutors} · Leads: {health.documentCounts.leads}
          </p>
        </div>

        <div className="ath-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Redis Cache</span>
            <RefreshCw size={16} className="text-[#2D9E6B]" />
          </div>
          <div className="text-xl font-800 text-[#0F2540]">{health.cacheStatus}</div>
          <p className="text-xs font-600 text-slate-600">60s TTL Query Caching</p>
        </div>

        <div className="ath-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Last Sync</span>
            <RefreshCw size={16} className="text-sky-600" />
          </div>
          <div className="text-sm font-800 text-[#0F2540] truncate">
            {new Date(health.lastSyncAt ?? "").toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <p className="text-xs font-600 text-slate-600">Auto-synchronized</p>
        </div>
      </div>

      {/* Index Controls */}
      <section className="ath-panel p-6 space-y-4">
        <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>Index Rebuild &amp; Operations</h2>
        <p className="text-xs font-600 text-slate-600">
          Execute a full entity scan of PostgreSQL and rebuild the search index across all collections.
        </p>

        <form
          action={async () => {
            "use server";
            await reindexSearchEngineAction();
          }}
        >
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Reindex Search Engine</span>
          </button>
        </form>
      </section>
    </div>
  );
}
