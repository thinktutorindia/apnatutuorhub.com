import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronRight,
} from "lucide-react";
import {
  suspendUserAction,
  reactivateUserAction,
  adminResetUserPasswordAction,
  adminDeleteUserAction,
} from "@/app/actions/admin.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportUsersCsv } from "@/app/actions/analytics.actions";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { UserFilterBar } from "@/components/admin/UserFilterBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "User Management — Admin" };

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  PARENT: { bg: "rgba(59,130,246,0.12)", text: "#3B82F6" },
  TUTOR: { bg: "rgba(139,92,246,0.12)", text: "#8B5CF6" },
  SUPER_ADMIN: { bg: "rgba(34,197,94,0.12)", text: "#22C55E" },
  SUB_ADMIN: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const roleFilter = params.role ?? "";
  const statusFilter = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const where = {
    AND: [
      q
        ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
        : {},
      roleFilter ? { role: roleFilter as "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN" } : {},
      statusFilter === "ACTIVE"
        ? { isActive: true }
        : statusFilter === "SUSPENDED"
          ? { isActive: false }
          : {},
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        tutorProfile: { select: { kycStatus: true, averageRating: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            User Management
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
            {total.toLocaleString()} total users
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
          >
            <Users size={14} style={{ color: "#22C55E" }} />
            <span className="text-sm font-semibold" style={{ color: "#22C55E" }}>{total}</span>
          </div>
          <ExportCsvButton label="Export CSV" action={exportUsersCsv} />
        </div>
      </div>

      {/* Filters */}
      <UserFilterBar
        initialQ={q}
        initialRole={roleFilter}
        initialStatus={statusFilter}
      />

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "#0F172A", border: "1px solid #1E293B" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E293B" }}>
                {["User", "Role", "KYC", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "#334155" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u, i) => {
                  const roleStyle = ROLE_COLOR[u.role] ?? { bg: "rgba(100,116,139,0.12)", text: "#64748B" };
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: i < users.length - 1 ? "1px solid #0F172A" : undefined }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                            style={{ background: roleStyle.bg, color: roleStyle.text }}
                          >
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{u.name || "—"}</p>
                            <p className="truncate text-xs" style={{ color: "#475569" }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: roleStyle.bg, color: roleStyle.text }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.tutorProfile ? (
                          <span
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{
                              color:
                                u.tutorProfile.kycStatus === "APPROVED"
                                  ? "#22C55E"
                                  : u.tutorProfile.kycStatus === "PENDING"
                                    ? "#F59E0B"
                                    : u.tutorProfile.kycStatus === "REJECTED"
                                      ? "#EF4444"
                                      : "#475569",
                            }}
                          >
                            {u.tutorProfile.kycStatus === "APPROVED" ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <ShieldOff size={12} />
                            )}
                            {u.tutorProfile.kycStatus}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#334155" }}>N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            background: u.isActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            color: u.isActive ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {u.isActive ? <UserCheck size={10} /> : <UserX size={10} />}
                          {u.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5">
                        <UserRowActions user={u} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderTop: "1px solid #1E293B" }}
          >
            <p className="text-xs" style={{ color: "#475569" }}>
              Page {page} of {totalPages} · {total} users
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/users?q=${encodeURIComponent(q)}&role=${roleFilter}&status=${statusFilter}&page=${page - 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "#1E293B", color: "#94A3B8" }}
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?q=${encodeURIComponent(q)}&role=${roleFilter}&status=${statusFilter}&page=${page + 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "#22C55E", color: "#0F172A" }}
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
