"use client";

import React, { useState, useTransition, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Play, Pause, Square, Trash2, Zap, Plus, RefreshCw,
  Mail, Bell, Smartphone, Users, TrendingUp, Send,
  AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronRight,
  Calendar, Target, Settings, BarChart2, Eye, Download,
  Loader2, X, Filter,
} from "lucide-react";
import {
  toggleCampaignStatusAction,
  deleteDummyCampaignAction,
  triggerCampaignNowAction,
} from "@/app/actions/dummy-campaign.actions";
import { DummyCampaignForm } from "./DummyCampaignForm";
import { DummyCampaignLogs } from "./DummyCampaignLogs";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
  targetGroup: string;
  channels: string[];
  leadsPerDay: number;
  totalSent: number;
  totalFailed: number;
  totalLimit: number | null;
  startDate: string | null;
  endDate: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  DRAFT:     { label: "Draft",     color: "#94A3B8", bg: "#F1F5F9", dot: "bg-slate-400" },
  ACTIVE:    { label: "Active",    color: "#16A34A", bg: "#F0FDF4", dot: "bg-emerald-500 animate-pulse" },
  PAUSED:    { label: "Paused",    color: "#D97706", bg: "#FFFBEB", dot: "bg-amber-400" },
  STOPPED:   { label: "Stopped",   color: "#DC2626", bg: "#FEF2F2", dot: "bg-rose-500" },
  COMPLETED: { label: "Completed", color: "#7C3AED", bg: "#F5F3FF", dot: "bg-purple-500" },
};

const TARGET_LABELS: Record<string, string> = {
  ALL_TUTORS: "All Tutors",
  NEW_7D:     "New (7 days)",
  NEW_14D:    "New (14 days)",
  NEW_30D:    "New (30 days)",
  VERIFIED:   "Verified Tutors",
  UNVERIFIED: "Unverified Tutors",
  SUBSCRIBED: "Subscribed (Paid)",
  FREE_TIER:  "Free Tier",
  CUSTOM:     "Custom Selection",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL:  <Mail size={12} />,
  PUSH:   <Smartphone size={12} />,
  IN_APP: <Bell size={12} />,
};

const PIE_COLORS = ["#16A34A", "#0EA5E9", "#F59E0B"];

// ── Helper: format date ───────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ── Sub-component: KPI Card ───────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white`} style={{ background: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Sub-component: Campaign Card ──────────────────────────────────────────────

function CampaignCard({ campaign, onRefresh }: { campaign: Campaign; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;
  const progress = campaign.totalLimit
    ? Math.min((campaign.totalSent / campaign.totalLimit) * 100, 100)
    : null;

  const handleStatus = (newStatus: "ACTIVE" | "PAUSED" | "STOPPED") => {
    startTransition(async () => {
      await toggleCampaignStatusAction(campaign.id, newStatus);
      onRefresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete campaign "${campaign.name}"? This will also delete all delivery logs.`)) return;
    startTransition(async () => {
      await deleteDummyCampaignAction(campaign.id);
      onRefresh();
    });
  };

  const handleTrigger = () => {
    startTransition(async () => {
      const result = await triggerCampaignNowAction(campaign.id);
      if (result.success) {
        setTriggerResult(`✅ Sent ${result.data!.sent} notifications to ${result.data!.usersProcessed} tutors`);
      } else {
        setTriggerResult(`❌ ${result.error}`);
      }
      setTimeout(() => setTriggerResult(null), 5000);
      onRefresh();
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
            <Send size={18} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm truncate">{campaign.name}</h3>
              <span
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                style={{ background: sc.bg, color: sc.color }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            {campaign.description && (
              <p className="text-[12px] text-slate-500 mt-0.5 truncate">{campaign.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
        {[
          { label: "Target",    value: TARGET_LABELS[campaign.targetGroup] ?? campaign.targetGroup },
          { label: "Per Day",   value: `${campaign.leadsPerDay} lead${campaign.leadsPerDay !== 1 ? "s" : ""}` },
          { label: "Total Sent",value: campaign.totalSent.toLocaleString() },
          { label: "Last Run",  value: fmtDateTime(campaign.lastRunAt) },
        ].map((s) => (
          <div key={s.label} className="px-4 py-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className="text-xs font-extrabold text-slate-700 mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Channels */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Channels:</span>
        {campaign.channels.map((ch) => (
          <span key={ch} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
            {CHANNEL_ICONS[ch]} {ch}
          </span>
        ))}
      </div>

      {/* Progress Bar (if limited) */}
      {progress !== null && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>{campaign.totalSent.toLocaleString()} / {campaign.totalLimit!.toLocaleString()} total sends</span>
            <span className="font-bold">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Trigger Result */}
      {triggerResult && (
        <div className={`mx-5 mb-3 p-3 rounded-xl text-xs font-bold ${triggerResult.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {triggerResult}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
        {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
          <button
            onClick={() => handleStatus("ACTIVE")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {campaign.status === "PAUSED" ? "Resume" : "Activate"}
          </button>
        ) : campaign.status === "ACTIVE" ? (
          <button
            onClick={() => handleStatus("PAUSED")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
            Pause
          </button>
        ) : null}

        {(campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
          <button
            onClick={() => handleStatus("STOPPED")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Square size={12} /> Stop
          </button>
        )}

        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          Fire Now
        </button>

        {(campaign.status === "DRAFT" || campaign.status === "STOPPED") && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>

      {/* Expanded: Logs Preview */}
      {expanded && (
        <div className="border-t border-slate-100 p-5">
          <DummyCampaignLogs campaignId={campaign.id} />
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard Component ─────────────────────────────────────────────────

export function DummyCampaignDashboard(props: Props) {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "paused" | "stopped" | "draft">("all");
  const [, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    startTransition(() => setRefreshKey((k) => k + 1));
  }, []);

  const { campaigns, totalCampaigns, activeCampaigns, sentToday, sentThisMonth, dailyVolume, channelBreakdown } = props;

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === "all") return true;
    return c.status.toLowerCase() === activeTab;
  });

  const pieData = Object.entries(channelBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            🎯 Dummy Lead Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Send location-aware dummy leads to tutors via Email, Push & In-App bell
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-500/25 transition-all active:scale-95"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<BarChart2 size={20} />} label="Total Campaigns" value={totalCampaigns} color="#3B82F6" />
        <KpiCard icon={<Play size={20} />} label="Active Now" value={activeCampaigns} sub="Running campaigns" color="#16A34A" />
        <KpiCard icon={<Send size={20} />} label="Sent Today" value={sentToday.toLocaleString()} sub="Across all campaigns" color="#0EA5E9" />
        <KpiCard icon={<TrendingUp size={20} />} label="This Month" value={sentThisMonth.toLocaleString()} sub="Total deliveries" color="#8B5CF6" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-500" />
            Daily Delivery Volume (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyVolume} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94A3B8" }}
                tickFormatter={(v) => v.slice(5)}
                interval={4}
              />
              <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 11 }}
                formatter={(v) => [v ?? 0, "Delivered"]}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Target size={16} className="text-emerald-500" />
            Channel Breakdown
          </h3>
          {pieData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700 }}>{v}</span>}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-slate-400">
              <BarChart2 size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-bold">No data yet</p>
              <p className="text-[10px]">Run a campaign to see breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-4 border-b border-slate-100 overflow-x-auto">
          {[
            { key: "all",      label: "All",       count: totalCampaigns },
            { key: "active",   label: "Active",    count: campaigns.filter((c) => c.status === "ACTIVE").length },
            { key: "paused",   label: "Paused",    count: campaigns.filter((c) => c.status === "PAUSED").length },
            { key: "draft",    label: "Draft",     count: campaigns.filter((c) => c.status === "DRAFT").length },
            { key: "stopped",  label: "Stopped",   count: campaigns.filter((c) => c.status === "STOPPED" || c.status === "COMPLETED").length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-extrabold px-1 ${activeTab === tab.key ? "bg-white/25 text-white" : "bg-slate-200 text-slate-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Campaign Cards */}
        <div className="p-4 space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Send size={40} className="mb-3 opacity-20" />
              <p className="font-bold text-sm">No campaigns yet</p>
              <p className="text-xs mt-1">Click "New Campaign" to create your first dummy lead campaign</p>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id + refreshKey} campaign={campaign} onRefresh={onRefresh} />
            ))
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-extrabold text-slate-900 text-base">Create Dummy Lead Campaign</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
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
