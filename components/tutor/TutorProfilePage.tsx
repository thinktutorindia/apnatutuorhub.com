"use client";

import React, { useState } from "react";
import {
  UserCheck,
  MessageCircle,
  Award,
  Coins,
  Shield,
  MapPin,
  BookOpen,
  Calendar,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { TutorProfileForm } from "@/components/tutor/TutorProfileForm";
import { KYCUploadModal } from "@/components/tutor/KYCUploadModal";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";
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
  latitude?: number | null;
  longitude?: number | null;
  introVideoUrl: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  kycStatus: string;
  kycRejectionNote: string | null;
  kycIdProofUrl: string | null;
  kycAddressUrl: string | null;
  kycSelfieUrl: string | null;
  isVerified: boolean;
  profileScore: number;
  coinBalance: number;
  gender?: string;
  teachingStartYear?: string;
  educationCourse?: string;
  educationSubjects?: string;
  educationUniversity?: string;
  educationYear?: string;
  profession?: string;
  dateOfBirth?: string;
  referralSource?: string;
  maritalStatus?: string;
  interestedIn?: string[];
};

export function TutorProfilePage({
  profile,
  scoreBreakdown,
}: {
  profile: ProfileData;
  scoreBreakdown: ProfileScoreBreakdown;
}) {
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [activeEditStep, setActiveEditStep] = useState<number | null>(null);

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
            href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I need help completing my tutor profile and KYC verification.")}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-1.5 transition-colors shadow-md hover:shadow-lg"
          >
            <MessageCircle size={15} className="!text-white" />
            <span className="!text-white font-800">WhatsApp {SUPPORT_PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>

      {/* ── PROFILE COMPLETENESS BADGES & TASK CARDS ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-800 text-[#0F2540] flex items-center gap-2">
          <Award size={20} className="text-[#2D9E6B]" />
          <span>Profile Completion Badges</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Coin Pack Badge */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-300/80 shadow-xs space-y-3 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-900 shadow-2xs text-lg">
                  🪙
                </div>
                <div>
                  <h3 className="text-xs font-900 text-amber-950">Coin Wallet & Leads</h3>
                  <p className="text-[11px] font-700 text-amber-800">
                    {profile.coinBalance > 0 ? `${profile.coinBalance} Coins Active` : "0 Coins Available"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                {profile.coinBalance > 0 ? "Active ✅" : "Needs Coins 🪙"}
              </span>
            </div>
            <p className="text-[11px] text-amber-900 font-500 leading-snug">
              Unlock student contact phone numbers and get instant lead alerts.
            </p>
            <Link
              href="/tutor/plans"
              className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 !text-white text-xs font-800 flex items-center justify-center gap-1.5 shadow-sm transition-all text-center cursor-pointer"
            >
              <Coins size={14} className="!text-white" />
              <span>Buy Coins & Membership →</span>
            </Link>
          </div>

          {/* 2. KYC Badge */}
          <div
            className={`p-5 rounded-3xl border-2 shadow-xs space-y-3 flex flex-col justify-between ${
              profile.kycStatus === "APPROVED"
                ? "bg-emerald-50/80 border-emerald-300"
                : profile.kycStatus === "PENDING"
                ? "bg-blue-50/80 border-blue-300"
                : "bg-amber-50/80 border-amber-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-800 text-white shadow-2xs ${
                    profile.kycStatus === "APPROVED"
                      ? "bg-[#2D9E6B]"
                      : profile.kycStatus === "PENDING"
                      ? "bg-blue-600"
                      : "bg-amber-600"
                  }`}
                >
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-900 text-gray-900">Government KYC Badge</h3>
                  <p className="text-[11px] font-700 text-gray-600">
                    {profile.kycStatus === "APPROVED"
                      ? "Verified Tutor Badge ✅"
                      : profile.kycStatus === "PENDING"
                      ? "Under Review ⏳"
                      : "Not Submitted ⚠️"}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 font-500 leading-snug">
              Verified tutors get 5x more parent calls and rank top in search.
            </p>
            <button
              type="button"
              onClick={() => setKycModalOpen(true)}
              className={`w-full py-2.5 rounded-2xl text-xs font-800 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                profile.kycStatus === "APPROVED"
                  ? "bg-emerald-700 hover:bg-emerald-800 !text-white"
                  : "bg-[#1A3C5E] hover:bg-black !text-white"
              }`}
            >
              <Shield size={14} className="!text-white" />
              <span>{profile.kycStatus === "APPROVED" ? "View KYC Badge" : "Complete KYC →"}</span>
            </button>
          </div>

          {/* 3. Location, Radius & Hourly Fees Badge */}
          {(() => {
            const isLocationDone = Boolean((profile.city || profile.address) && profile.pincode);
            const isFeesDone = Boolean(profile.feeMin && Number(profile.feeMin) > 0);
            const isDone = isLocationDone && isFeesDone;

            const localityLabel = profile.address
              ? profile.address.split(",").slice(0, 2).join(", ").trim()
              : profile.city
              ? `${profile.city}, ${profile.state || ""}`
              : "Location not set";

            const feeLabel = isFeesDone
              ? `₹${profile.feeMin}${profile.feeMax ? ` - ₹${profile.feeMax}` : ""}/hr`
              : "Fees missing";

            return (
              <div className={`p-5 rounded-3xl border-2 shadow-xs space-y-3 flex flex-col justify-between ${
                isDone ? "bg-emerald-50/60 border-emerald-200" : "bg-amber-50/60 border-amber-300"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-2xs ${
                      isDone ? "bg-[#2D9E6B]" : "bg-amber-600"
                    }`}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-900 text-gray-900">Location &amp; Hourly Fees</h3>
                      <p className="text-[11px] font-700 text-gray-600">
                        {localityLabel} · {feeLabel}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-800 px-2 py-0.5 rounded-full ${
                    isDone ? "bg-emerald-200 text-emerald-950" : "bg-amber-200 text-amber-950"
                  }`}>
                    {isDone ? "Configured ✅" : !isFeesDone ? "Fees Missing ⚠️" : "Location Missing ⚠️"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-500 leading-snug">
                  Sets your travel radius ({profile.teachingRadius || 10} km) &amp; tuition fee rate per hour.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveEditStep(2)}
                  className={`w-full py-2.5 rounded-2xl !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone ? "bg-[#2D9E6B] hover:bg-emerald-800" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <MapPin size={14} className="!text-white" />
                  <span>Update Location &amp; Fees →</span>
                </button>
              </div>
            );
          })()}

          {/* 4. Subjects & Skills Badge */}
          {(() => {
            const isDone = profile.subjects.length > 0;
            return (
              <div className={`p-5 rounded-3xl border-2 shadow-xs space-y-3 flex flex-col justify-between ${
                isDone ? "bg-emerald-50/60 border-emerald-200" : "bg-amber-50/60 border-amber-300"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-2xs ${
                      isDone ? "bg-[#2D9E6B]" : "bg-amber-600"
                    }`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-900 text-gray-900">Teaching Subjects</h3>
                      <p className="text-[11px] font-700 text-gray-600">
                        {isDone ? `${profile.subjects.length} Subjects Marked` : "No subjects set"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-800 px-2 py-0.5 rounded-full ${
                    isDone ? "bg-emerald-200 text-emerald-950" : "bg-amber-200 text-amber-950"
                  }`}>
                    {isDone ? "Configured ✅" : "Missing ⚠️"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-500 leading-snug">
                  Parents search by specific subject classes &amp; competitive exams.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveEditStep(1)}
                  className={`w-full py-2.5 rounded-2xl !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone ? "bg-[#2D9E6B] hover:bg-emerald-800" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <BookOpen size={14} className="!text-white" />
                  <span>Manage Subjects →</span>
                </button>
              </div>
            );
          })()}

          {/* 5. Schedule Badge */}
          {(() => {
            const isDone = profile.availability.length > 0;
            return (
              <div className={`p-5 rounded-3xl border-2 shadow-xs space-y-3 flex flex-col justify-between ${
                isDone ? "bg-[#E8F7F0] border-emerald-200" : "bg-amber-50/60 border-amber-300"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-2xs ${
                      isDone ? "bg-[#2D9E6B]" : "bg-amber-600"
                    }`}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-900 text-gray-900">Weekly Availability</h3>
                      <p className="text-[11px] font-700 text-gray-600">
                        {isDone ? `${profile.availability.length} Days Configured` : "Schedule not set"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-800 px-2 py-0.5 rounded-full ${
                    isDone ? "bg-emerald-200 text-[#0F2540]" : "bg-amber-200 text-amber-950"
                  }`}>
                    {isDone ? "Set ✅" : "Pending ⏳"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-500 leading-snug">
                  Allows parents to book trial sessions during your open hours.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveEditStep(5)}
                  className={`w-full py-2.5 rounded-2xl !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone ? "bg-[#2D9E6B] hover:bg-[#238357]" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <Calendar size={14} className="!text-white" />
                  <span>Set Weekly Schedule →</span>
                </button>
              </div>
            );
          })()}

          {/* 6. Education & Bio Badge */}
          {(() => {
            const isDone = Boolean(
              profile.bio &&
              profile.bio.trim().length >= 10 &&
              (profile.qualification || profile.educationCourse)
            );
            return (
              <div className={`p-5 rounded-3xl border-2 shadow-xs space-y-3 flex flex-col justify-between ${
                isDone ? "bg-blue-50/60 border-blue-200" : "bg-amber-50/60 border-amber-300"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-2xs ${
                      isDone ? "bg-blue-600" : "bg-amber-600"
                    }`}>
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-900 text-gray-900">Bio &amp; Qualifications</h3>
                      <p className="text-[11px] font-700 text-gray-600">
                        {profile.qualification || profile.educationCourse || "Degree missing"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-800 px-2 py-0.5 rounded-full ${
                    isDone ? "bg-blue-200 text-blue-950" : "bg-amber-200 text-amber-950"
                  }`}>
                    {isDone ? "Complete ✅" : "Incomplete ⚠️"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-500 leading-snug">
                  Showcase your degree, university, achievements, and video link.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveEditStep(4)}
                  className={`w-full py-2.5 rounded-2xl !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDone ? "bg-blue-700 hover:bg-blue-800" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <GraduationCap size={14} className="!text-white" />
                  <span>Edit Bio &amp; Degree →</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── FOCUS MODAL DIALOG POPUP FOR FILLING SPECIFIC SECTION ── */}
      {activeEditStep !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8 space-y-4">
            {/* Modal Header bar with Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-900 text-[#0F2540] uppercase tracking-wider">
                {activeEditStep === 1
                  ? "📚 Edit Teaching Subjects & Class Levels"
                  : activeEditStep === 2
                  ? "📍 Edit Location, Radius & Hourly Fees"
                  : activeEditStep === 4
                  ? "🎓 Edit Bio, Education & Qualifications"
                  : activeEditStep === 5
                  ? "📅 Edit Weekly Availability Schedule"
                  : "Update Profile Details"}
              </h3>
              <button
                type="button"
                onClick={() => setActiveEditStep(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <TutorProfileForm
              initialStep={activeEditStep}
              onCloseModal={() => setActiveEditStep(null)}
              defaults={{
                bio: profile.bio,
                qualification: profile.qualification || profile.educationCourse || "",
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
                latitude: profile.latitude,
                longitude: profile.longitude,
                introVideoUrl: profile.introVideoUrl,
                availability: profile.availability,
                coinBalance: profile.coinBalance,
                gender: profile.gender,
                teachingStartYear: profile.teachingStartYear,
                educationCourse: profile.educationCourse,
                educationSubjects: profile.educationSubjects,
                educationUniversity: profile.educationUniversity,
                educationYear: profile.educationYear,
                profession: profile.profession,
                dateOfBirth: profile.dateOfBirth,
                referralSource: profile.referralSource,
                maritalStatus: profile.maritalStatus,
                interestedIn: profile.interestedIn,
              }}
              kyc={{
                kycStatus: profile.kycStatus,
                kycRejectionNote: profile.kycRejectionNote,
                kycIdProofUrl: profile.kycIdProofUrl,
                kycAddressUrl: profile.kycAddressUrl,
                kycSelfieUrl: profile.kycSelfieUrl,
                onOpenKycModal: () => {
                  setActiveEditStep(null);
                  setKycModalOpen(true);
                },
              }}
            />
          </div>
        </div>
      )}

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
