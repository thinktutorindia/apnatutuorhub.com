"use client";

import { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import { TutorProfileForm } from "@/components/tutor/TutorProfileForm";
import { KYCUploadModal } from "@/components/tutor/KYCUploadModal";
import type { ProfileScoreBreakdown } from "@/lib/profile-score";

type ProfileData = {
  id: string;
  bio: string;
  qualification: string;
  experience: string;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  teachingRadius: string;
  feeMin: string;
  feeMax: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  introVideoUrl: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  kycStatus: string;
  kycRejectionNote: string | null;
  kycIdProofUrl: string | null;
  kycAddressUrl: string | null;
  kycSelfieUrl: string | null;
  isVerified: boolean;
  profileScore: number;
};

const KYC_STATUS_CONFIG = {
  NOT_SUBMITTED: {
    bg: "#FFEDD5",
    icon: ShieldAlert,
    iconColor: "text-orange-500",
    badge: "Not submitted",
    badgeBg: "#FFEDD5",
    description:
      "Submit your Government ID, Address Proof, and a Live Selfie to unlock the Verified Tutor badge and gain access to parent contacts.",
    cta: "Start KYC Verification",
  },
  PENDING: {
    bg: "#E0F2FE",
    icon: Shield,
    iconColor: "text-blue-500",
    badge: "Under review",
    badgeBg: "#E0F2FE",
    description:
      "Your documents are being reviewed by our team. Approval typically takes up to 24 hours. You'll receive an email once approved.",
    cta: "Update Documents",
  },
  REJECTED: {
    bg: "#FCE7F3",
    icon: ShieldAlert,
    iconColor: "text-red-500",
    badge: "Rejected",
    badgeBg: "#FCE7F3",
    description: "",
    cta: "Re-submit KYC",
  },
  APPROVED: {
    bg: "#DCFCE7",
    icon: ShieldCheck,
    iconColor: "text-[#22C55E]",
    badge: "Verified ✅",
    badgeBg: "#DCFCE7",
    description: "Your KYC is approved. You can unlock parent contact details using coins.",
    cta: null,
  },
} as const;

export function TutorProfilePage({
  profile,
  scoreBreakdown,
}: {
  profile: ProfileData;
  scoreBreakdown: ProfileScoreBreakdown;
}) {
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const kycConfig =
    KYC_STATUS_CONFIG[profile.kycStatus as keyof typeof KYC_STATUS_CONFIG] ??
    KYC_STATUS_CONFIG.NOT_SUBMITTED;

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <header className="neu-card flex flex-col gap-3 bg-[#F3E8FF] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <UserCog size={14} />
          Profile & KYC
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Build Your Tutor Profile
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          A complete profile ranks higher in the matching engine and earns more
          parent trust. KYC verification adds{" "}
          <strong>+500 ranking points</strong>.
        </p>

        {/* Score bar */}
        <div className="mt-2 max-w-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-[#0F172A]">Profile Completion</span>
            <span className="text-[#22C55E]">{scoreBreakdown.total}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-[#0F172A] bg-white">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all"
              style={{ width: `${scoreBreakdown.total}%` }}
            />
          </div>
        </div>
      </header>

      {/* KYC Card */}
      <section
        className="neu-card space-y-4 p-6"
        style={{ backgroundColor: kycConfig.bg }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <kycConfig.icon
              size={22}
              className={`mt-0.5 shrink-0 ${kycConfig.iconColor}`}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[#0F172A]">
                  KYC Verification
                </h2>
                <span
                  className="neu-badge text-[11px]"
                  style={{ backgroundColor: kycConfig.badgeBg }}
                >
                  {kycConfig.badge}
                </span>
              </div>
              {profile.kycRejectionNote ? (
                <div className="mt-1 space-y-1 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs text-red-900">
                  <p className="font-black text-red-700 uppercase text-[10px]">
                    Admin Rejection Reason — Please Re-upload:
                  </p>
                  <p className="font-bold">"{profile.kycRejectionNote}"</p>
                </div>
              ) : (
                <p className="max-w-lg text-xs font-semibold text-slate-700">
                  {kycConfig.description}
                </p>
              )}
            </div>
          </div>

          {kycConfig.cta && (
            <button
              type="button"
              onClick={() => setKycModalOpen(true)}
              className="neu-btn neu-btn-primary shrink-0 px-5 py-3 text-sm"
            >
              <Shield size={16} />
              <span>{kycConfig.cta}</span>
            </button>
          )}
        </div>

        {profile.kycStatus !== "NOT_SUBMITTED" && (
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { key: "kycIdProofUrl", label: "ID Proof" },
                { key: "kycAddressUrl", label: "Address Proof" },
                { key: "kycSelfieUrl", label: "Selfie" },
              ] as const
            ).map((doc) => {
              const hasDoc = Boolean(
                profile[doc.key as keyof ProfileData]
              );
              return (
                <div
                  key={doc.key}
                  className={`flex items-center gap-1.5 rounded-xl border-2 border-[#0F172A] px-3 py-2 text-[11px] font-bold ${
                    hasDoc ? "bg-white" : "bg-white opacity-40"
                  }`}
                >
                  {hasDoc ? (
                    <ShieldCheck size={13} className="text-[#22C55E]" />
                  ) : (
                    <ShieldAlert size={13} className="text-slate-400" />
                  )}
                  {doc.label}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Profile & Availability Forms */}
      <TutorProfileForm
        defaults={{
          bio: profile.bio,
          qualification: profile.qualification,
          experience: profile.experience,
          subjects: profile.subjects,
          classLevels: profile.classLevels,
          teachingMode: profile.teachingMode,
          teachingRadius: profile.teachingRadius,
          feeMin: profile.feeMin,
          feeMax: profile.feeMax,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          address: profile.address,
          introVideoUrl: profile.introVideoUrl,
          availability: profile.availability,
        }}
      />

      {/* KYC Modal */}
      {kycModalOpen && (
        <KYCUploadModal
          existingKeys={{
            kycIdProofUrl: profile.kycIdProofUrl,
            kycAddressUrl: profile.kycAddressUrl,
            kycSelfieUrl: profile.kycSelfieUrl,
          }}
          rejectionNote={profile.kycRejectionNote}
          onClose={() => setKycModalOpen(false)}
        />
      )}
    </div>
  );
}
