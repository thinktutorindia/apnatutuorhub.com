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
  MapPin,
  Phone,
  Lock,
} from "lucide-react";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportUsersCsv } from "@/app/actions/analytics.actions";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { UserFilterBar } from "@/components/admin/UserFilterBar";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";
import { resolveDocViewUrl } from "@/lib/s3";
import { AdminBulkUserTopupControl } from "@/components/admin/AdminBulkUserTopupControl";
import { maskPhoneNumber } from "@/lib/mask-utils";
import { can } from "@/lib/rbac";
import { UserEntrySource } from "@/components/admin/UserEntrySource";

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
    bg: "bg-[#E8F7F0]",
    text: "text-[#0F2540]",
    border: "border-emerald-300",
    avatarGrad: "bg-[#0F2540] text-white shadow-xs border border-[#1A3C5E]",
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
  searchParams: Promise<{ q?: string; role?: string; status?: string; emailType?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const roleFilter = params.role ?? "";
  const statusFilter = params.status ?? "";
  const emailTypeFilter = params.emailType ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const where: any = {};
  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (roleFilter) {
    andConditions.push({ role: roleFilter as "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN" });
  }
  if (statusFilter === "ACTIVE") {
    andConditions.push({ isActive: true });
  } else if (statusFilter === "SUSPENDED") {
    andConditions.push({ isActive: false });
  }

  // ── Genuine / Auto-assigned Email Filter ──
  if (emailTypeFilter === "GENUINE") {
    andConditions.push({
      AND: [
        { email: { not: { endsWith: "@apnatutorhub.com" } } },
        { email: { not: { contains: "apnatutorhub.com" } } },
      ],
    });
  } else if (emailTypeFilter === "AUTO_GENERATED") {
    andConditions.push({
      OR: [
        { email: { endsWith: "@apnatutorhub.com" } },
        { email: { contains: "apnatutorhub.com" } },
      ],
    });
  } else if (emailTypeFilter === "VERIFIED") {
    andConditions.push({
      emailVerified: { not: null },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [users, total, genuineTotal, genuineParentsTotal, genuineTutorsTotal] = await Promise.all([
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
        image: true,
        tutorProfile: {
          select: {
            id: true,
            kycStatus: true,
            averageRating: true,
            canTopup: true,
            marketingNotifsEnabled: true,
            subjects: true,
            city: true,
            address: true,
            pincode: true,
          },
        },
        parentProfile: {
          select: {
            id: true,
            city: true,
            address: true,
            pincode: true,
            students: {
              select: {
                subjects: true,
                classLevel: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        AND: [
          { email: { not: { endsWith: "@apnatutorhub.com" } } },
          { email: { not: { contains: "apnatutorhub.com" } } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        role: "PARENT",
        AND: [
          { email: { not: { endsWith: "@apnatutorhub.com" } } },
          { email: { not: { contains: "apnatutorhub.com" } } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        role: "TUTOR",
        AND: [
          { email: { not: { endsWith: "@apnatutorhub.com" } } },
          { email: { not: { contains: "apnatutorhub.com" } } },
        ],
      },
    }),
  ]);

  const resolvedUsers = await Promise.all(
    users.map(async (u) => ({
      ...u,
      image: await resolveDocViewUrl(u.image),
    }))
  );

  // ── Resolve Staff Creator / Sub-Admin Attribution ──
  const userIds = users.map((u) => u.id);

  const [auditLogs, adminNotes] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityId: { in: userIds },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminNote.findMany({
      where: {
        targetUserId: { in: userIds },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const adminIds = Array.from(new Set(auditLogs.map((l) => l.adminId)));
  const adminUsers = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, name: true, email: true, role: true, subAdminRole: true },
  });
  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));

  const userAttributionMap = new Map<
    string,
    {
      createdBy?: { name: string; role: string; email: string };
      lastEditedBy?: { name: string; role: string; email: string; action: string };
    }
  >();

  for (const log of auditLogs) {
    const targetUserId = log.entityId;
    if (!targetUserId) continue;

    const existing = userAttributionMap.get(targetUserId) || {};
    const admin = adminMap.get(log.adminId);

    if (admin) {
      const adminRoleLabel =
        admin.role === "SUPER_ADMIN"
          ? "Super Admin"
          : admin.subAdminRole
          ? `Sub-Admin (${admin.subAdminRole})`
          : "Sub-Admin";

      const staffInfo = {
        name: admin.name || admin.email.split("@")[0],
        role: adminRoleLabel,
        email: admin.email,
      };

      if (
        !existing.createdBy &&
        (log.action === "CREATE_USER" || log.action === "ADMIN_CREATE_USER" || log.action === "CREATE_SUB_ADMIN")
      ) {
        existing.createdBy = staffInfo;
      } else if (
        !existing.lastEditedBy &&
        (log.action.includes("EDIT") ||
          log.action.includes("UPDATE") ||
          log.action.includes("KYC") ||
          log.action.includes("SUSPEND"))
      ) {
        existing.lastEditedBy = { ...staffInfo, action: log.action.replace(/_/g, " ") };
      }
    }

    userAttributionMap.set(targetUserId, existing);
  }

  // Fallback check from admin notes author if createdBy wasn't in auditLog
  for (const note of adminNotes) {
    const existing = userAttributionMap.get(note.targetUserId) || {};
    if (!existing.createdBy && note.authorName) {
      existing.createdBy = {
        name: note.authorName,
        role: "Staff Member",
        email: "",
      };
      userAttributionMap.set(note.targetUserId, existing);
    }
  }

  const totalPages = Math.ceil(total / take);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Command Center</span>
            <span className="text-[11px] font-700 text-emerald-800 bg-[#E8F7F0] px-2.5 py-0.5 rounded-full">
              {genuineTotal} genuine emails · {genuineParentsTotal} parents · {genuineTutorsTotal} tutors
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            User Directory
          </h1>
          <p className="text-xs text-slate-600 font-600">
            {total.toLocaleString("en-IN")} parents, tutors, and staff matching filters
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 bg-[#E8F7F0] text-[#166534] font-800 text-xs">
            <Users size={14} />
            {total.toLocaleString("en-IN")} matching
          </span>
          <CreateUserModal
            defaultQuery={q}
            buttonClassName="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-800 !text-white bg-[#2D9E6B] hover:bg-[#238357]"
          />
          {isSuperAdmin && <ExportCsvButton label="Export CSV" action={exportUsersCsv} />}
        </div>
      </div>

      {/* Filters */}
      <UserFilterBar
        initialQ={q}
        initialRole={roleFilter}
        initialStatus={statusFilter}
        initialEmailType={emailTypeFilter}
      />

      {/* Main User Directory Table */}
      <div className="overflow-hidden ath-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200">
                {["User", "Entered via", "Role", "KYC", "Location", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3.5 text-left text-[11px] font-800 uppercase tracking-wider text-[#64748B] ${
                      h === "Actions" ? "sticky right-0 bg-[#F8FAFC]" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {resolvedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 px-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-[#2D9E6B] flex items-center justify-center border border-emerald-200 shadow-xs">
                        <Users size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#0F2540] font-bold text-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {q ? `No user found matching "${q}"` : "No users match your filter criteria"}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {q
                            ? `This email, phone, or name is not registered in our database yet. You can create a new account for them instantly with pre-filled details.`
                            : `Try switching to "All Email Types" or adjusting your search keywords.`}
                        </p>
                      </div>
                      {q && (
                        <div className="pt-2">
                          <CreateUserModal
                            defaultQuery={q}
                            buttonText={`+ Create Account with "${q}"`}
                            buttonClassName="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] shadow-md hover:shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                resolvedUsers.map((u) => {
                  const roleStyle = ROLE_COLOR[u.role] ?? {
                    bg: "bg-slate-100",
                    text: "text-slate-900",
                    border: "border-slate-300",
                    avatarGrad: "bg-gradient-to-tr from-slate-600 to-slate-800 text-white",
                  };

                  const isGenuineEmail = !u.email.toLowerCase().includes("apnatutorhub.com");

                  const locationText = u.tutorProfile?.city
                    ? [u.tutorProfile.address, u.tutorProfile.city, u.tutorProfile.pincode].filter(Boolean).join(", ")
                    : u.parentProfile?.city
                    ? [u.parentProfile.address, u.parentProfile.city, u.parentProfile.pincode].filter(Boolean).join(", ")
                    : null;

                  const subjectsList: string[] =
                    u.tutorProfile?.subjects && u.tutorProfile.subjects.length > 0
                      ? u.tutorProfile.subjects
                      : u.parentProfile?.students && u.parentProfile.students.length > 0
                      ? Array.from(new Set(u.parentProfile.students.flatMap((sp: { subjects: string[] }) => sp.subjects || [])))
                      : [];

                  const attribution = userAttributionMap.get(u.id);
                  const createdBy = attribution?.createdBy;
                  const lastEditedBy = attribution?.lastEditedBy;

                  return (
                    <tr
                      key={u.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <UserAvatar
                            image={u.image}
                            name={u.name}
                            email={u.email}
                            avatarGrad={roleStyle.avatarGrad}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-800 text-[#0F2540] text-sm">{u.name || "—"}</p>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="truncate text-xs font-600 text-slate-600">{u.email}</p>
                              {isGenuineEmail ? (
                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-800 bg-[#E8F7F0] text-[#166534]">
                                  Genuine
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-700 bg-slate-100 text-slate-600">
                                  Auto email
                                </span>
                              )}
                            </div>
                            {u.phone ? (
                              isSuperAdmin ? (
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-700 text-[#0F2540]">
                                  <Phone size={10} />
                                  {u.phone}
                                </p>
                              ) : (
                                <p
                                  className="mt-0.5 flex items-center gap-1 text-[11px] font-700 text-slate-500"
                                  title="Phone number masked for staff. Full number visible to Super Admin."
                                >
                                  <Lock size={10} className="text-amber-500 shrink-0" />
                                  {maskPhoneNumber(u.phone)}
                                </p>
                              )
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <UserEntrySource
                          isGenuineEmail={isGenuineEmail}
                          createdBy={createdBy}
                          lastEditedBy={lastEditedBy}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-800 border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
                        <div className="space-y-1 max-w-[200px]">
                          {locationText ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 truncate" title={locationText}>
                              <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
                              <span className="truncate">{locationText}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                              <MapPin size={12} className="text-slate-300" />
                              <span>Location not set</span>
                            </div>
                          )}

                          <UserSubjectChips subjects={subjectsList} maxVisible={2} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <p className="font-800 text-[#0F2540]">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </td>
                      <td className="sticky right-0 bg-white px-4 py-4 group-hover:bg-slate-50">
                        <UserRowActions user={u} isSuperAdmin={isSuperAdmin} />
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-700 text-slate-700">
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

      {/* Bulk Governance & Top-Up Control Panel (Bottom Collapsible) */}
      <AdminBulkUserTopupControl canGrantCoins={can(session.user, "wallets:manage")} />
    </div>
  );
}
