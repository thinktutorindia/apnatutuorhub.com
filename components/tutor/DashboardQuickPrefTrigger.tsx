"use client";

import React from "react";
import { MapPin, BookOpen, ChevronRight } from "lucide-react";

export function DashboardQuickPrefTrigger({
  locality,
  city,
  subjectCount,
}: {
  locality?: string | null;
  city?: string | null;
  subjectCount: number;
}) {
  const displayLoc = [locality, city].filter(Boolean).join(", ") || "Set your teaching area";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("ath:open-quick-profile-modal"))}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer group shadow-xs"
        title="Click to directly update location & subjects"
      >
        <MapPin size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-bold">{displayLoc}</span>
        <span className="text-white/60">|</span>
        <BookOpen size={13} className="text-teal-400" />
        <span className="font-bold">
          {subjectCount} {subjectCount === 1 ? "Subject" : "Subjects"}
        </span>
        <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-400/30">
          <span>Change</span>
          <ChevronRight size={11} />
        </span>
      </button>
    </div>
  );
}
