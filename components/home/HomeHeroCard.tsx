"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface HomeHeroCardProps {
  user: { role?: string } | null;
  dashboardUrl: string;
  isParent: boolean;
}

const CLASS_SUBJECT_OPTIONS = [
  { value: "", label: "Select Class / Subject" },
  { value: "Class 1-5 All Subjects", label: "Class 1–5 · All Subjects" },
  { value: "Class 6-8 Maths Science", label: "Class 6–8 · Maths & Science" },
  { value: "Class 9-10 Science & Math", label: "Class 9–10 · Science & Maths" },
  { value: "Class 11-12 Science", label: "Class 11–12 · Science" },
  { value: "Class 11-12 Commerce", label: "Class 11–12 · Commerce" },
  { value: "NEET / IIT-JEE", label: "NEET / IIT-JEE" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "English", label: "English" },
  { value: "Coding / CS", label: "Coding / Computer Science" },
];

export function HomeHeroCard({ user, dashboardUrl, isParent }: HomeHeroCardProps) {
  const router = useRouter();
  const [classSubject, setClassSubject] = useState("");
  const [locality, setLocality] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (classSubject) params.set("subject", classSubject);
    if (locality.trim()) params.set("city", locality.trim());

    if (user && isParent) {
      router.push(`/parent/post-requirement?${params.toString()}`);
    } else if (user) {
      router.push(dashboardUrl);
    } else {
      router.push(`/find-tutor?${params.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-full bg-white rounded-2xl shadow-[0_12px_40px_rgba(10,25,47,0.18)] p-2 sm:p-2.5 flex flex-col md:flex-row md:items-stretch gap-2 min-w-0"
    >
      <label className="sr-only" htmlFor="hero-class-subject">
        Select class or subject
      </label>
      <select
        id="hero-class-subject"
        value={classSubject}
        onChange={(e) => setClassSubject(e.target.value)}
        className="flex-1 min-w-0 min-h-12 md:min-h-14 px-3 sm:px-4 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
      >
        {CLASS_SUBJECT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="hidden md:block w-px bg-[#E2E8F0] my-2 shrink-0" />

      <label className="sr-only" htmlFor="hero-locality">
        Enter locality or city
      </label>
      <input
        id="hero-locality"
        type="text"
        value={locality}
        onChange={(e) => setLocality(e.target.value)}
        placeholder="Enter Locality / City"
        className="flex-1 min-w-0 min-h-12 md:min-h-14 px-3 sm:px-4 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B]"
      />

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 min-h-12 md:min-h-14 px-5 w-full md:w-auto rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800 shadow-[0_6px_18px_rgba(45,158,107,0.35)] shrink-0"
      >
        <Search size={18} />
        Search Tutors
      </button>
    </form>
  );
}
