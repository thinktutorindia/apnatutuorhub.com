"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import {
  BookOpen,
  GraduationCap,
  IndianRupee,
  MapPin,
  Save,
  Video,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Zap,
  Coins,
  Star,
  Sparkles,
  CloudUpload,
} from "lucide-react";
import Link from "next/link";
import {
  saveTutorStepAction,
  saveTutorProfileAction,
  saveAvailabilityAction,
  type TutorProfileState,
  type TutorStepState,
  type AvailabilityState,
} from "@/app/actions/tutor.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { AvailabilityGrid } from "@/components/tutor/AvailabilityGrid";
import { LocationSearchInput, type LocationResult } from "@/components/ui/LocationSearchInput";
import { InlineLocationMap } from "@/components/tutor/onboarding/InlineLocationMap";
import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";
import {
  CLASS_LEVELS,
  TEACHING_MODES,
  INDIAN_STATES,
} from "@/lib/validations";

const CLASS_LEVEL_OPTIONS = CLASS_LEVELS.map((l) => ({ value: l, label: l }));
const MODE_OPTIONS = TEACHING_MODES.map((m) => ({ value: m.value, label: m.label }));

const stepInitial: TutorStepState = { success: false };
const profileInitial: TutorProfileState = { success: false };
const availInitial: AvailabilityState = { success: false };

// Coin packages (mirror of lib/razorpay.ts COIN_PACKAGES)
const COIN_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    coins: 50,
    bonusCoins: 0,
    totalCoins: 50,
    priceInr: 500,
    badge: null,
    description: "Perfect for trying the platform",
    color: "from-emerald-400 to-green-500",
    bg: "bg-emerald-50 border-emerald-300",
    textColor: "text-emerald-900",
    popular: false,
    leadsUnlock: "4–6 leads",
  },
  {
    id: "pro",
    name: "Pro Pack",
    coins: 120,
    bonusCoins: 20,
    totalCoins: 140,
    priceInr: 1000,
    badge: "🔥 Most Popular",
    description: "Best for growing tutors",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50 border-amber-300",
    textColor: "text-amber-900",
    popular: true,
    leadsUnlock: "11–14 leads",
  },
  {
    id: "elite",
    name: "Elite Pack",
    coins: 300,
    bonusCoins: 80,
    totalCoins: 380,
    priceInr: 2200,
    badge: "💎 Best Value",
    description: "For serious full-time tutors",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 border-violet-300",
    textColor: "text-violet-900",
    popular: false,
    leadsUnlock: "30+ leads",
  },
] as const;

type Defaults = {
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
  coinBalance?: number;
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

type KycProps = {
  kycStatus: string;
  kycRejectionNote: string | null;
  kycIdProofUrl: string | null;
  kycAddressUrl: string | null;
  kycSelfieUrl: string | null;
  onOpenKycModal: () => void;
};

const KYC_STATUS_CONFIG = {
  NOT_SUBMITTED: {
    bg: "bg-amber-50 border-2 border-amber-300",
    icon: ShieldAlert,
    iconColor: "text-amber-700",
    badge: "Not Submitted",
    badgeBg: "bg-amber-200 text-amber-950",
    description:
      "Submit your Government ID, Address Proof, and Live Selfie to earn the Verified Badge and rank at the top of parent search results.",
    cta: "Start KYC Verification →",
  },
  PENDING: {
    bg: "bg-blue-50 border-2 border-blue-300",
    icon: Shield,
    iconColor: "text-blue-700",
    badge: "Under Review",
    badgeBg: "bg-blue-200 text-blue-950",
    description:
      "Your verification documents are being reviewed. Approval typically takes up to 24 hours.",
    cta: "Update Documents →",
  },
  REJECTED: {
    bg: "bg-red-50 border-2 border-red-300",
    icon: ShieldAlert,
    iconColor: "text-red-700",
    badge: "Rejected",
    badgeBg: "bg-red-200 text-red-950",
    description: "",
    cta: "Re-submit KYC Documents →",
  },
  APPROVED: {
    bg: "bg-emerald-50 border-2 border-emerald-300",
    icon: ShieldCheck,
    iconColor: "text-emerald-700",
    badge: "Verified Tutor ✅",
    badgeBg: "bg-emerald-200 text-emerald-950",
    description: "Your identity is 100% verified! You enjoy priority lead matching and maximum parent trust.",
    cta: null,
  },
} as const;

// ── Small "Saved" toast shown for 2s after each step save ──
function SavedToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-800 animate-in fade-in duration-200">
      <Check size={13} className="text-emerald-600" />
      Saved to profile
    </div>
  );
}

export function TutorProfileForm({
  defaults,
  kyc,
  initialStep = 1,
  onCloseModal,
}: {
  defaults: Defaults;
  kyc: KycProps;
  initialStep?: number;
  onCloseModal?: () => void;
}) {
  // ── Server action states ──
  const [stepState, stepAction, stepPending] = useActionState(saveTutorStepAction, stepInitial);
  const [profileState, profileAction, profilePending] = useActionState(saveTutorProfileAction, profileInitial);
  const [availState, availAction, availPending] = useActionState(saveAvailabilityAction, availInitial);

  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [savedToast, setSavedToast] = useState(false);

  // ── Step 1 state ──
  const [subjects, setSubjects] = useState<string[]>(defaults.subjects);
  const [classLevels, setClassLevels] = useState<string[]>(defaults.classLevels);
  const [classSearch, setClassSearch] = useState("");
  const [smartNotice, setSmartNotice] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["Combo Subjects KG to 10th", "Science Subjects"]));

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSubject = (subjName: string) => {
    if (subjects.includes(subjName)) {
      handleSubjectsChange(subjects.filter((s) => s !== subjName));
    } else {
      handleSubjectsChange([...subjects, subjName]);
    }
  };

  const toggleSelectAll = (subjList: string[]) => {
    const allSelected = subjList.every((s) => subjects.includes(s));
    if (allSelected) {
      handleSubjectsChange(subjects.filter((s) => !subjList.includes(s)));
    } else {
      handleSubjectsChange(Array.from(new Set([...subjects, ...subjList])));
    }
  };

  // ── Step 2 state ──
  const [teachingMode, setTeachingMode] = useState(defaults.teachingMode || "EITHER");
  const [radius, setRadius] = useState(Number(defaults.teachingRadius) || 10);
  const [city, setCity] = useState(defaults.city || "");
  const [state, setState] = useState(defaults.state || "");
  const [pincode, setPincode] = useState(defaults.pincode || "");
  const [address, setAddress] = useState(defaults.address || "");
  const [coordLat, setCoordLat] = useState(defaults.latitude != null ? String(defaults.latitude) : "");
  const [coordLng, setCoordLng] = useState(defaults.longitude != null ? String(defaults.longitude) : "");

  // ── Step 4 state (controlled so edits persist across re-renders) ──
  const [educationCourse, setEducationCourse] = useState(defaults.educationCourse || defaults.qualification || "");
  const [educationUniversity, setEducationUniversity] = useState(defaults.educationUniversity || "");
  const [educationSubjects, setEducationSubjects] = useState(defaults.educationSubjects || "");
  const [educationYear, setEducationYear] = useState(defaults.educationYear || "");
  const [experience, setExperience] = useState(defaults.experience || "");
  const [profession, setProfession] = useState(defaults.profession || "");
  const [dateOfBirth, setDateOfBirth] = useState(defaults.dateOfBirth || "");
  const [maritalStatus, setMaritalStatus] = useState(defaults.maritalStatus || "UNMARRIED");
  const [bio, setBio] = useState(defaults.bio || "");
  const [introVideoUrl, setIntroVideoUrl] = useState(defaults.introVideoUrl || "");

  // ── Auto-advance or close modal after step save ──
  useEffect(() => {
    if (stepState.success) {
      setSavedToast(true);
      if (onCloseModal) {
        onCloseModal();
      } else if (stepState.data?.nextStep) {
        setActiveStep(stepState.data.nextStep);
      }
      const toastTimer = setTimeout(() => setSavedToast(false), 2500);
      return () => clearTimeout(toastTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState]);

  // ── Advance or close modal after availability save ──
  useEffect(() => {
    if (availState.success) {
      setSavedToast(true);
      if (onCloseModal) {
        onCloseModal();
      } else {
        setActiveStep(6);
      }
      const toastTimer = setTimeout(() => setSavedToast(false), 2500);
      return () => clearTimeout(toastTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availState]);

  const handleLocationSelect = (res: LocationResult) => {
    if (res.city) setCity(res.city);
    if (res.state) setState(res.state);
    if (res.pincode) setPincode(res.pincode);
    if (res.area || res.fullAddress) setAddress(res.fullAddress || res.area);
    if (res.lat != null) setCoordLat(String(res.lat));
    if (res.lon != null) setCoordLng(String(res.lon));
  };

  const handleSubjectsChange = (newSubjects: string[]) => {
    setSubjects(newSubjects);
  };

  const handleClassLevelsChange = (newLevels: string[]) => {
    setClassLevels(newLevels);
  };

  const filteredClassLevels = CLASS_LEVEL_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(classSearch.toLowerCase().trim())
  );
  const toggleClassLevel = (levelVal: string) => {
    if (classLevels.includes(levelVal)) {
      handleClassLevelsChange(classLevels.filter((c) => c !== levelVal));
    } else {
      handleClassLevelsChange([...classLevels, levelVal]);
    }
  };

  // Step completion flags
  const isKycDone = kyc.kycStatus === "APPROVED";
  const isStep1Done = subjects.length > 0 && classLevels.length > 0;
  const isStep2Done = Boolean(city && defaults.feeMin);
  const isStep3Done = Boolean(defaults.coinBalance && defaults.coinBalance > 0);
  const isStep4Done = Boolean(defaults.bio);
  const isStep5Done = defaults.availability.length > 0;

  const steps = [
    { id: 1, title: "1. Subjects", icon: BookOpen, isDone: isStep1Done },
    { id: 2, title: "2. Location & Fees", icon: MapPin, isDone: isStep2Done },
    { id: 3, title: "3. Buy Coins 🪙", icon: Wallet, isDone: isStep3Done },
    { id: 4, title: "4. Bio & Quals", icon: GraduationCap, isDone: isStep4Done },
    { id: 5, title: "5. Schedule", icon: Calendar, isDone: isStep5Done },
    { id: 6, title: "6. KYC Badge", icon: Shield, isDone: isKycDone },
  ];

  const kycConfig =
    KYC_STATUS_CONFIG[kyc.kycStatus as keyof typeof KYC_STATUS_CONFIG] ??
    KYC_STATUS_CONFIG.NOT_SUBMITTED;

  const isOffline = teachingMode !== "ONLINE";

  return (
    <div className="space-y-6">
      <ActionOverlay isOpen={stepPending} title="Saving to Profile" subtitle="Progress saved to your account..." />
      <ActionOverlay isOpen={profilePending} title="Saving Profile Details" subtitle="Updating bio, qualifications, and experience..." />
      <ActionOverlay isOpen={availPending} title="Saving Schedule" subtitle="Updating weekly teaching availability..." />

      {/* ── STEP NAVIGATION TABS (Hidden when opened in focused badge modal) ── */}
      {!onCloseModal && (
        <div className="p-1.5 rounded-3xl bg-gray-200 border border-gray-300 grid grid-cols-2 xs:grid-cols-3 md:grid-cols-6 gap-1.5 shadow-2xs">
          {steps.map((s) => {
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`py-2.5 px-1.5 rounded-2xl text-[10px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isActive
                    ? "bg-[#0F2540] !text-white font-800 shadow-md ring-2 ring-[#0F2540]"
                    : s.isDone
                      ? "bg-emerald-100 !text-emerald-950 font-800 border border-emerald-300 hover:bg-emerald-200"
                      : "bg-white !text-gray-900 font-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                <s.icon size={14} className={isActive ? "!text-emerald-400" : s.isDone ? "!text-emerald-700" : "!text-gray-600"} />
                <span className="text-center leading-tight">{s.title}</span>
                {s.isDone && !isActive && <Check size={10} className="!text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Saved toast + form alerts */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {stepState.error && <FormAlert tone="error" message={stepState.error} />}
          {profileState.error && <FormAlert tone="error" message={profileState.error} />}
          {availState.error && <FormAlert tone="error" message={availState.error} />}
        </div>
        <SavedToast show={savedToast} />
      </div>

      {/* ══════════════════════════════════════════
          STEP 1: Subjects & Class Levels
      ══════════════════════════════════════════ */}
      {activeStep === 1 && (
        <form action={stepAction} className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Hidden: send nextStep so action knows where to navigate */}
          <input type="hidden" name="nextStep" value={2} />
          {subjects.map((sub) => <input key={sub} type="hidden" name="subjects" value={sub} />)}
          {classLevels.map((level) => <input key={level} type="hidden" name="classLevels" value={level} />)}

          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">
                {!onCloseModal ? "Step 1 of 6 · Auto-saves to profile" : "Auto-saves to profile"}
              </span>
              <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                <BookOpen size={20} className="text-[#2D9E6B]" />
                Teaching Expertise & Subjects
              </h2>
            </div>
          </div>

          {smartNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-xs font-700 text-emerald-950 flex items-center justify-between gap-2">
              <span>{smartNotice}</span>
              <button type="button" onClick={() => setSmartNotice(null)} className="text-emerald-800 hover:text-black p-1"><X size={14} /></button>
            </div>
          )}

          <div className="space-y-2">
            <SubjectPicker value={subjects} onChange={handleSubjectsChange} />
            <FieldError messages={stepState.fieldErrors?.subjects} />
          </div>

          {/* ── ONBOARDING SUBJECT CATEGORIES TREE (Matching TryMyTutor Onboarding 1:1) ── */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-800 text-gray-900 uppercase tracking-wider">
              Mark Your Skills &amp; Subjects (Category Tree)
            </h3>
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3 max-h-[380px] overflow-y-auto">
              {TRUEMYTUTOR_TREE.map((parent) => {
                const isExpanded = expandedNodes.has(parent.name);
                const hasSelectedSub =
                  (parent.subjects && parent.subjects.some((s) => subjects.includes(s))) ||
                  (parent.subcategories &&
                    parent.subcategories.some((sub) => sub.subjects.some((s) => subjects.includes(s))));

                return (
                  <div key={parent.name} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => toggleNode(parent.name)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-emerald-50/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#2D9E6B] w-4 text-center">
                          {isExpanded ? "−" : "+"}
                        </span>
                        <span className="text-xs font-800 text-gray-900">{parent.name}</span>
                      </div>
                      {hasSelectedSub && (
                        <span className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                          Selected ✓
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-3 border-t border-gray-100 bg-white space-y-3">
                        {parent.subjects && (
                          <>
                            <label className="flex items-center gap-2 text-[11px] font-700 text-[#2D9E6B] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={
                                  parent.subjects.length > 0 &&
                                  parent.subjects.every((s) => subjects.includes(s))
                                }
                                onChange={() => toggleSelectAll(parent.subjects!)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                              />
                              <span>Select all</span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {parent.subjects.map((s) => {
                                const isChecked = subjects.includes(s);
                                return (
                                  <label
                                    key={s}
                                    className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] font-700 cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-800"
                                        : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSubject(s)}
                                      className="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 text-[#2D9E6B] focus:ring-[#2D9E6B] shrink-0 cursor-pointer accent-[#2D9E6B]"
                                    />
                                    <span className="leading-tight">{s}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {parent.subcategories && (
                          <div className="space-y-3">
                            {parent.subcategories.map((sub) => {
                              const subKey = `${parent.name} > ${sub.name}`;
                              const isSubExpanded = expandedNodes.has(subKey);

                              return (
                                <div key={subKey} className="space-y-2 border-l-2 border-emerald-200 pl-3">
                                  <div
                                    onClick={() => toggleNode(subKey)}
                                    className="flex items-center gap-2 text-xs font-800 text-gray-800 cursor-pointer hover:text-[#2D9E6B] select-none"
                                  >
                                    <span className="font-extrabold text-xs text-[#2D9E6B]">
                                      {isSubExpanded ? "−" : "+"}
                                    </span>
                                    <span>{sub.name}</span>
                                  </div>

                                  {isSubExpanded && (
                                    <div className="space-y-2 pt-1">
                                      <label className="flex items-center gap-2 text-[11px] font-700 text-[#2D9E6B] cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={
                                            sub.subjects.length > 0 &&
                                            sub.subjects.every((s) => subjects.includes(s))
                                          }
                                          onChange={() => toggleSelectAll(sub.subjects)}
                                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                                        />
                                        <span>Select all</span>
                                      </label>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {sub.subjects.map((s) => {
                                          const isChecked = subjects.includes(s);
                                          return (
                                            <label
                                              key={s}
                                              className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] font-700 cursor-pointer transition-all ${
                                                isChecked
                                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-800"
                                                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSubject(s)}
                                                className="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 text-[#2D9E6B] focus:ring-[#2D9E6B] shrink-0 cursor-pointer accent-[#2D9E6B]"
                                              />
                                              <span className="leading-tight">{s}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-800 text-gray-900">Class Levels You Teach</label>
              {classLevels.length > 0 && (
                <span className="text-[11px] font-800 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {classLevels.length} selected
                </span>
              )}
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Filter class levels…"
                className="w-full h-10 pl-9 pr-4 rounded-2xl border border-gray-300 bg-white text-xs font-700 text-gray-900 outline-none focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredClassLevels.map((opt) => {
                const isSel = classLevels.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleClassLevel(opt.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-800 transition-all cursor-pointer border ${
                      isSel
                        ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-xs"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    {isSel && <Check size={11} className="inline mr-1 !text-emerald-400" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <FieldError messages={stepState.fieldErrors?.classLevels} />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={stepPending || subjects.length === 0 || classLevels.length === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload size={15} className="!text-white" />
              <span className="!text-white font-800">
                {onCloseModal ? "Save Subjects & Skills" : "Save & Continue to Location"}
              </span>
              <ArrowRight size={15} className="!text-white" />
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════
          STEP 2: Location, Fees & Teaching Mode
      ══════════════════════════════════════════ */}
      {activeStep === 2 && (
        <form action={stepAction} className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
          <input type="hidden" name="nextStep" value={3} />
          <input type="hidden" name="teachingMode" value={teachingMode} />
          <input type="hidden" name="teachingRadius" value={radius} />
          <input type="hidden" name="latitude" value={coordLat} />
          <input type="hidden" name="longitude" value={coordLng} />

          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">
                {!onCloseModal ? "Step 2 of 6 · Auto-saves to profile" : "Auto-saves to profile"}
              </span>
              <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-[#2D9E6B]" />
                Teaching Mode, Location & Fees
              </h2>
            </div>
          </div>

          {/* Teaching Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-800 text-gray-900">Preferred Teaching Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODE_OPTIONS.map((m) => {
                const isSel = teachingMode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setTeachingMode(m.value)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? "bg-emerald-100 border-[#2D9E6B] font-800 ring-2 ring-[#2D9E6B]/30 text-emerald-950"
                        : "bg-gray-50 border-gray-300 text-gray-900 font-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="text-xs font-800">{m.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Travel Radius Slider */}
          {isOffline && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-800 text-gray-900">
                <span>Home Tuition Travel Radius</span>
                <span className="text-[#2D9E6B] font-800">{radius} km</span>
              </div>
              <input
                type="range" min={1} max={50} value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-gray-300 accent-[#2D9E6B] cursor-pointer"
              />
            </div>
          )}

          {/* Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {[["feeMin", "Minimum Fee (₹/hr)", defaults.feeMin, "300"], ["feeMax", "Maximum Fee (₹/hr)", defaults.feeMax, "1000"]].map(([name, label, def, ph]) => (
              <div key={name as string} className="space-y-1">
                <label className="text-xs font-800 text-gray-900">{label as string}</label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    name={name as string} type="number"
                    defaultValue={def as string} placeholder={ph as string}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Location Search & Interactive Map Pin */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-800 text-[#0F2540] flex items-center justify-between">
              <span>Search Location & Pin on Map</span>
              <span className="text-[11px] font-700 text-[#2D9E6B]">Auto-Fill ✨</span>
            </label>
            <LocationSearchInput onSelectLocation={handleLocationSelect} placeholder="Type city, area or pincode (e.g. Koramangala, Sector 56 Gurgaon)..." />

            {/* Interactive Leaflet Pin Map (Same as Onboarding) */}
            <div className="pt-2">
              <label className="text-xs font-800 text-gray-700 block mb-1.5">Drag Pin to Set Exact Location</label>
              <InlineLocationMap
                lat={coordLat ? Number(coordLat) : (defaults.latitude ?? 28.6139)}
                lon={coordLng ? Number(coordLng) : (defaults.longitude ?? 77.209)}
                onLocationChange={(res) => {
                  if (res.city) setCity(res.city);
                  if (res.state) setState(res.state);
                  if (res.pincode) setPincode(res.pincode);
                  if (res.fullAddress || res.area) setAddress(res.fullAddress || res.area);
                  if (res.lat != null) setCoordLat(String(res.lat));
                  if (res.lon != null) setCoordLng(String(res.lon));
                }}
              />
            </div>
          </div>

          {/* City / State / Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">City</label>
              <input name="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">State</label>
              <select name="state" value={state} onChange={(e) => setState(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all">
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Pincode</label>
              <input name="pincode" type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="400001"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-800 text-gray-900">Full Address (Private until booking)</label>
            <input name="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Locality, Landmark, Building name"
              className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all" />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
            {!onCloseModal && (
              <button type="button" onClick={() => setActiveStep(1)} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
                <ArrowLeft size={16} /><span>Back</span>
              </button>
            )}
            <button type="submit" disabled={stepPending}
              className="w-full sm:w-auto ml-auto px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer">
              <CloudUpload size={15} className="!text-white" />
              <span className="!text-white font-800">
                {onCloseModal ? "Save Location & Fees" : "Save & Continue to Coins"}
              </span>
              <ArrowRight size={15} className="!text-white" />
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════
          STEP 3: BUY COINS — Primary Monetisation
      ══════════════════════════════════════════ */}
      {activeStep === 3 && (
        <div className="space-y-5">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white"
            style={{ background: "linear-gradient(135deg, #0F2540 0%, #1a3c5e 60%, #0a3d2e 100%)" }}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl" />
            <div className="relative space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-800 uppercase tracking-wider">
                <Zap size={13} className="fill-amber-300" />
                Step 3 of 6 — Unlock Lead Access
              </div>
              <h2 className="text-2xl sm:text-3xl font-800 text-white leading-tight">
                🪙 Buy Coins to Start<br />Receiving Student Enquiries
              </h2>
              <p className="text-sm text-gray-300 font-600 leading-relaxed max-w-xl">
                Each student lead costs 10–15 coins to unlock the parent&apos;s phone number. Tutors with coins earn up to <strong className="text-emerald-400">₹45,000/month</strong> on our platform.
              </p>
              {defaults.coinBalance != null && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-800">
                  <Wallet size={16} className="text-amber-400" />
                  Current Balance: <span className="text-amber-400 font-800">{defaults.coinBalance} coins</span>
                </div>
              )}
            </div>
          </div>

          {/* Why coins? */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "📞", title: "Unlock Phone Numbers", desc: "Instantly reveal parent contact to call directly" },
              { icon: "🏆", title: "Rank Higher in Search", desc: "Active coin users appear at top of parent results" },
              { icon: "💬", title: "Send Direct Messages", desc: "Message parents who match your teaching profile" },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                <div className="text-2xl">{item.icon}</div>
                <p className="text-xs font-800 text-gray-900">{item.title}</p>
                <p className="text-[11px] font-600 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Coin Packages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COIN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-3xl border-2 p-5 space-y-4 transition-all ${pkg.bg} ${pkg.popular ? "ring-2 ring-amber-400 shadow-lg sm:scale-[1.02]" : "shadow-xs"}`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 max-w-full px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-800 whitespace-nowrap shadow-sm">
                    {pkg.badge}
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className={`text-base font-800 ${pkg.textColor}`}>{pkg.name}</h3>
                  <p className="text-[11px] font-600 text-gray-600">{pkg.description}</p>
                </div>
                <div className="space-y-0.5">
                  <div className={`text-3xl font-800 ${pkg.textColor}`}>
                    🪙 {pkg.totalCoins}
                    <span className="text-sm font-700 text-gray-500 ml-1">coins</span>
                  </div>
                  {pkg.bonusCoins > 0 && (
                    <div className="text-[11px] font-800 text-emerald-700">
                      ✨ Includes {pkg.bonusCoins} bonus coins!
                    </div>
                  )}
                  <div className="text-xs font-600 text-gray-500">
                    Unlock ~{pkg.leadsUnlock}
                  </div>
                </div>
                <div className={`text-xl font-800 ${pkg.textColor}`}>₹{pkg.priceInr.toLocaleString("en-IN")}</div>
                <Link
                  href={`/tutor/wallet?package=${pkg.id}`}
                  className={`block w-full py-3 rounded-2xl text-center text-xs font-800 !text-white transition-all shadow-md hover:shadow-lg bg-gradient-to-r ${pkg.color} hover:scale-105 active:scale-95`}
                >
                  Buy {pkg.name} →
                </Link>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <button type="button" onClick={() => setActiveStep(2)} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} /><span>Back</span>
            </button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-3">
              <button type="button" onClick={() => setActiveStep(4)}
                className="text-xs font-700 text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors">
                Skip for now →
              </button>
              <button type="button" onClick={() => setActiveStep(4)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all">
                <span className="!text-white">Continue to Bio →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 4: Bio, Qualifications & Experience
      ══════════════════════════════════════════ */}
      {activeStep === 4 && (
        <form action={stepAction} className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
          <input type="hidden" name="nextStep" value={5} />

          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">
                {!onCloseModal ? "Step 4 of 6 · Auto-saves to profile" : "Auto-saves to profile"}
              </span>
              <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                <GraduationCap size={20} className="text-[#2D9E6B]" />
                Qualifications, Experience &amp; Bio
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Highest Qualification / Course</label>
              <input
                name="educationCourse"
                type="text"
                value={educationCourse}
                onChange={(e) => setEducationCourse(e.target.value)}
                placeholder="e.g. BSc, B.Tech, M.Sc Mathematics"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">University / College Name</label>
              <input
                name="educationUniversity"
                type="text"
                value={educationUniversity}
                onChange={(e) => setEducationUniversity(e.target.value)}
                placeholder="e.g. Delhi University, IIT Bombay"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Subjects Studied in College</label>
              <input
                name="educationSubjects"
                type="text"
                value={educationSubjects}
                onChange={(e) => setEducationSubjects(e.target.value)}
                placeholder="e.g. Physics, Maths"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Year of Passing</label>
              <input
                name="educationYear"
                type="text"
                value={educationYear}
                onChange={(e) => setEducationYear(e.target.value)}
                placeholder="e.g. 2022 or Pursuing"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Years of Experience</label>
              <input
                name="experience"
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 5"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Current Profession</label>
              <input
                name="profession"
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. Full-time Tutor, Engineer"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Date of Birth</label>
              <input
                name="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Marital Status</label>
              <select
                name="maritalStatus"
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all cursor-pointer"
              >
                <option value="UNMARRIED">Single / Unmarried</option>
                <option value="MARRIED">Married</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-800 text-gray-900">Bio Description (min 20 characters)</label>
            <textarea
              name="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Introduce yourself to parents: teaching style, achievements, exam results..."
              className="w-full p-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-600 text-gray-900 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-800 text-gray-900">Intro Video Link (YouTube / Drive — Optional)</label>
            <div className="relative">
              <Video size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                name="introVideoUrl"
                type="url"
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-600 text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
            {!onCloseModal && (
              <button type="button" onClick={() => setActiveStep(3)} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
                <ArrowLeft size={16} /><span>Back</span>
              </button>
            )}
            <button type="submit" disabled={stepPending}
              className="w-full sm:w-auto ml-auto px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer">
              <CloudUpload size={15} className="!text-white" />
              <span className="!text-white font-800">
                {onCloseModal ? "Save Education & Bio" : "Save & Continue to Schedule"}
              </span>
              <ArrowRight size={15} className="!text-white" />
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════
          STEP 5: Weekly Availability Schedule
      ══════════════════════════════════════════ */}
      {activeStep === 5 && (
        <form action={availAction} className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">
                {!onCloseModal ? "Step 5 of 6 · Auto-saves to profile" : "Auto-saves to profile"}
              </span>
              <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-[#2D9E6B]" />
                Weekly Teaching Schedule
              </h2>
            </div>
          </div>

          <p className="text-xs text-gray-600 font-600">
            Set your teaching availability for each day. Parents use this when booking trial classes.
          </p>

          <AvailabilityGrid defaultSlots={defaults.availability} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
            {!onCloseModal && (
              <button type="button" onClick={() => setActiveStep(4)} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
                <ArrowLeft size={16} /><span>Back</span>
              </button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-2 ml-auto">
              <button type="submit" disabled={availPending}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer">
                <Save size={16} className="!text-white" />
                <span className="!text-white font-800">Save Schedule</span>
              </button>
              {!onCloseModal && (
                <button type="button" onClick={() => setActiveStep(6)}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 flex items-center justify-center gap-1 transition-all">
                  <span className="!text-white font-800">Next: KYC Badge →</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════
          STEP 6: KYC Badge (Optional — do anytime)
      ══════════════════════════════════════════ */}
      {activeStep === 6 && (
        <div className="space-y-5">
          {/* Optional banner */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Star size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-800 text-blue-900">KYC is optional — complete anytime</p>
              <p className="text-[11px] font-600 text-blue-700 mt-0.5">
                Verified tutors get <strong>5x more leads</strong> and appear at the top of parent searches. You can submit documents now or after you start receiving enquiries.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 6 of 6 · Optional</span>
                <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                  <Shield size={20} className="text-[#2D9E6B]" />
                  Identity Verification (KYC Badge)
                </h2>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border shadow-2xs space-y-4 ${kycConfig.bg}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <kycConfig.icon size={26} className={`mt-0.5 shrink-0 ${kycConfig.iconColor}`} />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-800 text-gray-900">KYC Status</h3>
                      <span className={`text-xs font-800 px-3 py-0.5 rounded-full ${kycConfig.badgeBg}`}>
                        {kycConfig.badge}
                      </span>
                    </div>
                    {kyc.kycRejectionNote ? (
                      <div className="mt-2 p-3 rounded-2xl bg-red-100 border border-red-300 text-xs text-red-950">
                        <p className="font-800 text-red-900 uppercase tracking-wider text-[10px]">Rejection Reason:</p>
                        <p className="font-700">&quot;{kyc.kycRejectionNote}&quot;</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-900 font-600 max-w-xl leading-relaxed">{kycConfig.description}</p>
                    )}
                  </div>
                </div>
                {kycConfig.cta && (
                  <button type="button" onClick={kyc.onOpenKycModal}
                    className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 shrink-0 transition-colors shadow-md hover:shadow-lg cursor-pointer">
                    <span className="!text-white font-800">{kycConfig.cta}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
              <button type="button" onClick={() => setActiveStep(5)} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
                <ArrowLeft size={16} /><span>Back</span>
              </button>
              <span className="text-xs text-gray-500 font-700 text-center sm:text-right">💡 Documents are encrypted & reviewed within 24 hours.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
