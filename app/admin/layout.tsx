import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#F8FAFC] text-slate-900">
      <AdminSidebar
        userName={session.user.name || session.user.email || "Admin"}
        userRole={session.user.role}
        subAdminRole={session.user.subAdminRole ?? null}
      />

      {/* Main scrollable area */}
      <div className="flex flex-1 flex-col lg:ml-[260px] min-w-0 bg-[#F8FAFC]">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
