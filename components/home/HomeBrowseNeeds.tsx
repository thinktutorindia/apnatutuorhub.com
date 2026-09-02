"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Atom,
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Landmark,
  Languages,
  Leaf,
  Sparkles,
  Stethoscope,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = {
  label: string;
  hint?: string;
  subject: string;
  classLevel?: string;
  icon: LucideIcon;
  tint: string;
};

const SUBJECTS: Item[] = [
  { label: "Mathematics", subject: "Mathematics", icon: Calculator, tint: "bg-[#E8F7F0] text-[#238357]" },
  { label: "Physics", subject: "Physics", icon: Atom, tint: "bg-[#EEF3F8] text-[#0F2540]" },
  { label: "Chemistry", subject: "Chemistry", icon: FlaskConical, tint: "bg-[#FDE8D0] text-[#B45309]" },
  { label: "Biology", subject: "Biology", icon: Leaf, tint: "bg-[#E8F7F0] text-[#238357]" },
  { label: "English", subject: "English", icon: BookOpen, tint: "bg-[#EEF3F8] text-[#0F2540]" },
  { label: "Science", subject: "Science", icon: Sparkles, tint: "bg-[#F7F1E8] text-[#0F2540]" },
  { label: "Accounts", subject: "Accountancy", icon: Landmark, tint: "bg-[#FDE8D0] text-[#B45309]" },
  { label: "Economics", subject: "Economics", icon: Briefcase, tint: "bg-[#EEF3F8] text-[#0F2540]" },
  { label: "Hindi", subject: "Hindi", icon: Languages, tint: "bg-[#F7F1E8] text-[#0F2540]" },
  { label: "IIT-JEE", subject: "JEE Prep", classLevel: "IIT-JEE", icon: Trophy, tint: "bg-[#E8F7F0] text-[#238357]" },
  { label: "NEET", subject: "NEET Biology", classLevel: "NEET", icon: Stethoscope, tint: "bg-[#EEF3F8] text-[#0F2540]" },
  { label: "Coding", subject: "Coding & CS", classLevel: "Coding & IT", icon: Code2, tint: "bg-[#FDE8D0] text-[#B45309]" },
];

const CLASSES: Item[] = [
  { label: "Class 1–5", hint: "All subjects", subject: "Mathematics", classLevel: "Class 3", icon: BookOpen, tint: "bg-[#F7F1E8] text-[#0F2540]" },
  { label: "Class 6–8", hint: "Maths & Science", subject: "Mathematics", classLevel: "Class 7", icon: Calculator, tint: "bg-[#E8F7F0] text-[#238357]" },
  { label: "Class 9–10", hint: "Board exams", subject: "Mathematics", classLevel: "Class 10", icon: Sparkles, tint: "bg-[#EEF3F8] text-[#0F2540]" },
  { label: "11–12 Science", hint: "PCM / PCB", subject: "Physics", classLevel: "Class 12", icon: FlaskConical, tint: "bg-[#E8F7F0] text-[#238357]" },
  { label: "11–12 Commerce", hint: "Accounts", subject: "Accountancy", classLevel: "Class 12", icon: Landmark, tint: "bg-[#FDE8D0] text-[#B45309]" },
  { label: "IIT-JEE / NEET", hint: "Entrance", subject: "JEE Prep", classLevel: "IIT-JEE", icon: Trophy, tint: "bg-[#EEF3F8] text-[#0F2540]" },
];

const CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Gurugram",
  "Noida",
  "Chennai",
  "Kolkata",
  "Jaipur",
];

export function HomeBrowseNeeds({
  isParent,
  loggedIn,
  dashboardUrl,
}: {
  isParent: boolean;
  loggedIn: boolean;
  dashboardUrl: string;
}) {
  const [tab, setTab] = useState<"subjects" | "classes">("subjects");
  const items = tab === "subjects" ? SUBJECTS : CLASSES;

  const hrefFor = (item: { subject: string; classLevel?: string; city?: string }) => {
    if (loggedIn && !isParent) return dashboardUrl;
    const params = new URLSearchParams();
    if (item.subject) params.set("subject", item.subject);
    if (item.classLevel) params.set("classLevel", item.classLevel);
    if (item.city) params.set("city", item.city);
    if (loggedIn && isParent) return `/parent/post-requirement?${params.toString()}`;
    return `/find-tutor?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h2
            className="text-2xl sm:text-3xl font-800 text-[#0F2540]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Tutors according to your need
          </h2>
          <p className="text-[15px] font-500 text-[#64748B]">
            Pick a subject or class. We match verified teachers nearby.
          </p>
        </div>
        <div className="flex p-1 rounded-2xl bg-white border border-[#E2E8F0] w-fit">
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`cursor-pointer min-h-11 px-5 rounded-xl text-sm font-800 ${
              tab === "subjects" ? "bg-[#0F2540] text-white" : "text-[#334155]"
            }`}
          >
            Subjects
          </button>
          <button
            type="button"
            onClick={() => setTab("classes")}
            className={`cursor-pointer min-h-11 px-5 rounded-xl text-sm font-800 ${
              tab === "classes" ? "bg-[#0F2540] text-white" : "text-[#334155]"
            }`}
          >
            Classes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={hrefFor(item)}
              className="cursor-pointer group rounded-3xl bg-white border border-[#E2E8F0] px-3 py-5 sm:py-6 flex flex-col items-center text-center gap-3 hover:border-[#2D9E6B] hover:shadow-[0_10px_28px_rgba(15,37,64,0.08)]"
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.tint}`}>
                <Icon size={22} />
              </span>
              <span className="space-y-0.5">
                <span className="block text-[13px] sm:text-sm font-800 text-[#0F2540] leading-snug">
                  {item.label}
                </span>
                {item.hint && (
                  <span className="block text-[11px] font-600 text-[#94A3B8]">{item.hint}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-600 text-[#64748B]">
        <span className="font-800 text-[#0F2540] mr-1">Home tutors in</span>
        {CITIES.map((city, i) => (
          <span key={city} className="inline-flex items-center">
            <Link
              href={hrefFor({ subject: "Mathematics", city })}
              className="cursor-pointer text-[#2D9E6B] hover:underline"
            >
              {city}
            </Link>
            {i < CITIES.length - 1 && <span className="mx-1.5 text-[#CBD5E1]">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
