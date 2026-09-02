"use client";

import React, { useState } from "react";
import {
  Settings2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Home,
  Video,
  GraduationCap,
  Building2,
  ChevronDown,
  Heart,
  User,
} from "lucide-react";

interface Props {
  formData: {
    interestedIn: string[];
    profession: string;
    dateOfBirth: string;
    referralSource: string;
    maritalStatus: string;
  };
  onNext: (data: {
    interestedIn: string[];
    profession: string;
    dateOfBirth: string;
    referralSource: string;
    maritalStatus: string;
  }) => void;
  onBack: () => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

const INTEREST_OPTIONS = [
  { value: "HOME_TUTORING", label: "Home Tutoring", desc: "Teach at student's home", icon: Home },
  { value: "ONLINE_TUTORING", label: "Online Tutoring", desc: "Teach via video call", icon: Video },
  { value: "SCHOOL_JOBS", label: "School Jobs", desc: "Full-time school positions", icon: GraduationCap },
  { value: "INSTITUTE_JOBS", label: "Institute Jobs", desc: "Coaching/institute jobs", icon: Building2 },
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Friend / Family Referral",
  "Social Media (Facebook/Instagram)",
  "WhatsApp",
  "YouTube",
  "Other",
];

export function Step5Preferences({ formData, onNext, onBack, isLoading, isAdminMode = false }: Props) {
  const [interestedIn, setInterestedIn] = useState<string[]>(formData.interestedIn || []);
  const [profession, setProfession] = useState(formData.profession || "");
  const [dateOfBirth, setDateOfBirth] = useState(formData.dateOfBirth || "");
  const [referralSource, setReferralSource] = useState(formData.referralSource || "");
  const [maritalStatus, setMaritalStatus] = useState(formData.maritalStatus || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleInterest(val: string) {
    setInterestedIn((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
    setErrors({});
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (interestedIn.length === 0) errs.interestedIn = "Please select at least one option.";
    return errs;
  }

  function handleSubmit() {
    if (!isAdminMode) {
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
    }
    onNext({ interestedIn, profession, dateOfBirth, referralSource, maritalStatus });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Settings2 size={20} className="text-orange-500" />
        </div>
        <p className="text-xs text-gray-500">
          Tell us more about your teaching preferences so we can find the best matching leads for you.
        </p>
      </div>

      {/* Interested In */}
      <div className="space-y-2">
        <label className="text-xs font-700 text-gray-700">
          Interested in? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {INTEREST_OPTIONS.map((opt) => {
            const active = interestedIn.includes(opt.value);
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleInterest(opt.value)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                  active
                    ? "border-[#1A3C5E] bg-[#1A3C5E]/5 shadow-xs scale-[1.01]"
                    : "border-gray-200 bg-gray-50/80 hover:border-[#1A3C5E]/40 hover:bg-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    active ? "bg-[#1A3C5E] text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div className={`text-xs font-800 ${active ? "text-[#1A3C5E]" : "text-gray-900"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-500">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.interestedIn && <p className="text-xs text-red-600 font-600">{errors.interestedIn}</p>}
      </div>

      {/* Current Profession */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700">Your Current Profession</label>
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="e.g., Full-time tutor, Software engineer, Student..."
          className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-xs font-600 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700">Your Date of Birth</label>
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
          className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-xs font-600 text-gray-900 outline-none transition-all cursor-pointer"
        />
      </div>

      {/* Referral Source */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700">Where from did you come to know about us?</label>
        <div className="relative">
          <select
            value={referralSource}
            onChange={(e) => setReferralSource(e.target.value)}
            className="w-full h-11 pl-3.5 pr-8 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] text-xs font-600 text-gray-900 outline-none appearance-none cursor-pointer"
          >
            <option value="">Select source...</option>
            {REFERRAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Marital Status */}
      <div className="space-y-2">
        <label className="text-xs font-700 text-gray-700">Your Marital Status</label>
        <div className="flex gap-3">
          {(["MARRIED", "UNMARRIED"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaritalStatus(m)}
              className={`flex-1 py-3 rounded-2xl border-2 text-xs font-800 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                maritalStatus === m
                  ? "border-[#1A3C5E] bg-[#1A3C5E] text-white shadow-xs"
                  : "border-gray-200 bg-gray-50/80 text-gray-700 hover:border-[#1A3C5E]/40 hover:bg-white"
              }`}
            >
              {m === "MARRIED" ? (
                <>
                  <Heart size={16} className={maritalStatus === m ? "text-pink-300 fill-pink-300" : "text-pink-500"} />
                  <span>Married</span>
                </>
              ) : (
                <>
                  <User size={16} className={maritalStatus === m ? "text-blue-300" : "text-blue-500"} />
                  <span>Single / Unmarried</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 h-12 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-800 text-xs flex items-center justify-center gap-2 hover:bg-gray-50 transition-all cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-[2] h-12 rounded-2xl bg-[#1A3C5E] hover:bg-[#15304f] text-white font-800 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Save & Continue to Step 6 <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

