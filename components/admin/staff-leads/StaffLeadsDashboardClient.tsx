"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users, Upload, TrendingUp, CheckCircle2, XCircle, PhoneMissed,
  Phone, Star, Clock, RotateCcw, Sparkles, GraduationCap,
  ArrowRight, BarChart3, Zap, PhoneCall, CalendarCheck,
  UserCheck, Activity, HelpCircle, ChevronRight, Check
} from "lucide-react";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";
import { LeadsWorkspace, type WorkspaceLead, type StaffOption } from "@/components/admin/staff-leads/LeadsWorkspace";
import { StaffPresenceBoard } from "@/components/admin/staff-leads/StaffPresenceBoard";
import { StaffLeadsNavHeader } from "@/components/admin/staff-leads/StaffLeadsNavHeader";
import { StaffPowerDialer } from "@/components/admin/staff-leads/StaffPowerDialer";
import { StaffShiftGate } from "@/components/admin/staff-leads/StaffShiftGate";

type Stats = {
  total: number; newLeads: number; assigned: number; contacted: number;
  interested: number; converted: number; notInterested: number; noAnswer: number; followUp: number;
  parentLeads?: number; tutorLeads?: number;
} | null;

type Batch = { id: string; name: string; totalParsed: number; createdAt: Date; _count: { leads: number } };

interface Props {
  stats: Stats;
  leads: WorkspaceLead[];
  total: number;
  pageSize?: number;
  batches: Batch[];
  staff: StaffOption[];
  pipeline?: {
    batches: Array<{
      id: string; name: string; createdAt: Date;
      totalLeads: number; leadsNew: number; leadsContacted: number;
      leadsFollowUp: number; leadsConverted: number; leadsRejected: number;
      leadsDone: number; progressPercent: number; isFullyProcessed: boolean;
      estimatedDaysLeft: number | null; avgLeadsPerDay: number;
      status: "not_started" | "active" | "stalled" | "completed";
    }>;
    overall: {
      totalBatches: number; completedBatches: number; totalLeads: number;
      totalDone: number; progressPercent: number;
      estimatedCompletionDate: string | null; avgDailyThroughput: number;
    };
  } | null;
  liveStatus?: {
    online: Array<{
      staffId: string; staffName: string | null; email: string; subAdminRole: string | null;
      status: string; clockIn: Date; elapsedMinutes: number;
      onBreakSince: Date | null; callsToday: number; conversionsToday: number;
    }>;
    offline: Array<{
      staffId: string; staffName: string | null; email: string; subAdminRole: string | null;
      lastClockOut: Date | null; lastSessionMinutes: number | null;
    }>;
  } | null;
  activityFeed?: Array<{
    id: string; outcome: string; notes: string | null;
    calledAt: Date | string;
    calledBy: { name: string | null; email: string };
    lead: { id: string; name: string | null; phone: string | null; status: string };
  }>;
  isSuperAdmin?: boolean;
}

/* ─── Elevated KPI Card ────────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-all hover:border-slate-300">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0 shadow-xs`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className="text-xl font-black text-slate-800 leading-none tabular-nums">
            {value.toLocaleString()}
          </p>
          {trend && (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
              {trend}
            </span>
          )}
        </div>
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export function StaffLeadsDashboardClient({
  stats,
  leads,
  total,
  pageSize,
  batches,
  staff,
  pipeline,
  liveStatus,
  activityFeed,
  isSuperAdmin,
}: Props) {
  const [cockpitMode, setCockpitMode] = useState<"CALLING" | "PIPELINE" | "RADAR">("CALLING");
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [showPipelineFlow, setShowPipelineFlow] = useState(true);
  const [isPowerDialing, setIsPowerDialing] = useState(false);

  // Conversion rate percentage
  const convRate = stats && stats.total > 0
    ? ((stats.converted / stats.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-4">
      {/* ── Unified Nav Header ── */}
      <StaffLeadsNavHeader
        activeKey="desk"
        onlineCount={liveStatus?.online.length}
        totalLeads={total}
        isSuperAdmin={!!isSuperAdmin}
        onLaunchDialer={() => setIsPowerDialing(true)}
      />

      {/* ── Shift Gate (Prompts Clock-In when Off-Shift) ── */}
      <StaffShiftGate />

      {/* ── Quick Switch to Fast Calling Desk ── */}
      <div className="bg-gradient-to-r from-[#0F2540] via-[#1E3A8A] to-emerald-950 rounded-2xl p-3.5 text-white flex items-center justify-between gap-3 shadow-md flex-wrap border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black border border-emerald-500/30 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black flex items-center gap-2">
              <span>Active Telecalling Workspace</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                ⚡ 1-Click Speed Dial
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Dial your assigned leads with auto-advance, direct WhatsApp, and keyboard shortcuts.
            </p>
          </div>
        </div>
        <Link
          href="/admin/staff-leads/my-leads"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
        >
          <PhoneCall size={14} />
          <span>Open Live Calling Desk →</span>
        </Link>
      </div>

      {/* ── KPI Strip ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Total Pool"
            value={stats.total}
            subtitle="All captured contacts"
            icon={Users}
            color="bg-slate-700"
          />
          <KpiCard
            label="Fresh Uncalled"
            value={stats.newLeads}
            subtitle="Needs initial dial"
            icon={Sparkles}
            color="bg-blue-600"
            trend={stats.newLeads > 0 ? "Action needed" : undefined}
          />
          <KpiCard
            label="In Progress / Contacted"
            value={stats.contacted + stats.interested}
            subtitle="Active conversations"
            icon={PhoneCall}
            color="bg-amber-500"
          />
          <KpiCard
            label="Conversions"
            value={stats.converted}
            subtitle={`${convRate}% overall win rate`}
            icon={CheckCircle2}
            color="bg-emerald-600"
            trend={`+${convRate}%`}
          />
          <KpiCard
            label="Follow-ups Due"
            value={stats.followUp}
            subtitle="Scheduled callbacks"
            icon={Clock}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* ── Cockpit Mode Controller ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-extrabold flex-wrap">
          <button
            type="button"
            onClick={() => setCockpitMode("CALLING")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              cockpitMode === "CALLING"
                ? "bg-[#0F2540] text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Phone size={13} />
            <span>Calling Desk &amp; Leads</span>
          </button>

          <button
            type="button"
            onClick={() => setCockpitMode("PIPELINE")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              cockpitMode === "PIPELINE"
                ? "bg-[#0F2540] text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <RotateCcw size={13} />
            <span>Ingest &amp; Pipeline Health</span>
            {pipeline && (
              <span className="ml-1 text-[10px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                {pipeline.overall.progressPercent}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCockpitMode("RADAR")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              cockpitMode === "RADAR"
                ? "bg-[#0F2540] text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity size={13} />
            <span>Telecaller Radar &amp; Live Feed</span>
            {liveStatus && (
              <span className="ml-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                {liveStatus.online.length} Online
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowPlaybook(!showPlaybook)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1 cursor-pointer transition-colors"
        >
          {showPlaybook ? "Hide" : "Show"} Telecaller Playbook
        </button>
      </div>

      {showPlaybook && <StaffCrmPlaybook />}

      {/* ── MODE 1: CALLING DESK & LEADS (DEFAULT WORKSPACE) ── */}
      {cockpitMode === "CALLING" && (
        <LeadsWorkspace
          initialLeads={leads}
          initialTotal={total}
          pageSize={pageSize}
          staff={staff}
          batches={batches.map((b) => ({ id: b.id, name: b.name }))}
          isSuperAdmin={!!isSuperAdmin}
        />
      )}

      {/* ── MODE 2: INGESTION & PIPELINE HEALTH ── */}
      {cockpitMode === "PIPELINE" && (
        <div className="space-y-4">
          {/* 4-Step Interactive Visual Funnel */}
          {showPipelineFlow && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    How Staff CRM Works: The 4-Step Pipeline Flow
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPipelineFlow(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Dismiss ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Step 1</span>
                  </div>
                  <p className="font-extrabold text-xs text-slate-900 mt-2">📥 1. Bulk Ingest</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Upload CSV or Excel data files with automatic telephone and duplicate validation.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Step 2</span>
                  </div>
                  <p className="font-extrabold text-xs text-slate-900 mt-2">👥 2. Fair-Share Distribute</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Auto-assign equal batches of fresh leads to active on-duty telecallers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Step 3</span>
                  </div>
                  <p className="font-extrabold text-xs text-slate-900 mt-2">⚡ 3. Power Dial &amp; Classify</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Dial contacts with 1-click outcomes, pitch scripts, and WhatsApp follow-up templates.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-black">
                      4
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Step 4</span>
                  </div>
                  <p className="font-extrabold text-xs text-slate-900 mt-2">🎉 4. Convert &amp; Match</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Promote tutors to User Directory; route parents into Student Leads for immediate teacher matching.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Pipeline (2/3) + Recent Uploads (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {pipeline && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <RotateCcw size={14} className="text-blue-500" /> Data Pipeline Overview
                  </h2>
                  <div className="text-[10px] font-bold text-slate-500">
                    {pipeline.overall.completedBatches}/{pipeline.overall.totalBatches} batches done
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mb-3 bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">
                      {pipeline.overall.totalDone.toLocaleString()}/{pipeline.overall.totalLeads.toLocaleString()} processed
                    </span>
                    <span className="font-extrabold text-blue-600">{pipeline.overall.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${pipeline.overall.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>~{pipeline.overall.avgDailyThroughput} leads/day throughput</span>
                    {pipeline.overall.estimatedCompletionDate && (
                      <span>ETA: {pipeline.overall.estimatedCompletionDate}</span>
                    )}
                  </div>
                </div>

                {/* Per-batch list */}
                <div className="space-y-2">
                  {pipeline.batches.slice(0, 6).map((b) => {
                    const sc: Record<string, string> = {
                      not_started: "text-slate-400",
                      active: "text-emerald-600",
                      stalled: "text-amber-600",
                      completed: "text-blue-600",
                    };
                    const sl: Record<string, string> = {
                      not_started: "⚪ Not Started",
                      active: "🟢 Active",
                      stalled: "🟡 Stalled",
                      completed: "🔵 Completed",
                    };
                    return (
                      <div key={b.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="font-bold text-slate-700 truncate">{b.name}</span>
                            <span className={`text-[9px] font-extrabold ${sc[b.status]}`}>
                              {sl[b.status]} · {b.progressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                b.status === "completed"
                                  ? "bg-blue-400"
                                  : b.status === "stalled"
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                              style={{ width: `${b.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Uploads */}
            <div className="space-y-4">
              {batches.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <Upload size={14} className="text-blue-500" /> Recent Upload Batches
                  </h2>
                  <div className="space-y-2">
                    {batches.slice(0, 6).map((b) => (
                      <div key={b.id} className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                          <Upload size={11} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-700 truncate">{b.name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">{b._count.leads} leads</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODE 3: TELECALLER LIVE RADAR & ACTIVITY ── */}
      {cockpitMode === "RADAR" && (
        <div className="space-y-4">
          <StaffPresenceBoard isSuperAdmin={!!isSuperAdmin} />

          {/* Live Activity Feed */}
          {activityFeed && activityFeed.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-3">
                <Activity size={14} className="text-[#16A34A]" /> Real-Time Telecaller Activity Feed
              </h2>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {activityFeed.map((log) => {
                  const emoji: Record<string, string> = {
                    ANSWERED: "📞", NO_ANSWER: "📵", BUSY: "⏳", WRONG_NUMBER: "❌",
                    CALLBACK_REQUESTED: "🔔", CONVERTED: "🎉", NOT_INTERESTED: "👎",
                  };
                  const calledAt = new Date(log.calledAt);
                  const minsAgo = Math.round((Date.now() - calledAt.getTime()) / 60000);
                  const timeLabel = minsAgo < 1 ? "now" : minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`;
                  return (
                    <div key={log.id} className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <span className="text-[11px] text-slate-400 font-mono w-14 shrink-0 pt-0.5">{timeLabel}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-slate-800">{log.calledBy.name || log.calledBy.email.split("@")[0]}</span>
                        {" "}<span>{emoji[log.outcome] || "📋"}</span>{" "}
                        <span className="font-semibold text-slate-700">{log.lead.name || "Lead"}</span>
                        {log.notes && <span className="text-slate-500 italic"> — &quot;{log.notes.slice(0, 45)}&quot;</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Power Dialer launched from Top Nav ── */}
      {isPowerDialing && (
        <StaffPowerDialer
          leads={leads}
          initialIndex={0}
          onClose={() => setIsPowerDialing(false)}
          onLeadUpdated={() => {}}
        />
      )}
    </div>
  );
}
