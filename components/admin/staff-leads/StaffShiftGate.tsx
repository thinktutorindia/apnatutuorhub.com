"use client";

import React, { useTransition } from "react";
import {
  Lock, Play, Coffee, AlertTriangle, ShieldCheck, Loader2,
  MousePointer, Sparkles, PhoneCall
} from "lucide-react";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import {
  staffClockInAction,
  staffEndBreakAction
} from "@/app/actions/staff-leads.actions";
import { setMyDutyAction } from "@/app/actions/staff-presence.actions";

/**
 * Hook to check telecaller shift status and enforce duty gating across calling desks.
 */
export function useStaffShiftGate() {
  const shiftStatus = useStaffDutyStore((s) => s.shiftStatus);
  const forcedOff = useStaffDutyStore((s) => s.forcedOff);
  const isIdle = useStaffDutyStore((s) => s.isIdle);
  const hydrated = useStaffDutyStore((s) => s.hydrated);

  const isShiftActive = shiftStatus === "CLOCKED_IN" && !forcedOff;
  const isOnBreak = shiftStatus === "ON_BREAK";
  const isOffShift = shiftStatus === "CLOCKED_OUT";

  return {
    isShiftActive,
    isOffShift,
    isOnBreak,
    isIdle,
    forcedOff,
    hydrated,
    shiftStatus,
  };
}

interface Props {
  onClockedIn?: () => void;
  compact?: boolean;
}

/**
 * Prominent, user-friendly banner displayed when a telecaller is off-shift, on break, or idle.
 * Includes a 1-click Clock In action that immediately unlocks all telecalling features.
 */
export function StaffShiftGate({ onClockedIn, compact = false }: Props) {
  const { isShiftActive, isOffShift, isOnBreak, isIdle, forcedOff } = useStaffShiftGate();
  const [isPending, startTransition] = useTransition();
  const setDutySnapshot = useStaffDutyStore((s) => s.setSnapshot);
  const setShiftSession = useStaffDutyStore((s) => s.setShiftSession);

  const handleQuickClockIn = () => {
    startTransition(async () => {
      const res = await staffClockInAction();
      if (res.success && res.data) {
        setShiftSession({ id: res.data.sessionId, status: "CLOCKED_IN" });
        const dutyRes = await setMyDutyAction("ON_DUTY");
        if (dutyRes.success && dutyRes.data) {
          setDutySnapshot(dutyRes.data);
        }
        if (onClockedIn) onClockedIn();
      }
    });
  };

  const handleQuickResume = () => {
    startTransition(async () => {
      const res = await staffEndBreakAction();
      if (res.success) {
        setShiftSession({ id: null, status: "CLOCKED_IN" });
      }
    });
  };

  // If active and working normally with mouse movement, render NOTHING!
  if (isShiftActive && !isIdle) {
    return null;
  }

  if (forcedOff) {
    return (
      <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-rose-950">Duty Locked by Administrator</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Your contact reveal permissions have been locked. Contact a Super Admin to re-enable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isOnBreak) {
    return (
      <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Coffee size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-amber-950">You Are Currently On Break</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Calling features and lead operations are paused while on break. Resume shift when ready to call.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleQuickResume}
          disabled={isPending}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm shrink-0"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Resume Shift
        </button>
      </div>
    );
  }

  if (isShiftActive && isIdle) {
    return (
      <div className="rounded-2xl p-3.5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/40 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          <div>
            <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <MousePointer size={13} className="text-amber-600" />
              Away — Tap or Move Mouse to Resume
            </p>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              Shift time is paused while away. Tap anywhere, move your mouse, or tap the button to resume calling immediately!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const store = useStaffDutyStore.getState();
            store.setIdleLocal(false);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("mousemove"));
              window.dispatchEvent(new Event("touchstart"));
            }
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-xs active:scale-95 shrink-0 text-center transition-all"
        >
          ▶ Resume Calling Now
        </button>
      </div>
    );
  }

  // Default: Off Shift (Clocked Out)
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-slate-900 via-[#0F2540] to-slate-900 text-white p-4 sm:p-5 border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${compact ? "p-3" : ""}`}>
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 text-[#F5A623] flex items-center justify-center shrink-0 shadow-inner">
          <Lock size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-full">
              Off Shift
            </span>
            <span className="text-xs text-white/50">·</span>
            <span className="text-xs text-white/80 font-bold">Calling Desk</span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
            Clock In to Start Your Shift
          </h3>
          <p className="text-xs text-white/70 mt-0.5 max-w-xl leading-relaxed">
            Clocking in tracks your active shift and unlocks calling, WhatsApp messaging, and lead management.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleQuickClockIn}
        disabled={isPending}
        className="px-5 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md shrink-0 active:scale-95"
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Play size={15} className="fill-white" />
        )}
        <span>Clock In to Start Shift</span>
      </button>
    </div>
  );
}
