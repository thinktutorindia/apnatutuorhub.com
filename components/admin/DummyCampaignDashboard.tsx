"use client";

import React, { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Play, Pause, Square, Trash2, Zap, Plus, RefreshCw,
  Mail, Bell, Smartphone, TrendingUp, Send,
  CheckCircle2, ChevronDown, ChevronRight, Eye,
  Download, Loader2, X, MapPin, GraduationCap,
  Clock, IndianRupee, Sparkles, BarChart2, Users,
  Target, Settings2, BookOpen, Layers, ShieldCheck,
  Calendar, Check, AlertCircle, Info, Flame, ArrowRight
} from "lucide-react";
import {
  toggleCampaignStatusAction,
  deleteDummyCampaignAction,
  triggerCampaignNowAction,
  generateLeadPreviewAction,
} from "@/app/actions/dummy-campaign.actions";
import { DummyCampaignForm } from "./DummyCampaignForm";
import { DummyCampaignLogs } from "./DummyCampaignLogs";
import type { DummyLead } from "@/lib/dummy-campaign-types";
import { stripCampaignCfg, parseCampaignCfg } from "@/lib/dummy-campaign-types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
  targetGroup: string;
  channels: string[];
  leadsPerDay: number;
  overrideSubjects?: string[];
  budgetMin?: number;
  budgetMax?: number;
  customUserIds?: string[];
  excludeUserIds?: string[];
  totalSent: number;
  totalFailed: number;
  totalLimit: number | null;
  startDate: string | null;
  endDate: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

interface Props {
  campaigns: Campaign[];
  totalCampaigns: number;
  activeCampaigns: number;
  sentToday: number;
  sentThisMonth: number;
  dailyVolume: Array<{ date: string; count: number }>;
  channelBreakdown: Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     bg: "#F1F5F9", color: "#64748B", dot: "bg-slate-400" },
  ACTIVE:    { label: "Active",    bg: "#DCFCE7", color: "#16A34A", dot: "bg-emerald-500 animate-pulse" },
  PAUSED:    { label: "Paused",    bg: "#FEF9C3", color: "#CA8A04", dot: "bg-yellow-400" },
  STOPPED:   { label: "Stopped",   bg: "#FEE2E2", color: "#DC2626", dot: "bg-rose-500" },
  COMPLETED: { label: "Completed", bg: "#EDE9FE", color: "#7C3AED", dot: "bg-purple-500" },
};

const TARGET_LABELS: Record<string, string> = {
  ALL_TUTORS:  "🌐 All Active Tutors",
  NEW_7D:      "🆕 New (7 days)",
  NEW_14D:     "🆕 New (14 days)",
  NEW_30D:     "🆕 New (30 days)",
  VERIFIED:    "✅ Verified Tutors",
  UNVERIFIED:  "⏳ Unverified Tutors",
  SUBSCRIBED:  "💎 Subscribed Tutors",
  FREE_TIER:   "🆓 Free Tier Tutors",
  CUSTOM:      "🎯 Specific Tutors",
};

const CHANNEL_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  EMAIL:  { icon: <Mail size={11} />,       color: "#2563EB", bg: "#DBEAFE", label: "Email" },
  PUSH:   { icon: <Smartphone size={11} />, color: "#7C3AED", bg: "#EDE9FE", label: "Push" },
  IN_APP: { icon: <Bell size={11} />,       color: "#D97706", bg: "#FEF3C7", label: "Bell" },
};

const MODE_LABELS: Record<string, string> = {
  ONLINE:   "Online",
  OFFLINE:  "In-Person",
  EITHER:   "Online / In-Person",
  COACHING: "Coaching Institute",
};

// ── Next Automated Run Countdown Helper ────────────────────────────────────────

function getNextAutomatedRunInfo(): { timeStr: string; remainingStr: string; exactIST: string } {
  const now = new Date();
  // Convert current UTC time to IST (UTC + 5:30)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istNow = new Date(utcMs + 330 * 60000);

  const nextRun = new Date(istNow);
  nextRun.setHours(9, 0, 0, 0);

  if (istNow.getTime() >= nextRun.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const diffMs = nextRun.getTime() - istNow.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isToday = nextRun.getDate() === istNow.getDate();
  const dayLabel = isToday ? "Today" : "Tomorrow";

  return {
    timeStr: `${dayLabel} at 9:00 AM IST`,
    remainingStr: `in ${diffHours}h ${diffMins}m`,
    exactIST: nextRun.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
  };
}

// ── Lead Preview Card ─────────────────────────────────────────────────────────

function LeadPreviewCard({ lead, index }: { lead: DummyLead; index: number }) {
  const isHourly = lead.rateType === "HOURLY";
  const budgetFormatted = isHourly
    ? `₹${lead.budgetMin}–₹${lead.budgetMax}/hr`
    : `₹${(lead.budgetMin || 0).toLocaleString("en-IN")}–₹${(lead.budgetMax || 0).toLocaleString("en-IN")}/mo`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden hover:shadow-md transition-all">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-[#0F2540] via-[#2D9E6B] to-emerald-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white">
          <MapPin size={14} className="text-emerald-300 shrink-0" />
          <span className="text-xs font-black">{lead.locality}, {lead.city}</span>
          {lead.distanceKm !== undefined && (
            <span className="text-[10px] bg-white/20 rounded-full px-2.5 py-0.5 font-bold">
              ~{lead.distanceKm} km away
            </span>
          )}
        </div>
        <span className="text-[10px] bg-black/20 text-white/90 font-black px-2.5 py-0.5 rounded-full">
          AI Simulation #{index + 1}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Subjects */}
        <div className="flex flex-wrap gap-1.5">
          {lead.subjects.map((s) => (
            <span key={s} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
              <BookOpen size={10} /> {s}
            </span>
          ))}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Class &amp; Board</p>
            <p className="text-xs font-black text-slate-800 mt-0.5">{lead.classLevel} · {lead.board}</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Teaching Mode</p>
            <p className="text-xs font-black text-slate-800 mt-0.5">{MODE_LABELS[lead.mode] || lead.mode}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">AI Market+ Rate Tariff</p>
              <span className="text-[9px] font-black bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-md">
                {isHourly ? "Hourly Rate" : "Monthly Rate"}
              </span>
            </div>
            <p className="text-base font-black text-emerald-900 mt-0.5">
              {budgetFormatted}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Schedule</p>
            <p className="text-[11px] font-bold text-slate-700 mt-0.5">{lead.days}</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Preferred Timing</p>
            <p className="text-[11px] font-bold text-slate-700 mt-0.5">{lead.timing}</p>
          </div>
        </div>

        {/* Dummy AI watermark */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-600" />
            <p className="text-[10px] font-black text-purple-800">Gemini Geo-Cluster Proximity Engine</p>
          </div>
          <span className="text-[9px] text-purple-700 font-bold">Rotates Every 24h</span>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Row Card ─────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  isSelected,
  onSelect,
  onRefresh,
  onTriggerDispatch,
}: {
  campaign: Campaign;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  onTriggerDispatch: (campaign: Campaign) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;

  const cfg = parseCampaignCfg(campaign.description);
  const isHourly = cfg.rateType === "HOURLY";
  const rateDisplay = cfg.autoAdapt
    ? `Auto-adapt ${isHourly ? "₹/hr" : "₹/mo"} by class + area`
    : isHourly
    ? `₹${campaign.budgetMin ?? 200}–₹${campaign.budgetMax ?? 600}/hr`
    : `₹${(campaign.budgetMin ?? 800).toLocaleString()}–₹${(campaign.budgetMax ?? 3000).toLocaleString()}/mo`;

  const handleStatus = (e: React.MouseEvent, newStatus: "ACTIVE" | "PAUSED" | "STOPPED") => {
    e.stopPropagation();
    startTransition(async () => {
      await toggleCampaignStatusAction(campaign.id, newStatus);
      onRefresh();
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) return;
    startTransition(async () => {
      await deleteDummyCampaignAction(campaign.id);
      onRefresh();
    });
  };

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTriggerDispatch(campaign);
  };

  return (
    <div
      className={`rounded-3xl border transition-all cursor-pointer ${
        isSelected
          ? "border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
      }`}
      onClick={onSelect}
    >
      <div className="p-4 space-y-2.5">
        {/* Title & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-slate-900 text-sm truncate">{campaign.name}</span>
              <span
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-slate-200/40"
                style={{ background: sc.bg, color: sc.color }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
              {TARGET_LABELS[campaign.targetGroup] || campaign.targetGroup}
            </p>
          </div>
          {isSelected && <ChevronDown size={15} className="text-emerald-600 shrink-0 mt-0.5" />}
        </div>

        {/* Schedule & Rate Pill */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="p-1.5 rounded-xl bg-slate-100/80 text-slate-700 font-bold flex items-center gap-1">
            <Clock size={11} className="text-blue-500 shrink-0" />
            <span className="truncate">9:00 AM IST ({campaign.leadsPerDay}/day)</span>
          </div>
          <div className="p-1.5 rounded-xl bg-emerald-100/70 text-emerald-900 font-black flex items-center gap-1">
            <IndianRupee size={11} className="text-emerald-600 shrink-0" />
            <span className="truncate">{rateDisplay}</span>
          </div>
        </div>

        {/* Channels & Stats */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex gap-1">
            {campaign.channels.map((ch) => {
              const m = CHANNEL_META[ch];
              return (
                <span
                  key={ch}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black"
                  style={{ background: m?.bg, color: m?.color }}
                >
                  {m?.icon} {m?.label}
                </span>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-500 font-extrabold">
            <strong className="text-slate-900 font-black">{campaign.totalSent.toLocaleString()}</strong> sent
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {campaign.status === "ACTIVE" && (
            <button
              type="button"
              onClick={(e) => handleStatus(e, "PAUSED")}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black transition-all cursor-pointer"
            >
              <Pause size={10} /> Pause
            </button>
          )}
          {campaign.status === "PAUSED" && (
            <button
              type="button"
              onClick={(e) => handleStatus(e, "ACTIVE")}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black transition-all cursor-pointer"
            >
              <Play size={10} /> Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleTrigger}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black transition-all shadow-xs cursor-pointer"
          >
            <Zap size={10} /> Fire Now
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Delete Campaign"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Right Panel: Comprehensive Campaign Detail, Simulator & Sent Transcripts ────

function CampaignDetailPanel({
  campaign,
  onRefresh,
  onTriggerDispatch,
}: {
  campaign: Campaign;
  onRefresh: () => void;
  onTriggerDispatch: (campaign: Campaign) => void;
}) {
  const [leads, setLeads] = useState<DummyLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [tutorCount, setTutorCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"logs" | "preview" | "settings">("logs");
  const nextRunInfo = useMemo(() => getNextAutomatedRunInfo(), []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    const r = await generateLeadPreviewAction({ campaignId: campaign.id, count: 6 });
    if (r.success && r.data) {
      setLeads(r.data.leads);
      setTutorCount(r.data.tutorCount);
    }
    setLoading(false);
  }, [campaign.id]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const cfg = parseCampaignCfg(campaign.description);
  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;
  const isHourly = cfg.rateType === "HOURLY";
  const rateDisplay = cfg.autoAdapt
    ? `Auto-adapt ${isHourly ? "hourly" : "monthly"} by class + area`
    : isHourly
    ? `₹${campaign.budgetMin ?? 200}–₹${campaign.budgetMax ?? 600} / hour`
    : `₹${(campaign.budgetMin ?? 800).toLocaleString()}–₹${(campaign.budgetMax ?? 3000).toLocaleString()} / month`;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* ── Top Header & Follow-Up Status ── */}
      <div className="p-5 border-b border-slate-100 space-y-3.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-slate-900 text-lg leading-tight">{campaign.name}</h2>
              <span
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black"
                style={{ background: sc.bg, color: sc.color }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Targeting: <strong className="text-slate-800">{TARGET_LABELS[campaign.targetGroup] || campaign.targetGroup}</strong> ({tutorCount} matched tutors)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTriggerDispatch(campaign)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Zap size={14} className="fill-white" />
              <span>⚡ Test Fire Now</span>
            </button>
          </div>
        </div>

        {/* Follow-Up Status & Automated Daily Schedule Card with Live Countdown */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/80 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-blue-950 flex items-center gap-1.5 flex-wrap">
                <span>⏰ Automated Daily Dispatch: 9:00 AM IST</span>
                <span className="text-[10px] bg-blue-200/90 text-blue-950 px-2 py-0.5 rounded-full font-black">
                  Next: {nextRunInfo.timeStr} ({nextRunInfo.remainingStr})
                </span>
              </p>
              <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                {campaign.lastRunAt
                  ? `Last dispatched on ${new Date(campaign.lastRunAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · Next automated run scheduled for 9:00 AM IST tomorrow`
                  : `Next automated run scheduled for 9:00 AM IST ${nextRunInfo.timeStr.toLowerCase()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-black text-blue-900 bg-white/90 px-3.5 py-2 rounded-2xl border border-blue-200 shadow-2xs">
            <span>{campaign.leadsPerDay} lead(s) / tutor daily</span>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Strip ── */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/30">
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
            <Send size={11} className="text-emerald-500" /> Total Dispatched
          </div>
          <p className="text-sm font-black text-slate-900">{campaign.totalSent.toLocaleString()}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
            <IndianRupee size={11} className="text-blue-500" /> Rate Structure
          </div>
          <p className="text-xs font-black text-slate-800 truncate px-1">{rateDisplay}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
            <Layers size={11} className="text-purple-500" /> Delivery Channels
          </div>
          <p className="text-xs font-black text-slate-800">{campaign.channels.join(", ")}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
            <Target size={11} className="text-amber-500" /> Total Limit
          </div>
          <p className="text-sm font-black text-slate-900">
            {campaign.totalLimit ? campaign.totalLimit.toLocaleString() : "Unlimited (∞)"}
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 px-5 bg-white">
        {[
          { key: "logs", label: "📜 Sent Messages & Tutors", icon: <BarChart2 size={13} />, badge: `${campaign.totalSent}` },
          { key: "preview", label: "👁️ Daily Rotation Simulator", icon: <Sparkles size={13} /> },
          { key: "settings", label: "⚙️ Campaign Configuration", icon: <Settings2 size={13} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Tab 1: Sent Messages & Tutors */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Info size={15} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-800">
                  Full Dispatch Log &amp; Notification Transcripts
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inspect every tutor who received a lead from this campaign. Click &quot;View Message&quot; to read the exact in-app notification, web push text, and simulated email sent to their device.
                </p>
              </div>
            </div>
            <DummyCampaignLogs campaignId={campaign.id} />
          </div>
        )}

        {/* Tab 2: Live Rotation Simulator */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">
                  24-Hour Geo &amp; Class Rotation Simulator
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Preview next simulated leads generated deterministically by tutor GPS location and class benchmarks.
                </p>
              </div>
              <button
                type="button"
                onClick={loadPreview}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>Reroll Simulation</span>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 size={24} className="animate-spin mb-2 text-emerald-500" />
                <p className="text-xs font-bold">Calculating geo-rotations...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs font-black text-slate-700">No tutors found in this target audience</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leads.map((lead, i) => (
                  <LeadPreviewCard key={i} lead={lead} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Campaign Configuration */}
        {activeTab === "settings" && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
            <p className="font-black text-slate-900 text-sm">Campaign Engine Settings</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400">Target Group</p>
                <p className="font-black text-slate-800 mt-0.5">{TARGET_LABELS[campaign.targetGroup] || campaign.targetGroup}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400">Rate Structure</p>
                <p className="font-black text-emerald-700 mt-0.5">{rateDisplay}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400">Leads per Tutor Daily</p>
                <p className="font-black text-slate-800 mt-0.5">{campaign.leadsPerDay} lead(s) / day</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400">Schedule Time</p>
                <p className="font-black text-slate-800 mt-0.5">9:00 AM IST Every Morning</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 col-span-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Internal Memo / Notes</p>
                <p className="font-semibold text-slate-700 mt-0.5">{stripCampaignCfg(campaign.description) || "No internal notes provided."}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

interface DispatchState {
  isOpen: boolean;
  isDispatching: boolean;
  campaignName: string;
  progress: number;
  result: { sent: number; failed: number; usersProcessed: number; timeTakenMs?: number } | null;
  error: string | null;
}

export function DummyCampaignDashboard(props: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  const [dispatchState, setDispatchState] = useState<DispatchState>({
    isOpen: false,
    isDispatching: false,
    campaignName: "",
    progress: 0,
    result: null,
    error: null,
  });

  const { campaigns, totalCampaigns, activeCampaigns, sentToday, sentThisMonth, dailyVolume, channelBreakdown } = props;

  const onRefresh = useCallback(() => {
    startTransition(() => setRefreshKey((k) => k + 1));
  }, []);

  // Auto-select first campaign on load if available
  useEffect(() => {
    if (!selectedId && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns, selectedId]);

  const handleTriggerDispatch = useCallback((campaign: Campaign) => {
    setDispatchState({
      isOpen: true,
      isDispatching: true,
      campaignName: campaign.name,
      progress: 25,
      result: null,
      error: null,
    });

    const progressTimer = setInterval(() => {
      setDispatchState((prev) => {
        if (!prev.isDispatching || prev.progress >= 90) return prev;
        return { ...prev, progress: Math.min(90, prev.progress + 15) };
      });
    }, 200);

    triggerCampaignNowAction(campaign.id)
      .then((res) => {
        clearInterval(progressTimer);
        if (res.success && res.data) {
          setDispatchState({
            isOpen: true,
            isDispatching: false,
            campaignName: campaign.name,
            progress: 100,
            result: res.data,
            error: null,
          });
          onRefresh();
        } else {
          setDispatchState({
            isOpen: true,
            isDispatching: false,
            campaignName: campaign.name,
            progress: 100,
            result: null,
            error: res.error || "Failed to trigger campaign",
          });
        }
      })
      .catch((err) => {
        clearInterval(progressTimer);
        setDispatchState({
          isOpen: true,
          isDispatching: false,
          campaignName: campaign.name,
          progress: 100,
          result: null,
          error: err instanceof Error ? err.message : "Unexpected error during dispatch",
        });
      });
  }, [onRefresh]);

  const filtered = campaigns.filter((c) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return c.status === "ACTIVE";
    if (statusFilter === "paused") return c.status === "PAUSED";
    if (statusFilter === "draft") return c.status === "DRAFT";
    if (statusFilter === "stopped") return c.status === "STOPPED" || c.status === "COMPLETED";
    return true;
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* ── Top Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-fuchsia-600" /> Dummy Lead Campaigns &amp; Follow-Ups
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Automated geo-matched daily dummy lead engine · Rotates localities &amp; class fee benchmarks every 24h
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2D9E6B] hover:bg-[#238357] text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* ── Top Educational Engine Feature Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin size={17} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">Gemini AI Proximity</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-snug">
              Micro-clusters nearby localities within 1–5 km (e.g. Sangam Vihar → Batra → Khanpur; Govindpuri → Okhla).
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#2D9E6B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap size={17} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">AI Market+ Rate Tariff</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-snug">
              Strictly matched to taught subjects &amp; classes with attractive +15% premium to motivate teachers.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck size={17} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">Resend Quota Guard</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-snug">
              Sends simulated alerts to placeholder accounts while protecting real email deliverability.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock size={17} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">Automated 9:00 AM Cron</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-snug">
              Active campaigns dispatch daily follow-ups automatically every morning without manual intervention.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white bg-blue-600 shadow-xs">
            <BarChart2 size={19} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Campaigns</p>
            <p className="text-xl font-black text-slate-900">{totalCampaigns}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white bg-[#2D9E6B] shadow-xs">
            <Play size={19} className="fill-white ml-0.5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Live</p>
            <p className="text-xl font-black text-slate-900">{activeCampaigns} Campaigns</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white bg-sky-500 shadow-xs">
            <Send size={19} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sent Today</p>
            <p className="text-xl font-black text-slate-900">{sentToday.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white bg-purple-600 shadow-xs">
            <TrendingUp size={19} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">This Month</p>
            <p className="text-xl font-black text-slate-900">{sentThisMonth.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Section: Left (Campaigns List) & Right (Detail Panel / Transcripts) ── */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0" style={{ height: "calc(100vh - 280px)" }}>

        {/* LEFT: Campaign list */}
        <div className="flex flex-col w-full lg:w-[390px] shrink-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-2.5 border-b border-slate-100 overflow-x-auto bg-slate-50/50">
            {[
              { key: "all", label: "All", count: campaigns.length },
              { key: "active", label: "Active", count: campaigns.filter((c) => c.status === "ACTIVE").length },
              { key: "paused", label: "Paused", count: campaigns.filter((c) => c.status === "PAUSED").length },
              { key: "draft", label: "Draft", count: campaigns.filter((c) => c.status === "DRAFT").length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                No {statusFilter} campaigns found.
              </div>
            ) : (
              filtered.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  isSelected={selectedId === c.id}
                  onSelect={() => setSelectedId(c.id)}
                  onRefresh={onRefresh}
                  onTriggerDispatch={handleTriggerDispatch}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Campaign detail, simulator, and sent messages transcript */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden min-w-0">
          {selectedCampaign ? (
            <CampaignDetailPanel
              key={`${selectedCampaign.id}-${refreshKey}`}
              campaign={selectedCampaign}
              onRefresh={onRefresh}
              onTriggerDispatch={handleTriggerDispatch}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center shadow-xs">
                <Sparkles size={32} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Select a Campaign to Inspect</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md font-medium">
                  Click any campaign on the left to see full daily follow-up stats, real-time message transcripts, and live rotation previews.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Interactive Real-Time Dispatch Progress & Toast Modal ── */}
      {dispatchState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${dispatchState.isDispatching ? "bg-blue-100 text-blue-600" : dispatchState.error ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {dispatchState.isDispatching ? (
                    <Zap size={18} className="animate-bounce fill-blue-600" />
                  ) : dispatchState.error ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle2 size={18} className="stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {dispatchState.isDispatching ? "Firing Campaign..." : dispatchState.error ? "Dispatch Error" : "Campaign Dispatched!"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">{dispatchState.campaignName}</p>
                </div>
              </div>
              {!dispatchState.isDispatching && (
                <button
                  type="button"
                  onClick={() => setDispatchState((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {dispatchState.isDispatching && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Generating AI geo-leads &amp; dispatching notifications...</span>
                  <span className="text-blue-600 font-black">{dispatchState.progress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-[#2D9E6B] to-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${dispatchState.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center">
                  ⏱️ Estimated time: ~1.5 seconds · Processing batch queue concurrently
                </p>
              </div>
            )}

            {/* Success Summary */}
            {!dispatchState.isDispatching && dispatchState.result && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 stroke-[2.5]" />
                    <span>Instant Follow-Up Dispatch Completed</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Tutors Reached</p>
                      <p className="text-base font-black text-slate-900 mt-0.5">{dispatchState.result.usersProcessed}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Alerts Sent</p>
                      <p className="text-base font-black text-emerald-700 mt-0.5">{dispatchState.result.sent}</p>
                    </div>
                  </div>
                  {dispatchState.result.timeTakenMs !== undefined && (
                    <p className="text-[10px] text-emerald-800 font-bold text-center pt-1">
                      ⚡ Executed in {(dispatchState.result.timeTakenMs / 1000).toFixed(1)}s (10x faster concurrent batch mode)
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDispatchState((prev) => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-sm cursor-pointer text-center"
                >
                  Inspect Sent Transcripts in Table →
                </button>
              </div>
            )}

            {/* Error Message */}
            {!dispatchState.isDispatching && dispatchState.error && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {dispatchState.error}
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchState((prev) => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 px-4 rounded-2xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Campaign Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative z-10 w-full sm:max-w-3xl bg-white rounded-3xl shadow-2xl h-[90vh] max-h-[850px] overflow-hidden flex flex-col my-auto">
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-100 bg-white z-10">
              <div>
                <h2 className="font-black text-slate-900 text-base">New Dummy Lead Campaign</h2>
                <p className="text-xs text-slate-500 mt-0.5">Geo-matched leads rotate daily per tutor location &amp; class levels</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <DummyCampaignForm
              onSuccess={() => { setShowForm(false); onRefresh(); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

