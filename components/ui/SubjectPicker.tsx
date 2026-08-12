"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, Plus } from "lucide-react";
import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";

export function SubjectPicker({
  name = "subjects",
  value = [],
  onChange,
  max = 50,
  disabled = false,
  hintText = "Select subjects from the dropdown or type to search automatically.",
}: {
  name?: string;
  value: string[];
  onChange: (subjects: string[]) => void;
  max?: number;
  disabled?: boolean;
  hintText?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);

  const allSubjects = useMemo(() => {
    const list: { subject: string; group: string }[] = [];
    TRUEMYTUTOR_TREE.forEach((node) => {
      if (node.subjects) {
        node.subjects.forEach((s) => {
          list.push({ subject: s, group: node.name });
        });
      }
      if (node.subcategories) {
        node.subcategories.forEach((sub) => {
          sub.subjects.forEach((s) => {
            list.push({ subject: s, group: `${node.name} > ${sub.name}` });
          });
        });
      }
    });
    return list;
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["ALL"]);
    TRUEMYTUTOR_TREE.forEach((node) => set.add(node.name));
    return Array.from(set);
  }, []);

  const filteredSubjects = useMemo(() => {
    let result = allSubjects;
    if (activeCategory !== "ALL") {
      result = result.filter((item) => item.group.startsWith(activeCategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.subject.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allSubjects, activeCategory, search]);

  const atLimit = value.length >= max;

  const toggleSubject = (subj: string) => {
    if (value.includes(subj)) {
      onChange(value.filter((s) => s !== subj));
    } else {
      if (!atLimit) {
        onChange([...value, subj]);
      }
    }
  };

  const removeSubject = (subj: string) => {
    onChange(value.filter((s) => s !== subj));
  };

  const addCustomSubject = () => {
    const custom = search.trim();
    if (custom && !value.includes(custom) && !atLimit) {
      onChange([...value, custom]);
      setSearch("");
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-3 relative text-slate-900">
      {/* Hidden Inputs for Form Submit */}
      {value.map((s) => (
        <input key={s} type="hidden" name={name} value={s} />
      ))}

      {/* Header bar with counter */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-800 uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>Selected Subjects</span>
          <span className="text-[10px] font-800 text-[#2D9E6B] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {value.length}/{max}
          </span>
        </label>
        {atLimit && (
          <span className="text-[11px] font-700 text-amber-700">
            Maximum {max} subjects reached
          </span>
        )}
      </div>

      {/* Selected Chips Bar */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          {value.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-800 text-[#0F2540] shadow-2xs group hover:border-red-300 transition-colors"
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
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-700">
          💡 {hintText}
        </div>
      )}

      {/* Search Input Field */}
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-300 shadow-2xs focus-within:border-[#2D9E6B]">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Type to search subjects (e.g., Mathematics, Physics, Coding)..."
            disabled={disabled || atLimit}
            className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-80 flex flex-col">
            {/* Category Filter Pills & Cute Close Button Bar */}
            <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden py-0.5 flex-1 pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-800 whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-[#0F2540] text-white shadow-2xs"
                        : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Cute Animated Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close dropdown"
                aria-label="Close subject selector dropdown"
                className="group relative flex items-center justify-center w-7 h-7 rounded-full bg-white hover:bg-rose-500 text-slate-500 hover:text-white border border-slate-200 hover:border-rose-500 transition-all duration-200 hover:scale-115 active:scale-90 shadow-2xs shrink-0 cursor-pointer"
              >
                <X size={14} className="transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>

            {/* Subject Options List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map(({ subject, group }) => {
                  const isSelected = value.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      disabled={atLimit && !isSelected}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-700 transition-colors text-left cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-[#2D9E6B] font-800"
                          : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{subject}</span>
                        <span className="text-[10px] font-600 text-slate-400">({group})</span>
                      </div>
                      {isSelected && <Check size={14} className="text-[#2D9E6B] shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs font-700 text-slate-500">No subjects found matching &quot;{search}&quot;</p>
                  {search.trim() && !atLimit && (
                    <button
                      type="button"
                      onClick={addCustomSubject}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D9E6B] text-white text-xs font-800 hover:bg-[#238357]"
                    >
                      <Plus size={14} />
                      <span>Add &quot;{search.trim()}&quot; as custom subject</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
