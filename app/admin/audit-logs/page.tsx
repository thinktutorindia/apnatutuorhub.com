import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Search, Activity, Filter } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs — Admin" };

const ACTION_COLOR: Record<string, string> = {
  SUSPEND_USER: "#EF4444",
  REACTIVATE_USER: "#22C55E",
  KYC_APPROVE: "#22C55E",
  KYC_REJECT: "#EF4444",
  LEAD_FORCE_CLOSE: "#EF4444",
  LEAD_FORCE_EXPIRE: "#64748B",
  LEAD_FORCE_RADIUS_EXPAND: "#F59E0B",
  WALLET_ADMIN_CREDIT: "#22C55E",
  WALLET_ADMIN_DEBIT: "#EF4444",
  SETTING_UPDATE: "#3B82F6",
};

const ENTITY_ICON: Record<string, string> = {
  User: "👤",
  TutorProfile: "🧑‍🏫",
  Lead: "📄",
  Wallet: "💰",
  PlatformSetting: "⚙️",
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const actionFilter = params.action ?? "";
  const entityFilter = params.entity ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  const where = {
    AND: [
      actionFilter ? { action: { contains: actionFilter, mode: "insensitive" as const } } : {},
      entityFilter ? { entityType: entityFilter } : {},
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  const ALL_ENTITY_TYPES = ["User", "TutorProfile", "Lead", "Wallet", "PlatformSetting"];

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <ClipboardList size={16} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
              Audit Logs
            </h1>
            <p className="text-sm" style={{ color: "#475569" }}>
              {total.toLocaleString()} total actions recorded
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0F172A", border: "1px solid #1E293B", minWidth: "180px" }}>
          <Search size={14} style={{ color: "#475569" }} />
          <input name="action" defaultValue={actionFilter} placeholder="Search action…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <Filter size={14} style={{ color: "#475569" }} />
          <select name="entity" defaultValue={entityFilter} className="bg-transparent text-sm text-white outline-none">
            <option value="">All Entities</option>
            {ALL_ENTITY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>
          Filter
        </button>
        {(actionFilter || entityFilter) && (
          <Link href="/admin/audit-logs" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#1E293B", color: "#94A3B8" }}>
            Clear
          </Link>
        )}
      </form>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <ClipboardList size={36} style={{ color: "#1E293B" }} />
            <p className="text-sm" style={{ color: "#334155" }}>No audit entries matching your filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#0A0F1E" }}>
            {logs.map((log) => {
              const color = ACTION_COLOR[log.action] ?? "#475569";
              const entityEmoji = ENTITY_ICON[log.entityType] ?? "🔧";
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  {/* Action indicator */}
                  <div
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    <Activity size={13} style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
                        style={{ background: `${color}15`, color, fontFamily: "'Fira Code', monospace" }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs" style={{ color: "#334155" }}>
                        {entityEmoji} {log.entityType}
                        {log.entityId ? (
                          <span style={{ color: "#475569" }}> · <code className="font-mono">{log.entityId.slice(0, 12)}…</code></span>
                        ) : null}
                      </span>
                    </div>
                    {log.details && (
                      <p className="mt-1 text-sm" style={{ color: "#64748B" }}>{log.details}</p>
                    )}
                    <p className="mt-1 text-xs" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                      Admin ID: {log.adminId.slice(0, 12)}… · {new Date(log.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-semibold" style={{ color: "#334155" }}>
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs" style={{ color: "#1E293B" }}>
                      {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: "1px solid #1E293B" }}>
            <p className="text-xs" style={{ color: "#475569" }}>Page {page} of {totalPages} · {total} logs</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/audit-logs?action=${actionFilter}&entity=${entityFilter}&page=${page - 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1E293B", color: "#94A3B8" }}>
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/audit-logs?action=${actionFilter}&entity=${entityFilter}&page=${page + 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
