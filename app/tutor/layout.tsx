import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { User, ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TutorNav } from "@/components/tutor/TutorNav";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      kycStatus: true,
      kycRejectionNote: true,
      wallet: { select: { balance: true } },
    },
  });

  const kycStatus = tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const walletBalance = tutorProfile?.wallet?.balance ?? 0;

  const kycBannerConfig = {
    NOT_SUBMITTED: {
      show: true,
      bg: "#FFEDD5",
      icon: ShieldAlert,
      iconColor: "text-orange-500",
      message:
        "Complete KYC verification to unlock leads and earn the Verified Tutor badge (+500 ranking points).",
      cta: "Start KYC →",
    },
    PENDING: {
      show: true,
      bg: "#E0F2FE",
      icon: ShieldCheck,
      iconColor: "text-blue-500",
      message: "Your KYC documents are under review. We'll notify you once approved (usually within 24 hours).",
      cta: null,
    },
    REJECTED: {
      show: true,
      bg: "#FCE7F3",
      icon: AlertCircle,
      iconColor: "text-red-500",
      message: tutorProfile?.kycRejectionNote
        ? `KYC rejected: ${tutorProfile.kycRejectionNote}. Please re-upload corrected documents.`
        : "Your KYC was rejected. Please re-upload your documents.",
      cta: "Re-submit KYC →",
    },
    APPROVED: { show: false, bg: "", icon: ShieldCheck, iconColor: "", message: "", cta: null },
  } as const;

  const banner = kycBannerConfig[kycStatus as keyof typeof kycBannerConfig] ?? kycBannerConfig.NOT_SUBMITTED;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      {/* Navbar */}
      <header className="mx-auto w-full max-w-6xl px-4 pt-4">
        <nav className="neu-card flex items-center justify-between gap-4 bg-white px-6 py-3.5">
          <LogoBrand size={32} href="/tutor/dashboard" />

          <TutorNav />

          <div className="flex items-center gap-3">
            <div className="neu-badge hidden items-center gap-1.5 bg-[#FEF3C7] text-[#0F172A] sm:inline-flex">
              <User size={14} />
              <span className="max-w-[120px] truncate">{session.user.name || session.user.email}</span>
              <span className="rounded-full bg-[#0F172A] px-1.5 py-0.5 text-[10px] uppercase text-white">
                {walletBalance} 🪙
              </span>
            </div>
            <SignOutButton />
          </div>
        </nav>
      </header>

      {/* KYC Status Banner */}
      {banner.show && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <div
            className="neu-card flex items-center justify-between gap-4 px-5 py-3"
            style={{ backgroundColor: banner.bg }}
          >
            <div className="flex items-center gap-3">
              <banner.icon size={18} className={`shrink-0 ${banner.iconColor}`} />
              <p className="text-xs font-bold text-slate-700">{banner.message}</p>
            </div>
            {banner.cta && (
              <Link
                href="/tutor/profile"
                className="neu-btn neu-btn-primary shrink-0 px-4 py-2 text-[11px]"
              >
                {banner.cta}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
