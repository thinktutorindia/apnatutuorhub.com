import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ParentNavClient } from "@/components/parent/ParentNavClient";
import { NotificationBell } from "@/components/NotificationBell";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/s3";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });

  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderUserId: { not: session.user.id },
        conversation: { parentProfile: { userId: session.user.id } },
      },
    }),
  ]);

  const userName = user?.name || session.user.name || session.user.email || "Parent";
  const userEmail = user?.email || session.user.email || "";
  const userImage = getMediaUrl(user?.image || session.user.image);

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4F8] text-slate-900 font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-[0_2px_12px_rgba(15,37,64,0.05)] overflow-x-clip">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <LogoBrand href="/parent/dashboard" />
          </div>

          <ParentNavClient
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            unreadCount={unreadMessages}
          />

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href={getWhatsAppSupportLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center min-h-11 text-sm font-700 text-[#2D9E6B] hover:text-[#238357] whitespace-nowrap"
            >
              Helpline {SUPPORT_PHONE_DISPLAY}
            </a>
            <NotificationBell initialCount={unreadNotifications} viewerRole="PARENT" />
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
