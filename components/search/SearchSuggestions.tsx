"use client";

import { Search, Sparkles } from "lucide-react";
import type { AutocompleteResult } from "@/lib/search/types";

type Props = {
  suggestions: AutocompleteResult;
  onSelectSuggestion: (term: string) => void;
};

export function SearchSuggestions({ suggestions, onSelectSuggestion }: Props) {
  if (!suggestions.query && suggestions.suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border-2 border-[#0F172A] bg-white p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Suggestions */}
      {suggestions.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400">
            {suggestions.query ? "Suggestions" : "Popular Searches"}
          </p>
          {suggestions.suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelectSuggestion(item)}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-[#0F172A] transition-colors hover:bg-[#DCFCE7]"
            >
              <Search size={12} className="text-slate-400" />
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tutor matches */}
      {suggestions.tutors.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400">
            Matching Tutors
          </p>
          {suggestions.tutors.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectSuggestion(t.name)}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-[#0F172A] hover:bg-[#FEF3C7]"
            >
              <span>🧑‍🏫 {t.name}</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {t.subjects.join(", ")} · {t.city}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lead matches */}
      {suggestions.leads.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
          <p className="px-2 text-[10px] font-black uppercase text-slate-400">
            Matching Requirements
          </p>
          {suggestions.leads.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectSuggestion(l.subjects.join(", "))}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-[#0F172A] hover:bg-[#E0F2FE]"
            >
              <span>📚 {l.classLevel} {l.subjects.join(", ")}</span>
              <span className="text-[10px] text-slate-500 font-semibold">{l.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
