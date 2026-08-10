"use client";

import { useActionState, useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import {
  saveTutorProfileAction,
  saveAvailabilityAction,
  type TutorProfileState,
  type AvailabilityState,
} from "@/app/actions/tutor.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { AvailabilityGrid } from "@/components/tutor/AvailabilityGrid";
import {
  CLASS_LEVELS,
  TEACHING_MODES,
  INDIAN_STATES,
} from "@/lib/validations";

const CLASS_LEVEL_OPTIONS = CLASS_LEVELS.map((l) => ({ value: l, label: l }));
const MODE_OPTIONS = TEACHING_MODES.map((m) => ({ value: m.value, label: m.label }));

const profileInitial: TutorProfileState = { success: false };
const availInitial: AvailabilityState = { success: false };

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
  introVideoUrl: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
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
    badge: "Action Required",
    badgeBg: "bg-amber-200 text-amber-950 font-800",
    description:
      "Submit your Government ID, Address Proof, and Live Selfie to earn the Verified Tutor Badge and rank at the top of parent search results.",
    cta: "Start KYC Verification →",
  },
  PENDING: {
    bg: "bg-blue-50 border-2 border-blue-300",
    icon: Shield,
    iconColor: "text-blue-700",
    badge: "Under Review",
    badgeBg: "bg-blue-200 text-blue-950 font-800",
    description:
      "Your verification documents are being reviewed by our team. Approval typically takes up to 24 hours.",
    cta: "Update Documents →",
  },
  REJECTED: {
    bg: "bg-red-50 border-2 border-red-300",
    icon: ShieldAlert,
    iconColor: "text-red-700",
    badge: "Verification Rejected",
    badgeBg: "bg-red-200 text-red-950 font-800",
    description: "",
    cta: "Re-submit KYC Documents →",
  },
  APPROVED: {
    bg: "bg-emerald-50 border-2 border-emerald-300",
    icon: ShieldCheck,
    iconColor: "text-emerald-700",
    badge: "Verified Tutor ✅",
    badgeBg: "bg-emerald-200 text-emerald-950 font-800",
    description: "Your identity is 100% verified! Your profile enjoys priority lead matching and maximum parent trust.",
    cta: null,
  },
} as const;

export function TutorProfileForm({
  defaults,
  kyc,
}: {
  defaults: Defaults;
  kyc: KycProps;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    saveTutorProfileAction,
    profileInitial
  );
  const [availState, availAction, availPending] = useActionState(
    saveAvailabilityAction,
    availInitial
  );

  const [activeStep, setActiveStep] = useState<number>(1);
  const [subjects, setSubjects] = useState<string[]>(defaults.subjects);
  const [classLevels, setClassLevels] = useState<string[]>(defaults.classLevels);
  const [teachingMode, setTeachingMode] = useState(defaults.teachingMode || "EITHER");
  const [radius, setRadius] = useState(Number(defaults.teachingRadius) || 10);
  const [classSearch, setClassSearch] = useState("");
  const [smartNotice, setSmartNotice] = useState<string | null>(null);

  // 🧠 Form Intelligence: Auto-match Subjects & Class Levels
  const handleSubjectsChange = (newSubjects: string[]) => {
    setSubjects(newSubjects);

    const hasSeniorSub = newSubjects.some((s) =>
      ["Physics", "Chemistry", "Biology"].includes(s)
    );
    const hasSeniorLevel = classLevels.some((c) =>
      ["Class 9-10", "Class 11-12", "JEE", "NEET"].includes(c)
    );

    if (hasSeniorSub && !hasSeniorLevel) {
      setClassLevels((prev) => Array.from(new Set([...prev, "Class 9-10", "Class 11-12"])));
      setSmartNotice("🧠 Form Intelligence: Added Class 9-10 & Class 11-12 to match Physics/Chemistry/Biology.");
    }
  };

  const handleClassLevelsChange = (newLevels: string[]) => {
    setClassLevels(newLevels);

    if (newLevels.includes("JEE") || newLevels.includes("NEET")) {
      const needed = ["Physics", "Chemistry", newLevels.includes("JEE") ? "Mathematics" : "Biology"];
      const missing = needed.filter((s) => !subjects.includes(s));
      if (missing.length > 0) {
        setSubjects((prev) => Array.from(new Set([...prev, ...needed])).slice(0, 10));
        setSmartNotice(`🧠 Form Intelligence: Added ${missing.join(", ")} to match your target competitive exam.`);
      }
    }
  };

  const isKycDone = kyc.kycStatus === "APPROVED";
  const isStep1Done = subjects.length > 0 && classLevels.length > 0;
  const isStep2Done = Boolean(defaults.city && defaults.feeMin);
  const isStep3Done = Boolean(defaults.bio);

  const steps = [
    { id: 1, title: "1. Subjects & Classes", icon: BookOpen, isDone: isStep1Done },
    { id: 2, title: "2. Location & Fees", icon: MapPin, isDone: isStep2Done },
    { id: 3, title: "3. Bio & Qualifications", icon: GraduationCap, isDone: isStep3Done },
    { id: 4, title: "4. Schedule", icon: Calendar, isDone: defaults.availability.length > 0 },
    { id: 5, title: "5. Coins & KYC Badge", icon: Shield, isDone: isKycDone },
  ];

  const kycConfig =
    KYC_STATUS_CONFIG[kyc.kycStatus as keyof typeof KYC_STATUS_CONFIG] ??
    KYC_STATUS_CONFIG.NOT_SUBMITTED;

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

  return (
    <div className="space-y-6">
      <ActionOverlay
        isOpen={profilePending}
        title="Saving Tutor Profile"
        subtitle="Updating subjects, fees, location, and bio..."
      />
      <ActionOverlay
        isOpen={availPending}
        title="Saving Availability"
        subtitle="Updating weekly teaching schedule..."
      />

      {/* ── UNIFIED 5-STEP STACKED WIZARD NAVIGATION (LOW FRICTION FIRST) ── */}
      <div className="p-1.5 rounded-3xl bg-gray-200 border border-gray-300 grid grid-cols-2 md:grid-cols-5 gap-1.5 shadow-2xs">
        {steps.map((s) => {
          const isActive = activeStep === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStep(s.id)}
              className={`py-3 px-2 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-[#0F2540] !text-white font-800 shadow-md ring-2 ring-[#0F2540]"
                  : s.isDone
                    ? "bg-emerald-100 !text-emerald-950 font-800 border border-emerald-300 hover:bg-emerald-200"
                    : "bg-white !text-gray-900 font-700 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              <s.icon size={15} className={isActive ? "!text-emerald-400" : s.isDone ? "!text-emerald-700" : "!text-gray-700"} />
              <span className="truncate">{s.title}</span>
              {s.isDone && <Check size={13} className="!text-emerald-700 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Form State Alerts */}
      {profileState.error && <FormAlert tone="error" message={profileState.error} />}
      {profileState.success && (
        <FormAlert tone="success" message="Profile saved successfully!" />
      )}
      {availState.error && <FormAlert tone="error" message={availState.error} />}
      {availState.success && (
        <FormAlert tone="success" message="Availability saved successfully!" />
      )}

      {/* ── Profile form container ── */}
      <form action={profileAction} className="space-y-6">
        {subjects.map((sub) => (
          <input key={sub} type="hidden" name="subjects" value={sub} />
        ))}
        {classLevels.map((level) => (
          <input key={level} type="hidden" name="classLevels" value={level} />
        ))}

        {/* ── STEP 1: Subjects & Classes (LOW FRICTION START) ── */}
        {activeStep === 1 && (
          <div className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 1 of 5</span>
                <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                  <BookOpen size={20} className="text-[#2D9E6B]" />
                  Teaching Expertise &amp; Subjects
                </h2>
              </div>
            </div>

            {/* Smart Notice */}
            {smartNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-xs font-700 text-emerald-950 flex items-center justify-between gap-2">
                <span>{smartNotice}</span>
                <button
                  type="button"
                  onClick={() => setSmartNotice(null)}
                  className="text-emerald-800 hover:text-black p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Subjects Searchable Dropdown */}
            <div className="space-y-2">
              <SubjectPicker value={subjects} onChange={handleSubjectsChange} />
              <FieldError messages={profileState.fieldErrors?.subjects} />
            </div>

            {/* Class Levels Searchable Selector */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-800 uppercase tracking-wider text-gray-900">
                  Target Class Levels &amp; Exams
                </label>
                <span className="text-[10px] font-800 text-emerald-950 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {classLevels.length} selected
                </span>
              </div>

              {/* Selected Class Chips */}
              {classLevels.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-gray-100 border border-gray-200">
                  {classLevels.map((lvl) => (
                    <span
                      key={lvl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-800 text-gray-900 shadow-2xs"
                    >
                      <span>{lvl}</span>
                      <button
                        type="button"
                        onClick={() => toggleClassLevel(lvl)}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search Filter Box */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Search class levels (e.g. Class 10, JEE, NEET...)"
                  className="w-full h-11 pl-10 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-xs font-600 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Class Level Options */}
              <div className="flex flex-wrap gap-2 pt-1">
                {filteredClassLevels.map((option) => {
                  const isActive = classLevels.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => toggleClassLevel(option.value)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-800 transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#2D9E6B] !text-white shadow-xs"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                      }`}
                    >
                      {isActive && <Check size={13} strokeWidth={2.5} className="!text-white" />}
                      <span className={isActive ? "!text-white font-800" : "text-gray-900 font-700"}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <FieldError messages={profileState.fieldErrors?.classLevels} />
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span className="!text-white font-800">Continue to Location &amp; Fees</span>
                <ArrowRight size={16} className="!text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location, Fees & Teaching Mode ── */}
        {activeStep === 2 && (
          <div className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 2 of 5</span>
                <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                  <MapPin size={20} className="text-[#2D9E6B]" />
                  Teaching Mode, Location &amp; Hourly Fees
                </h2>
              </div>
            </div>

            {/* Teaching Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-800 text-gray-900">
                Preferred Teaching Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODE_OPTIONS.map((m) => {
                  const isSel = teachingMode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setTeachingMode(m.value)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? "bg-emerald-100 border-[#2D9E6B] text-emerald-950 font-800 ring-2 ring-[#2D9E6B]/30"
                          : "bg-gray-50 border-gray-300 text-gray-900 font-700 hover:bg-gray-100"
                      }`}
                    >
                      <div className="text-xs font-800">{m.label}</div>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="teachingMode" value={teachingMode} />
            </div>

            {/* Teaching Radius Slider */}
            {teachingMode !== "ONLINE" && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-800 text-gray-900">
                  <span>Home Tuition Travel Radius</span>
                  <span className="text-[#2D9E6B] font-800">{radius} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-gray-300 accent-[#2D9E6B] cursor-pointer"
                />
                <input type="hidden" name="teachingRadius" value={radius} />
              </div>
            )}

            {/* Hourly Fee Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">Minimum Fee (₹/hr)</label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    name="feeMin"
                    type="number"
                    defaultValue={defaults.feeMin}
                    placeholder="300"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">Maximum Fee (₹/hr)</label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    name="feeMax"
                    type="number"
                    defaultValue={defaults.feeMax}
                    placeholder="1000"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* City, State, Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">City</label>
                <input
                  name="city"
                  type="text"
                  defaultValue={defaults.city}
                  placeholder="e.g. Mumbai"
                  className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">State</label>
                <select
                  name="state"
                  defaultValue={defaults.state}
                  className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">Pincode</label>
                <input
                  name="pincode"
                  type="text"
                  maxLength={6}
                  defaultValue={defaults.pincode}
                  placeholder="400001"
                  className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Full Address (Private until booking)</label>
              <input
                name="address"
                type="text"
                defaultValue={defaults.address}
                placeholder="Locality, Landmark, Building name"
                className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span className="!text-white font-800">Continue to Bio &amp; Qualifications</span>
                <ArrowRight size={16} className="!text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Bio, Qualifications & Experience ── */}
        {activeStep === 3 && (
          <div className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 3 of 5</span>
                <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                  <GraduationCap size={20} className="text-[#2D9E6B]" />
                  Qualifications, Experience &amp; Bio
                </h2>
              </div>
            </div>

            {/* Experience & Qualification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">Years of Experience</label>
                <input
                  name="experience"
                  type="number"
                  defaultValue={defaults.experience}
                  placeholder="e.g. 5"
                  className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-800 text-gray-900">Highest Qualification</label>
                <input
                  name="qualification"
                  type="text"
                  defaultValue={defaults.qualification}
                  placeholder="e.g. B.Tech in CSE / M.Sc Mathematics"
                  className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Bio Description */}
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Bio Description (min 20 characters)</label>
              <textarea
                name="bio"
                rows={4}
                defaultValue={defaults.bio}
                placeholder="Introduce yourself to parents: describe your teaching style, achievements, and exam results..."
                className="w-full p-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-600 text-gray-900 outline-none transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Intro Video URL */}
            <div className="space-y-1">
              <label className="text-xs font-800 text-gray-900">Intro Video Link (YouTube / Drive - Optional)</label>
              <div className="relative">
                <Video size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  name="introVideoUrl"
                  type="url"
                  defaultValue={defaults.introVideoUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-600 text-gray-900 outline-none transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Step Navigation Controls & Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={profilePending}
                  className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                >
                  <Save size={16} className="!text-white" />
                  <span className="!text-white font-800">Save Profile Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-3 rounded-2xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 flex items-center gap-1 transition-all"
                >
                  <span className="!text-white font-800">Next: Schedule →</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ── STEP 4: Weekly Availability Schedule ── */}
      {activeStep === 4 && (
        <form action={availAction} className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="space-y-0.5">
              <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 4 of 5</span>
              <h2 className="text-xl font-800 text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-[#2D9E6B]" />
                Weekly Teaching Schedule
              </h2>
            </div>
          </div>

          <p className="text-xs text-gray-900 font-600">
            Set your teaching availability for each day of the week. Parents use this schedule when booking trial classes.
          </p>

          <AvailabilityGrid defaultSlots={defaults.availability} />

          {/* Navigation & Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={availPending}
                className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                <Save size={16} className="!text-white" />
                <span className="!text-white font-800">Save Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="px-4 py-3 rounded-2xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 flex items-center gap-1 transition-all"
              >
                <span className="!text-white font-800">Next: Coins &amp; KYC Badge →</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 5: COINS & KYC BADGE (TRUST & MONETIZATION AT THE END) ── */}
      {activeStep === 5 && (
        <div className="space-y-6">
          {/* Monetization Wallet Offer */}
          <div className="p-6 rounded-3xl bg-amber-100/90 border-2 border-amber-400 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-800 text-xl shrink-0 shadow-xs">
                  🪙
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 text-[10px] font-800 uppercase tracking-wider text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400">
                    ⚡ Priority Lead Access Offer
                  </div>
                  <h3 className="text-base font-800 text-gray-900">
                    Top Up Coins &amp; Unlock Student Enquiries
                  </h3>
                  <p className="text-xs text-gray-900 font-600 leading-relaxed max-w-lg">
                    Use your coins to instantly unlock parent phone numbers, schedule trial classes, and start earning up to ₹45,000/month.
                  </p>
                </div>
              </div>

              <Link
                href="/tutor/wallet"
                className="px-6 py-3.5 rounded-2xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 transition-colors shadow-md flex items-center justify-center gap-1.5 shrink-0"
              >
                <span className="!text-white font-800">View Coin Packages (from ₹199)</span>
                <ArrowRight size={16} className="!text-white" />
              </Link>
            </div>
          </div>

          {/* High-Contrast KYC Box */}
          <div className="bg-white rounded-3xl border border-gray-300 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">Step 5 of 5</span>
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
                      <div className="mt-2 p-3 rounded-2xl bg-red-100 border border-red-300 text-xs text-red-950 space-y-0.5">
                        <p className="font-800 text-red-900 uppercase tracking-wider text-[10px]">
                          Admin Rejection Reason — Please Re-upload:
                        </p>
                        <p className="font-700">&quot;{kyc.kycRejectionNote}&quot;</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-900 font-600 max-w-xl leading-relaxed">
                        {kycConfig.description}
                      </p>
                    )}
                  </div>
                </div>

                {kycConfig.cta && (
                  <button
                    type="button"
                    onClick={kyc.onOpenKycModal}
                    className="px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 shrink-0 transition-colors shadow-md hover:shadow-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="!text-white font-800">{kycConfig.cta}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-900 text-xs font-800 flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <span className="text-xs text-gray-900 font-700">
                💡 Documents are encrypted &amp; reviewed within 24 hours.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
