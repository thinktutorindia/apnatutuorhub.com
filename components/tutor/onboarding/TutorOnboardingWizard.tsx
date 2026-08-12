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
import { CheckCircle, ChevronRight } from "lucide-react";

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

export function TutorOnboardingWizard({ profile }: { profile: OnboardingProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Resume from last saved step, or start at 1
  const resumeStep = Math.max(1, Math.min(profile.onboardingStep + 1, 7));
  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [error, setError] = useState("");

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
    const merged = { ...formData, ...stepData };
    setFormData(merged);

    startTransition(async () => {
      const result = await saveTutorOnboardingAction({
        step: currentStep,
        ...merged,
        teachingStartYear: merged.teachingStartYear ?? undefined,
        latitude: merged.latitude,
        longitude: merged.longitude,
      });

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }

      if (currentStep === totalSteps) {
        // All done - go to plans page
        router.push("/tutor/plans");
      } else {
        setCurrentStep((s) => s + 1);
      }
    });
  }

  function handleBack() {
    setError("");
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  function renderStep() {
    const props = { formData, onNext: handleNext, onBack: handleBack, isLoading: isPending };
    switch (currentStep) {
      case 1: return <Step1Location {...props} />;
      case 2: return <Step2GenderYear {...props} />;
      case 3: return <Step3Subjects {...props} />;
      case 4: return <Step4Education {...props} />;
      case 5: return <Step5Preferences {...props} />;
      case 6: return <Step6Bio {...props} />;
      case 7: return <Step7Photo {...props} profileId={profile.id} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <LogoBrand heightClass="h-10 sm:h-12" />
          <div className="text-xs font-700 text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
            Step <span className="text-[#1A3C5E] font-800">{currentStep}</span> of {totalSteps}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-[#2D9E6B] to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* Step Indicator dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`transition-all duration-300 rounded-full ${
                s.num < currentStep
                  ? "w-6 h-6 bg-[#2D9E6B] flex items-center justify-center"
                  : s.num === currentStep
                  ? "w-8 h-8 bg-[#1A3C5E] flex items-center justify-center ring-4 ring-[#1A3C5E]/20"
                  : "w-2 h-2 bg-gray-200"
              }`}
              title={s.title}
            >
              {s.num < currentStep && <CheckCircle size={14} className="text-white" />}
              {s.num === currentStep && <span className="text-white text-xs font-800">{s.num}</span>}
            </div>
          ))}
        </div>

        {/* Step title (Hidden on step 3 which has its own custom TryMyTutor title) */}
        {currentStep !== 3 && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-widest text-[#2D9E6B] bg-[#2D9E6B]/10 px-3 py-1 rounded-full mb-2">
              <ChevronRight size={12} />
              Step {currentStep} of {totalSteps} • Auto-saves to profile
            </div>
            <h1
              className="text-2xl font-800 text-[#1A3C5E] tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {STEPS[currentStep - 1]?.subtitle}
            </h1>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 font-600">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 sm:p-8">
          {renderStep()}
        </div>

        {/* Bottom helper text */}
        <p className="text-center text-xs text-gray-400 mt-4 font-500">
          Your progress is automatically saved. You can continue later from where you left off.
        </p>
      </div>
    </div>
  );
}
