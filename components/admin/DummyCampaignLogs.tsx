"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail, Smartphone, Bell, CheckCircle2, XCircle, Download, Filter,
  ChevronLeft, ChevronRight, Loader2, Search, Eye, MapPin, Sparkles,
  IndianRupee, Clock, X, ShieldCheck, UserCheck, RefreshCw,
  BookOpen, ChevronDown, ChevronUp, ExternalLink, MessageSquare, AlertCircle,
  Copy, Check
} from "lucide-react";
import { getDummyCampaignLogs } from "@/app/actions/dummy-campaign.actions";
import { isGenuineEmail } from "@/lib/lead-utils";

interface LogEntry {
  id: string;
  campaignId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  channel: string;
  status: string;
  leadData: any;
  errorMessage: string | null;
  sentAt: string;
  campaign: { name: string; targetGroup?: string };
}

interface Props {
  campaignId?: string;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  EMAIL:  <Mail size={13} />,
  PUSH:   <Smartphone size={13} />,
  IN_APP: <Bell size={13} />,
};

const CHANNEL_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  EMAIL:  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Email Alert" },
  PUSH:   { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Web Push" },
  IN_APP: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", label: "In-App Bell" },
};

export function DummyCampaignLogs({ campaignId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState<"GENUINE_ONLY" | "ALL" | "DUMMY_ONLY">("ALL");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLogForModal, setSelectedLogForModal] = useState<LogEntry | null>(null);
  const [modalTab, setModalTab] = useState<"push" | "inapp" | "email" | "raw">("push");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const result = await getDummyCampaignLogs({
      campaignId,
      search: search || undefined,
      emailFilter,
      page,
      pageSize: PAGE_SIZE,
      channel: filterChannel || undefined,
      status: filterStatus || undefined,
    });
    setLogs((result.logs as unknown as LogEntry[]) ?? []);
    setTotal(result.total ?? 0);
    setLoading(false);
  }, [campaignId, search, emailFilter, page, filterChannel, filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Quick stats summary
  const summaryStats = useMemo(() => {
    let genuine = 0;
    let pushCount = 0;
    let inAppCount = 0;
    let emailCount = 0;

    for (const l of logs) {
      if (isGenuineEmail(l.userEmail)) genuine++;
      if (l.channel === "PUSH") pushCount++;
      if (l.channel === "IN_APP") inAppCount++;
      if (l.channel === "EMAIL") emailCount++;
    }

    return { genuine, pushCount, inAppCount, emailCount };
  }, [logs]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const rows = [
      ["Campaign", "Tutor Name", "Email", "Account Type", "Channel", "Status", "Locality", "City", "Distance (km)", "Class", "Subjects", "Budget", "Sent At"],
      ...logs.map((l) => [
        l.campaign?.name ?? "",
        l.userName ?? "Tutor",
        l.userEmail,
        isGenuineEmail(l.userEmail) ? "Real Tutor" : "System Account",
        l.channel,
        l.status,
        l.leadData?.locality ?? "",
        l.leadData?.city ?? "",
        l.leadData?.distanceKm ?? "",
        l.leadData?.classLevel ?? "",
        (l.leadData?.subjects ?? []).join("; "),
        l.leadData?.rateType === "HOURLY"
          ? `₹${l.leadData?.budgetMin}–₹${l.leadData?.budgetMax}/hr`
          : `₹${l.leadData?.budgetMin}–₹${l.leadData?.budgetMax}/mo`,
        new Date(l.sentAt).toLocaleString("en-IN"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apnatutorhub-dispatched-tutor-messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* ── Summary & Metrics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Transcripts</p>
            <p className="text-base font-black text-slate-900 leading-tight">{total.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Web Push Alerts</p>
            <p className="text-base font-black text-slate-900 leading-tight">{summaryStats.pushCount} in page</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">In-App Bell Alerts</p>
            <p className="text-base font-black text-slate-900 leading-tight">{summaryStats.inAppCount} in page</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Email Dispatches</p>
            <p className="text-base font-black text-slate-900 leading-tight">{summaryStats.emailCount} in page</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white text-slate-700 shadow-xs border border-slate-200">
              <Filter size={15} className="text-emerald-600" />
            </span>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Filter &amp; Inspect Dispatched Messages
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Real-time feed of all leads, nearby localities, subjects &amp; notification payloads sent to tutors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-black border border-slate-200 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
              <span>Refresh Feed</span>
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-black transition-all shadow-sm"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search tutor name, email, locality (e.g. Sangam Vihar, Batra, Govindpuri)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]/30 focus:border-[#2D9E6B] shadow-2xs"
            />
          </div>

          {/* Account Filter */}
          <select
            value={emailFilter}
            onChange={(e) => { setEmailFilter(e.target.value as any); setPage(1); }}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]/30 focus:border-[#2D9E6B] shadow-2xs cursor-pointer"
          >
            <option value="ALL">👥 All Accounts (Real + System)</option>
            <option value="GENUINE_ONLY">🌟 Genuine Real Tutors Only</option>
            <option value="DUMMY_ONLY">🤖 System Accounts Only</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filterChannel}
            onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]/30 focus:border-[#2D9E6B] shadow-2xs cursor-pointer"
          >
            <option value="">All Channels (In-App, Push, Email)</option>
            <option value="PUSH">📱 Web Push Notifications</option>
            <option value="IN_APP">🔔 In-App Bell Notifications</option>
            <option value="EMAIL">📧 Email Alerts</option>
          </select>
        </div>
      </div>

      {/* ── Dispatched Tutors Feed & Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Loader2 size={32} className="animate-spin mb-3 text-[#2D9E6B]" />
          <p className="text-xs font-black text-slate-700">Loading dispatched tutor transcripts...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fetching matching geo-localities &amp; message payloads</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Sparkles size={26} />
          </div>
          <h4 className="text-sm font-black text-slate-800">No Dispatched Notifications Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Click &quot;Fire Now&quot; on any campaign to trigger an instant test run or wait for the automated 9:00 AM IST daily follow-up dispatch.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isReal = isGenuineEmail(log.userEmail);
            const lead = log.leadData || {};
            const isHourly = lead.rateType === "HOURLY";
            const budgetStr = isHourly
              ? `₹${lead.budgetMin}–₹${lead.budgetMax}/hr`
              : `₹${(lead.budgetMin || 0).toLocaleString("en-IN")}–₹${(lead.budgetMax || 0).toLocaleString("en-IN")}/mo`;

            const channelMeta = CHANNEL_BADGE[log.channel] || {
              bg: "bg-slate-100",
              text: "text-slate-700",
              border: "border-slate-200",
              label: log.channel,
            };

            const isExpanded = !!expandedRows[log.id];
            const classLine = lead.classLevel ? (lead.classLevel.startsWith("Class") ? lead.classLevel : `Class ${lead.classLevel}`) : "Class Requirement";
            const localityText = lead.locality || "Nearby Area";
            const distanceText = lead.distanceKm !== undefined ? `~${lead.distanceKm} km away` : "";

            // Simulated notification texts for preview
            const notificationTitle = `📍 ${classLine} tuition near ${localityText}`;
            const notificationBody = `${classLine} · ${(lead.subjects || []).join(", ")} needed near ${localityText}${distanceText ? ` (${distanceText})` : ""}. Budget ${budgetStr}. ${lead.days || "Flexible schedule"}, ${lead.timing || "Flexible timing"}.`;

            return (
              <div
                key={log.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:border-[#2D9E6B]/50 hover:shadow-md transition-all overflow-hidden"
              >
                {/* ── Main Row Bar ── */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Tutor Identity Column */}
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {(log.userName || log.userEmail || "T")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">{log.userName || "Tutor"}</span>
                        {isReal ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-black border border-emerald-200">
                            ✓ Real Tutor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            🤖 System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{log.userEmail}</p>
                    </div>
                  </div>

                  {/* AI Geo-Match Locality Column */}
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{localityText}, {lead.city || "Delhi"}</span>
                      {lead.distanceKm !== undefined && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-black border border-emerald-200 shrink-0">
                          {lead.distanceKm} km
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Target Area · <span className="text-slate-700 font-bold">{lead.city || "City Area"}</span>
                    </p>
                  </div>

                  {/* Strict Subjects & Class Column */}
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-black border border-slate-200">
                        {classLine}
                      </span>
                      {(lead.subjects || []).map((s: string) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-xl bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Board: <strong className="text-slate-700 font-bold">{lead.board || "CBSE"}</strong> · Mode: <strong className="text-slate-700 font-bold">{lead.mode || "Home / Online"}</strong>
                    </p>
                  </div>

                  {/* Pricing Rate Tag */}
                  <div className="min-w-[160px]">
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <IndianRupee size={12} className="text-emerald-700 shrink-0" />
                      <span className="text-xs font-black tracking-tight">{budgetStr}</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">
                      ✨ AI Market+ Rate
                    </p>
                  </div>

                  {/* Channel, Time & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border ${channelMeta.bg} ${channelMeta.text} ${channelMeta.border}`}
                      >
                        {CHANNEL_ICON[log.channel]}
                        <span>{channelMeta.label}</span>
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        {new Date(log.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, {new Date(log.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleRow(log.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all cursor-pointer"
                        title="Toggle message text preview"
                      >
                        <MessageSquare size={13} className="text-slate-600" />
                        <span>{isExpanded ? "Hide" : "Preview"}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setSelectedLogForModal(log); setModalTab(log.channel === "PUSH" ? "push" : log.channel === "EMAIL" ? "email" : "inapp"); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-xs cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Inline Expandable Message Transcript Strip ── */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-slate-50/80 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                            Exact Dispatched Notification Text (Tutor View)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`${notificationTitle}\n${notificationBody}`, log.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600 font-black">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1 text-xs">
                        <p className="font-black text-emerald-400">{notificationTitle}</p>
                        <p className="text-slate-300 leading-relaxed font-normal">{notificationBody}</p>
                        <p className="text-[10px] text-slate-400 pt-1 font-mono">
                          Action Destination: <span className="text-emerald-300">/tutor/leads</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-2">
          <span className="font-bold">{total.toLocaleString()} total dispatched notifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all font-black text-xs shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="font-black text-slate-900 text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-2xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all font-black text-xs shadow-2xs cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Message Payload Inspector & Device Simulation Modal ── */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    Dispatched Lead Notification Inspector
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">
                    ✓ Verified Delivery
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Recipient: <strong className="text-slate-900">{selectedLogForModal.userName || "Tutor"}</strong> ({selectedLogForModal.userEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-2 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Device View Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5">
              {[
                { key: "push", label: "📱 Mobile Lockscreen Push", icon: <Smartphone size={13} /> },
                { key: "inapp", label: "🔔 In-App Bell Drawer", icon: <Bell size={13} /> },
                { key: "email", label: "📧 Email Notification", icon: <Mail size={13} /> },
                { key: "raw", label: "📊 Raw Lead Payload", icon: <ExternalLink size={13} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setModalTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    modalTab === tab.key
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
              {/* Tab 1: Mobile Lockscreen Push Mockup */}
              {modalTab === "push" && (
                <div className="space-y-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    This is how the web push alert appears on the tutor&apos;s phone lock screen or desktop notification tray:
                  </p>

                  {/* Smartphone Lockscreen Mockup Container */}
                  <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl space-y-4 text-white">
                    {/* Simulated Clock */}
                    <div className="text-center">
                      <p className="text-2xl font-extralight tracking-tight">09:41</p>
                      <p className="text-[10px] text-slate-400 font-medium">Thursday, 27 August</p>
                    </div>

                    {/* Notification Card */}
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/80 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-[#2D9E6B] text-white flex items-center justify-center text-[9px] font-black">
                            A
                          </div>
                          <span className="font-black text-white">ApnaTutorHub</span>
                        </div>
                        <span className="text-[10px] text-white/60">now</span>
                      </div>

                      <p className="font-black text-white text-xs">
                        📍 {selectedLogForModal.leadData?.classLevel || "Class 10"} near {selectedLogForModal.leadData?.locality || "Your Area"}
                      </p>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        {(selectedLogForModal.leadData?.subjects || []).join(" & ")} · {selectedLogForModal.leadData?.classLevel || "Class 10"} · {selectedLogForModal.leadData?.rateType === "HOURLY" ? `₹${selectedLogForModal.leadData?.budgetMin}–₹${selectedLogForModal.leadData?.budgetMax}/hr` : `₹${(selectedLogForModal.leadData?.budgetMin || 0).toLocaleString("en-IN")}–₹${(selectedLogForModal.leadData?.budgetMax || 0).toLocaleString("en-IN")}/mo`}. Tap to view!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: In-App Bell Notification Drawer Mockup */}
              {modalTab === "inapp" && (
                <div className="space-y-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    This is how the lead notification is rendered inside the tutor&apos;s notification drawer:
                  </p>

                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          📍 {selectedLogForModal.leadData?.classLevel || "Class 10"} tuition near {selectedLogForModal.leadData?.locality}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">Just now</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {selectedLogForModal.leadData?.classLevel || "Class 10"} · {(selectedLogForModal.leadData?.subjects || []).join(", ")} needed near {selectedLogForModal.leadData?.locality}{selectedLogForModal.leadData?.distanceKm ? ` (${selectedLogForModal.leadData?.distanceKm} km)` : ""}. Budget {selectedLogForModal.leadData?.rateType === "HOURLY" ? `₹${selectedLogForModal.leadData?.budgetMin}–₹${selectedLogForModal.leadData?.budgetMax}/hr` : `₹${(selectedLogForModal.leadData?.budgetMin || 0).toLocaleString("en-IN")}–₹${(selectedLogForModal.leadData?.budgetMax || 0).toLocaleString("en-IN")}/mo`}. {selectedLogForModal.leadData?.days || "Flexible schedule"}, {selectedLogForModal.leadData?.timing || "Flexible timing"}.
                      </p>
                      <div className="pt-1">
                        <span className="text-[11px] font-black text-[#2D9E6B] hover:underline cursor-pointer">
                          View Lead Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Email Notification Preview */}
              {modalTab === "email" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <p className="text-slate-500 font-semibold">
                      <strong className="text-slate-800">Subject:</strong> 📍 New Student Requirement Near {selectedLogForModal.leadData?.locality} — ApnaTutorHub
                    </p>
                    <p className="text-slate-500 font-semibold">
                      <strong className="text-slate-800">To:</strong> {selectedLogForModal.userEmail}
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-3">
                      <p className="text-base font-black text-slate-900">
                        Hello {selectedLogForModal.userName || "Tutor"},
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        A new home tuition requirement matching your teaching profile was posted near <strong className="text-slate-900">{selectedLogForModal.leadData?.locality}, {selectedLogForModal.leadData?.city}</strong>.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                      <p className="text-xs font-black text-emerald-950">Requirement Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-500 font-bold">Class &amp; Board:</span>
                          <p className="font-black text-slate-900">{selectedLogForModal.leadData?.classLevel} · {selectedLogForModal.leadData?.board || "CBSE"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Budget Offered:</span>
                          <p className="font-black text-emerald-700">
                            {selectedLogForModal.leadData?.rateType === "HOURLY"
                              ? `₹${selectedLogForModal.leadData?.budgetMin}–₹${selectedLogForModal.leadData?.budgetMax}/hr`
                              : `₹${(selectedLogForModal.leadData?.budgetMin || 0).toLocaleString("en-IN")}–₹${(selectedLogForModal.leadData?.budgetMax || 0).toLocaleString("en-IN")}/mo`}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-bold">Subjects:</span>
                          <p className="font-black text-slate-900">{(selectedLogForModal.leadData?.subjects || []).join(", ")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Raw Lead Payload */}
              {modalTab === "raw" && (
                <div className="space-y-2">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Structured JSON payload generated by Gemini AI locality &amp; benchmark engine:
                  </p>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLogForModal.leadData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">
                Sent via <strong className="text-slate-800">{selectedLogForModal.channel}</strong> on {new Date(selectedLogForModal.sentAt).toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

