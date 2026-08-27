"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

interface HomeHeroCardProps {
  user: any;
  dashboardUrl: string;
  isParent: boolean;
}

const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "English", "Accountancy", "JEE Prep", "NEET Prep",
  "Coding / CS", "Hindi"
];

export function HomeHeroCard({ user, dashboardUrl, isParent }: HomeHeroCardProps) {
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [tuitionMode, setTuitionMode] = useState<"home" | "online">("home");

  const postUrl = user
    ? (isParent ? `/parent/post-requirement?subject=${encodeURIComponent(selectedSubject)}&mode=${tuitionMode}` : dashboardUrl)
    : `/register?subject=${encodeURIComponent(selectedSubject)}&mode=${tuitionMode}`;

  const tutorUrl = user
    ? (user.role === "TUTOR" ? "/tutor/dashboard" : dashboardUrl)
    : "/register?role=tutor";

  return (
    <div className="hero-card bg-white rounded-3xl shadow-xl p-4 sm:p-7 border border-gray-300 relative overflow-hidden hero-bob">
      {/* Top Gradient Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ background: "linear-gradient(90deg, #0F2540, #2D9E6B, #F5A623)" }}
      />

      <div className="mb-4">
        <h2 className="font-800 text-xl text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Find Tutors by Subject
        </h2>
        <p className="text-xs text-gray-900 font-600">
          Select a subject to post your requirement
        </p>
      </div>

      {/* Subject Pill Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 mb-5">
        {SUBJECT_OPTIONS.map((subject) => {
          const isActive = selectedSubject === subject;
          return (
            <button
              key={subject}
              type="button"
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-2.5 rounded-xl text-xs font-700 transition-all text-center border cursor-pointer ${
                isActive
                  ? "bg-amber-200 border-amber-400 text-amber-950 font-800 shadow-xs"
                  : "bg-gray-100 border-gray-300 text-gray-900 font-700 hover:bg-gray-200"
              }`}
            >
              {subject}
            </button>
          );
        })}
      </div>

      {/* Tuition Mode Toggle */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTuitionMode("home")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-800 border transition-all cursor-pointer ${
            tuitionMode === "home"
              ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-2xs"
              : "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200"
          }`}
        >
          🏠 Home Tuition
        </button>
        <button
          type="button"
          onClick={() => setTuitionMode("online")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-800 border transition-all cursor-pointer ${
            tuitionMode === "online"
              ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-2xs"
              : "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200"
          }`}
        >
          💻 Live Online
        </button>
      </div>

      {/* Primary CTA */}
      <Link
        href={postUrl}
        className="w-full py-4 px-4 rounded-2xl text-xs font-800 bg-[#2D9E6B] hover:bg-[#238357] !text-white flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-center"
      >
        <span className="!text-white font-800 break-words min-w-0">Post Requirement for {selectedSubject} →</span>
        <ArrowRight size={16} className="!text-white" />
      </Link>

      {/* Secondary Tutor Link */}
      <div className="mt-4 text-center">
        <Link href={tutorUrl} className="text-xs font-800 text-[#0F2540] hover:text-[#2D9E6B] underline underline-offset-4">
          Are you a tutor? Register here →
        </Link>
      </div>
    </div>
  );
}
