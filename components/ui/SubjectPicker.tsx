"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Check, Layers, ChevronDown, ChevronRight } from "lucide-react";
import {
  TRUEMYTUTOR_TREE,
  FLATTENED_TAXONOMY_SUBJECTS,
  type CategoryNode,
} from "@/lib/subject-taxonomy";

export interface SubjectPickerProps {
  name?: string;
  value?: string[];
  selectedSubjects?: string[]; // compatibility alias
  onChange: (subjects: string[]) => void;
  max?: number;
  maxSelections?: number; // compatibility alias
  disabled?: boolean;
  classLevel?: string;
  hintText?: string;
  title?: string;
  showTitle?: boolean;
  compact?: boolean;
}

/**
 * Standardized, hard-pinned Subject Picker used across the entire platform
 * (User Directory, Tutor Onboarding, Tutor Profile, Staff CRM, Admin Modals).
 * Displays the canonical 18-category tree matching "Mark Your Skills & Subjects;"
 * Strictly disallows unstandardized/custom subjects.
 */
export function SubjectPicker({
  name = "subjects",
  value,
  selectedSubjects,
  onChange,
  max,
  maxSelections,
  disabled = false,
  classLevel,
  hintText = "Browse categories below or search to pick subjects.",
  title = "Mark Your Skills & Subjects;",
  showTitle = true,
  compact = false,
}: SubjectPickerProps) {
  // Normalize value & max from props or aliases
  const activeSubjects = useMemo(() => {
    return value ?? selectedSubjects ?? [];
  }, [value, selectedSubjects]);

  const maxLimit = max ?? maxSelections ?? 50;
  const atLimit = activeSubjects.length >= maxLimit;

  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Combo Subjects KG to 10th", "Science Subjects", "Maths"])
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleSubcategory = (subKey: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subKey)) next.delete(subKey);
      else next.add(subKey);
      return next;
    });
  };

  const toggleSubject = (subj: string) => {
    if (disabled) return;
    if (activeSubjects.includes(subj)) {
      onChange(activeSubjects.filter((s) => s !== subj));
    } else {
      if (!atLimit) {
        onChange([...activeSubjects, subj]);
      }
    }
  };

  const toggleSelectAll = (subSubjects: string[]) => {
    if (disabled) return;
    const allSelected = subSubjects.every((s) => activeSubjects.includes(s));
    if (allSelected) {
      onChange(activeSubjects.filter((s) => !subSubjects.includes(s)));
    } else {
      const remainingSlots = maxLimit - activeSubjects.length;
      const toAdd = subSubjects.filter((s) => !activeSubjects.includes(s)).slice(0, remainingSlots);
      onChange([...activeSubjects, ...toAdd]);
    }
  };

  const removeSubject = (subj: string) => {
    if (disabled) return;
    onChange(activeSubjects.filter((s) => s !== subj));
  };

  // Instant search filtering across the pre-indexed canonical subjects
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return FLATTENED_TAXONOMY_SUBJECTS.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.breadcrumb.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className={`space-y-3 text-slate-900 ${compact ? "text-xs" : ""}`}>
      {/* Hidden inputs for form actions */}
      {activeSubjects.map((s) => (
        <input key={s} type="hidden" name={name} value={s} />
      ))}

      {/* Main Title if enabled */}
      {showTitle && (
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0F2540] tracking-tight">
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Hard-pinned official platform taxonomy ({TRUEMYTUTOR_TREE.length} canonical categories)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#2D9E6B] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {activeSubjects.length} / {maxLimit} selected
            </span>
            {activeSubjects.length > 0 && !disabled && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Subjects Chips Box */}
      {activeSubjects.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
          {activeSubjects.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0F2540] shadow-2xs group hover:border-red-300 transition-colors"
            >
              <span>{s}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSubject(s)}
                  className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  aria-label={`Remove ${s}`}
                >
                  <X size={13} />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 font-semibold flex items-center gap-1.5">
          <span>💡</span>
          <span>{hintText}</span>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#2D9E6B] transition-colors">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects (e.g. Maths for Class X, Physics for NEET, French, Python)..."
            disabled={disabled || atLimit}
            className="flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Mode (Active when user types in search bar) */}
      {search.trim() ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-inner max-h-72 overflow-y-auto space-y-1.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500">
            <span>
              Search Results ({searchResults.length})
            </span>
            <span className="text-[#2D9E6B] text-[10px]">
              Strict taxonomy match only
            </span>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {searchResults.map(({ subject, breadcrumb }) => {
                const isSelected = activeSubjects.includes(subject);
                return (
                  <label
                    key={`${breadcrumb}-${subject}`}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSubject(subject)}
                      disabled={disabled || (atLimit && !isSelected)}
                      className="w-4 h-4 mt-0.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-slate-900 font-bold">{subject}</p>
                      <p className="text-[10px] text-slate-400 truncate">{breadcrumb}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-center space-y-1">
              <p className="text-xs font-bold text-slate-500">
                No standard subjects match &quot;{search}&quot;
              </p>
              <p className="text-[11px] text-slate-400">
                Only verified subjects from the official taxonomy can be chosen.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Hierarchical Category Tree (Exact match with Screenshot 2) */
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-inner max-h-80 overflow-y-auto space-y-2">
          <div className="text-[11px] font-bold text-slate-500 pb-1.5 border-b border-slate-100 flex items-center justify-between">
            <span>Subject Categories</span>
            <span className="text-slate-400 text-[10px] font-medium">Click [+] to expand</span>
          </div>

          <div className="space-y-2">
            {TRUEMYTUTOR_TREE.map((parent) => {
              const isParentExpanded = expandedCategories.has(parent.name);

              // Calculate how many subjects are currently selected in this branch
              let branchSelectedCount = 0;
              if (parent.subjects) {
                branchSelectedCount += parent.subjects.filter((s) => activeSubjects.includes(s)).length;
              }
              if (parent.subcategories) {
                parent.subcategories.forEach((sub) => {
                  branchSelectedCount += sub.subjects.filter((s) => activeSubjects.includes(s)).length;
                });
              }

              return (
                <div
                  key={parent.name}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden"
                >
                  {/* Category Header (+ / -) */}
                  <div
                    onClick={() => toggleCategory(parent.name)}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-100/80 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="w-4 text-center font-black text-sm text-[#2D9E6B]">
                        {isParentExpanded ? "−" : "+"}
                      </span>
                      <span>{parent.name}</span>
                    </div>
                    {branchSelectedCount > 0 && (
                      <span className="text-[10px] font-black bg-[#2D9E6B] text-white px-2 py-0.5 rounded-full">
                        {branchSelectedCount} selected
                      </span>
                    )}
                  </div>

                  {/* Expanded Category Content */}
                  {isParentExpanded && (
                    <div className="p-3 pt-1.5 pl-6 space-y-3 bg-white border-t border-slate-100">
                      {/* Direct Category Subjects */}
                      {parent.subjects && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#2D9E6B] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={
                                parent.subjects.length > 0 &&
                                parent.subjects.every((s) => activeSubjects.includes(s))
                              }
                              onChange={() => toggleSelectAll(parent.subjects!)}
                              className="w-3.5 h-3.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                            />
                            <span>Select all in {parent.name}</span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {parent.subjects.map((s) => {
                              const isChecked = activeSubjects.includes(s);
                              return (
                                <label
                                  key={s}
                                  className={`flex items-start gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer select-none leading-tight transition-colors ${
                                    isChecked
                                      ? "bg-emerald-50 text-emerald-950 font-bold"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSubject(s)}
                                    disabled={disabled || (atLimit && !isChecked)}
                                    className="w-3.5 h-3.5 mt-0.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] shrink-0 cursor-pointer accent-[#2D9E6B]"
                                  />
                                  <span>{s}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Nested Subcategories */}
                      {parent.subcategories && (
                        <div className="space-y-2.5">
                          {parent.subcategories.map((sub) => {
                            const subKey = `${parent.name} > ${sub.name}`;
                            const isSubExpanded = expandedSubcategories.has(subKey);
                            const subSelectedCount = sub.subjects.filter((s) => activeSubjects.includes(s)).length;

                            return (
                              <div
                                key={subKey}
                                className="rounded-lg border border-slate-100 p-2 bg-slate-50/40 space-y-2"
                              >
                                <div
                                  onClick={() => toggleSubcategory(subKey)}
                                  className="flex items-center justify-between cursor-pointer hover:text-[#2D9E6B] select-none text-xs font-bold text-slate-800"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3.5 text-center font-black text-xs text-slate-500">
                                      {isSubExpanded ? "−" : "+"}
                                    </span>
                                    <span>{sub.name}</span>
                                  </div>
                                  {subSelectedCount > 0 && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                                      {subSelectedCount}
                                    </span>
                                  )}
                                </div>

                                {isSubExpanded && (
                                  <div className="pl-4 space-y-2 pt-1">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#2D9E6B] cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={
                                          sub.subjects.length > 0 &&
                                          sub.subjects.every((s) => activeSubjects.includes(s))
                                        }
                                        onChange={() => toggleSelectAll(sub.subjects)}
                                        className="w-3.5 h-3.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                                      />
                                      <span>Select all {sub.name}</span>
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {sub.subjects.map((s) => {
                                        const isChecked = activeSubjects.includes(s);
                                        return (
                                          <label
                                            key={s}
                                            className={`flex items-start gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer select-none leading-tight transition-colors ${
                                              isChecked
                                                ? "bg-emerald-50 text-emerald-950 font-bold"
                                                : "hover:bg-slate-50 text-slate-700"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleSubject(s)}
                                              disabled={disabled || (atLimit && !isChecked)}
                                              className="w-3.5 h-3.5 mt-0.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] shrink-0 cursor-pointer accent-[#2D9E6B]"
                                            />
                                            <span>{s}</span>
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
      )}

      {/* Verbatim footer instruction from Screenshot 2 */}
      <p className="text-[11px] text-slate-500 text-center pt-1 font-medium">
        Click on the subject category to see subjects. Click on checkbox to select the subjects you teach.
      </p>
    </div>
  );
}
