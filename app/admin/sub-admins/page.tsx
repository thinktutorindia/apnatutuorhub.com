import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubAdminManagement } from "@/components/admin/SubAdminManagement";

export const metadata = {
  title: "Sub-Admin Management | ApnaTutorHub Admin",
};

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  SUPPORT: { label: "Support", color: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
  VERIFICATION: { label: "Verification", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  FINANCE: { label: "Finance", color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  OPERATIONS: { label: "Operations", color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
  MARKETING: { label: "Marketing", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
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
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}
          >
            Sub-Admin Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Create and manage staff accounts with department-level access control.
          </p>
        </div>
      </div>

      {/* Department Key */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(ROLE_BADGES).map(([role, badge]) => (
          <span
            key={role}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ color: badge.color, background: badge.bg }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: badge.color }}
            />
            {badge.label}
          </span>
        ))}
      </div>

      {/* Client component for interactive create/manage */}
      <SubAdminManagement
        initialSubAdmins={subAdmins.map((u) => ({
          ...u,
          subAdminRole: u.subAdminRole ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
        roleBadges={ROLE_BADGES}
      />
    </div>
  );
}
