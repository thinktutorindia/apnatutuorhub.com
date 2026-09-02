import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StaffGlobalShiftBar } from "@/components/admin/StaffGlobalShiftBar";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/s3";

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

  const [staffUser, unreadNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subAdminRole: true, customPermissions: true, isActive: true, image: true },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  if (session.user.role === "SUB_ADMIN" && staffUser) {
    if (!staffUser.isActive) redirect("/login");
    customPermissions = staffUser.customPermissions;
    subAdminRole = staffUser.subAdminRole;
  }

  return (
    <div className="flex min-h-screen lg:min-h-screen flex-col lg:flex-row bg-[#F0F4F8] text-slate-900">
      <AdminSidebar
        userName={session.user.name || "Admin"}
        userEmail={session.user.email ?? ""}
        userRole={session.user.role}
        subAdminRole={subAdminRole}
        customPermissions={customPermissions}
        kycPendingCount={await prisma.tutorProfile.count({ where: { kycStatus: "PENDING" } })}
      />

      {/* Main scrollable area */}
      <div className="flex flex-1 flex-col lg:ml-[260px] min-w-0 bg-[#F0F4F8] min-h-screen">
        {/* Persistent Global Shift & Presence Header Bar */}
        <StaffGlobalShiftBar
          userRole={session.user.role}
          userName={session.user.name ?? session.user.email ?? "Staff"}
          userImage={getMediaUrl(staffUser?.image)}
          unreadCount={unreadNotifications}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 min-w-0 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
