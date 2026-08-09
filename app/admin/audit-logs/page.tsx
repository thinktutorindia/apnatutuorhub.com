import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Activity, UserCheck, Shield } from "lucide-react";
import { AuditLogFilterBar } from "@/components/admin/AuditLogFilterBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sub-Admin & Audit Activity Logs — Admin" };

const ACTION_COLOR: Record<string, string> = {
  SUSPEND_USER: "#EF4444",
  REACTIVATE_USER: "#22C55E",
  DELETE_USER: "#EF4444",
  ADMIN_RESET_PASSWORD: "#F59E0B",
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

const SUB_ADMIN_ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  VERIFICATION: { bg: "rgba(168,85,247,0.15)", text: "#C084FC", label: "Verification" },
  SUPPORT: { bg: "rgba(59,130,246,0.15)", text: "#60A5FA", label: "Support" },
  FINANCE: { bg: "rgba(245,158,11,0.15)", text: "#FBBF24", label: "Finance" },
  OPERATIONS: { bg: "rgba(249,115,22,0.15)", text: "#FB923C", label: "Operations" },
  MARKETING: { bg: "rgba(236,72,153,0.15)", text: "#F472B6", label: "Marketing" },
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity?: string;
    adminId?: string;
    subAdminOnly?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const actionFilter = params.action?.trim() ?? "";
  const entityFilter = params.entity ?? "";
  const adminIdFilter = params.adminId ?? "";
  const isSubAdminOnly = params.subAdminOnly === "true";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  // Fetch all admin and sub-admin accounts for filter and user resolution
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      subAdminRole: true,
    },
  });

  const adminMap = new Map(adminUsers.map((u) => [u.id, u]));
  const subAdminIds = adminUsers.filter((u) => u.role === "SUB_ADMIN").map((u) => u.id);

  // Build filter query
  const whereConditions: any[] = [];

  if (actionFilter) {
    whereConditions.push({ action: { contains: actionFilter, mode: "insensitive" as const } });
  }

  if (entityFilter) {
    whereConditions.push({ entityType: entityFilter });
  }

  if (adminIdFilter) {
    whereConditions.push({ adminId: adminIdFilter });
  } else if (isSubAdminOnly) {
    whereConditions.push({ adminId: { in: subAdminIds } });
  }

  const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [logs, total, totalSubAdminLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { adminId: { in: subAdminIds } } }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <ClipboardList size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
              Sub-Admin Activity & Audit Logs
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Track all work, approvals, rejections, & changes performed by sub-admins & super admins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2">
            <UserCheck size={14} className="text-amber-400" />
            <span className="text-xs font-extrabold text-amber-400">
              {totalSubAdminLogs} Sub-Admin Actions Logged
            </span>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <AuditLogFilterBar
        initialAction={actionFilter}
        initialEntity={entityFilter}
        initialAdminId={adminIdFilter}
        initialSubAdminOnly={isSubAdminOnly}
        adminUsers={adminUsers}
      />

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl bg-[#0F172A] border border-[#1E293B]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <ClipboardList size={36} className="text-slate-700" />
            <p className="text-sm font-bold text-slate-500">No audit log entries found matching your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {logs.map((log) => {
              const color = ACTION_COLOR[log.action] ?? "#94A3B8";
              const entityEmoji = ENTITY_ICON[log.entityType] ?? "🔧";
              const adminUser = adminMap.get(log.adminId);
              const isSubAdmin = adminUser?.role === "SUB_ADMIN";
              const subAdminBadge = isSubAdmin && adminUser.subAdminRole
                ? SUB_ADMIN_ROLE_BADGE[adminUser.subAdminRole]
                : null;

              return (
                <div
                  key={log.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Action Indicator Icon */}
                    <div
                      className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      <Activity size={15} style={{ color }} />
                    </div>

                    {/* Main Log Info */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action Badge */}
                        <span
                          className="rounded-md px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider"
                          style={{ background: `${color}18`, color, fontFamily: "'Fira Code', monospace" }}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>

                        {/* Entity Label */}
                        <span className="text-xs font-bold text-slate-400">
                          {entityEmoji} {log.entityType}
                          {log.entityId && (
                            <span className="text-slate-500 font-mono ml-1">
                              (ID: {log.entityId.slice(0, 10)}…)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Log Details */}
                      {log.details && (
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed bg-white/[0.03] p-2 rounded-lg border border-white/5">
                          {log.details}
                        </p>
                      )}

                      {/* Performed By Admin / Sub-Admin Info */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400">
                        <span className="font-extrabold text-slate-300">
                          By: {adminUser ? (adminUser.name || adminUser.email) : `ID: ${log.adminId.slice(0, 10)}`}
                        </span>

                        {/* Role Pill */}
                        {isSubAdmin ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                            style={{
                              backgroundColor: subAdminBadge?.bg ?? "rgba(245,158,11,0.15)",
                              color: subAdminBadge?.text ?? "#FBBF24",
                            }}
                          >
                            Sub-Admin ({subAdminBadge?.label ?? adminUser?.subAdminRole})
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            Super Admin
                          </span>
                        )}

                        {log.ipAddress && (
                          <span className="text-slate-500 font-mono text-[10px]">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-left md:text-right text-xs text-slate-400 font-mono">
                    <p className="font-bold text-slate-300">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1E293B]">
            <p className="text-xs font-semibold text-slate-400">
              Page {page} of {totalPages} · {total} audit records
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&entity=${entityFilter}&adminId=${adminIdFilter}&subAdminOnly=${isSubAdminOnly}&page=${page - 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#1E293B] text-slate-300 hover:text-white"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&entity=${entityFilter}&adminId=${adminIdFilter}&subAdminOnly=${isSubAdminOnly}&page=${page + 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#22C55E] text-[#0F172A] hover:bg-[#1ea34d]"
                >
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
