"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";
import { searchSmartSubjects } from "@/lib/subject-matcher";

export type NeedStepId = "subject" | "class" | "board" | "mode" | "city" | "budget";

export const NEED_AVATARS = [
  "/images/tutors/tutor_1.png",
  "/images/tutors/tutor_2.png",
  "/images/tutors/tutor_3.png",
];

export const BOARD_OPTIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ISC/ICSE" },
  { value: "State Board", label: "State" },
  { value: "IB", label: "International Baccalaureate" },
  { value: "NIOS", label: "NIOS" },
  { value: "A Levels", label: "AS/A levels" },
  { value: "Other", label: "Other / Not sure" },
];

export const MODE_OPTIONS = [
  { value: "EITHER", label: "Home tuition or online" },
  { value: "OFFLINE", label: "Home tuition" },
  { value: "ONLINE", label: "Live online classes" },
  { value: "COACHING", label: "Coaching centre" },
];

export const BUDGET_OPTIONS = [
  { value: 3000, label: "Up to ₹3,000 / month" },
  { value: 6000, label: "₹3,000 – ₹6,000 / month" },
  { value: 10000, label: "₹6,000 – ₹10,000 / month" },
  { value: 15000, label: "₹10,000 – ₹15,000 / month" },
  { value: 99999, label: "Above ₹15,000 / month" },
];

const STEP_COPY: Record<NeedStepId, { title: string; search: string }> = {
  subject: { title: "Which subject do you need help with?", search: "Search subjects..." },
  class: { title: "Which class or level are you looking for?", search: "Search class..." },
  board: { title: "Which board of education are you looking for?", search: "Search..." },
  mode: { title: "How would you like to take classes?", search: "Search..." },
  city: { title: "Which city or locality are you in?", search: "Search city..." },
  budget: { title: "What is your monthly budget?", search: "Search..." },
};

function RadioRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 border-b border-[#F1F5F9] px-1 py-3.5 text-left transition-colors ${
        selected ? "bg-[#F3FBF7]" : "bg-white hover:bg-[#F8FAFC]"
      }`}
    >
      <span className={`text-[15px] ${selected ? "font-700 text-[#0F2540]" : "font-500 text-[#334155]"}`}>
        {label}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-[#2D9E6B]" : "border-[#CBD5E1]"
        }`}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[#2D9E6B]" /> : null}
      </span>
    </button>
  );
}

export function NeedMatchWizard({
  stepId,
  stepIndex,
  stepCount,
  matchTotal,
  options,
  value,
  onPick,
  onBack,
  onViewAll,
  showingAll,
  hasMore,
  dir,
}: {
  stepId: NeedStepId;
  stepIndex: number;
  stepCount: number;
  matchTotal: number;
  options: { value: string; label: string }[];
  value: string;
  onPick: (value: string) => void;
  onBack: () => void;
  onViewAll: () => void;
  showingAll: boolean;
  hasMore: boolean;
  dir: "forward" | "back";
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    setQuery("");
  }, [stepId]);
  const copy = STEP_COPY[stepId];
  const progress = ((stepIndex + 1) / stepCount) * 100;
  const extra = Math.max(matchTotal - NEED_AVATARS.length, 0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const directMatches = options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
    if (directMatches.length > 0) return directMatches;

    if (stepId === "subject") {
      const smart = searchSmartSubjects(query.trim(), 12);
      if (smart.length > 0) {
        return smart.map((s) => ({ value: s.name, label: s.name }));
      }
      return [{ value: query.trim(), label: `"${query.trim()}" (Custom Subject)` }];
    }
    return directMatches;
  }, [options, query, stepId]);

  const needsScroll = filtered.length > 8;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[radial-gradient(1200px_700px_at_70%_20%,#34d399_0%,transparent_55%),linear-gradient(135deg,#0F766E_0%,#14B8A6_48%,#2D9E6B_100%)]">
      <div className="pointer-events-none absolute bottom-10 left-6 hidden lg:block">
        <div className="flex items-end gap-1 opacity-40">
          <span className="h-16 w-12 rounded-sm bg-white/30" />
          <span className="h-24 w-14 rounded-sm bg-white/45" />
          <span className="h-20 w-12 rounded-sm bg-white/25" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[70%] w-[38%] lg:block">
        <div className="relative h-full w-full overflow-hidden">
        <Image
          src="/images/tutors/tutor_2.png"
          alt=""
          fill
          sizes="38vw"
          className="object-cover object-top opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0D9488]" />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[720px] items-center justify-center gap-4 px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0F2540] shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl bg-white shadow-[0_8px_16px_rgba(0,0,0,0.12),0_28px_64px_rgba(0,0,0,0.28)]">
          <div className="h-[3px] bg-[#E2E8F0]">
            <div className="h-full bg-[#2D9E6B] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-8">
            <p className="pt-1 text-[11px] font-800 uppercase tracking-[0.14em] text-[#94A3B8]">
              Step {stepIndex + 1} of {stepCount}
            </p>
            <div className="text-right">
              <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-[#64748B]">Matches Found</p>
              <div className="mt-1.5 flex items-center justify-end">
                <div className="flex -space-x-2">
                  {NEED_AVATARS.map((src) => (
                    <Image
                      key={src}
                      src={src}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                </div>
                <span className="ml-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#E8F7F0] px-1.5 text-[11px] font-800 text-[#0F2540] shadow-sm">
                  +{extra > 0 ? extra : Math.max(matchTotal, 12)}
                </span>
              </div>
            </div>
          </div>

          <div
            key={stepId}
            className={`px-6 pb-7 pt-3 sm:px-8 ${
              dir === "back" ? "animate-in fade-in slide-in-from-left-4 duration-300" : "animate-in fade-in slide-in-from-right-4 duration-300"
            }`}
          >
            <h1 className="text-[22px] font-800 leading-snug text-[#0F2540] sm:text-[26px]" style={{ fontFamily: "Poppins, sans-serif" }}>
              {copy.title}
            </h1>

            <div className="relative mt-4">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.search}
                className="h-11 w-full rounded-md border border-[#D0D5DD] bg-white pl-10 pr-3 text-sm font-500 text-[#0F2540] outline-none placeholder:text-[#94A3B8] focus:border-[#2D9E6B]"
              />
            </div>

            <div
              className={`mt-1 ${
                needsScroll
                  ? "max-h-[min(48vh,340px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                  : "overflow-visible"
              }`}
            >
              {filtered.length === 0 ? (
                <p className="px-1 py-6 text-sm font-600 text-[#64748B]">No matching option. Try another search.</p>
              ) : (
                filtered.map((opt) => (
                  <RadioRow
                    key={opt.value}
                    label={opt.label}
                    selected={value === opt.value}
                    onSelect={() => onPick(opt.value)}
                  />
                ))
              )}
            </div>

            {hasMore && !query.trim() ? (
              <button
                type="button"
                onClick={onViewAll}
                className="mt-4 text-sm font-700 text-[#2563EB] hover:underline"
              >
                {showingAll ? "Show fewer options" : "Can't find what you are looking for? View all options"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
