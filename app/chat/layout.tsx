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

  const [dbUser, unreadNotifications, unreadMessages] = await Promise.all([
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
    prisma.message.count({
      where: {
        isRead: false,
        senderUserId: { not: session.user.id },
        OR: [
          { conversation: { parentProfile: { userId: session.user.id } } },
          { conversation: { tutorProfile: { userId: session.user.id } } },
        ],
      },
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
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs overflow-x-clip">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <LogoBrand href={isTutor ? "/tutor/dashboard" : "/parent/dashboard"} />
          </div>

          {isTutor ? (
            <TutorNavClient
              userName={userName}
              userEmail={userEmail}
              walletBalance={walletBalance}
              unreadCount={unreadMessages}
            />
          ) : (
            <ParentNavClient
              userName={userName}
              userEmail={userEmail}
              unreadCount={unreadMessages}
            />
          )}

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <NotificationBell initialCount={unreadNotifications} viewerRole={isTutor ? "TUTOR" : "PARENT"} />
            <div className="hidden lg:block">
              <SignOutButton variant="link" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 pb-24 xl:pb-12 min-w-0">
        {children}
      </main>
    </div>
  );
}
