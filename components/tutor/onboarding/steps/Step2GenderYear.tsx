"use client";

import React, { useState } from "react";
import { User, ArrowRight, ArrowLeft, Loader2, Calendar, ChevronDown, Sparkles, UserCheck } from "lucide-react";

interface Props {
  formData: { gender: string; teachingStartYear: number | null };
  onNext: (data: { gender: string; teachingStartYear: number }) => void;
  onBack: () => void;
  isLoading: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

export function Step2GenderYear({ formData, onNext, onBack, isLoading }: Props) {
  const [gender, setGender] = useState(formData.gender || "");
  const [teachingStartYear, setTeachingStartYear] = useState<number>(
    formData.teachingStartYear || currentYear
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!gender) errs.gender = "Please select your gender.";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onNext({ gender, teachingStartYear });
  }

  const experience = currentYear - teachingStartYear;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="w-14 h-14 rounded-2xl bg-[#1A3C5E]/8 flex items-center justify-center mx-auto text-[#1A3C5E]">
          <User size={26} />
        </div>
        <h2 className="text-lg font-800 text-[#1A3C5E]">Gender & Teaching Experience</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Help parents and students match with their preferred tutor profile.
        </p>
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <label className="text-xs font-700 text-gray-700 flex items-center gap-1.5">
          <User size={14} className="text-[#2D9E6B]" />
          Gender <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["MALE", "FEMALE"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGender(g);
                setErrors({});
              }}
              className={`py-3.5 px-4 rounded-2xl border-2 text-xs font-800 transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                gender === g
                  ? "border-[#1A3C5E] bg-[#1A3C5E] text-white shadow-md scale-[1.01]"
                  : "border-gray-200 bg-gray-50/80 text-gray-700 hover:border-[#1A3C5E]/40 hover:bg-white"
              }`}
            >
              {g === "MALE" ? (
                <User size={18} className={gender === g ? "text-emerald-300" : "text-blue-600"} />
              ) : (
                <UserCheck size={18} className={gender === g ? "text-emerald-300" : "text-pink-600"} />
              )}
              <span>{g === "MALE" ? "Male Tutor" : "Female Tutor"}</span>
            </button>
          ))}
        </div>
        {errors.gender && <p className="text-xs text-red-600 font-600">{errors.gender}</p>}
      </div>

      {/* Teaching Start Year */}
      <div className="space-y-2">
        <label htmlFor="start-year" className="text-xs font-700 text-gray-700 flex items-center gap-1.5">
          <Calendar size={14} className="text-[#2D9E6B]" />
          Which year did you start teaching?
        </label>
        <div className="relative">
          <select
            id="start-year"
            value={teachingStartYear}
            onChange={(e) => setTeachingStartYear(parseInt(e.target.value))}
            className="w-full h-12 pl-4 pr-10 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-xs font-700 text-gray-900 outline-none appearance-none cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} {y === currentYear ? "(Started this year)" : ""}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={16} />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-[#2D9E6B] font-700">
          <Sparkles size={15} className="shrink-0 text-[#2D9E6B]" />
          <span>
            {experience === 0
              ? "New Tutor (Less than 1 year teaching experience)"
              : `${experience} year${experience > 1 ? "s" : ""} of teaching experience verified`}
          </span>
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
          className="flex-[2] h-12 rounded-2xl bg-[#1A3C5E] hover:bg-[#15304f] text-white font-800 text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-lg disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Save & Continue to Step 3 <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

