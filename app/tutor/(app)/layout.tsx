import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlertCircle, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TutorNavClient } from "@/components/tutor/TutorNavClient";
import { NotificationBell } from "@/components/NotificationBell";
import { WhatsAppHelpLink } from "@/components/support/WhatsAppHelpLink";

export default async function TutorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [tutorProfile, unreadMessages, unreadNotifications] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        kycStatus: true,
        kycRejectionNote: true,
        onboardingStep: true,
        wallet: { select: { balance: true } },
      },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderUserId: { not: session.user.id },
        conversation: { tutorProfile: { userId: session.user.id } },
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  // If tutor hasn't completed onboarding, redirect to /tutor/onboarding
  if (tutorProfile && tutorProfile.onboardingStep < 7) {
    redirect("/tutor/onboarding");
  }

  const kycStatus = tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const walletBalance = tutorProfile?.wallet?.balance ?? 0;
  const userName = session.user.name || session.user.email || "Tutor";
  const userEmail = session.user.email || "";

  // KYC banner config
  type BannerKey = "NOT_SUBMITTED" | "PENDING" | "REJECTED" | "APPROVED";
  const kycBanners: Record<BannerKey, {
    show: boolean;
    bg: string;
    borderColor: string;
    icon: React.ElementType;
    iconColor: string;
    message: string;
    cta: string | null;
  }> = {
    NOT_SUBMITTED: {
      show: true,
      bg: "#FFFBEB",
      borderColor: "#FDE68A",
      icon: ShieldAlert,
      iconColor: "#D97706",
      message: "Complete your identity verification to start receiving student enquiries.",
      cta: "Complete Verification →",
    },
    PENDING: {
      show: true,
      bg: "#EFF6FF",
      borderColor: "#BFDBFE",
      icon: ShieldCheck,
      iconColor: "#2563EB",
      message: "Your documents are being reviewed by our team. Usually approved within 24 hours.",
      cta: null,
    },
    REJECTED: {
      show: true,
      bg: "#FEF2F2",
      borderColor: "#FECACA",
      icon: AlertCircle,
      iconColor: "#DC2626",
      message: tutorProfile?.kycRejectionNote
        ? `Verification rejected: ${tutorProfile.kycRejectionNote}. Please re-upload corrected documents.`
        : "Your verification was rejected. Please re-upload corrected documents.",
      cta: "Re-submit Documents →",
    },
    APPROVED: { show: false, bg: "", borderColor: "", icon: ShieldCheck, iconColor: "", message: "", cta: null },
  };

  const banner = kycBanners[kycStatus as BannerKey] ?? kycBanners.NOT_SUBMITTED;

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4F8]">
      {/* Top sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-[0_2px_12px_rgba(15,37,64,0.05)] overflow-x-clip">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <LogoBrand href="/tutor/dashboard" />
          </div>

          <TutorNavClient
            userName={userName}
            userEmail={userEmail}
            walletBalance={walletBalance}
            unreadCount={unreadMessages}
          />

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <NotificationBell initialCount={unreadNotifications} viewerRole="TUTOR" />
            <WhatsAppHelpLink
              role="TUTOR"
              compact
              className="hidden lg:inline-flex items-center min-h-11 text-sm font-700 text-[#2D9E6B] hover:text-[#238357]"
            />
            <div className="hidden lg:block">
              <SignOutButton variant="link" />
            </div>
          </div>
        </div>
      </header>

      {/* KYC Alert Banner */}
      {banner.show && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-3">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xs transition-all"
            style={{
              backgroundColor: banner.bg,
              borderColor: banner.borderColor,
            }}
          >
            <div className="flex items-center gap-2.5">
              <banner.icon
                size={18}
                style={{ color: banner.iconColor, flexShrink: 0 }}
              />
              <p className="text-xs sm:text-sm font-500 text-gray-800 leading-snug">{banner.message}</p>
            </div>
            {banner.cta && (
              <Link
                href="/tutor/profile"
                className="px-3.5 py-1.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-700 shrink-0 self-start sm:self-auto transition-colors shadow-2xs flex items-center gap-1"
              >
                <span>{banner.cta}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 pb-24 xl:pb-8 min-w-0">
        {children}
      </main>
    </div>
  );
}
