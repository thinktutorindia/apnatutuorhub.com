"use client";

import { SlidersHorizontal, RotateCcw } from "lucide-react";
import type { TutorSearchFilters, SortOrder } from "@/lib/search/types";

type Props = {
  filters: TutorSearchFilters;
  sort: SortOrder;
  onFilterChange: (filters: TutorSearchFilters) => void;
  onSortChange: (sort: SortOrder) => void;
  onReset: () => void;
};

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Computer Science",
  "Economics",
  "Accountancy",
];

const MODE_OPTIONS = [
  { label: "All Modes", value: undefined },
  { label: "Online", value: "ONLINE" },
  { label: "Home (Offline)", value: "OFFLINE" },
  { label: "Coaching / Institute", value: "COACHING" },
];

export function SearchFilters({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onReset,
}: Props) {
  const toggleSubject = (subject: string) => {
    const current = filters.subjects ?? [];
    const updated = current.includes(subject)
      ? current.filter((s) => s !== subject)
      : [...current, subject];
    onFilterChange({ ...filters, subjects: updated });
  };

  return (
    <aside className="neu-card space-y-5 bg-white p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 font-black text-[#0F172A]">
          <SlidersHorizontal size={16} />
          <span>Filters & Sort</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-extrabold text-slate-500 hover:text-[#22C55E]"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-[#0F172A]">Sort By</label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          className="neu-input w-full text-xs py-2 font-semibold"
        >
          <option value="best_match">Best Match</option>
          <option value="rating_desc">Highest Rated</option>
          <option value="nearest">Nearest First</option>
          <option value="featured">Featured First</option>
          <option value="newest">Newest Tutors</option>
        </select>
      </div>

      {/* Teaching Mode */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-[#0F172A]">Teaching Mode</label>
        <div className="flex flex-wrap gap-1.5">
          {MODE_OPTIONS.map((mode) => {
            const isSelected = filters.teachingMode === mode.value;
            return (
              <button
                key={mode.label}
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    teachingMode: mode.value as any,
                  })
                }
                className={`rounded-xl border-2 border-[#0F172A] px-3 py-1 text-xs font-black transition-all ${
                  isSelected
                    ? "bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)]"
                    : "bg-white text-[#0F172A] hover:bg-slate-50"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subjects multi-select */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-[#0F172A]">Subjects</label>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_OPTIONS.map((sub) => {
            const isSelected = filters.subjects?.includes(sub);
            return (
              <button
                key={sub}
                type="button"
                onClick={() => toggleSubject(sub)}
                className={`rounded-xl border-2 border-[#0F172A] px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                  isSelected
                    ? "bg-[#DCFCE7] text-[#0F172A] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience & Rating */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-[#0F172A]">Min Experience</label>
          <select
            value={filters.minExperience ?? 0}
            onChange={(e) =>
              onFilterChange({ ...filters, minExperience: Number(e.target.value) })
            }
            className="neu-input w-full text-xs py-2"
          >
            <option value={0}>Any Experience</option>
            <option value={1}>1+ Years</option>
            <option value={3}>3+ Years</option>
            <option value={5}>5+ Years</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-[#0F172A]">Min Rating</label>
          <select
            value={filters.minRating ?? 0}
            onChange={(e) =>
              onFilterChange({ ...filters, minRating: Number(e.target.value) })
            }
            className="neu-input w-full text-xs py-2"
          >
            <option value={0}>Any Rating</option>
            <option value={4}>⭐ 4.0 & above</option>
            <option value={4.5}>⭐ 4.5 & above</option>
          </select>
        </div>
      </div>

      {/* Verifications & Badges */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-xs font-bold text-[#0F172A] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(filters.isVerified)}
            onChange={(e) =>
              onFilterChange({ ...filters, isVerified: e.target.checked })
            }
            className="rounded border-2 border-[#0F172A] text-[#22C55E]"
          />
          <span>Verified Tutors Only (KYC Approved)</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-bold text-[#0F172A] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(filters.isFeatured)}
            onChange={(e) =>
              onFilterChange({ ...filters, isFeatured: e.target.checked })
            }
            className="rounded border-2 border-[#0F172A] text-[#22C55E]"
          />
          <span>Featured Tutors Only</span>
        </label>
      </div>
    </aside>
  );
}
