"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  X, MessageCircle, Sparkles, Send, MapPin, Users, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Search, CheckSquare, Square,
  Filter, ArrowRight, Bot, IndianRupee, Clock, ChevronRight, ShieldCheck,
  TrendingUp, TrendingDown, Flame, Check, HelpCircle, Globe, Home
} from "lucide-react";
import {
  getInterestedLeadsAction,
  sendDummyNotificationsToInterestedLeadsAction,
  autoSyncWhatsAppInterestedLeadsAction,
  type InterestedLead,
  type NotifDeliveryResult,
} from "@/app/actions/interested-leads.actions";
import { editWhatsAppPitchWithAIAction } from "@/app/actions/ai-message-edit.actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const DEFAULT_OFFLINE_TEMPLATE = `Namaste {{name}} ji 🙏

Apna Tutor Hub se aapke area ke liye ek verified tuition student requirement aayi hai:

📚 *Class:* {{class}} ({{subject}})
📍 *Location:* {{location}} ({{distance}})
💰 *Monthly Fee:* {{fee}}
⏰ *Timing:* 5 days/week (Evening)
🏡 *Teaching Mode:* Home Tuition (In-Person Nearby)

Student ke parent demo class schedule karna chahte hain.

💼 *Commission Based Plan (Kam Upfront Se Shuru Karein):*
• Registration Fee: ₹1,257 (6 Months Validity)
• 5 Verified Student Leads Unlock
• Platform Commission: 1st month fee ka 50%, aur 2nd month se sirf 5% monthly commission

Agar aap yeh tuition lene ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko parent se direct connect kara degi.

— Coordinator, Apna Tutor Hub 🎓`;

const DEFAULT_ONLINE_TEMPLATE = `Namaste {{name}} ji 🙏

Apna Tutor Hub se verified 1-on-1 Online Tuition requirement aayi hai:

📚 *Class:* {{class}} ({{subject}})
💻 *Teaching Mode:* 1-on-1 Online Class (Zoom / Google Meet)
💰 *Tuition Fee:* {{fee}}
⏰ *Timing:* Flexible Evening Schedule
📍 *Student Location:* Online (Remote Pan-India)

Student ke parent demo class arrange karwana chahte hain.

💼 *Commission Based Plan (Kam Upfront Se Shuru Karein):*
• Registration Fee: ₹1,257 (6 Months Validity)
• 5 Verified Student Leads Unlock
• Platform Commission: 1st month fee ka 50%, aur 2nd month se sirf 5% monthly commission

Agar aap yeh online tuition accept karne ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko student details share kar degi.

— Coordinator, Apna Tutor Hub 🎓`;

export function WhatsAppBlastModal({ isOpen, onClose, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition();

  // Leads state
  const [leads, setLeads] = useState<InterestedLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [within5KmCount, setWithin5KmCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "WITHIN_5KM" | "ONLINE_ONLY">("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "CLASS_1_8" | "CLASS_9_12">("ALL");
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(null);

  // Dual Templates state (5km In-Person vs Online Mode)
  const [offlineTemplate, setOfflineTemplate] = useState<string>(DEFAULT_OFFLINE_TEMPLATE);
  const [onlineTemplate, setOnlineTemplate] = useState<string>(DEFAULT_ONLINE_TEMPLATE);
  const [activeTemplateTab, setActiveTemplateTab] = useState<"OFFLINE" | "ONLINE">("OFFLINE");

  // AI Chat state
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    explanation: string;
    warnings: string[];
    isValid: boolean;
  } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    simulated: number;
    failed: number;
    results: NotifDeliveryResult[];
  } | null>(null);

  // Load leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await getInterestedLeadsAction({
        limit: 1500,
        search,
        filterMode,
        classFilter,
        radiusKm: 5,
      });
      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotalCount(res.data.total);
        setWithin5KmCount(res.data.within5KmCount);
        setOnlineCount(res.data.onlineCount);
        // By default, select all fetched leads
        setSelectedIds(res.data.leads.map((l) => l.id));
        if (res.data.leads.length > 0 && !focusedLeadId) {
          setFocusedLeadId(res.data.leads[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen, filterMode, classFilter]);

  // Sync inbound WhatsApp replies
  const handleSyncInbound = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await autoSyncWhatsAppInterestedLeadsAction();
      if (res.success && res.data) {
        setSyncFeedback(`✓ Synced all WhatsApp inbound replies! ${res.data.totalInterestedInDb} active leads ready.`);
        await fetchLeads();
        if (onRefresh) onRefresh();
      } else {
        setSyncFeedback(res.error || "Sync completed");
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || "Sync error");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const displayedLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    const qDigits = q.replace(/\D/g, "");
    return leads.filter((lead) => {
      const phoneDigits = `${lead.phone || ""}${lead.whatsapp || ""}`.replace(/\D/g, "");
      if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
      const haystack = [
        lead.name,
        lead.phone,
        lead.whatsapp,
        lead.location,
        lead.email,
        lead.recommendedSubject,
        lead.classLabel,
        lead.batchName,
        ...(lead.subjects || []),
        ...(lead.classes || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, search]);

  const handleSelectAll = () => {
    setSelectedIds(displayedLeads.map((l) => l.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Current active template string based on tab
  const activeTemplate = activeTemplateTab === "OFFLINE" ? offlineTemplate : onlineTemplate;
  const setActiveTemplate = (val: string) => {
    if (activeTemplateTab === "OFFLINE") setOfflineTemplate(val);
    else setOnlineTemplate(val);
  };

  // AI template editor
  const handleAiEdit = async (customPrompt?: string, priceAdjustment?: "INCREASE" | "DECREASE") => {
    const promptToUse = customPrompt || aiInstruction;
    if (!promptToUse.trim()) return;

    setIsAiEditing(true);
    setAiFeedback(null);
    try {
      const categoryHint = activeTemplateTab === "OFFLINE" ? "CLASS_1_8" : "ONLINE";
      const res = await editWhatsAppPitchWithAIAction({
        currentTemplate: activeTemplate,
        instruction: promptToUse,
        categoryHint,
        priceAdjustment: priceAdjustment || (promptToUse.toLowerCase().includes("high") || promptToUse.toLowerCase().includes("increase") ? "INCREASE" : promptToUse.toLowerCase().includes("low") || promptToUse.toLowerCase().includes("decrease") ? "DECREASE" : "NONE"),
      });

      if (res.success && res.data) {
        setActiveTemplate(res.data.revisedTemplate);
        setAiFeedback({
          explanation: res.data.aiExplanation,
          warnings: res.data.validationReport.warnings,
          isValid: res.data.validationReport.isValid,
        });
        setAiInstruction("");
      } else {
        setAiFeedback({
          explanation: res.error || "Failed to update template",
          warnings: [],
          isValid: false,
        });
      }
    } catch (err: any) {
      setAiFeedback({
        explanation: err?.message || "AI error",
        warnings: [],
        isValid: false,
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // Focused lead for live preview
  const focusedLead = useMemo(() => {
    if (focusedLeadId) {
      const found = leads.find((l) => l.id === focusedLeadId);
      if (found) return found;
    }
    if (selectedIds.length > 0) {
      return leads.find((l) => selectedIds.includes(l.id)) || leads[0] || null;
    }
    return leads[0] || null;
  }, [leads, focusedLeadId, selectedIds]);

  // Lead preview text
  const livePreviewText = useMemo(() => {
    if (!focusedLead) return activeTemplate;

    // Use offlineTemplate if lead is within 5km, else onlineTemplate
    const tpl = focusedLead.deliveryMode === "OFFLINE_5KM" ? offlineTemplate : onlineTemplate;

    const rawName = (focusedLead.name || "").trim();
    const isJunkOrMissingName =
      !rawName ||
      /^\+?\d+$/.test(rawName) ||
      /^(tutor|teacher|user|student|lead|parent|sir|madam|ji|whatsapp\s*user|unknown|test)$/i.test(rawName);
    const cleanFirstName = isJunkOrMissingName ? "" : rawName.split(" ")[0].trim();

    let out = tpl;
    if (cleanFirstName) {
      out = out
        .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, `Namaste ${cleanFirstName} ji 🙏`)
        .replace(/Namaste\s*\{\{name\}\}/gi, `Namaste ${cleanFirstName} ji 🙏`)
        .replace(/\{\{name\}\}/gi, cleanFirstName);
    } else {
      out = out
        .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, "Namaste ji 🙏")
        .replace(/Namaste\s*\{\{name\}\}/gi, "Namaste ji 🙏")
        .replace(/\{\{name\}\}/gi, "Sir/Ma'am");
    }

    const is5Km = focusedLead.deliveryMode === "OFFLINE_5KM";
    const loc = is5Km && focusedLead.location ? focusedLead.location : "Online (Remote Pan-India)";
    const dist = is5Km ? (focusedLead.distanceKm ? `~${focusedLead.distanceKm} km nearby` : "Within 5 km") : "";
    const mode = is5Km ? "Home Tuition (In-Person Nearby)" : "1-on-1 Online Class (Zoom / Google Meet)";

    // Clean distance placeholder: if online, strip any "( {{distance}} )" or "{{distance}}"
    if (!is5Km) {
      out = out.replace(/\s*\(\s*\{\{distance\}\}\s*\)/gi, "").replace(/\{\{distance\}\}/gi, "");
    } else {
      out = out.replace(/\{\{distance\}\}/gi, dist);
    }

    // Replace generic class labels if any
    let safeClass = focusedLead.classLabel || "Class 5";
    if (safeClass.includes("-") || safeClass.includes("–") || safeClass.toLowerCase().includes("1 to 8")) {
      safeClass = "Class 5";
    }

    return out
      .replace(/\{\{phone\}\}/gi, focusedLead.phone || focusedLead.whatsapp || "")
      .replace(/\{\{class\}\}/gi, safeClass)
      .replace(/\{\{subject\}\}/gi, focusedLead.recommendedSubject)
      .replace(/\{\{fee\}\}/gi, focusedLead.recommendedFee)
      .replace(/\{\{location\}\}/gi, loc)
      .replace(/\{\{mode\}\}/gi, mode);
  }, [focusedLead, offlineTemplate, onlineTemplate, activeTemplate]);

  // Selected leads breakdown
  const selectedBreakdown = useMemo(() => {
    const selectedLeads = leads.filter((l) => selectedIds.includes(l.id));
    const offlineCount = selectedLeads.filter((l) => l.deliveryMode === "OFFLINE_5KM").length;
    const onlineCount = selectedLeads.filter((l) => l.deliveryMode === "ONLINE").length;
    return { offlineCount, onlineCount, total: selectedLeads.length };
  }, [leads, selectedIds]);

  // Validation alerts based on business rules
  const validationAlerts = useMemo(() => {
    const alerts: string[] = [];
    const lowerOffline = offlineTemplate.toLowerCase();
    const lowerOnline = onlineTemplate.toLowerCase();

    // Check Class 9-12 rules
    if (lowerOffline.includes("class 9") || lowerOffline.includes("class 10") || lowerOffline.includes("class 11") || lowerOffline.includes("class 12")) {
      if (lowerOffline.includes("all subjects")) {
        alerts.push("⚠️ 5km Template: Class 9–12 leads must be subject-specific (never 'All Subjects').");
      }
      if (lowerOffline.includes("/month") || lowerOffline.includes("/mo") || lowerOffline.includes("per month")) {
        alerts.push("⚠️ 5km Template: Class 9–12 leads must be HOURLY rate only (never monthly).");
      }
    }

    // Check Class 1-8 rules
    if (lowerOffline.includes("class 1") || lowerOffline.includes("class 2") || lowerOffline.includes("class 6") || lowerOffline.includes("class 8")) {
      if (lowerOffline.includes("/hr") || lowerOffline.includes("/hour") || lowerOffline.includes("per hour")) {
        alerts.push("⚠️ 5km Template: Class 1–8 leads must be MONTHLY rate only (never hourly).");
      }
    }

    return alerts;
  }, [offlineTemplate, onlineTemplate]);

  // Send Blast
  const handleSendBlast = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Are you sure you want to dispatch WhatsApp notifications to ${selectedIds.length} tutors?\n\n• ${selectedBreakdown.offlineCount} tutors with 5km location will receive the 5km In-Person pitch.\n• ${selectedBreakdown.onlineCount} tutors without location will receive the Online Mode pitch.`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await sendDummyNotificationsToInterestedLeadsAction({
        leadIds: selectedIds,
        offlineTemplate,
        onlineTemplate,
        channels: ["WHATSAPP"],
      });

      if (res.success && res.data) {
        setSendResult(res.data);
        if (onRefresh) onRefresh();
      } else {
        alert(res.error || "Failed to send notifications");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to send notifications");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-[#0F2540] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 shadow-xs">
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight">Direct WhatsApp Blast — Interested Leads</h2>
                <span className="text-[10px] bg-emerald-400/25 text-emerald-100 border border-emerald-400/40 font-black px-2.5 py-0.5 rounded-full">
                  {totalCount} Total WhatsApp Replies Available
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                📍 5km within radius gets Home Tuition · 🌐 Without location gets Online Mode · Strictly no junk leads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncInbound}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
              title="Sync all 717 inbound WhatsApp chat replies into CRM"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Syncing 717..." : "⚡ Sync All 717 Replies"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sync feedback banner */}
        {syncFeedback && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* ── Summary Distribution Strip ── */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-900 font-black">
              <Users size={14} className="text-emerald-600" />
              <span>{leads.length} Active Leads</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-black border border-emerald-300">
              <Home size={12} className="text-emerald-700" />
              <span>{within5KmCount} within 5km radius (Home Tuition)</span>
            </span>
            <span className="flex items-center gap-1 text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full font-black border border-blue-300">
              <Globe size={12} className="text-blue-700" />
              <span>{onlineCount} without location (Online Mode)</span>
            </span>
          </div>

          <div className="text-[11px] font-black text-slate-500">
            Selected: <strong className="text-slate-900">{selectedBreakdown.total}</strong> ({selectedBreakdown.offlineCount} 5km · {selectedBreakdown.onlineCount} Online)
          </div>
        </div>

        {/* ── Main Body Grid ── */}
        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* ── Left Column: Audience Selection & 5km Filter (5 cols) ── */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col min-h-0 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-800">Target Audience List</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {selectedIds.length} of {displayedLeads.length} shown
                  {search.trim() ? ` (filtered from ${leads.length})` : ` selected`}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer transition-all"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* 5km Radius & Mode Filters */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <MapPin size={11} className="text-emerald-600" /> Location Filter
                </span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Strict Dual-Mode Matching
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "ALL", label: "👥 All Leads", sub: `${leads.length} tutors` },
                  { key: "WITHIN_5KM", label: "📍 5km Nearby Only", sub: `${within5KmCount} nearby` },
                  { key: "ONLINE_ONLY", label: "🌐 Online Only", sub: `${onlineCount} remote` },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterMode(item.key as any)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      filterMode === item.key
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-1 ring-emerald-500/30"
                        : "bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-[11px] leading-tight">{item.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>

              {/* Class Filter */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400">Class:</span>
                {[
                  { key: "ALL", label: "All Classes" },
                  { key: "CLASS_1_8", label: "Class 1–8 (₹/mo)" },
                  { key: "CLASS_9_12", label: "Class 9–12 (₹/hr)" },
                ].map((cf) => (
                  <button
                    key={cf.key}
                    type="button"
                    onClick={() => setClassFilter(cf.key as any)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                      classFilter === cf.key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, locality, subject..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Leads List Box */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={20} className="animate-spin text-emerald-500" />
                  <p className="text-xs font-bold">Loading WhatsApp leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <p>No leads found. Click below to sync all 717 WhatsApp replies.</p>
                  <button
                    onClick={handleSyncInbound}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
                  >
                    ⚡ Sync All 717 Replies Now
                  </button>
                </div>
              ) : displayedLeads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No leads match &quot;{search.trim()}&quot;. Try name, phone, locality, or subject.
                </div>
              ) : (
                displayedLeads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);
                  const isFocused = focusedLeadId === lead.id;
                  const is5Km = lead.deliveryMode === "OFFLINE_5KM";

                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setFocusedLeadId(lead.id);
                        setActiveTemplateTab(is5Km ? "OFFLINE" : "ONLINE");
                      }}
                      className={`p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                        isFocused
                          ? "bg-emerald-100/70 border-l-4 border-emerald-600"
                          : isChecked
                          ? "bg-emerald-50/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelect(lead.id, e as any)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {lead.name || "WhatsApp Tutor"}
                          </p>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                            is5Km
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-blue-100 text-blue-900 border border-blue-300"
                          }`}>
                            {is5Km ? "📍 5km In-Person" : "🌐 Online Mode"}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {lead.phone || lead.whatsapp} · {is5Km ? lead.location : "No Location (Online)"}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                            {lead.classLabel}
                          </span>
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {lead.recommendedFee}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[130px]">
                            {lead.recommendedSubject}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between px-1">
              <span>Selected for dispatch: <strong className="text-slate-900">{selectedIds.length}</strong></span>
              <span className="text-emerald-700 font-black">Ready</span>
            </div>
          </div>

          {/* ── Right Column: Dual Message Preview & AI Editor (7 cols) ── */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col min-h-0 space-y-3 bg-white">
            
            {/* Template Mode Tabs & AI Trigger */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-700">Template Mode:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-black">
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("OFFLINE")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeTemplateTab === "OFFLINE"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Home size={12} />
                    <span>📍 5km In-Person ({selectedBreakdown.offlineCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("ONLINE")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeTemplateTab === "ONLINE"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe size={12} />
                    <span>🌐 Online Mode ({selectedBreakdown.onlineCount})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Reset Template Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeTemplateTab === "OFFLINE") setOfflineTemplate(DEFAULT_OFFLINE_TEMPLATE);
                    else setOnlineTemplate(DEFAULT_ONLINE_TEMPLATE);
                  }}
                  title="Reset to official high-conversion template"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  ↺ Reset
                </button>

                {/* Chat with AI Button */}
                <button
                  type="button"
                  onClick={() => setShowAiChat(!showAiChat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                    showAiChat
                      ? "bg-purple-600 text-white ring-2 ring-purple-600/30"
                      : "bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 text-purple-900 border border-purple-300 hover:bg-purple-100"
                  }`}
                >
                  <Bot size={14} className={showAiChat ? "text-white" : "text-purple-600"} />
                  <span>🤖 Chat with AI (Edit Template)</span>
                </button>
              </div>
            </div>

            {/* Instruction banner */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              <span>
                {activeTemplateTab === "OFFLINE"
                  ? "Editing 5km In-Person Template (sent strictly to tutors with verified location within 5km)"
                  : "Editing Online Mode Template (sent strictly to tutors without location for remote 1-on-1)"}
              </span>
              <span className="font-bold text-slate-800">
                {activeTemplateTab === "OFFLINE" ? "Class 1–8: Monthly · Class 9–12: Hourly" : "Online Class: Hourly/Monthly"}
              </span>
            </div>

            {/* ── Interactive AI Chat Drawer ── */}
            {showAiChat && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 border border-purple-200 space-y-2.5 animate-in fade-in slide-in-from-top duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    <p className="text-xs font-black text-purple-950">
                      AI Assistant for {activeTemplateTab === "OFFLINE" ? "5km Nearby" : "Online Mode"} Template
                    </p>
                  </div>
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-2 py-0.5 rounded-md">
                    Guardrails: 5km Localities Only · No Junk City
                  </span>
                </div>

                {/* Quick Action Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Increase fees by 15% and keep natural coordinator Hinglish tone", "INCREASE")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    <TrendingUp size={11} className="text-emerald-600" /> Increase Price (+15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Include Commission Based Plan details: ₹1,257 registration fee, 6 months validity, 5 leads, 50% 1st month + 5% recurring from 2nd month")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    💼 Commission Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Add student parent demo tomorrow notice in polite Delhi-NCR coordinator Hinglish")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    <Flame size={11} className="text-rose-500" /> Demo Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Make phrasing natural Delhi-NCR tuition coordinator Hinglish, remove robot generic English words")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer"
                  >
                    🗣️ Coordinator Hinglish
                  </button>
                </div>

                {/* Custom Prompt Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAiEdit();
                      }
                    }}
                    placeholder="e.g. 'Price badha do aur chemistry trial mention karo'..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAiEdit()}
                    disabled={isAiEditing || !aiInstruction.trim()}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {isAiEditing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{isAiEditing ? "Updating..." : "Ask AI"}</span>
                  </button>
                </div>

                {/* AI Rationale / Feedback */}
                {aiFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold border ${
                    aiFeedback.isValid ? "bg-white border-emerald-300 text-slate-800" : "bg-amber-50 border-amber-300 text-amber-900"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{aiFeedback.explanation}</span>
                    </p>
                    {aiFeedback.warnings.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 text-[11px] text-amber-800 space-y-0.5">
                        {aiFeedback.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Validation Rule Warnings (If any) */}
            {validationAlerts.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold space-y-1">
                {validationAlerts.map((a, i) => (
                  <p key={i}>{a}</p>
                ))}
              </div>
            )}

            {/* Editable Template Textarea & Live Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[220px]">
              
              {/* Box 1: Raw Template (Editable) */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {activeTemplateTab === "OFFLINE" ? "5km In-Person Template" : "Online Mode Template"}
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {"{{name}}, {{fee}}, {{subject}}, {{class}}, {{location}}, {{distance}}"}
                  </span>
                </div>
                <textarea
                  value={activeTemplate}
                  onChange={(e) => setActiveTemplate(e.target.value)}
                  rows={10}
                  className="flex-1 w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono resize-none"
                />
              </div>

              {/* Box 2: Live WhatsApp Message Preview */}
              <div className="flex flex-col min-h-0 bg-[#EFEAE2] rounded-2xl p-3 border border-slate-300 shadow-2xs">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-black/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Live Preview for: <strong className="text-slate-900">{focusedLead?.name || "Tutor"}</strong>
                    </span>
                  </div>
                  {focusedLead && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                      focusedLead.deliveryMode === "OFFLINE_5KM"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-blue-100 text-blue-900 border border-blue-300"
                    }`}>
                      {focusedLead.deliveryMode === "OFFLINE_5KM" ? "📍 5km In-Person" : "🌐 Online Mode"}
                    </span>
                  )}
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-3.5 shadow-xs border border-black/5 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {livePreviewText}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Channel: <strong>Aqua WhatsApp API</strong></span>
                  <span>Length: {livePreviewText.length} chars</span>
                </div>
              </div>
            </div>

            {/* ── Dispatch Results Panel (If sent) ── */}
            {sendResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs space-y-1.5">
                <p className="font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Dispatch Complete! {sendResult.sent} Sent · {sendResult.simulated} Simulated · {sendResult.failed} Failed</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  {sendResult.simulated > 0
                    ? "Aqua WhatsApp API is in test/simulation mode. Messages were validated and CRM interaction logged."
                    : "WhatsApp messages dispatched directly to recipients' phone numbers."}
                </p>
              </div>
            )}

            {/* ── Bottom Modal Action Strip ── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-xs text-slate-600 font-semibold">
                  Auto-Routing: <strong className="text-slate-800">{selectedBreakdown.offlineCount} Nearby (5km) + {selectedBreakdown.onlineCount} Online Mode</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBlast}
                  disabled={isSending || selectedIds.length === 0 || validationAlerts.length > 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{isSending ? "Sending..." : `Dispatch WhatsApp to ${selectedIds.length} Tutors`}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
