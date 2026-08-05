import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ParentNav } from "@/components/parent/ParentNav";

import { NotificationBell } from "@/components/NotificationBell";
import { prisma } from "@/lib/prisma";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      {/* Navbar */}
      <header className="mx-auto w-full max-w-6xl px-4 pt-4">
        <nav className="neu-card flex items-center justify-between gap-4 bg-white px-6 py-3.5">
          <LogoBrand size={32} href="/parent/dashboard" />

          <ParentNav />

          <div className="flex items-center gap-3">
            <NotificationBell initialCount={unreadCount} />
            <div className="neu-badge hidden items-center gap-1.5 bg-[#E0F2FE] text-[#0F172A] sm:inline-flex">
              <User size={14} />
              <span>{session.user.name || session.user.email}</span>
              <span className="rounded-full bg-[#0F172A] px-1.5 py-0.5 text-[10px] uppercase text-white">
                PARENT
              </span>
            </div>
            <SignOutButton />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
