"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface UserSubjectChipsProps {
  subjects: string[];
  maxVisible?: number;
}

export function UserSubjectChips({
  subjects,
  maxVisible = 2,
}: UserSubjectChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

  if (!subjects || subjects.length === 0) {
    return <span className="text-[11px] text-slate-400 font-medium">—</span>;
  }

  const visibleSubjects = subjects.slice(0, maxVisible);
  const hiddenSubjectsCount = subjects.length - maxVisible;

  return (
    <div className="relative inline-flex flex-wrap items-center gap-1">
      {visibleSubjects.map((s, idx) => (
        <span
          key={`${s}-${idx}`}
          className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200"
        >
          {s}
        </span>
      ))}

      {hiddenSubjectsCount > 0 && (
        <div className="relative inline-block" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowPopover(!showPopover)}
            className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs transition-colors cursor-pointer active:scale-95"
            title="Click to view all subjects"
          >
            +{hiddenSubjectsCount} more
          </button>

          {/* Floating Interactive Popover */}
          {showPopover && (
            <div className="absolute left-0 top-6 z-50 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2540]">
                  <BookOpen size={13} className="text-[#2D9E6B]" />
                  <span>All Subjects ({subjects.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPopover(false)}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto pr-1">
                {subjects.map((subj, i) => (
                  <span
                    key={`${subj}-${i}`}
                    className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
