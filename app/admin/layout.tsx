import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/");
  }

  // Fetch live sub-admin permissions directly from DB so updates reflect in real-time
  let customPermissions = session.user.customPermissions ?? null;
  let subAdminRole = session.user.subAdminRole ?? null;

  if (session.user.role === "SUB_ADMIN" && session.user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subAdminRole: true, customPermissions: true, isActive: true },
    });
    if (dbUser) {
      if (!dbUser.isActive) redirect("/login");
      customPermissions = dbUser.customPermissions;
      subAdminRole = dbUser.subAdminRole;
    }
  }

  return (
    <div className="flex min-h-screen lg:min-h-screen flex-col lg:flex-row bg-[#F8FAFC] text-slate-900">
      <AdminSidebar
        userName={session.user.name || "Admin"}
        userEmail={session.user.email ?? ""}
        userRole={session.user.role}
        subAdminRole={subAdminRole}
        customPermissions={customPermissions}
      />

      {/* Main scrollable area — account for sticky topbar height (56px) on mobile */}
      <div className="flex flex-1 flex-col lg:ml-[260px] min-w-0 bg-[#F8FAFC] min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
