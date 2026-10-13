"use client";

import React, { useState, useTransition, useCallback, useMemo } from "react";
import {
  Users,
  Bell,
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  BookOpen,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  WholeWord,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import type { InterestedLead, NotifDeliveryResult } from "@/app/actions/interested-leads.actions";
import {
  sendDummyNotificationsToInterestedLeadsAction,
  getInterestedLeadsAction,
} from "@/app/actions/interested-leads.actions";

// ─── Source badge colors ────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "WhatsApp Channel":    { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  "WhatsApp Live Chat":  { bg: "bg-teal-50",     text: "text-teal-700",    dot: "bg-teal-500" },
  "Aqua SMS":            { bg: "bg-sky-50",       text: "text-sky-700",     dot: "bg-sky-500" },
  "Website":             { bg: "bg-blue-50",      text: "text-blue-700",    dot: "bg-blue-500" },
  "Facebook":            { bg: "bg-indigo-50",    text: "text-indigo-700",  dot: "bg-indigo-500" },
  "Google Ads":          { bg: "bg-yellow-50",    text: "text-yellow-700",  dot: "bg-yellow-500" },
  "CRM":                 { bg: "bg-slate-100",    text: "text-slate-600",   dot: "bg-slate-400" },
};
function sourceBadge(src: string) {
  return SOURCE_COLORS[src] ?? SOURCE_COLORS["CRM"];
}

// ─── Preset messages ────────────────────────────────────────────────────────────
const PRESET_MESSAGES = [
  {
    id: "follow_up",
    label: "🔔 Follow-Up Reminder",
    text: "Hi {{name}}! 👋 We noticed your interest in tutoring. We have some great tutors available in your area. Want us to connect you? Reply YES and we'll set it up right away! — ApnaTutorHub 📚",
  },
  {
    id: "new_tutors",
    label: "👩‍🏫 New Tutors Available",
    text: "Hello {{name}}! Great news — new verified tutors have joined ApnaTutorHub in your area. 🎓 Book a FREE demo session now! Visit apnatutorhub.com or reply to this message. — Team ATH",
  },
  {
    id: "limited_offer",
    label: "⚡ Limited-Time Offer",
    text: "Hi {{name}}! ⚡ For a limited time, get your first tutoring session at 50% off! Don't miss out. Find top tutors near you on ApnaTutorHub. Reply OFFER to know more! 🚀",
  },
  {
    id: "demo_class",
    label: "🎯 Free Demo Class",
    text: "Dear {{name}}, we'd love to offer you a FREE demo class with one of our top-rated tutors! No commitment required. Just reply DEMO and we'll arrange it for you. — ApnaTutorHub 📖",
  },
  {
    id: "re_engage",
    label: "💬 Re-engagement",
    text: "Hey {{name}}! We haven't heard from you in a while. 😊 Is finding a good tutor still on your mind? We're here to help! Message us anytime. — ApnaTutorHub",
  },
  {
    id: "custom",
    label: "✏️ Custom Message",
    text: "",
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Props {
  initialLeads: InterestedLead[];
  initialTotal: number;
}

// ─── Component ──────────────────────────────────────────────────────────────────
export function InterestedLeadsPanel({ initialLeads, initialTotal }: Props) {
  const [leads, setLeads] = useState<InterestedLead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  // Notification compose state
  const [chosenPreset, setChosenPreset] = useState(PRESET_MESSAGES[0].id);
  const [customText, setCustomText] = useState("");
  const [channels, setChannels] = useState<Set<"WHATSAPP" | "IN_APP">>(new Set(["WHATSAPP"]));
  const [showCompose, setShowCompose] = useState(false);
  const [results, setResults] = useState<NotifDeliveryResult[] | null>(null);
  const [sendSummary, setSendSummary] = useState<{ sent: number; simulated: number; failed: number } | null>(null);

  // ── Sources in the current dataset ──
  const allSources = useMemo(() => {
    const set = new Set(leads.map((l) => l.source));
    return ["ALL", ...Array.from(set).sort()];
  }, [leads]);

  // ── Filtered leads ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (sourceFilter !== "ALL" && l.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.whatsapp?.includes(q) ||
          l.location?.toLowerCase().includes(q) ||
          l.subjects.some((s) => s.toLowerCase().includes(q)) ||
          l.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, search, sourceFilter]);

  // ── Select helpers ────────────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach((l) => next.delete(l.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((l) => next.add(l.id));
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────────
  function handleRefresh() {
    startRefresh(async () => {
      const res = await getInterestedLeadsAction({ limit: 200, search: "" });
      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotal(res.data.total);
        setSelected(new Set());
      }
    });
  }

  // ── Toggle channel ──────────────────────────────────────────────────────────
  function toggleChannel(ch: "WHATSAPP" | "IN_APP") {
    const next = new Set(channels);
    next.has(ch) ? next.delete(ch) : next.add(ch);
    setChannels(next);
  }

  // ── Active message text ───────────────────────────────────────────────────────
  const activeMessage = useMemo(() => {
    if (chosenPreset === "custom") return customText;
    return PRESET_MESSAGES.find((p) => p.id === chosenPreset)?.text ?? "";
  }, [chosenPreset, customText]);

  // ── Send notifications ────────────────────────────────────────────────────────
  function handleSend() {
    if (!someSelected) return;
    if (!activeMessage.trim()) return;
    if (channels.size === 0) return;

    startTransition(async () => {
      setResults(null);
      setSendSummary(null);
      const res = await sendDummyNotificationsToInterestedLeadsAction({
        leadIds: Array.from(selected),
        messageTemplate: activeMessage,
        channels: Array.from(channels) as Array<"WHATSAPP" | "IN_APP">,
      });
      if (res.success && res.data) {
        setResults(res.data.results);
        setSendSummary({ sent: res.data.sent, simulated: res.data.simulated, failed: res.data.failed });
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────
  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-emerald-600">Staff CRM</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Interested Leads
          </h1>
          <p className="text-xs text-slate-500 font-600">
            Leads marked <span className="text-emerald-600 font-bold">INTERESTED</span> from WhatsApp Channel, Aqua SMS, WhatsApp Live Chat &amp; other sources.
            Select leads and send dummy/follow-up notifications.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowCompose((v) => !v)}
            disabled={!someSelected}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-bold hover:bg-[#1a3a5c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={14} />
            {someSelected ? `Send Notification (${selected.size})` : "Select Leads First"}
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Interested", value: total, color: "#16A34A" },
          { label: "Visible", value: filtered.length, color: "#0EA5E9" },
          { label: "Selected", value: selected.size, color: "#8B5CF6" },
          { label: "Sources", value: allSources.length - 1, color: "#F59E0B" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{kpi.label}</p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Compose drawer ── */}
      {showCompose && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              <h2 className="text-sm font-extrabold text-emerald-800">Compose &amp; Send Notification</h2>
            </div>
            <button
              onClick={() => setShowCompose(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors text-xs"
            >
              ✕ Close
            </button>
          </div>
          <div className="p-5 space-y-5">
            {/* Preset selector */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 block">
                Choose a Message Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PRESET_MESSAGES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setChosenPreset(p.id)}
                    className={`text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                      chosenPreset === p.id
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom message textarea (always visible for editing / shows preset) */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 block">
                {chosenPreset === "custom" ? "✏️ Custom Message" : "Message Preview (editable)"}
              </label>
              <textarea
                rows={4}
                value={chosenPreset === "custom" ? customText : activeMessage}
                onChange={(e) => {
                  if (chosenPreset === "custom") {
                    setCustomText(e.target.value);
                  } else {
                    // User started editing a preset → auto-switch to custom
                    setChosenPreset("custom");
                    setCustomText(e.target.value);
                  }
                }}
                placeholder="Type your message here… Use {{name}} for personalisation."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                💡 <span className="font-bold">{"{{name}}"}</span> will be replaced with the lead's first name.
              </p>
            </div>

            {/* Channel selector */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 block">
                Delivery Channels
              </label>
              <div className="flex gap-3 flex-wrap">
                {(["WHATSAPP", "IN_APP"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      channels.has(ch)
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {ch === "WHATSAPP" ? (
                      <MessageSquare size={13} />
                    ) : (
                      <Bell size={13} />
                    )}
                    {ch === "WHATSAPP" ? "WhatsApp / Aqua SMS" : "In-App Notification"}
                  </button>
                ))}
              </div>
            </div>

            {/* Send button */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSend}
                disabled={isPending || !activeMessage.trim() || channels.size === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {isPending ? "Sending…" : `Send to ${selected.size} Lead${selected.size === 1 ? "" : "s"}`}
              </button>
              {sendSummary && (
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-emerald-600">✓ {sendSummary.sent} sent</span>
                  <span className="text-amber-500">⚡ {sendSummary.simulated} simulated</span>
                  <span className="text-red-500">✗ {sendSummary.failed} failed</span>
                </div>
              )}
            </div>

            {/* Results table */}
            {results && results.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden mt-2">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Delivery Results</p>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      {r.status === "SENT" && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                      {r.status === "SIMULATED" && <Sparkles size={13} className="text-amber-500 shrink-0" />}
                      {r.status === "FAILED" && <XCircle size={13} className="text-red-500 shrink-0" />}
                      {r.status === "SKIPPED" && <AlertCircle size={13} className="text-slate-400 shrink-0" />}
                      <span className="font-bold text-slate-700 flex-1 truncate">{r.name ?? r.leadId}</span>
                      <span className="text-slate-400">{r.channel}</span>
                      <span
                        className={`font-extrabold ${
                          r.status === "SENT" ? "text-emerald-600" :
                          r.status === "SIMULATED" ? "text-amber-600" :
                          r.status === "FAILED" ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.reason && <span className="text-slate-400 truncate max-w-32" title={r.reason}>{r.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filters row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, location, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 shrink-0" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer"
          >
            {allSources.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All Sources" : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Leads table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50">
          <button
            onClick={toggleAll}
            title={allFilteredSelected ? "Deselect all" : "Select all visible"}
            className="text-slate-500 hover:text-emerald-600 transition-colors shrink-0"
          >
            {allFilteredSelected ? (
              <CheckSquare size={16} className="text-emerald-500" />
            ) : (
              <Square size={16} />
            )}
          </button>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            {filtered.length === 0 ? "No leads" : `${filtered.length} lead${filtered.length === 1 ? "" : "s"} — ${selected.size} selected`}
          </span>
          {someSelected && (
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users size={40} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-500">No interested leads found.</p>
            <p className="text-xs text-slate-400">Try a different search or source filter.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((lead) => {
              const isSelected = selected.has(lead.id);
              const isExpanded = expandedLead === lead.id;
              const badge = sourceBadge(lead.source);
              return (
                <li
                  key={lead.id}
                  className={`transition-colors ${isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3 px-5 py-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleOne(lead.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-emerald-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    {/* Avatar */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold text-sm">
                      {(lead.name || "?")[0].toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold text-slate-800 truncate">
                          {lead.name ?? "Unknown Name"}
                        </p>
                        {/* Source badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {lead.source}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone size={10} /> {lead.phone}
                          </span>
                        )}
                        {lead.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={10} /> {lead.location}
                          </span>
                        )}
                        {lead.subjects.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <BookOpen size={10} /> {lead.subjects.slice(0, 2).join(", ")}
                            {lead.subjects.length > 2 ? ` +${lead.subjects.length - 2}` : ""}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={10} /> {fmt(lead.lastContactedAt ?? lead.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-14 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                      {[
                        { label: "WhatsApp", value: lead.whatsapp ?? lead.phone ?? "—" },
                        { label: "Email", value: lead.email ?? "—" },
                        { label: "Classes", value: lead.classes.join(", ") || "—" },
                        { label: "Batch", value: lead.batchName ?? "—" },
                        { label: "Added", value: fmt(lead.createdAt) },
                        { label: "Last Contacted", value: fmt(lead.lastContactedAt) },
                      ].map((row) => (
                        <div key={row.label}>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{row.label}</p>
                          <p className="font-bold text-slate-700 mt-0.5 break-all">{row.value}</p>
                        </div>
                      ))}
                      {lead.staffNotes && (
                        <div className="col-span-full mt-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Staff Notes</p>
                          <p className="font-medium text-slate-600 mt-0.5">{lead.staffNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
