import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportUsersCsv } from "@/app/actions/analytics.actions";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { UserFilterBar } from "@/components/admin/UserFilterBar";
import { CreateUserModal } from "@/components/admin/CreateUserModal";

export const dynamic = "force-dynamic";
export const metadata = { title: "User Management — Admin" };

const ROLE_COLOR: Record<string, { bg: string; text: string; border: string; avatarGrad: string }> = {
  PARENT: {
    bg: "bg-blue-100",
    text: "text-blue-950",
    border: "border-blue-300",
    avatarGrad: "bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-xs border border-blue-400/40",
  },
  TUTOR: {
    bg: "bg-purple-100",
    text: "text-purple-950",
    border: "border-purple-300",
    avatarGrad: "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs border border-purple-400/40",
  },
  SUPER_ADMIN: {
    bg: "bg-emerald-100",
    text: "text-emerald-950",
    border: "border-emerald-300",
    avatarGrad: "bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-xs border border-emerald-400/40",
  },
  SUB_ADMIN: {
    bg: "bg-amber-100",
    text: "text-amber-950",
    border: "border-amber-300",
    avatarGrad: "bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xs border border-amber-400/40",
  },
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
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">User Management</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Account &amp; Role Directory
          </h1>
          <p className="text-xs text-slate-600 font-600">
            {total.toLocaleString("en-IN")} total parents, tutors, and sub-admin staff
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-emerald-50 border border-emerald-200 text-[#2D9E6B] font-800 text-sm">
            <Users size={16} />
            <span>{total} Total Users</span>
          </div>
          <CreateUserModal />
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
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["User", "Role", "KYC", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-xs font-800 uppercase tracking-wider text-slate-900"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-700 text-slate-700">
                    No users match your query
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleStyle = ROLE_COLOR[u.role] ?? {
                    bg: "bg-slate-100",
                    text: "text-slate-900",
                    border: "border-slate-300",
                    avatarGrad: "bg-gradient-to-tr from-slate-600 to-slate-800 text-white",
                  };
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          {/* Vibrant Gradient Avatar Pill */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-800 text-xs ${roleStyle.avatarGrad}`}
                          >
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-800 text-[#0F2540] text-sm">{u.name || "—"}</p>
                            <p className="truncate text-xs font-600 text-slate-600">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-800 border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.tutorProfile ? (
                          <span
                            className={`flex items-center gap-1.5 text-xs font-800 ${
                              u.tutorProfile.kycStatus === "APPROVED"
                                ? "text-emerald-700"
                                : u.tutorProfile.kycStatus === "PENDING"
                                  ? "text-amber-700"
                                  : "text-red-700"
                            }`}
                          >
                            {u.tutorProfile.kycStatus === "APPROVED" ? (
                              <ShieldCheck size={14} className="text-emerald-600" />
                            ) : (
                              <ShieldOff size={14} />
                            )}
                            {u.tutorProfile.kycStatus}
                          </span>
                        ) : (
                          <span className="text-xs font-600 text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-800 border ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                              : "bg-red-100 text-red-950 border-red-300"
                          }`}
                        >
                          {u.isActive ? <UserCheck size={13} /> : <UserX size={13} />}
                          {u.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-700 text-slate-700">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
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
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-700 text-slate-700">
            <p>
              Page {page} of {totalPages} · {total} users
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/users?q=${encodeURIComponent(q)}&role=${roleFilter}&status=${statusFilter}&page=${page - 1}`}
                  className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-slate-900 font-800 hover:bg-slate-100"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?q=${encodeURIComponent(q)}&role=${roleFilter}&status=${statusFilter}&page=${page + 1}`}
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
