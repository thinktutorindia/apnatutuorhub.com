import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Activity, UserCheck } from "lucide-react";
import { AuditLogFilterBar } from "@/components/admin/AuditLogFilterBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sub-Admin & Audit Activity Logs — Admin" };

const ACTION_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  SUSPEND_USER: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
  REACTIVATE_USER: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300" },
  DELETE_USER: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
  ADMIN_RESET_PASSWORD: { bg: "bg-amber-100", text: "text-amber-950", border: "border-amber-300" },
  KYC_APPROVE: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300" },
  KYC_REJECT: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
  LEAD_FORCE_CLOSE: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
  LEAD_FORCE_EXPIRE: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  LEAD_FORCE_RADIUS_EXPAND: { bg: "bg-amber-100", text: "text-amber-950", border: "border-amber-300" },
  WALLET_ADMIN_CREDIT: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300" },
  WALLET_ADMIN_DEBIT: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
  SETTING_UPDATE: { bg: "bg-blue-100", text: "text-blue-950", border: "border-blue-300" },
};

const ENTITY_ICON: Record<string, string> = {
  User: "👤",
  TutorProfile: "🧑‍🏫",
  Lead: "📄",
  Wallet: "💰",
  PlatformSetting: "⚙️",
};

const SUB_ADMIN_ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  VERIFICATION: { bg: "bg-[#E8F7F0] border-emerald-300", text: "text-[#0F2540]", label: "Verification" },
  SUPPORT: { bg: "bg-[#E0F2FE] border-sky-300", text: "text-sky-950", label: "Support" },
  FINANCE: { bg: "bg-amber-100 border-amber-300", text: "text-amber-950", label: "Finance" },
  OPERATIONS: { bg: "bg-orange-100 border-orange-300", text: "text-orange-950", label: "Operations" },
  MARKETING: { bg: "bg-pink-100 border-pink-300", text: "text-pink-950", label: "Marketing" },
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
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F1FB] text-[#2563EB] shrink-0">
            <ClipboardList size={22} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Operations</span>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Audit Logs
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-600">
              Approvals, rejections, and settings changes by staff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[#FFF3DC] px-4 py-2">
            <UserCheck size={16} className="text-[#0F2540]" />
            <span className="text-xs font-800 text-[#0F2540]">
              {totalSubAdminLogs} staff actions
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
      <div className="overflow-hidden ath-panel">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <ClipboardList size={40} className="text-slate-400" />
            <p className="text-base font-800 text-[#0F2540]">No audit log entries match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.map((log) => {
              const color = ACTION_COLOR[log.action] ?? { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300" };
              const entityEmoji = ENTITY_ICON[log.entityType] ?? "🔧";
              const adminUser = adminMap.get(log.adminId);
              const isSubAdmin = adminUser?.role === "SUB_ADMIN";
              const subAdminBadge = isSubAdmin && adminUser.subAdminRole
                ? SUB_ADMIN_ROLE_BADGE[adminUser.subAdminRole]
                : null;

              return (
                <div
                  key={log.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB]">
                      <Activity size={18} />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-800 uppercase tracking-wider border ${color.bg} ${color.text} ${color.border}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>

                        <span className="text-xs font-800 text-slate-800">
                          {entityEmoji} {log.entityType}
                          {log.entityId && (
                            <span className="text-slate-500 font-normal ml-1">
                              (ID: {log.entityId.slice(0, 10)}…)
                            </span>
                          )}
                        </span>
                      </div>

                      {log.details && (
                        <p className="text-xs font-700 text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {log.details}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-600 font-600">
                        <span className="font-800 text-[#0F2540]">
                          By: {adminUser ? (adminUser.name || adminUser.email) : `ID: ${log.adminId.slice(0, 10)}`}
                        </span>

                        {isSubAdmin ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-800 uppercase tracking-wider border ${subAdminBadge?.bg} ${subAdminBadge?.text}`}>
                            Sub-Admin ({subAdminBadge?.label ?? adminUser?.subAdminRole})
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-800 uppercase tracking-wider">
                            Super Admin
                          </span>
                        )}

                        {log.ipAddress && (
                          <span className="text-slate-500 text-[10px]">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left md:text-right text-xs font-700 text-slate-700">
                    <p className="font-800 text-[#0F2540]">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                    <p className="text-[11px] text-slate-500 font-600">
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

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-700 text-slate-700">
            <p>Page {page} of {totalPages} · {total} audit records</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&entity=${entityFilter}&adminId=${adminIdFilter}&subAdminOnly=${isSubAdminOnly}&page=${page - 1}`}
                  className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-slate-900 font-800 hover:bg-slate-100"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&entity=${entityFilter}&adminId=${adminIdFilter}&subAdminOnly=${isSubAdminOnly}&page=${page + 1}`}
                  className="rounded-xl px-4 py-2 bg-[#2D9E6B] text-white font-800 hover:bg-[#238357]"
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
