"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, Plus, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { TRUEMYTUTOR_TREE, type CategoryNode } from "@/components/tutor/onboarding/steps/Step3Subjects";

interface SubjectPickerProps {
  name?: string;
  value: string[];
  onChange: (subjects: string[]) => void;
  max?: number;
  disabled?: boolean;
  classLevel?: string;
  hintText?: string;
}

export function SubjectPicker({
  name = "subjects",
  value = [],
  onChange,
  max = 50,
  disabled = false,
  classLevel,
  hintText = "Browse categories below or search to pick detailed subjects.",
}: SubjectPickerProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Combo Subjects KG to 10th", "Science Subjects", "Maths"]));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "search">("tree");

  const atLimit = value.length >= max;

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
    if (value.includes(subj)) {
      onChange(value.filter((s) => s !== subj));
    } else {
      if (!atLimit) {
        onChange([...value, subj]);
      }
    }
  };

  const toggleSelectAll = (subSubjects: string[]) => {
    if (disabled) return;
    const allSelected = subSubjects.every((s) => value.includes(s));
    if (allSelected) {
      onChange(value.filter((s) => !subSubjects.includes(s)));
    } else {
      const remainingSlots = max - value.length;
      const toAdd = subSubjects.filter((s) => !value.includes(s)).slice(0, remainingSlots);
      onChange([...value, ...toAdd]);
    }
  };

  const removeSubject = (subj: string) => {
    if (disabled) return;
    onChange(value.filter((s) => s !== subj));
  };

  // Flatten all subjects for rapid search
  const allFlattenedSubjects = useMemo(() => {
    const list: { subject: string; group: string; parentCategory: string }[] = [];
    TRUEMYTUTOR_TREE.forEach((node) => {
      if (node.subjects) {
        node.subjects.forEach((s) => {
          list.push({ subject: s, group: node.name, parentCategory: node.name });
        });
      }
      if (node.subcategories) {
        node.subcategories.forEach((sub) => {
          sub.subjects.forEach((s) => {
            list.push({ subject: s, group: `${node.name} > ${sub.name}`, parentCategory: node.name });
          });
        });
      }
    });
    return list;
  }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return allFlattenedSubjects.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [allFlattenedSubjects, search]);

  const addCustomSubject = () => {
    const custom = search.trim();
    if (custom && !value.includes(custom) && !atLimit) {
      onChange([...value, custom]);
      setSearch("");
    }
  };

  return (
    <div className="space-y-3.5 text-slate-900">
      {/* Hidden Inputs for Next.js Server Action Form Submission */}
      {value.map((s) => (
        <input key={s} type="hidden" name={name} value={s} />
      ))}

      {/* Header bar with counter */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-800 uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers size={14} className="text-[#2D9E6B]" />
          <span>Selected Subjects</span>
          <span className="text-[11px] font-800 text-[#2D9E6B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {value.length}/{max}
          </span>
        </label>
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] font-700 text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Clear all ({value.length})
          </button>
        )}
      </div>

      {/* Selected Subjects Chips Bar */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
          {value.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-xs font-800 text-[#0F2540] shadow-2xs group hover:border-red-300 transition-colors"
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
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-700 flex items-center gap-1.5">
          <span>💡</span>
          <span>{hintText}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#2D9E6B]">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects (e.g. Maths for Class X, Physics for NEET, French, Python)..."
            disabled={disabled || atLimit}
            className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Mode (When typing) */}
      {search.trim() ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-inner max-h-72 overflow-y-auto space-y-1.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] font-800 text-slate-500">
            <span>Search Results ({searchResults.length})</span>
            <span className="text-[#2D9E6B]">Click to toggle</span>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {searchResults.map(({ subject, group }) => {
                const isSelected = value.includes(subject);
                return (
                  <label
                    key={subject}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs font-700 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-800"
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
                      <p className="truncate">{subject}</p>
                      <p className="text-[10px] font-600 text-slate-400 truncate">{group}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs font-700 text-slate-500">No standard subjects match &quot;{search}&quot;</p>
              {!atLimit && (
                <button
                  type="button"
                  onClick={addCustomSubject}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D9E6B] text-white text-xs font-800 hover:bg-[#238357] cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Add &quot;{search.trim()}&quot; as custom subject</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Hierarchical Category Accordion (Exact match with Tutor Onboarding) */
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-inner max-h-80 overflow-y-auto space-y-2.5">
          <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
            <span>Subject Categories (Hierarchical Tree)</span>
            <span className="text-slate-400 font-600">Click [+] to expand</span>
          </div>

          {TRUEMYTUTOR_TREE.map((parent) => {
            const isParentExpanded = expandedCategories.has(parent.name);

            // Calculate selected count in this category
            let selectedCount = 0;
            if (parent.subjects) {
              selectedCount += parent.subjects.filter((s) => value.includes(s)).length;
            }
            if (parent.subcategories) {
              parent.subcategories.forEach((sub) => {
                selectedCount += sub.subjects.filter((s) => value.includes(s)).length;
              });
            }

            return (
              <div key={parent.name} className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden">
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(parent.name)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-100 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 text-xs font-800 text-slate-800">
                    <span className="w-4 text-center font-black text-sm text-[#2D9E6B]">
                      {isParentExpanded ? "−" : "+"}
                    </span>
                    <span>{parent.name}</span>
                  </div>
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-800 bg-[#2D9E6B] text-white px-2 py-0.5 rounded-full">
                      {selectedCount} selected
                    </span>
                  )}
                </div>

                {/* Expanded Category Content */}
                {isParentExpanded && (
                  <div className="p-3 pt-1 pl-6 space-y-3 bg-white border-t border-slate-100">
                    {/* Direct Category Subjects */}
                    {parent.subjects && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[11px] font-800 text-[#2D9E6B] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={
                              parent.subjects.length > 0 &&
                              parent.subjects.every((s) => value.includes(s))
                            }
                            onChange={() => toggleSelectAll(parent.subjects!)}
                            className="w-3.5 h-3.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                          />
                          <span>Select all in {parent.name}</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {parent.subjects.map((s) => {
                            const isChecked = value.includes(s);
                            return (
                              <label
                                key={s}
                                className={`flex items-start gap-2 p-1.5 rounded-lg text-xs font-600 cursor-pointer select-none leading-tight transition-colors ${
                                  isChecked
                                    ? "bg-emerald-50 text-emerald-950 font-800"
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

                    {/* Subcategories */}
                    {parent.subcategories && (
                      <div className="space-y-3">
                        {parent.subcategories.map((sub) => {
                          const subKey = `${parent.name} > ${sub.name}`;
                          const isSubExpanded = expandedSubcategories.has(subKey);
                          const subSelectedCount = sub.subjects.filter((s) => value.includes(s)).length;

                          return (
                            <div key={subKey} className="rounded-lg border border-slate-100 p-2 bg-slate-50/40 space-y-2">
                              <div
                                onClick={() => toggleSubcategory(subKey)}
                                className="flex items-center justify-between cursor-pointer hover:text-[#2D9E6B] select-none text-xs font-800 text-slate-800"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3.5 text-center font-black text-xs text-slate-500">
                                    {isSubExpanded ? "−" : "+"}
                                  </span>
                                  <span>{sub.name}</span>
                                </div>
                                {subSelectedCount > 0 && (
                                  <span className="text-[10px] font-800 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                                    {subSelectedCount}
                                  </span>
                                )}
                              </div>

                              {isSubExpanded && (
                                <div className="pl-4 space-y-2 pt-1">
                                  <label className="flex items-center gap-1.5 text-[11px] font-700 text-[#2D9E6B] cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={
                                        sub.subjects.length > 0 &&
                                        sub.subjects.every((s) => value.includes(s))
                                      }
                                      onChange={() => toggleSelectAll(sub.subjects)}
                                      className="w-3.5 h-3.5 rounded-sm text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer accent-[#2D9E6B]"
                                    />
                                    <span>Select all {sub.name}</span>
                                  </label>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {sub.subjects.map((s) => {
                                      const isChecked = value.includes(s);
                                      return (
                                        <label
                                          key={s}
                                          className={`flex items-start gap-2 p-1.5 rounded-lg text-xs font-600 cursor-pointer select-none leading-tight transition-colors ${
                                            isChecked
                                              ? "bg-emerald-50 text-emerald-950 font-800"
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
      )}
    </div>
  );
}
