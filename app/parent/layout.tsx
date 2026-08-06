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

  const userName = session.user.name || session.user.email || "Parent";
  const userEmail = session.user.email || "";

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      {/* Top Navbar */}
      <header className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
        <nav className="neu-card flex items-center justify-between gap-2 sm:gap-4 bg-white px-3.5 py-3 sm:px-6 sm:py-3.5">
          {/* Left: Logo Brand (Logo + Wordmark on desktop, Icon only on mobile) */}
          <div className="shrink-0">
            <LogoBrand size={32} href="/parent/dashboard" hideWordmarkOnMobile={true} />
          </div>

          {/* Center: Parent Nav Links (Desktop md+ / Mobile Drawer Trigger) */}
          <div className="flex-1 flex items-center justify-end md:justify-center">
            <ParentNav userName={userName} userEmail={userEmail} />
          </div>

          {/* Right: Actions Container */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell */}
            <NotificationBell initialCount={unreadCount} />

            {/* User Badge (desktop xl+ only to prevent header crowding) */}
            <div className="neu-badge hidden items-center gap-1.5 bg-[#E0F2FE] text-[#0F172A] xl:inline-flex">
              <User size={14} />
              <span className="max-w-[100px] truncate">{userName}</span>
              <span className="rounded-full bg-[#0F172A] px-1.5 py-0.5 text-[10px] uppercase text-white">
                PARENT
              </span>
            </div>

            {/* Sign Out Button (desktop md+ only) */}
            <div className="hidden md:block">
              <SignOutButton />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
