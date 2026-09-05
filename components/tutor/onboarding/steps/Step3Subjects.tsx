"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  formData: { subjects: string[]; classLevels: string[]; teachingMode: string; teachingRadius: number };
  onNext: (data: { subjects: string[]; classLevels: string[]; teachingMode: string; teachingRadius: number }) => void;
  onBack: () => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

import {
  TRUEMYTUTOR_TREE,
  type CategoryNode,
} from "@/lib/subject-taxonomy";

export { TRUEMYTUTOR_TREE, type CategoryNode };

export function Step3Subjects({ formData, onNext, onBack, isLoading, isAdminMode = false }: Props) {
  const [subjects, setSubjects] = useState<string[]>(formData.subjects || []);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleSubject(s: string) {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setErrors({});
  }

  function toggleSelectAll(subSubjects: string[]) {
    const allSelected = subSubjects.every((s) => subjects.includes(s));
    if (allSelected) {
      setSubjects((prev) => prev.filter((s) => !subSubjects.includes(s)));
    } else {
      const combined = new Set([...subjects, ...subSubjects]);
      setSubjects(Array.from(combined));
    }
    setErrors({});
  }

  function toggleNode(nodeKey: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  }

  function handleSubmit() {
    if (!isAdminMode && subjects.length === 0) {
      setErrors({ subjects: "Please select at least one subject." });
      return;
    }
    onNext({
      subjects,
      classLevels: ["General"],
      teachingMode: formData.teachingMode || "EITHER",
      teachingRadius: formData.teachingRadius || 10,
    });
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto py-2">
      {/* Page Title verbatim from TryMyTutor screenshot */}
      <h2 className="text-xl font-400 text-[#222222] text-center tracking-tight font-serif">
        Mark Your Skills & Subjects;
      </h2>

      {errors.subjects && (
        <p className="text-xs text-red-600 font-600 text-center">{errors.subjects}</p>
      )}

      {/* Accordion Tree View verbatim from TryMyTutor screenshot */}
      <div className="space-y-3.5 pl-4 py-2">
        {TRUEMYTUTOR_TREE.map((parent) => {
          const isParentExpanded = expandedNodes.has(parent.name);

          return (
            <div key={parent.name} className="space-y-2">
              {/* Top-Level Category Header */}
              <div
                onClick={() => toggleNode(parent.name)}
                className="flex items-center gap-1.5 text-xs font-800 text-gray-900 cursor-pointer hover:text-[#00a8ff] transition-colors select-none"
              >
                <span className="font-extrabold text-sm text-gray-900 w-4 text-left">
                  {isParentExpanded ? "-" : "+"}
                </span>
                <span>{parent.name}</span>
              </div>

              {/* Expanded Top-Level Content */}
              {isParentExpanded && (
                <div className="pl-5 space-y-3">
                  {/* If node has direct subjects */}
                  {parent.subjects && (
                    <>
                      <label className="flex items-center gap-2 text-[11px] font-600 text-[#00a8ff] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={
                            parent.subjects.length > 0 &&
                            parent.subjects.every((s) => subjects.includes(s))
                          }
                          onChange={() => toggleSelectAll(parent.subjects!)}
                          className="w-3.5 h-3.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 cursor-pointer accent-[#7dd3fc]"
                        />
                        <span>Select all</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2.5">
                        {parent.subjects.map((s) => {
                          const isChecked = subjects.includes(s);
                          return (
                            <label
                              key={s}
                              className="flex items-start gap-2 text-[11px] font-500 text-gray-700 cursor-pointer hover:text-[#00a8ff] select-none leading-tight"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSubject(s)}
                                className="w-3.5 h-3.5 mt-0.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 shrink-0 cursor-pointer accent-[#7dd3fc]"
                              />
                              <span>{s}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* If node has nested subcategories */}
                  {parent.subcategories && (
                    <div className="space-y-3.5">
                      {parent.subcategories.map((sub) => {
                        const subKey = `${parent.name} > ${sub.name}`;
                        const isSubExpanded = expandedNodes.has(subKey);

                        return (
                          <div key={subKey} className="space-y-2">
                            <div
                              onClick={() => toggleNode(subKey)}
                              className="flex items-center gap-1.5 text-xs font-700 text-gray-800 cursor-pointer hover:text-[#00a8ff] select-none"
                            >
                              <span className="font-extrabold text-sm text-gray-800 w-4 text-left">
                                {isSubExpanded ? "-" : "+"}
                              </span>
                              <span>{sub.name}</span>
                            </div>

                            {isSubExpanded && (
                              <div className="pl-5 space-y-3">
                                <label className="flex items-center gap-2 text-[11px] font-600 text-[#00a8ff] cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={
                                      sub.subjects.length > 0 &&
                                      sub.subjects.every((s) => subjects.includes(s))
                                    }
                                    onChange={() => toggleSelectAll(sub.subjects)}
                                    className="w-3.5 h-3.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 cursor-pointer accent-[#7dd3fc]"
                                  />
                                  <span>Select all</span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2.5">
                                  {sub.subjects.map((s) => {
                                    const isChecked = subjects.includes(s);
                                    return (
                                      <label
                                        key={s}
                                        className="flex items-start gap-2 text-[11px] font-500 text-gray-700 cursor-pointer hover:text-[#00a8ff] select-none leading-tight"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleSubject(s)}
                                          className="w-3.5 h-3.5 mt-0.5 rounded-2xs border-cyan-400 text-cyan-400 focus:ring-cyan-300 shrink-0 cursor-pointer accent-[#7dd3fc]"
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

      {/* Footer Instruction verbatim from TryMyTutor screenshot */}
      <p className="text-[11px] font-400 text-gray-500 text-center pt-2">
        Click on the subject category to see subjects. Click on checkbox to select the subjects you teach.
      </p>

      {/* Bottom Floating Navigation Buttons matching TryMyTutor screenshot */}
      <div className="flex justify-between items-center pt-6 max-w-lg mx-auto">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-full bg-[#5b9bd5] hover:bg-[#4a89c4] text-white font-700 text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-8 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-700 text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Next &rarr;
            </>
          )}
        </button>
      </div>
    </div>
  );
}
