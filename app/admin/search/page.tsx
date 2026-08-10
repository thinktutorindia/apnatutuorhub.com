import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSearchEngineHealth } from "@/lib/search/health";
import { reindexSearchEngineAction } from "@/app/actions/search.actions";
import { Search, Database, Cpu, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Search Engine Control Panel | ApnaTutorHub Admin",
};

export default async function AdminSearchPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const health = await getSearchEngineHealth();

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Search Infrastructure</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Search Engine Control Panel 🔎
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Monitor search index cluster status, document counts, Redis query caching status, and trigger automated background reindexing jobs
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-2">
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

        <div className="rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Indexed Documents</span>
            <Database size={16} className="text-[#7C3AED]" />
          </div>
          <div className="text-2xl font-800 text-[#0F2540]">
            {health.documentCounts.tutors + health.documentCounts.leads}
          </div>
          <p className="text-xs font-600 text-slate-600">
            Tutors: {health.documentCounts.tutors} · Leads: {health.documentCounts.leads}
          </p>
        </div>

        <div className="rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-800 text-slate-900">
            <span>Redis Cache</span>
            <RefreshCw size={16} className="text-[#2D9E6B]" />
          </div>
          <div className="text-xl font-800 text-[#0F2540]">{health.cacheStatus}</div>
          <p className="text-xs font-600 text-slate-600">60s TTL Query Caching</p>
        </div>

        <div className="rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-2">
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
      <section className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-4">
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
