import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlertCircle, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TutorNavClient } from "@/components/tutor/TutorNavClient";
import { NotificationBell } from "@/components/NotificationBell";
import { WhatsAppHelpLink } from "@/components/support/WhatsAppHelpLink";
import { QuickProfileUpdateModal } from "@/components/tutor/QuickProfileUpdateModal";

import { SeniorTutorProvider } from "@/components/tutor/SeniorTutorContext";
import { SeniorTutorShell } from "@/components/tutor/SeniorTutorShell";

export default async function TutorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });

  if (!dbUser?.phone || dbUser.phone.trim().length < 10) {
    redirect("/complete-phone");
  }

  const [tutorProfile, unreadMessages, unreadNotifications] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        kycStatus: true,
        kycRejectionNote: true,
        onboardingStep: true,
        city: true,
        address: true,
        subjects: true,
        classLevels: true,
        teachingMode: true,
        teachingRadius: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
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

  // If tutor hasn't completed onboarding, redirect unless they already have core profile configured
  if (tutorProfile && tutorProfile.onboardingStep < 7) {
    if (tutorProfile.city && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: { onboardingStep: 7 },
      }).catch(() => { });
    } else {
      redirect("/tutor/onboarding");
    }
  }

  const kycStatus = tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const walletBalance = tutorProfile?.wallet?.balance ?? 0;
  const userName = session.user.name || session.user.email || "Tutor";
  const userEmail = session.user.email || "";

  const isSubscriptionActive = Boolean(
    tutorProfile?.subscriptionPlan &&
    tutorProfile.subscriptionExpiresAt &&
    new Date(tutorProfile.subscriptionExpiresAt) > new Date()
  );
  const subscriptionPlan = isSubscriptionActive ? tutorProfile?.subscriptionPlan : null;

  // KYC banner is only shown in layout if rejected and requires correction
  const showKycRejectedBanner = kycStatus === "REJECTED";

  const tutorInitialArea = tutorProfile?.address
    ? tutorProfile.address
    : tutorProfile?.city
      ? `${tutorProfile.city}, Delhi NCR`
      : "Sangam Vihar, Delhi";

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("ath_senior_lang")?.value;
  const initialLang = cookieLang === "hi" ? "hi" : "en";

  return (
    <SeniorTutorProvider
      initialArea={tutorInitialArea}
      initialRadius={tutorProfile?.teachingRadius ?? 5}
      initialLang={initialLang}
    >
      <SeniorTutorShell
        userName={userName}
        userEmail={userEmail}
        walletBalance={walletBalance}
        unreadMessagesCount={unreadMessages}
        unreadNotificationsCount={unreadNotifications}
        subscriptionPlan={subscriptionPlan}
        isSubscriptionActive={isSubscriptionActive}
        kycStatus={kycStatus}
      >
        {/* KYC Alert Banner - Only if Rejected */}
        {showKycRejectedBanner && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl border-2 border-red-300 bg-red-50 text-red-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={20} className="text-red-600 shrink-0" />
                <p className="text-xs sm:text-sm font-bold">
                  {tutorProfile?.kycRejectionNote
                    ? `Verification rejected: ${tutorProfile.kycRejectionNote}. Please re-upload corrected documents.`
                    : "Your verification was rejected. Please re-upload corrected documents."}
                </p>
              </div>
              <Link
                href="/tutor/profile"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shrink-0 self-start sm:self-auto transition-colors shadow-xs"
              >
                Re-submit Documents →
              </Link>
            </div>
          </div>
        )}

        {children}
      </SeniorTutorShell>
    </SeniorTutorProvider>
  );
}
