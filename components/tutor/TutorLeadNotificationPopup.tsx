"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, MapPin, BookOpen, IndianRupee, Globe, ArrowRight, BellRing } from "lucide-react";
import { formatLeadBudget } from "@/lib/lead-utils";

export type MatchingLeadAlert = {
  id: string;
  inquiryNumber?: number | null;
  classLevel: string | null;
  subjects: string[];
  mode: string;
  city: string | null;
  area: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  coinCost?: number | null;
  distanceKm?: number | null;
};

const POPUP_SNOOZE_MS = 5 * 60 * 1000; // 5 minutes snooze on dismiss
const STORAGE_KEY = "ath_tutor_lead_popup_dismissed_at";

export function TutorLeadNotificationPopup({
  leads,
}: {
  leads: MatchingLeadAlert[];
}) {
  const [activeLead, setActiveLead] = useState<MatchingLeadAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!leads || leads.length === 0) return;

    // Check if dismissed recently in this session
    try {
      const lastDismissed = sessionStorage.getItem(STORAGE_KEY);
      if (lastDismissed) {
        const timePassed = Date.now() - parseInt(lastDismissed, 10);
        if (timePassed < POPUP_SNOOZE_MS) {
          // Check again after remainder of snooze
          const timer = setTimeout(() => {
            setActiveLead(leads[0]);
            setIsVisible(true);
          }, POPUP_SNOOZE_MS - timePassed);
          return () => clearTimeout(timer);
        }
      }
    } catch {}

    // Delay 1.5 seconds on mount for smooth page entrance
    const initialTimer = setTimeout(() => {
      setActiveLead(leads[0]);
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(initialTimer);
  }, [leads]);

  if (!isVisible || !activeLead) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const isOnline = activeLead.mode === "ONLINE";
  const budgetStr = formatLeadBudget(activeLead);
  const locationStr = [activeLead.area, activeLead.city].filter(Boolean).join(", ") || "Delhi NCR";

  return (
    <div
      role="alertdialog"
      aria-label="New matching tuition inquiry"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-6 fade-in duration-300"
    >
      <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-emerald-500 shadow-2xl p-5 text-slate-900 ring-4 ring-emerald-500/10">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        {/* Top bar with alert badge and close */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black tracking-wide">
            <BellRing size={13} className="text-emerald-600 animate-pulse" />
            <span>NEW MATCHING TUITION</span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss lead popup"
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Core Subject & Class */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <BookOpen size={13} className="text-[#2D9E6B]" />
            <span>Class {activeLead.classLevel || "Requirement"}</span>
          </div>
          <h4 className="text-base sm:text-lg font-black text-[#0F2540] line-clamp-1">
            {activeLead.subjects.join(", ") || "All Subjects"}
          </h4>
        </div>

        {/* Badges: Location, Mode, Fees */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold mb-4">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 truncate">
            <MapPin size={13} className="text-rose-500 shrink-0" />
            <span className="truncate">{locationStr}</span>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
            {isOnline ? (
              <>
                <Globe size={13} className="text-blue-500 shrink-0" />
                <span className="text-blue-700 font-extrabold">Online Class</span>
              </>
            ) : (
              <>
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                <span className="text-emerald-800 font-extrabold">Home Tuition</span>
              </>
            )}
          </div>

          <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-black">
            <div className="flex items-center gap-1">
              <IndianRupee size={14} className="text-emerald-700" />
              <span>Fee Budget:</span>
            </div>
            <span className="text-sm font-black text-emerald-800">{budgetStr}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors text-center cursor-pointer"
          >
            Remind Later
          </button>

          <Link
            href={`/tutor/leads?leadId=${activeLead.id}`}
            onClick={handleDismiss}
            className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <Sparkles size={13} />
            <span>Unlock / View Lead</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
