"use client";

import { useState } from "react";
import { UserCheck, MessageCircle } from "lucide-react";
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

export function TutorProfilePage({
  profile,
  scoreBreakdown,
}: {
  profile: ProfileData;
  scoreBreakdown: ProfileScoreBreakdown;
}) {
  const [kycModalOpen, setKycModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Header Card */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl space-y-4"
        style={{
          backgroundColor: "#0F2540",
          backgroundImage:
            "radial-gradient(ellipse at 85% 15%, rgba(45, 158, 107, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(245, 166, 35, 0.2) 0%, transparent 45%)",
        }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-800 bg-white/15 text-emerald-300 border border-white/20">
            <UserCheck size={15} /> Tutor Verification &amp; Onboarding Hub
          </div>
          <h1
            className="text-2xl sm:text-4xl font-800 text-white tracking-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Build Profile &amp; Start Earning
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 font-500 leading-relaxed">
            Verified tutors rank higher, receive 5x more student enquiries, and unlock parent phone numbers instantly.
          </p>
        </div>

        {/* Profile Strength Bar */}
        <div className="max-w-lg space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-800">
            <span className="text-gray-200">Profile Completeness Score</span>
            <span className="text-emerald-400 font-800">{scoreBreakdown.total}%</span>
          </div>
          <div className="h-3.5 rounded-full bg-white/20 p-0.5 overflow-hidden border border-white/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2D9E6B] to-emerald-400 transition-all duration-500 shadow-2xs"
              style={{ width: `${scoreBreakdown.total}%` }}
            />
          </div>
        </div>
      </div>

      {/* Support Assistance Helpline Box */}
      <div className="p-5 sm:p-6 rounded-3xl bg-emerald-100 border border-emerald-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#2D9E6B] !text-white flex items-center justify-center shrink-0 shadow-2xs">
            <MessageCircle size={20} className="!text-white" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-800 text-emerald-950">
              Need Help with KYC or Profile Setup?
            </h3>
            <p className="text-xs text-emerald-950 font-600 leading-relaxed">
              If you have any questions or get stuck at any step, our onboarding support team is available on WhatsApp to assist you immediately!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="https://wa.me/919876543210?text=Hi%20ApnaTutorHub%20Support,%20I%20need%20help%20completing%20my%20tutor%20profile%20and%20KYC%20verification."
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-1.5 transition-colors shadow-md hover:shadow-lg"
          >
            <MessageCircle size={15} className="!text-white" />
            <span className="!text-white font-800">Chat on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Unified 5-Step Stacked Form Component */}
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
        kyc={{
          kycStatus: profile.kycStatus,
          kycRejectionNote: profile.kycRejectionNote,
          kycIdProofUrl: profile.kycIdProofUrl,
          kycAddressUrl: profile.kycAddressUrl,
          kycSelfieUrl: profile.kycSelfieUrl,
          onOpenKycModal: () => setKycModalOpen(true),
        }}
      />

      {/* KYC Upload Modal */}
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
