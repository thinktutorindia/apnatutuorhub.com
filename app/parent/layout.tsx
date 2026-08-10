import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ParentNavClient } from "@/components/parent/ParentNavClient";
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
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-18 flex items-center justify-between gap-3">
          <div className="shrink-0">
            <LogoBrand size={30} href="/parent/dashboard" hideWordmarkOnMobile={true} />
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-end md:justify-center">
            <ParentNavClient
              userName={userName}
              userEmail={userEmail}
              unreadCount={unreadCount}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell initialCount={unreadCount} />
            <div className="hidden md:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
        {children}
      </main>
    </div>
  );
}
