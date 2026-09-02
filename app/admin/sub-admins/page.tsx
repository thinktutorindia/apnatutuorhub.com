import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubAdminManagement } from "@/components/admin/SubAdminManagement";

export const metadata = {
  title: "Sub-Admin Management | ApnaTutorHub Admin",
};
export const dynamic = "force-dynamic";

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  SUPPORT: { label: "Support", color: "#0284C7", bg: "bg-sky-100 text-sky-950 border-sky-300" },
  VERIFICATION: { label: "Verification", color: "#2D9E6B", bg: "bg-[#E8F7F0] text-[#0F2540] border-emerald-300" },
  FINANCE: { label: "Finance", color: "#16A34A", bg: "bg-emerald-100 text-emerald-950 border-emerald-300" },
  OPERATIONS: { label: "Operations", color: "#EA580C", bg: "bg-orange-100 text-orange-950 border-orange-300" },
  MARKETING: { label: "Marketing", color: "#DB2777", bg: "bg-pink-100 text-pink-950 border-pink-300" },
};

export default async function SubAdminsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      subAdminRole: true,
      customPermissions: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Operations</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Team &amp; Roles
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Staff accounts and custom feature access
          </p>
        </div>
      </div>

      {/* Department Key */}
      <div className="flex flex-wrap gap-2.5">
        {Object.entries(ROLE_BADGES).map(([role, badge]) => (
          <span
            key={role}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-800 border ${badge.bg}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {badge.label}
          </span>
        ))}
      </div>

      {/* Client component for interactive create/manage */}
      <SubAdminManagement
        initialSubAdmins={subAdmins.map((u) => ({
          ...u,
          subAdminRole: u.subAdminRole ?? null,
          customPermissions: u.customPermissions ?? [],
          createdAt: u.createdAt.toISOString(),
        }))}
        roleBadges={ROLE_BADGES}
      />
    </div>
  );
}
