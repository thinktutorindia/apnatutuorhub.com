"use client";

import React, { useState, useTransition, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Play, Pause, Square, Trash2, Zap, Plus, RefreshCw,
  Mail, Bell, Smartphone, TrendingUp, Send,
  CheckCircle2, ChevronDown, ChevronRight, Eye,
  Download, Loader2, X, MapPin, GraduationCap,
  Clock, IndianRupee, Sparkles, BarChart2, Users,
  Target, Settings2, BookOpen, Layers,
} from "lucide-react";
import {
  toggleCampaignStatusAction,
  deleteDummyCampaignAction,
  triggerCampaignNowAction,
  generateLeadPreviewAction,
} from "@/app/actions/dummy-campaign.actions";
import { DummyCampaignForm } from "./DummyCampaignForm";
import { DummyCampaignLogs } from "./DummyCampaignLogs";
import type { DummyLead } from "@/lib/dummy-lead-engine";

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
  ALL_TUTORS:  "🌐 All Tutors",
  NEW_7D:      "🆕 New (7 days)",
  NEW_14D:     "🆕 New (14 days)",
  NEW_30D:     "🆕 New (30 days)",
  VERIFIED:    "✅ Verified",
  UNVERIFIED:  "⏳ Unverified",
  SUBSCRIBED:  "💎 Subscribed",
  FREE_TIER:   "🆓 Free Tier",
  CUSTOM:      "🎯 Custom",
};

const CHANNEL_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  EMAIL:  { icon: <Mail size={11} />,       color: "#2563EB", bg: "#DBEAFE", label: "Email" },
  PUSH:   { icon: <Smartphone size={11} />, color: "#7C3AED", bg: "#EDE9FE", label: "Push" },
  IN_APP: { icon: <Bell size={11} />,       color: "#D97706", bg: "#FEF3C7", label: "Bell" },
};

const MODE_LABELS: Record<string, string> = {
  ONLINE:  "Online",
  OFFLINE: "In-Person",
  EITHER:  "Online / In-Person",
};

const PIE_COLORS = ["#2563EB", "#7C3AED", "#D97706"];

// ── Lead Preview Card ─────────────────────────────────────────────────────────

function LeadPreviewCard({ lead, index }: { lead: DummyLead; index: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white">
          <MapPin size={12} />
          <span className="text-xs font-extrabold">{lead.locality}, {lead.city}</span>
          {lead.distanceKm !== undefined && (
            <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5 font-bold">
              ~{lead.distanceKm} km away
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/70 font-bold">Lead #{index + 1}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Subjects */}
        <div className="flex flex-wrap gap-1">
          {lead.subjects.map((s) => (
            <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
              <BookOpen size={9} /> {s}
            </span>
          ))}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Class & Board</p>
            <p className="text-xs font-extrabold text-slate-700 mt-0.5">{lead.classLevel} · {lead.board}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Mode</p>
            <p className="text-xs font-extrabold text-slate-700 mt-0.5">{MODE_LABELS[lead.mode]}</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 col-span-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">Budget</p>
            <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
              ₹{lead.budgetMin.toLocaleString("en-IN")} – ₹{lead.budgetMax.toLocaleString("en-IN")}/mo
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Days</p>
            <p className="text-[11px] font-extrabold text-slate-700 mt-0.5">{lead.days}</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Timing</p>
            <p className="text-[11px] font-extrabold text-slate-700 mt-0.5">{lead.timing}</p>
          </div>
        </div>

        {/* Dummy watermark */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200">
          <Sparkles size={10} className="text-fuchsia-500" />
          <p className="text-[10px] font-extrabold text-fuchsia-600">Dummy / Simulated Lead</p>
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
}: {
  campaign: Campaign;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [trigMsg, setTrigMsg] = useState<string | null>(null);
  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;
  const progress = campaign.totalLimit
    ? Math.min((campaign.totalSent / campaign.totalLimit) * 100, 100) : null;

  const handleStatus = (newStatus: "ACTIVE" | "PAUSED" | "STOPPED") => {
    startTransition(async () => {
      await toggleCampaignStatusAction(campaign.id, newStatus);
      onRefresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${campaign.name}"?`)) return;
    startTransition(async () => {
      await deleteDummyCampaignAction(campaign.id);
      onRefresh();
    });
  };

  const handleTrigger = () => {
    startTransition(async () => {
      const r = await triggerCampaignNowAction(campaign.id);
      setTrigMsg(r.success
        ? `✅ Sent to ${r.data!.usersProcessed} tutors (${r.data!.sent} notifications)`
        : `❌ ${r.error}`);
      setTimeout(() => setTrigMsg(null), 5000);
      onRefresh();
    });
  };

  return (
    <div
      className={`rounded-2xl border transition-all cursor-pointer ${
        isSelected
          ? "border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm truncate">{campaign.name}</span>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                style={{ background: sc.bg, color: sc.color }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {TARGET_LABELS[campaign.targetGroup]} · {campaign.leadsPerDay}/day
            </p>
          </div>
          {isSelected && <ChevronDown size={14} className="text-emerald-500 shrink-0 mt-0.5" />}
        </div>

        {/* Channel badges */}
        <div className="flex gap-1 mt-2">
          {campaign.channels.map((ch) => {
            const m = CHANNEL_META[ch];
            return (
              <span key={ch} className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: m?.bg, color: m?.color }}>
                {m?.icon} {m?.label}
              </span>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-500">
          <span><strong className="text-slate-800">{campaign.totalSent.toLocaleString()}</strong> sent</span>
          {campaign.totalLimit && <span>/ {campaign.totalLimit.toLocaleString()} limit</span>}
          {campaign.lastRunAt && (
            <span className="ml-auto">
              Last: {new Date(campaign.lastRunAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Trigger result */}
        {trigMsg && (
          <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold ${trigMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {trigMsg}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
            <button onClick={() => handleStatus("ACTIVE")} disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-extrabold transition-all disabled:opacity-50">
              {isPending ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
              {campaign.status === "PAUSED" ? "Resume" : "Activate"}
            </button>
          )}
          {campaign.status === "ACTIVE" && (
            <button onClick={() => handleStatus("PAUSED")} disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-extrabold transition-all disabled:opacity-50">
              {isPending ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />} Pause
            </button>
          )}
          {(campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
            <button onClick={() => handleStatus("STOPPED")} disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[11px] font-extrabold transition-all">
              <Square size={10} /> Stop
            </button>
          )}
          <button onClick={handleTrigger} disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[11px] font-extrabold transition-all disabled:opacity-50">
            {isPending ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} Fire Now
          </button>
          {(campaign.status === "DRAFT" || campaign.status === "STOPPED") && (
            <button onClick={handleDelete} disabled={isPending}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-xl text-[11px] font-bold transition-all">
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Right Panel: Campaign Detail + Lead Preview ───────────────────────────────

function CampaignDetailPanel({ campaign }: { campaign: Campaign }) {
  const [leads, setLeads] = useState<DummyLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [tutorCount, setTutorCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"preview" | "logs">("preview");

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

  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Panel Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-extrabold text-slate-900 text-base leading-tight">{campaign.name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: sc.bg, color: sc.color }}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {sc.label}
            </span>
            <span className="text-xs text-slate-500">{TARGET_LABELS[campaign.targetGroup]}</span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded-lg px-2 py-0.5">
              👥 {tutorCount.toLocaleString()} tutors
            </span>
          </div>
        </div>
        <button onClick={loadPreview} disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all disabled:opacity-50">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Total Sent",  value: campaign.totalSent.toLocaleString(),  icon: <Send size={11} className="text-emerald-500" /> },
          { label: "Per Day",     value: `${campaign.leadsPerDay} lead${campaign.leadsPerDay > 1 ? "s" : ""}`, icon: <Clock size={11} className="text-blue-500" /> },
          { label: "Channels",    value: campaign.channels.length,              icon: <Layers size={11} className="text-purple-500" /> },
          { label: "Limit",       value: campaign.totalLimit ? campaign.totalLimit.toLocaleString() : "∞", icon: <Target size={11} className="text-amber-500" /> },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
              {s.icon} {s.label}
            </div>
            <p className="text-sm font-extrabold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4">
        {[
          { key: "preview", label: "Lead Preview", icon: <Eye size={12} /> },
          { key: "logs",    label: "Delivery Logs", icon: <BarChart2 size={12} /> },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "preview" && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} className="text-fuchsia-500" />
              <p className="text-xs font-extrabold text-slate-600">
                Sample leads that real tutors will receive today (geo-matched)
              </p>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 size={24} className="animate-spin mb-2" />
                <p className="text-xs font-bold">Generating location-aware previews...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <MapPin size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold">No tutors in target group yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {leads.map((lead, i) => (
                  <LeadPreviewCard key={i} lead={lead} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "logs" && (
          <div className="p-4">
            <DummyCampaignLogs campaignId={campaign.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xl font-extrabold text-slate-900">{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function DummyCampaignDashboard(props: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  const { campaigns, totalCampaigns, activeCampaigns, sentToday, sentThisMonth, dailyVolume, channelBreakdown } = props;

  const onRefresh = useCallback(() => {
    startTransition(() => setRefreshKey((k) => k + 1));
  }, []);

  const filtered = campaigns.filter((c) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return c.status === "ACTIVE";
    if (statusFilter === "paused") return c.status === "PAUSED";
    if (statusFilter === "draft") return c.status === "DRAFT";
    if (statusFilter === "stopped") return c.status === "STOPPED" || c.status === "COMPLETED";
    return true;
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) ?? null;
  const pieData = Object.entries(channelBreakdown).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-fuchsia-500" /> Dummy Lead Campaigns
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Send geo-matched dummy leads to tutors · Rotates daily by location
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-sm shadow-md shadow-emerald-500/25 transition-all"
        >
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<BarChart2 size={18} />} label="Campaigns" value={totalCampaigns} color="#3B82F6" />
        <KpiCard icon={<Play size={18} />} label="Active" value={activeCampaigns} sub="Live now" color="#16A34A" />
        <KpiCard icon={<Send size={18} />} label="Sent Today" value={sentToday.toLocaleString()} color="#0EA5E9" />
        <KpiCard icon={<TrendingUp size={18} />} label="This Month" value={sentThisMonth.toLocaleString()} color="#8B5CF6" />
      </div>

      {/* Main Layout: Left (list) + Right (detail/preview) */}
      <div className="flex gap-4 min-h-0" style={{ height: "calc(100vh - 260px)" }}>

        {/* LEFT: Campaign list */}
        <div className="flex flex-col w-full lg:w-[380px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Charts */}
          <div className="p-3 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              {/* Mini bar chart */}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">30-Day Volume</p>
                <ResponsiveContainer width="100%" height={55}>
                  <BarChart data={dailyVolume.slice(-14)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="date" tick={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 10, border: "1px solid #E2E8F0" }}
                      formatter={(v) => [v ?? 0, "Sent"]}
                      labelFormatter={(l) => String(l ?? "").slice(5)}
                    />
                    <Bar dataKey="count" fill="#16A34A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Mini pie */}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Channel Split</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={55}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={24} dataKey="value" paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-14 text-[10px] text-slate-400">No data yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 p-2.5 border-b border-slate-100 overflow-x-auto">
            {[
              { key: "all",     label: "All",     count: totalCampaigns },
              { key: "active",  label: "Active",  count: campaigns.filter((c) => c.status === "ACTIVE").length },
              { key: "paused",  label: "Paused",  count: campaigns.filter((c) => c.status === "PAUSED").length },
              { key: "draft",   label: "Draft",   count: campaigns.filter((c) => c.status === "DRAFT").length },
              { key: "stopped", label: "Stopped", count: campaigns.filter((c) => c.status === "STOPPED" || c.status === "COMPLETED").length },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all ${
                  statusFilter === tab.key ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}>
                {tab.label}
                <span className={`h-3.5 min-w-3.5 flex items-center justify-center rounded-full text-[8px] font-extrabold px-0.5 ${statusFilter === tab.key ? "bg-white/30 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Campaign list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-400">
                <Send size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold">No campaigns yet</p>
                <p className="text-[10px] mt-1">Click "New Campaign" above</p>
              </div>
            ) : (
              filtered.map((c) => (
                <CampaignCard
                  key={c.id + refreshKey}
                  campaign={c}
                  isSelected={selectedId === c.id}
                  onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Detail + Preview */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hidden lg:flex flex-col min-h-0">
          {selectedCampaign ? (
            <CampaignDetailPanel campaign={selectedCampaign} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 p-8">
              <div className="w-16 h-16 rounded-2xl bg-fuchsia-50 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-fuchsia-400" />
              </div>
              <h3 className="font-extrabold text-slate-700 text-base mb-1">Select a Campaign</h3>
              <p className="text-xs text-center max-w-xs text-slate-400">
                Click any campaign on the left to see real lead previews — geo-matched to actual tutor locations
              </p>
              <div className="mt-6 flex flex-col gap-2 items-center text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5"><MapPin size={11} className="text-emerald-400" /> Leads rotate daily by tutor's neighbourhood</div>
                <div className="flex items-center gap-1.5"><Sparkles size={11} className="text-fuchsia-400" /> Matched to tutor's subjects & class levels</div>
                <div className="flex items-center gap-1.5"><Zap size={11} className="text-blue-400" /> Fire now to test instantly</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">New Dummy Lead Campaign</h2>
                <p className="text-xs text-slate-500 mt-0.5">Geo-matched leads rotate daily per tutor location</p>
              </div>
              <button onClick={() => setShowForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
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
