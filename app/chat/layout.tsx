import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TutorNavClient } from "@/components/tutor/TutorNavClient";
import { ParentNavClient } from "@/components/parent/ParentNavClient";
import { NotificationBell } from "@/components/NotificationBell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [dbUser, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        tutorProfile: {
          select: {
            wallet: { select: { balance: true } },
          },
        },
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  const role = dbUser?.role ?? "PARENT";
  const isTutor = role === "TUTOR";
  const walletBalance = dbUser?.tutorProfile?.wallet?.balance ?? 0;
  const userName = session.user.name || session.user.email || "User";
  const userEmail = session.user.email || "";

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-18 flex items-center justify-between gap-3">
          <div className="shrink-0 flex items-center gap-2">
            <LogoBrand size={30} href={isTutor ? "/tutor/dashboard" : "/parent/dashboard"} hideWordmarkOnMobile={true} />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-800 uppercase tracking-wider">
              {isTutor ? "Tutor Portal" : "Parent Portal"}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-end md:justify-center">
            {isTutor ? (
              <TutorNavClient
                userName={userName}
                userEmail={userEmail}
                walletBalance={walletBalance}
                unreadCount={unreadCount}
              />
            ) : (
              <ParentNavClient
                userName={userName}
                userEmail={userEmail}
                unreadCount={unreadCount}
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell initialCount={unreadCount} />
            <div className="hidden md:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 md:pb-12">
        {children}
      </main>
    </div>
  );
}
