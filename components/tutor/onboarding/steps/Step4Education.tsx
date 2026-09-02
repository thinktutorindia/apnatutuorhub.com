"use client";

import React, { useState } from "react";
import { GraduationCap, ArrowRight, ArrowLeft, Loader2, ChevronDown } from "lucide-react";

interface Props {
  formData: { educationCourse: string; educationSubjects: string; educationUniversity: string; educationYear: string };
  onNext: (data: { educationCourse: string; educationSubjects: string; educationUniversity: string; educationYear: string }) => void;
  onBack: () => void;
  isLoading: boolean;
}

const currentYear = new Date().getFullYear();
const passYears = ["Pursuing", ...Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i))];

export function Step4Education({ formData, onNext, onBack, isLoading }: Props) {
  const [educationCourse, setEducationCourse] = useState(formData.educationCourse || "");
  const [educationSubjects, setEducationSubjects] = useState(formData.educationSubjects || "");
  const [educationUniversity, setEducationUniversity] = useState(formData.educationUniversity || "");
  const [educationYear, setEducationYear] = useState(formData.educationYear || "Pursuing");

  function handleSubmit() {
    onNext({ educationCourse, educationSubjects, educationUniversity, educationYear });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E8F7F0] flex items-center justify-center mx-auto mb-3">
          <GraduationCap size={28} className="text-[#2D9E6B]" />
        </div>
        <p className="text-gray-500 text-sm">Your education builds parent trust. Share your academic background.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Course */}
        <div className="space-y-1.5">
          <label className="text-xs font-700 text-gray-700">Course You Did</label>
          <input
            type="text"
            value={educationCourse}
            onChange={(e) => setEducationCourse(e.target.value)}
            placeholder="e.g., BSc, B.Ed, MBA"
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
          />
        </div>

        {/* Year of Passing */}
        <div className="space-y-1.5">
          <label className="text-xs font-700 text-gray-700">Year of Passing</label>
          <div className="relative">
            <select
              value={educationYear}
              onChange={(e) => setEducationYear(e.target.value)}
              className="w-full h-11 pl-3.5 pr-8 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] text-sm font-600 text-gray-900 outline-none appearance-none cursor-pointer"
            >
              {passYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Subjects studied */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700">Subjects You Studied</label>
        <input
          type="text"
          value={educationSubjects}
          onChange={(e) => setEducationSubjects(e.target.value)}
          placeholder="e.g., Economics, Biology, English"
          className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
        />
      </div>

      {/* University */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700">University / College Name</label>
        <input
          type="text"
          value={educationUniversity}
          onChange={(e) => setEducationUniversity(e.target.value)}
          placeholder="e.g., Delhi University, IIT Mumbai"
          className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-sm font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all"
        />
      </div>

      <p className="text-xs text-gray-400 text-center">You can add more qualifications from your profile later.</p>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} disabled={isLoading} className="flex-1 h-12 rounded-2xl border-2 border-gray-200 bg-white text-gray-600 font-700 text-sm flex items-center justify-center gap-2 hover:border-gray-300 transition-all cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" onClick={handleSubmit} disabled={isLoading} className="flex-[2] h-12 rounded-2xl bg-[#1A3C5E] hover:bg-[#15304f] text-white font-800 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 cursor-pointer">
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <>Next <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
