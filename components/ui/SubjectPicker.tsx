"use client";

import { Check } from "lucide-react";
import { SUBJECT_TAXONOMY } from "@/lib/validations";

const GROUP_BACKGROUNDS = [
  "#DCFCE7",
  "#E0F2FE",
  "#FEF3C7",
  "#F3E8FF",
  "#FCE7F3",
] as const;

export function SubjectPicker({
  name = "subjects",
  value,
  onChange,
  max = 6,
  disabled = false,
}: {
  name?: string;
  value: string[];
  onChange: (subjects: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const atLimit = value.length >= max;

  const toggle = (subject: string) => {
    if (value.includes(subject)) {
      onChange(value.filter((item) => item !== subject));
      return;
    }
    if (!atLimit) onChange([...value, subject]);
  };

  return (
    <div className="space-y-4">
      {value.map((subject) => (
        <input key={subject} type="hidden" name={name} value={subject} />
      ))}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Subject taxonomy
        </span>
        <span
          className={`text-[11px] font-black ${
            atLimit ? "text-[#EC4899]" : "text-slate-500"
          }`}
        >
          {value.length}/{max} selected
        </span>
      </div>

      {SUBJECT_TAXONOMY.map((group, index) => (
        <div key={group.group} className="space-y-2">
          <div
            className="inline-flex items-center rounded-full border-2 border-[#0F172A] px-3 py-1 text-[10px] font-black uppercase"
            style={{ backgroundColor: GROUP_BACKGROUNDS[index % GROUP_BACKGROUNDS.length] }}
          >
            {group.group}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.subjects.map((subject) => {
              const isSelected = value.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled || (!isSelected && atLimit)}
                  onClick={() => toggle(subject)}
                  className={`inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-[#0F172A] px-3.5 py-1.5 text-[11px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? "bg-[#22C55E] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -translate-x-[1px] -translate-y-[1px]"
                      : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                  {subject}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
