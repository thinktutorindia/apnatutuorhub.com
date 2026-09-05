"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Play, Square, Calendar, Loader2, X, CheckCircle2, AlertCircle, ShieldCheck, ShieldOff, Lock, Menu
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import {
  staffClockInAction,
  staffClockOutAction,
  staffStartBreakAction,
  staffEndBreakAction,
  getMyActiveSessionAction
} from "@/app/actions/staff-leads.actions";
import { setMyDutyAction } from "@/app/actions/staff-presence.actions";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import { useAdminSidebarStore } from "@/lib/stores/sidebar-store";

interface Props {
  userRole?: string;
  userName?: string;
  userImage?: string | null;
  unreadCount?: number;
}

export function StaffGlobalShiftBar({ userRole, userName, userImage, unreadCount = 0 }: Props) {
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const [session, setSession] = useState<{
    id: string;
    clockIn: string;
    status: string;
    breakStartedAt: string | null;
    totalBreakMins: number;
    callsMade: number;
    leadsConverted: number;
  } | null>(null);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [breakSec, setBreakSec] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [clockOutModal, setClockOutModal] = useState(false);
  const [shiftNotes, setShiftNotes] = useState("");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Duty (data-access) state, shared via the presence store ──
  const dutyStatus = useStaffDutyStore((s) => s.dutyStatus);
  const dutyForcedOff = useStaffDutyStore((s) => s.forcedOff);
  const dutyHydrated = useStaffDutyStore((s) => s.hydrated);
  const isIdle = useStaffDutyStore((s) => s.isIdle);
  const setDutySnapshot = useStaffDutyStore((s) => s.setSnapshot);
  const setShiftSession = useStaffDutyStore((s) => s.setShiftSession);
  const openSidebar = useAdminSidebarStore((s) => s.open);

  // Sync session state with global duty store
  useEffect(() => {
    if (session) {
      setShiftSession({ id: session.id, status: session.status as any });
    } else {
      setShiftSession({ id: null, status: "CLOCKED_OUT" });
    }
  }, [session, setShiftSession]);

  // Fetch initial active session or auto-clock in on mount
  useEffect(() => {
    let mounted = true;
    getMyActiveSessionAction().then(async (res) => {
      if (!mounted) return;
      if (res.success && res.data?.session) {
        const s = res.data.session;
        setSession({
          id: s.id,
          clockIn: new Date(s.clockIn).toISOString(),
          status: s.status,
          breakStartedAt: s.breakStartedAt ? new Date(s.breakStartedAt).toISOString() : null,
          totalBreakMins: s.totalBreakMins,
          callsMade: s.callsMade,
          leadsConverted: s.leadsConverted,
        });
        const initialMs = new Date(s.clockIn).getTime();
        const initialElapsed = Math.max(0, Math.floor((Date.now() - initialMs) / 1000) - (s.totalBreakMins * 60));
        setElapsedSec(initialElapsed);
        setShiftSession({ id: s.id, status: s.status as any });
        const dutyRes = await setMyDutyAction("ON_DUTY");
        if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
      } else {
        // Automatic clock-in on mount/login so staff is immediately on shift
        const autoRes = await staffClockInAction();
        if (mounted && autoRes.success && autoRes.data) {
          setSession({
            id: autoRes.data.sessionId,
            clockIn: new Date().toISOString(),
            status: "CLOCKED_IN",
            breakStartedAt: null,
            totalBreakMins: 0,
            callsMade: 0,
            leadsConverted: 0,
          });
          setElapsedSec(0);
          setShiftSession({ id: autoRes.data.sessionId, status: "CLOCKED_IN" });
          const dutyRes = await setMyDutyAction("ON_DUTY");
          if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
        }
      }
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [setDutySnapshot, setShiftSession]);

  // Ticking Timer — Pauses when isIdle is true (does not count idle time on shift!)
  useEffect(() => {
    if (!session || session.status !== "CLOCKED_IN") {
      return;
    }

    const interval = setInterval(() => {
      // If idle (no mouse movement > 1 minute), DO NOT COUNT TIME!
      if (isIdle) {
        return;
      }
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isIdle]);

  // Break Timer
  useEffect(() => {
    if (!session || session.status !== "ON_BREAK") {
      setBreakSec(0);
      return;
    }

    const interval = setInterval(() => {
      setBreakSec((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleClockIn = () => {
    startTransition(async () => {
      const res = await staffClockInAction();
      if (res.success && res.data) {
        setSession({
          id: res.data.sessionId,
          clockIn: new Date().toISOString(),
          status: "CLOCKED_IN",
          breakStartedAt: null,
          totalBreakMins: 0,
          callsMade: 0,
          leadsConverted: 0,
        });
        if (dutyStatus !== "ON_DUTY" && !dutyForcedOff) {
          const dutyRes = await setMyDutyAction("ON_DUTY");
          if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
        }
        showToast("success", "🟢 Shift started! Tracking mouse movement & duty unlocked.");
      } else {
        showToast("error", res.error ?? "Failed to clock in");
      }
    });
  };

  const handleToggleBreak = () => {
    startTransition(async () => {
      if (session?.status === "ON_BREAK") {
        const res = await staffEndBreakAction();
        if (res.success) {
          setSession((s) => s ? { ...s, status: "CLOCKED_IN", breakStartedAt: null } : null);
          showToast("success", "☕ Break ended — back on shift!");
        } else {
          showToast("error", res.error ?? "Failed to resume work");
        }
      } else {
        const res = await staffStartBreakAction();
        if (res.success) {
          setSession((s) => s ? { ...s, status: "ON_BREAK", breakStartedAt: new Date().toISOString() } : null);
          showToast("success", "☕ Break started. Take your time!");
        } else {
          showToast("error", res.error ?? "Failed to start break");
        }
      }
    });
  };

  const handleConfirmClockOut = () => {
    startTransition(async () => {
      const res = await staffClockOutAction(shiftNotes);
      if (res.success && res.data) {
        setSession(null);
        setClockOutModal(false);
        setShiftNotes("");
        if (dutyStatus === "ON_DUTY") {
          const dutyRes = await setMyDutyAction("OFF_DUTY");
          if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
        }
        const mins = res.data.totalMinutes;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        showToast("success", `⏹️ Clocked out! Shift logged: ${h > 0 ? `${h}h ${m}m` : `${m}m`} (${res.data.callsMade} calls). Duty locked.`);
      } else {
        showToast("error", res.error ?? "Failed to clock out");
      }
    });
  };

  const formatTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) return null;

  return (
    <>
      {/* ── Global Toast ── */}
      {toastMsg && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black flex items-center gap-2 border animate-in slide-in-from-top ${
            toastMsg.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toastMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="w-full bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 text-xs select-none sticky top-0 z-30">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          {/* Mobile hamburger button cleanly integrated inline */}
          <button
            type="button"
            onClick={openSidebar}
            className="lg:hidden p-1.5 rounded-xl bg-[#0F2540] text-white hover:bg-slate-800 shrink-0 cursor-pointer shadow-xs active:scale-95"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>

          {/* Badge hidden on small mobile to conserve space */}
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-800 uppercase tracking-wider bg-[#E8F7F0] text-[#238357] shrink-0">
            {isSuperAdmin ? "Super Admin" : "Staff Admin"}
          </span>

          {session ? (
            session.status === "ON_BREAK" ? (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Break {formatTimer(breakSec)}
              </span>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#238357] bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B] animate-pulse" />
                  <span className="hidden sm:inline">Shift</span> {formatTimer(elapsedSec)}
                </span>
                {isIdle ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                    title="Shift paused (idle). Tap anywhere to resume."
                  >
                    <span>⏸️ Idle</span>
                  </span>
                ) : null}
              </div>
            )
          ) : null}

          {session ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToggleBreak}
                disabled={isPending}
                className="px-2 sm:px-3 py-1 rounded-full font-extrabold text-[10px] sm:text-[11px] cursor-pointer disabled:opacity-50 bg-[#FFF3DC] text-[#92400E] hover:bg-amber-200 transition-colors"
              >
                {isPending ? <Loader2 size={11} className="animate-spin" /> : session.status === "ON_BREAK" ? "Resume" : "Break"}
              </button>
              <button
                type="button"
                onClick={() => setClockOutModal(true)}
                disabled={isPending}
                className="px-2 sm:px-3 py-1 rounded-full bg-[#FEF2F2] text-[#BE123C] hover:bg-rose-100 font-extrabold text-[10px] sm:text-[11px] cursor-pointer disabled:opacity-50 transition-colors"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClockIn}
              disabled={isPending}
              className="px-2.5 sm:px-3.5 py-1 rounded-full bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-[10px] sm:text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Play size={10} />}
              Start
            </button>
          )}

          {/* Locked-off indicator */}
          {dutyHydrated && dutyForcedOff && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#BE123C] font-extrabold text-[10px] shrink-0" title="Locked off duty">
              <Lock size={10} /> Locked
            </span>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:block">
            <AdminCommandPalette />
          </div>
          <Link
            href="/admin/bookings"
            className="hidden sm:inline-flex w-10 h-10 rounded-full border border-[#E2E8F0] !text-[#0F2540] hover:bg-[#F0F4F8] items-center justify-center"
            aria-label="Class requests"
          >
            <Calendar size={16} />
          </Link>
          <NotificationBell initialCount={unreadCount} viewerRole="ADMIN" />
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#0F2540] text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center shrink-0">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" className="w-full h-full object-cover" />
            ) : (
              (userName?.[0] ?? "A").toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* ── Clock Out Confirmation & Notes Modal ── */}
      {clockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black">
                  <Square size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">End Shift &amp; Clock Out</h3>
                  <p className="text-xs text-slate-500">Save your work hours and shift notes</p>
                </div>
              </div>
              <button
                onClick={() => setClockOutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Shift Summary Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Working Time:</span>
                <span className="font-black text-slate-900 font-mono text-sm">{formatTimer(elapsedSec)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Calls Logged:</span>
                <span className="font-black text-blue-700">{session?.callsMade ?? 0} calls</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Conversions:</span>
                <span className="font-black text-emerald-700">✓ {session?.leadsConverted ?? 0}</span>
              </div>
            </div>

            {/* Shift Notes Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End-of-Shift Summary / Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g. Completed batch 4 calls, followed up with 8 tutors in South Delhi..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white text-slate-800"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setClockOutModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClockOut}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Square size={13} />}
                Confirm Clock Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
