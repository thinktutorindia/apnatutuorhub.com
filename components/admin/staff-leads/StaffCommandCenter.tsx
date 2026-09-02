"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock, Play, Pause, Square, Coffee, PhoneCall, CheckCircle2,
  AlertTriangle, Bell, ChevronRight, TrendingUp, Flame, Star,
  MapPin, Phone, BookOpen, ArrowRight, RefreshCcw, Loader2,
  Users, BarChart3, Calendar, Target, Zap, Timer, X,
  AlarmClock, PhoneForwarded, XCircle, Volume2
} from "lucide-react";
import {
  staffClockInAction,
  staffClockOutAction,
  staffStartBreakAction,
  staffEndBreakAction,
  snoozeReminderAction,
  completeReminderAction,
  dismissReminderAction,
} from "@/app/actions/staff-leads.actions";
import { StaffLeadTypeBadge } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveSession = {
  id: string;
  clockIn: Date | string;
  status: string;
  breakStartedAt: Date | string | null;
  totalBreakMins: number;
  callsMade: number;
  leadsContacted: number;
  leadsConverted: number;
  followUpsSet: number;
  followUpsDone: number;
};

type DueReminder = {
  id: string;
  scheduledAt: Date | string;
  urgency: string;
  reminderNote: string | null;
  snoozeCount: number;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    subjects: string[];
    status: string;
  };
};

type NextLead = {
  id: string;
  name: string | null;
  phone: string | null;
  location: string | null;
  subjects: string[];
  classes: string[];
  status: string;
  nextFollowUpAt: Date | string | null;
  staffNotes: string | null;
  priority: number;
};

type WeeklyDay = { date: string; calls: number; minutes: number; conversions: number };

type DashboardData = {
  activeSession: ActiveSession | null;
  dueReminders: DueReminder[];
  overdueCount: number;
  dueSoonCount: number;
  todayStats: { calls: number; conversions: number; followUpsDone: number };
  weeklyHistory: WeeklyDay[];
  nextLeads: NextLead[];
  performance: {
    weeklyCallTarget: number;
    weeklyCallsMade: number;
    streak: number;
    rank: number;
    totalStaff: number;
  };
};

interface Props {
  data: DashboardData;
  staffName: string;
  isSuperAdmin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeUntil(target: Date | string): string {
  const diff = new Date(target).getTime() - Date.now();
  if (diff < 0) {
    const ago = Math.abs(diff);
    if (ago < 60000) return "just now";
    if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
    return `${Math.floor(ago / 3600000)}h ${Math.floor((ago % 3600000) / 60000)}m ago`;
  }
  if (diff < 60000) return "< 1m";
  if (diff < 3600000) return `in ${Math.floor(diff / 60000)}m`;
  return `in ${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

function urgencyColor(urgency: string, scheduledAt: Date | string) {
  const isOverdue = new Date(scheduledAt).getTime() < Date.now();
  if (isOverdue || urgency === "CRITICAL") return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", pulse: true };
  if (urgency === "HIGH") return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", pulse: false };
  return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", pulse: false };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "bg-slate-100 text-slate-600" },
  ASSIGNED: { label: "Assigned", color: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "Contacted", color: "bg-teal-100 text-teal-700" },
  FOLLOW_UP: { label: "Follow Up", color: "bg-amber-100 text-amber-700" },
  NO_ANSWER: { label: "No Answer", color: "bg-orange-100 text-orange-700" },
  INTERESTED: { label: "Interested", color: "bg-emerald-100 text-emerald-700" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffCommandCenter({ data, staffName, isSuperAdmin }: Props) {
  const [activeSession, setActiveSession] = useState(data.activeSession);
  const [reminders, setReminders] = useState(data.dueReminders);
  const [todayStats, setTodayStats] = useState(data.todayStats);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer for clock-in
  useEffect(() => {
    if (!activeSession || activeSession.status === "ON_BREAK") return;
    const clockInTime = new Date(activeSession.clockIn).getTime();
    const breakMins = activeSession.totalBreakMins;

    const update = () => {
      const totalElapsed = Math.floor((Date.now() - clockInTime) / 1000);
      setElapsedSeconds(Math.max(0, totalElapsed - breakMins * 60));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Auto-dismiss messages
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
  }, []);

  // ── Clock Actions ──
  const handleClockIn = () => {
    startTransition(async () => {
      const res = await staffClockInAction();
      if (res.success && res.data) {
        setActiveSession({
          id: res.data.sessionId,
          clockIn: new Date().toISOString(),
          status: "CLOCKED_IN",
          breakStartedAt: null,
          totalBreakMins: 0,
          callsMade: 0, leadsContacted: 0, leadsConverted: 0,
          followUpsSet: 0, followUpsDone: 0,
        });
        showToast("success", "🟢 Clocked in! Let's get started.");
      } else {
        showToast("error", res.error ?? "Failed to clock in");
      }
    });
  };

  const handleClockOut = () => {
    startTransition(async () => {
      const res = await staffClockOutAction();
      if (res.success && res.data) {
        setActiveSession(null);
        showToast("success", `⏹️ Clocked out — ${formatMins(res.data.totalMinutes)} worked, ${res.data.callsMade} calls, ${res.data.leadsConverted} conversions`);
      } else {
        showToast("error", res.error ?? "Failed to clock out");
      }
    });
  };

  const handleBreakToggle = () => {
    startTransition(async () => {
      if (activeSession?.status === "ON_BREAK") {
        const res = await staffEndBreakAction();
        if (res.success) {
          setActiveSession((s) => s ? { ...s, status: "CLOCKED_IN", breakStartedAt: null } : null);
          showToast("success", "☕ Break ended — back to work!");
        }
      } else {
        const res = await staffStartBreakAction();
        if (res.success) {
          setActiveSession((s) => s ? { ...s, status: "ON_BREAK", breakStartedAt: new Date().toISOString() } : null);
          showToast("success", "☕ On break — take your time.");
        }
      }
    });
  };

  // ── Reminder Actions ──
  const handleSnooze = (id: string, minutes: number) => {
    startTransition(async () => {
      const res = await snoozeReminderAction(id, minutes);
      if (res.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        showToast("success", `⏰ Snoozed for ${minutes} minutes`);
      }
    });
  };

  const handleComplete = (id: string) => {
    startTransition(async () => {
      const res = await completeReminderAction(id);
      if (res.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        setTodayStats((s) => ({ ...s, followUpsDone: s.followUpsDone + 1 }));
        showToast("success", "✅ Follow-up completed!");
      }
    });
  };

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      const res = await dismissReminderAction(id);
      if (res.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        showToast("success", "Reminder dismissed");
      }
    });
  };

  const overdueReminders = reminders.filter((r) => new Date(r.scheduledAt).getTime() < Date.now());
  const upcomingReminders = reminders.filter((r) => new Date(r.scheduledAt).getTime() >= Date.now());

  const weeklyProgress = data.performance.weeklyCallTarget > 0
    ? Math.min(100, Math.round((data.performance.weeklyCallsMade / data.performance.weeklyCallTarget) * 100))
    : 0;

  const dailyTarget = 40;
  const dailyProgress = Math.min(100, Math.round((todayStats.calls / dailyTarget) * 100));

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Toast ── */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-right ${
          message.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="ath-panel flex items-center justify-between flex-wrap gap-3 p-5 sm:p-6">
        <div>
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Staff CRM</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {staffName.split(" ")[0]}&apos;s Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-600">
            {activeSession ? "On shift" : "Off shift"} · Clock, today&apos;s calls, due follow-ups, next contacts to work
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/staff-leads/my-leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-slate-200 text-xs font-800 text-[#0F2540] hover:bg-slate-50">
            <Phone size={14} className="text-[#2563EB]" /> My Calling Queue
          </Link>
          <Link href="/admin/staff-leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0F2540] text-white text-xs font-800 hover:bg-[#1e3a5f]">
            <BarChart3 size={14} className="text-[#2D9E6B]" /> CRM Dashboard
          </Link>
        </div>
      </div>

      <StaffCrmPlaybook compact />

      {/* ── Clock In/Out Banner ── */}
      <div className={`rounded-2xl p-5 border-2 shadow-lg transition-all ${
        activeSession
          ? activeSession.status === "ON_BREAK"
            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
            : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
          : "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200"
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {activeSession ? (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  activeSession.status === "ON_BREAK" ? "bg-amber-100" : "bg-emerald-100"
                }`}>
                  {activeSession.status === "ON_BREAK" ? (
                    <Coffee size={28} className="text-amber-600" />
                  ) : (
                    <Timer size={28} className="text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${
                      activeSession.status === "ON_BREAK"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-emerald-200 text-emerald-800"
                    }`}>
                      {activeSession.status === "ON_BREAK" ? "☕ ON BREAK" : "🟢 CLOCKED IN"}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-1 font-mono tracking-tight">
                    {formatDuration(elapsedSeconds)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
                    <span>📞 {activeSession.callsMade} calls</span>
                    <span>👥 {activeSession.leadsContacted} contacted</span>
                    <span>✅ {activeSession.leadsConverted} converted</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center">
                  <Play size={28} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-700">Not Clocked In</p>
                  <p className="text-xs text-slate-500 mt-0.5">Clock in to start tracking your work session</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeSession ? (
              <>
                <button
                  onClick={handleBreakToggle}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all ${
                    activeSession.status === "ON_BREAK"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  {activeSession.status === "ON_BREAK" ? <><Play size={14} /> Resume Work</> : <><Coffee size={14} /> Take Break</>}
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 shadow-sm"
                >
                  <Square size={14} /> Clock Out
                </button>
              </>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Clock In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Calls Today", value: todayStats.calls, target: dailyTarget, icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-50", progress: dailyProgress },
          { label: "Conversions", value: todayStats.conversions, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Follow-ups Done", value: todayStats.followUpsDone, icon: Bell, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Due Reminders", value: reminders.length, icon: AlarmClock, color: overdueReminders.length > 0 ? "text-red-600" : "text-amber-600", bg: overdueReminders.length > 0 ? "bg-red-50" : "bg-amber-50" },
        ].map(({ label, value, target, icon: Icon, color, bg, progress }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-white/80 relative overflow-hidden`}>
            <Icon size={16} className={`${color} mb-2`} />
            <p className="text-2xl font-black text-slate-900">{value}{target ? <span className="text-sm font-medium text-slate-400">/{target}</span> : null}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p>
            {progress !== undefined && (
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Follow-Up Reminders ── */}
      {reminders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className={overdueReminders.length > 0 ? "text-red-500" : "text-amber-500"} />
              <h2 className="text-sm font-black text-slate-900">Follow-Up Reminders</h2>
              {overdueReminders.length > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                  {overdueReminders.length} OVERDUE
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {reminders.map((reminder) => {
              const uc = urgencyColor(reminder.urgency, reminder.scheduledAt);
              const isOverdue = new Date(reminder.scheduledAt).getTime() < Date.now();
              return (
                <div key={reminder.id} className={`px-5 py-3.5 flex items-center justify-between gap-3 ${uc.bg} transition-all hover:brightness-[0.97]`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${uc.dot} ${uc.pulse ? "animate-pulse" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black ${uc.text}`}>
                          {isOverdue ? "OVERDUE" : ""} {timeUntil(reminder.scheduledAt)}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {reminder.lead.name || "Unknown"} · {reminder.lead.phone ? `+91 ${reminder.lead.phone}` : "No phone"}
                        </span>
                        {reminder.lead.location && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <MapPin size={10} /> {reminder.lead.location}
                          </span>
                        )}
                      </div>
                      {reminder.reminderNote && (
                        <p className="text-[11px] text-slate-500 mt-0.5 italic truncate">"{reminder.reminderNote}"</p>
                      )}
                      {reminder.snoozeCount > 0 && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          Snoozed {reminder.snoozeCount}x
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/admin/staff-leads/${reminder.lead.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-black hover:bg-blue-700 shadow-sm">
                      <PhoneCall size={11} /> Call Now
                    </Link>
                    <div className="relative group">
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                        <AlarmClock size={11} /> Snooze
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 hidden group-hover:block min-w-[130px]">
                        {[
                          { label: "15 min", mins: 15 },
                          { label: "30 min", mins: 30 },
                          { label: "1 hour", mins: 60 },
                          { label: "2 hours", mins: 120 },
                        ].map(({ label, mins }) => (
                          <button key={mins} onClick={() => handleSnooze(reminder.id, mins)}
                            className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
                            ⏰ {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => handleComplete(reminder.id)}
                      className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Mark completed">
                      <CheckCircle2 size={12} />
                    </button>
                    <button onClick={() => handleDismiss(reminder.id)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200" title="Dismiss">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Performance Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-indigo-600" />
            <h2 className="text-sm font-black text-slate-900">Weekly Performance</h2>
          </div>

          {/* Progress Ring */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#progressGrad)" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={`${weeklyProgress * 3.267} 326.73`} />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">{weeklyProgress}%</span>
                <span className="text-[10px] text-slate-500 font-semibold">of target</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600">
            <span className="font-bold">{data.performance.weeklyCallsMade}</span> / {data.performance.weeklyCallTarget} calls this week
          </div>

          {/* Streak & Rank */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <Flame size={16} className="text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-black text-slate-900">{data.performance.streak}</p>
              <p className="text-[10px] text-slate-500 font-semibold">Day Streak</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <Star size={16} className="text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-black text-slate-900">#{data.performance.rank}</p>
              <p className="text-[10px] text-slate-500 font-semibold">of {data.performance.totalStaff} staff</p>
            </div>
          </div>
        </div>

        {/* ── Next Leads Queue ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <h2 className="text-sm font-black text-slate-900">Next Leads to Work</h2>
              <span className="text-[10px] font-bold text-slate-400">{data.nextLeads.length} leads</span>
            </div>
            <Link href="/admin/staff-leads/my-leads" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          {data.nextLeads.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm font-bold text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400">No pending leads in your queue</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.nextLeads.slice(0, 6).map((lead, i) => {
                const st = STATUS_LABELS[lead.status] || { label: lead.status, color: "bg-slate-100 text-slate-600" };
                return (
                  <Link key={lead.id} href={`/admin/staff-leads/${lead.id}`}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono text-slate-400 w-5 text-center">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800 truncate">{lead.name || "Unknown contact"}</span>
                          <StaffLeadTypeBadge type={getStaffRecordType(lead.staffNotes)} />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                          {lead.priority > 0 && <Flame size={12} className="text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                          {lead.phone && <span className="font-mono">+91 {lead.phone}</span>}
                          {lead.location && <span className="flex items-center gap-0.5"><MapPin size={10} /> {lead.location}</span>}
                          {lead.subjects.length > 0 && <span className="flex items-center gap-0.5"><BookOpen size={10} /> {lead.subjects.slice(0, 2).join(", ")}</span>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Weekly Work Log ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-slate-600" />
          <h2 className="text-sm font-black text-slate-900">Work Log — Last 7 Days</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {data.weeklyHistory.map((day) => {
            const date = new Date(day.date);
            const dayName = DAY_NAMES[date.getDay()];
            const isToday = day.date === new Date().toISOString().split("T")[0];
            const intensity = day.calls === 0 ? 0 : day.calls < 10 ? 1 : day.calls < 25 ? 2 : day.calls < 40 ? 3 : 4;
            const bgIntensity = ["bg-slate-50", "bg-emerald-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-400"][intensity];

            return (
              <div key={day.date} className={`rounded-xl p-3 text-center border ${
                isToday ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-100"
              } ${bgIntensity}`}>
                <p className={`text-[10px] font-bold ${isToday ? "text-blue-600" : "text-slate-500"}`}>{dayName}</p>
                <p className="text-lg font-black text-slate-900 mt-1">{day.calls}</p>
                <p className="text-[10px] text-slate-500">calls</p>
                {day.minutes > 0 && (
                  <p className="text-[9px] text-slate-400 mt-0.5">{formatMins(day.minutes)}</p>
                )}
                {day.conversions > 0 && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    ✓ {day.conversions}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
