import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSearchEngineHealth } from "@/lib/search/health";
import { reindexSearchEngineAction } from "@/app/actions/search.actions";
import { Search, Database, Cpu, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Search Engine Control Panel | ThinkTutor Admin",
};

export default async function AdminSearchPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const health = await getSearchEngineHealth();

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <header className="neu-card flex flex-col gap-3 bg-[#E0F2FE] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Search size={14} />
          Search Infrastructure
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Search Engine Control Panel 🔎
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Monitor search index cluster status, document counts, Redis query caching status, and trigger automated background reindexing jobs.
        </p>
      </header>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="neu-card bg-white p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Engine Status</span>
            <Cpu size={16} />
          </div>
          <div className="flex items-center gap-2">
            {health.status === "HEALTHY" ? (
              <CheckCircle size={20} className="text-[#22C55E]" />
            ) : (
              <AlertTriangle size={20} className="text-[#F59E0B]" />
            )}
            <span className="text-xl font-black text-[#0F172A]">{health.status}</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            Active: <strong>{health.connectedEngine}</strong>
          </p>
        </div>

        <div className="neu-card bg-white p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Indexed Documents</span>
            <Database size={16} />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {health.documentCounts.tutors + health.documentCounts.leads}
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            Tutors: {health.documentCounts.tutors} · Leads: {health.documentCounts.leads}
          </p>
        </div>

        <div className="neu-card bg-white p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Redis Cache</span>
            <RefreshCw size={16} />
          </div>
          <div className="text-xl font-black text-[#0F172A]">{health.cacheStatus}</div>
          <p className="text-[11px] font-semibold text-slate-500">60s TTL Query Caching</p>
        </div>

        <div className="neu-card bg-white p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Last Sync</span>
            <RefreshCw size={16} />
          </div>
          <div className="text-sm font-black text-[#0F172A] truncate">
            {new Date(health.lastSyncAt ?? "").toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <p className="text-[11px] font-semibold text-slate-500">Auto-synchronized</p>
        </div>
      </div>

      {/* Index Controls */}
      <section className="neu-card bg-white p-6 space-y-4">
        <h2 className="text-lg font-black text-[#0F172A]">Index Rebuild & Operations</h2>
        <p className="text-xs font-semibold text-slate-600">
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
            className="neu-btn neu-btn-primary px-5 py-2.5 text-xs inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Rebuild Full Search Index</span>
          </button>
        </form>
      </section>
    </div>
  );
}
