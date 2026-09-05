"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTutorOnboardingAction } from "@/app/actions/tutor.actions";
import { Step1Location } from "./steps/Step1Location";
import { Step2GenderYear } from "./steps/Step2GenderYear";
import { Step3Subjects } from "./steps/Step3Subjects";
import { Step4Education } from "./steps/Step4Education";
import { Step5Preferences } from "./steps/Step5Preferences";
import { Step6Bio } from "./steps/Step6Bio";
import { Step7Photo } from "./steps/Step7Photo";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { CheckCircle, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";

export interface OnboardingProfile {
  id: string;
  onboardingStep: number;
  city: string;
  state: string;
  pincode: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  gender: string;
  teachingStartYear: number | null;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  teachingRadius: number;
  educationCourse: string;
  educationSubjects: string;
  educationUniversity: string;
  educationYear: string;
  interestedIn: string[];
  profession: string;
  dateOfBirth: string;
  referralSource: string;
  maritalStatus: string;
  bio: string;
  photoUrl: string;
  tutorName: string;
}

const STEPS = [
  { num: 1, title: "Location", subtitle: "Where do you stay?" },
  { num: 2, title: "Experience", subtitle: "Your gender & teaching experience" },
  { num: 3, title: "Subjects", subtitle: "What do you teach?" },
  { num: 4, title: "Education", subtitle: "Your educational background" },
  { num: 5, title: "Preferences", subtitle: "Teaching preferences" },
  { num: 6, title: "About You", subtitle: "Write about yourself" },
  { num: 7, title: "Photo", subtitle: "Upload your photograph" },
];

export interface TutorOnboardingWizardProps {
  profile: OnboardingProfile;
  isAdminMode?: boolean;
  targetUserId?: string;
  onFinishAdmin?: () => void;
}

export function TutorOnboardingWizard({
  profile,
  isAdminMode = false,
  targetUserId,
  onFinishAdmin,
}: TutorOnboardingWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Resume from last saved step or start at step 1
  const resumeStep = isAdminMode
    ? 1
    : Math.max(1, Math.min(profile.onboardingStep + 1, 7));

  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Unified form data state across all steps
  const [formData, setFormData] = useState({
    city: profile.city,
    state: profile.state,
    pincode: profile.pincode,
    address: profile.address,
    latitude: profile.latitude,
    longitude: profile.longitude,
    gender: profile.gender,
    teachingStartYear: profile.teachingStartYear,
    subjects: profile.subjects,
    classLevels: profile.classLevels,
    teachingMode: profile.teachingMode || "EITHER",
    teachingRadius: profile.teachingRadius || 10,
    educationCourse: profile.educationCourse,
    educationSubjects: profile.educationSubjects,
    educationUniversity: profile.educationUniversity,
    educationYear: profile.educationYear,
    interestedIn: profile.interestedIn,
    profession: profile.profession,
    dateOfBirth: profile.dateOfBirth,
    referralSource: profile.referralSource,
    maritalStatus: profile.maritalStatus,
    bio: profile.bio,
    photoUrl: profile.photoUrl,
  });

  const totalSteps = STEPS.length;
  const progress = Math.round((currentStep / totalSteps) * 100);

  async function handleNext(stepData: Partial<typeof formData>) {
    setError("");
    setSuccessNotice("");
    const merged = { ...formData, ...stepData };
    setFormData(merged);

    startTransition(async () => {
      const result = await saveTutorOnboardingAction(
        {
          step: currentStep,
          ...merged,
          teachingStartYear: merged.teachingStartYear ?? undefined,
          latitude: merged.latitude,
          longitude: merged.longitude,
        },
        targetUserId
      );

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccessNotice(`Step ${currentStep} saved to profile!`);

      if (currentStep === totalSteps) {
        if (isAdminMode) {
          if (onFinishAdmin) onFinishAdmin();
        } else {
          router.push("/tutor/leads");
        }
      } else {
        setCurrentStep((s) => s + 1);
      }
    });
  }

  function handleBack() {
    setError("");
    setSuccessNotice("");
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  function handleJumpStep(stepNum: number) {
    setError("");
    setSuccessNotice("");
    setCurrentStep(stepNum);
  }

  function renderStep() {
    const props = {
      formData,
      onNext: handleNext,
      onBack: handleBack,
      isLoading: isPending,
      isAdminMode,
    };
    switch (currentStep) {
      case 1:
        return <Step1Location {...props} />;
      case 2:
        return <Step2GenderYear {...props} />;
      case 3:
        return <Step3Subjects {...props} />;
      case 4:
        return <Step4Education {...props} />;
      case 5:
        return <Step5Preferences {...props} />;
      case 6:
        return <Step6Bio {...props} />;
      case 7:
        return <Step7Photo {...props} profileId={profile.id} isAdminMode={isAdminMode} targetUserId={targetUserId} />;
      default:
        return null;
    }
  }

  return (
    <div className={`min-h-screen ${isAdminMode ? "bg-[#F0F4F8] p-4" : "bg-[#F0F4F8]"}`}>
      {/* Top Header */}
      {!isAdminMode && (
        <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <LogoBrand heightClass="h-10 sm:h-11" />
            <div className="flex items-center gap-2">
              <p className="hidden rounded-full border border-[#E2E8F0] bg-[#F0F4F8] px-3 py-1.5 text-sm font-800 text-[#0F2540] xs:block">
                Step {currentStep} of {totalSteps}
              </p>
              <SignOutButton variant="link" text="Sign out" />
            </div>
          </div>
          <div className="h-1.5 bg-[#E8F7F0]">
            <div
              className="h-full bg-[#2D9E6B] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Admin Quick Step Selector Bar */}
      {isAdminMode && (
        <div className="max-w-3xl mx-auto mb-6 p-4 rounded-3xl bg-[#0F2540] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-2">
              <Sparkles size={16} /> Super Admin Privilege Mode: Click Any Step to Edit &amp; Jump
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-bold">
              Editing User: {profile.tutorName || "Tutor Profile"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {STEPS.map((s) => {
              const isActive = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleJumpStep(s.num)}
                  className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-lg font-bold"
                      : "bg-[#0A192F] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <p className="text-[10px] font-extrabold opacity-80">STEP {s.num}</p>
                  <p className="text-xs font-extrabold truncate mt-0.5">{s.title}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-20">
        {/* Clickable Step Indicator Dots for Tutors */}
        {!isAdminMode && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => handleJumpStep(s.num)}
                className={`rounded-xl cursor-pointer transition-all ${
                  s.num < currentStep
                    ? "w-8 h-8 bg-emerald-600 text-white flex items-center justify-center shadow-xs"
                    : s.num === currentStep
                    ? "w-9 h-9 bg-[#0F2540] text-white flex items-center justify-center shadow-md scale-105 ring-2 ring-emerald-500/30"
                    : "w-8 h-8 bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:border-emerald-600 hover:text-slate-600"
                }`}
                title={`Step ${s.num}: ${s.title}`}
              >
                {s.num < currentStep ? (
                  <CheckCircle size={15} className="text-white" />
                ) : (
                  <span className={`text-xs font-black ${s.num === currentStep ? "text-white" : "text-slate-500"}`}>
                    {s.num}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step title */}
        {currentStep !== 3 && (
          <div className="mb-6 text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200">
              <Sparkles size={12} className="text-emerald-600" />
              <span>Step {currentStep} of {totalSteps}: {STEPS[currentStep - 1]?.title}</span>
            </div>
            <h1
              className="text-2xl font-black text-[#0F2540] sm:text-3xl tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {STEPS[currentStep - 1]?.subtitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Your progress is automatically saved at every step.</p>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 font-600 animate-in fade-in">
            {error}
          </div>
        )}
        {successNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-700 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Step content */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-10 space-y-6">
          {renderStep()}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep <= 1 || isPending}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#E2E8F0] bg-white px-5 text-[15px] font-800 text-[#0F2540] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <span className="text-sm font-700 text-slate-400">
            {currentStep} / {totalSteps}
          </span>
          <span className="w-[7.5rem]" aria-hidden />
        </div>
      </div>
    </div>
  );
}
