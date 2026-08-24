"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import {
  Loader2, Users, AlertCircle, Check, Mail, Bell, Smartphone, MapPin,
  Sparkles, Search, CheckSquare, Square, Filter, Clock, IndianRupee,
  Calendar, ShieldCheck, Layers, GraduationCap, Info, ChevronRight, X
} from "lucide-react";
import {
  createDummyCampaignAction,
  previewCampaignTargetsAction,
  getTutorsForCampaignTargetAction,
  toggleCampaignStatusAction,
} from "@/app/actions/dummy-campaign.actions";
import { CLASS_FEE_RATES } from "@/lib/dummy-campaign-types";
import { isGenuineEmail } from "@/lib/lead-utils";
import type { DummyTargetGroup } from "@prisma/client";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const TARGET_OPTIONS: Array<{ value: DummyTargetGroup; label: string; emoji: string; description: string }> = [
  { value: "ALL_TUTORS",  emoji: "🌐", label: "All Active Tutors", description: "Every active registered tutor" },
  { value: "NEW_7D",      emoji: "🆕", label: "New (7 days)",      description: "Joined within past week" },
  { value: "NEW_14D",     emoji: "🆕", label: "New (14 days)",     description: "Joined in last 2 weeks" },
  { value: "NEW_30D",     emoji: "🆕", label: "New (30 days)",     description: "Joined in last month" },
  { value: "VERIFIED",    emoji: "✅", label: "Verified Tutors",   description: "KYC-approved tutors only" },
  { value: "UNVERIFIED",  emoji: "⏳", label: "Unverified",        description: "Pending verification" },
  { value: "SUBSCRIBED",  emoji: "💎", label: "Subscribed",        description: "On a paid subscription" },
  { value: "FREE_TIER",   emoji: "🆓", label: "Free Tier",         description: "On free coin allocation" },
  { value: "CUSTOM",      emoji: "🎯", label: "Specific Tutors",   description: "Pick & search individual tutors" },
];

const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi",
  "Science", "Social Science", "Computer Science", "Accountancy",
  "Economics", "History", "Geography", "Sanskrit", "French",
];

const CHANNELS = [
  { key: "IN_APP", label: "In-App Bell", icon: <Bell size={14} />, color: "text-amber-600 bg-amber-50 border-amber-200", activeColor: "bg-amber-500 text-white border-amber-500" },
  { key: "PUSH",   label: "Web Push",    icon: <Smartphone size={14} />, color: "text-purple-600 bg-purple-50 border-purple-200", activeColor: "bg-purple-500 text-white border-purple-500" },
  { key: "EMAIL",  label: "Email Alert", icon: <Mail size={14} />, color: "text-blue-600 bg-blue-50 border-blue-200", activeColor: "bg-blue-500 text-white border-blue-500" },
];

type RateType = "HOURLY" | "MONTHLY";
type FeePresetKey = "AUTO_ADAPT" | "1-5" | "6-8" | "9-10" | "11-12" | "CUSTOM";

export function DummyCampaignForm({ onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 State: Who & Channels ──
  const [name, setName] = useState("");
  const [targetGroup, setTargetGroup] = useState<DummyTargetGroup>("NEW_7D");
  const [emailFilter, setEmailFilter] = useState<"GENUINE_ONLY" | "ALL" | "DUMMY_ONLY">("GENUINE_ONLY");
  const [channels, setChannels] = useState<string[]>(["IN_APP", "PUSH"]);
  const [autoActivate, setAutoActivate] = useState(true);

  // Interactive Tutor Picker State (for Custom / Search)
  const [tutorSearch, setTutorSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [tutorsList, setTutorsList] = useState<Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    city: string | null;
    subjects: string[];
    classLevels: string[];
    isVerified: boolean;
    isGenuine: boolean;
  }>>([]);
  const [isFetchingTutors, setIsFetchingTutors] = useState(false);
  const [manualUserIdsText, setManualUserIdsText] = useState("");
  const [showManualIdInput, setShowManualIdInput] = useState(false);

  // Audience Preview
  const [preview, setPreview] = useState<{ count: number; genuineCount?: number; dummyCount?: number; sample: Array<{ id: string; name: string | null; email: string }> } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Step 2 State: Lead Settings & Fees Structure ──
  const [rateType, setRateType] = useState<RateType>("HOURLY");
  const [feePreset, setFeePreset] = useState<FeePresetKey>("AUTO_ADAPT");
  const [budgetMin, setBudgetMin] = useState(200);
  const [budgetMax, setBudgetMax] = useState(600);
  const [leadsPerDay, setLeadsPerDay] = useState(1);
  const [overrideSubjects, setOverrideSubjects] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // ── Step 3 State: Schedule & Limits ──
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalLimit, setTotalLimit] = useState("");

  // Fetch Audience Count Preview
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      const customIds = targetGroup === "CUSTOM"
        ? (selectedUserIds.length > 0 ? selectedUserIds : manualUserIdsText.split("\n").map((s) => s.trim()).filter(Boolean))
        : [];

      const result = await previewCampaignTargetsAction({
        targetGroup,
        customUserIds: customIds,
        emailFilter,
      });
      if (result.success && result.data) {
        setPreview(result.data);
      }
      setPreviewLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [targetGroup, selectedUserIds, manualUserIdsText, emailFilter]);

  // Load Interactive Tutors List when in CUSTOM mode or search changed
  useEffect(() => {
    if (targetGroup !== "CUSTOM") return;
    let isSubscribed = true;
    const fetchTutors = async () => {
      setIsFetchingTutors(true);
      const res = await getTutorsForCampaignTargetAction({
        search: tutorSearch || undefined,
        city: filterCity || undefined,
        subject: filterSubject || undefined,
        emailFilter,
        limit: 80,
      });
      if (isSubscribed && res.success && res.data) {
        setTutorsList(res.data.tutors);
      }
      if (isSubscribed) setIsFetchingTutors(false);
    };
    const t = setTimeout(fetchTutors, 300);
    return () => {
      isSubscribed = false;
      clearTimeout(t);
    };
  }, [targetGroup, tutorSearch, filterCity, filterSubject, emailFilter]);

  // Apply Fee Preset values when changed
  const applyFeePreset = (preset: FeePresetKey, currentRateType: RateType = rateType) => {
    setFeePreset(preset);
    if (preset === "AUTO_ADAPT") {
      if (currentRateType === "HOURLY") {
        setBudgetMin(200);
        setBudgetMax(800);
      } else {
        setBudgetMin(2500);
        setBudgetMax(12000);
      }
    } else if (preset === "1-5") {
      if (currentRateType === "HOURLY") {
        setBudgetMin(CLASS_FEE_RATES["1-5"].hourlyMin);
        setBudgetMax(CLASS_FEE_RATES["1-5"].hourlyMax);
      } else {
        setBudgetMin(CLASS_FEE_RATES["1-5"].monthlyMin);
        setBudgetMax(CLASS_FEE_RATES["1-5"].monthlyMax);
      }
    } else if (preset === "6-8") {
      if (currentRateType === "HOURLY") {
        setBudgetMin(CLASS_FEE_RATES["6-8"].hourlyMin);
        setBudgetMax(CLASS_FEE_RATES["6-8"].hourlyMax);
      } else {
        setBudgetMin(CLASS_FEE_RATES["6-8"].monthlyMin);
        setBudgetMax(CLASS_FEE_RATES["6-8"].monthlyMax);
      }
    } else if (preset === "9-10") {
      if (currentRateType === "HOURLY") {
        setBudgetMin(CLASS_FEE_RATES["9-10"].hourlyMin);
        setBudgetMax(CLASS_FEE_RATES["9-10"].hourlyMax);
      } else {
        setBudgetMin(CLASS_FEE_RATES["9-10"].monthlyMin);
        setBudgetMax(CLASS_FEE_RATES["9-10"].monthlyMax);
      }
    } else if (preset === "11-12") {
      if (currentRateType === "HOURLY") {
        setBudgetMin(CLASS_FEE_RATES["11-12"].hourlyMin);
        setBudgetMax(CLASS_FEE_RATES["11-12"].hourlyMax);
      } else {
        setBudgetMin(CLASS_FEE_RATES["11-12"].monthlyMin);
        setBudgetMax(CLASS_FEE_RATES["11-12"].monthlyMax);
      }
    }
  };

  const handleRateTypeChange = (newRateType: RateType) => {
    setRateType(newRateType);
    applyFeePreset(feePreset, newRateType);
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const toggleSubject = (s: string) => {
    setOverrideSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const toggleTutorSelection = (id: string) => {
    setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSelectTopN = (n: number) => {
    const topIds = tutorsList.slice(0, n).map((t) => t.id);
    setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...topIds])));
  };

  const handleSelectAllVisible = () => {
    const visibleIds = tutorsList.map((t) => t.id);
    setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...visibleIds])));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  // Human-touch Campaign Creation (Only fired on explicit click in Step 3!)
  const handleLaunchCampaign = () => {
    if (!name.trim()) { setError("Campaign name is required"); setStep(1); return; }
    if (channels.length === 0) { setError("Select at least one delivery channel"); setStep(1); return; }
    if (budgetMin <= 0 || budgetMax <= 0 || budgetMin > budgetMax) {
      setError("Please specify a valid budget range (Min ≤ Max)");
      setStep(2);
      return;
    }

    setError(null);
    startTransition(async () => {
      const finalCustomIds = targetGroup === "CUSTOM"
        ? (selectedUserIds.length > 0 ? selectedUserIds : manualUserIdsText.split("\n").map((s) => s.trim()).filter(Boolean))
        : [];

      const result = await createDummyCampaignAction({
        name: name.trim(),
        description: description.trim() || undefined,
        targetGroup,
        customUserIds: finalCustomIds,
        channels,
        leadsPerDay,
        overrideSubjects,
        budgetMin,
        budgetMax,
        totalLimit: totalLimit ? parseInt(totalLimit) : null,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create campaign");
        return;
      }

      // Auto-activate if toggled
      if (autoActivate && result.data?.id) {
        await toggleCampaignStatusAction(result.data.id, "ACTIVE");
      }

      onSuccess();
    });
  };

  const cls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all";
  const labelCls = "block text-xs font-extrabold uppercase tracking-widest text-slate-600 mb-1.5";

  const stepTitles = [
    { num: 1, title: "Who & Channels", icon: <Users size={13} /> },
    { num: 2, title: "Lead Settings & Rates", icon: <IndianRupee size={13} /> },
    { num: 3, title: "Schedule & Launch", icon: <Calendar size={13} /> },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white">
      {/* ── Top Step Header Progress Bar (Pinned) ── */}
      <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 sm:gap-4 w-full">
          {stepTitles.map((st, i) => {
            const done = step > st.num;
            const active = step === st.num;
            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (st.num < step) setStep(st.num as any);
                    else if (st.num === 2 && name.trim() && channels.length > 0) setStep(2);
                  }}
                  className={`flex items-center gap-2 group transition-all text-left ${active ? "opacity-100" : done ? "opacity-90 hover:opacity-100" : "opacity-40"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      done
                        ? "bg-emerald-500 text-white shadow-xs"
                        : active
                        ? "bg-slate-900 text-white ring-4 ring-slate-900/10 shadow-xs"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? <Check size={13} className="stroke-[3]" /> : st.num}
                  </div>
                  <div>
                    <p className={`text-xs font-black leading-none ${active ? "text-slate-900" : "text-slate-600"}`}>
                      {st.title}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Step {st.num} of 3</p>
                  </div>
                </button>
                {i < 2 && <div className="flex-1 h-0.5 bg-slate-200 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Area (Scrollable Body) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">

        {/* ── STEP 1: Who & Channels ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className={labelCls}>Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                placeholder='e.g., "Daily Priority Matching — South Delhi Tutors"'
                className={cls}
                autoFocus
              />
            </div>

            {/* Email Quota Protection Segmented Tabs */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Email Quota Guard &amp; Delivery Targeting
                  </label>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Resend Credit Protection Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: "GENUINE_ONLY", label: "🌟 Genuine Real Emails", sub: "Real Gmail/Yahoo (Quota Safe)" },
                  { value: "ALL", label: "🌐 All Accounts", sub: "Includes placeholder emails" },
                  { value: "DUMMY_ONLY", label: "🤖 System Accounts Only", sub: "@apnatutorhub.com test users" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setEmailFilter(item.value as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      emailFilter === item.value
                        ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 font-black text-slate-900"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-600 font-bold"
                    }`}
                  >
                    <p className="text-xs">{item.label}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience Options */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + " mb-0"}>Target Audience *</label>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Select predefined group or pick individual tutors
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetGroup(opt.value)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      targetGroup === opt.value
                        ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{opt.emoji}</span>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Tutor Search & Checkbox Selector (Active when CUSTOM is picked) */}
            {targetGroup === "CUSTOM" && (
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-indigo-600" />
                    <p className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      Interactive Tutor Audience Picker
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualIdInput(!showManualIdInput)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    {showManualIdInput ? "Switch to Visual List" : "Paste Raw IDs"}
                  </button>
                </div>

                {showManualIdInput ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                      Paste Tutor User IDs (one per line):
                    </label>
                    <textarea
                      value={manualUserIdsText}
                      onChange={(e) => setManualUserIdsText(e.target.value)}
                      placeholder="cltutor123...&#10;cltutor456..."
                      rows={3}
                      className={cls + " resize-none font-mono text-xs"}
                    />
                  </div>
                ) : (
                  <>
                    {/* Filters & Search Toolbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={tutorSearch}
                          onChange={(e) => setTutorSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                          placeholder="Search name, phone, city..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <input
                        type="text"
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        placeholder="Filter by city (e.g. Delhi)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        type="text"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        placeholder="Filter by subject (e.g. Maths)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>

                    {/* Quick Selection Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Quick Select:</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTopN(10)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-extrabold transition-all"
                      >
                        ⚡ Top 10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTopN(25)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-extrabold transition-all"
                      >
                        ⚡ Top 25
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTopN(50)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-extrabold transition-all"
                      >
                        ⚡ Top 50
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-extrabold transition-all"
                      >
                        Select All Visible ({tutorsList.length})
                      </button>
                      {selectedUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-extrabold transition-all ml-auto"
                        >
                          ✕ Clear ({selectedUserIds.length})
                        </button>
                      )}
                    </div>

                    {/* Tutor Checkbox List */}
                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white divide-y divide-slate-100">
                      {isFetchingTutors ? (
                        <div className="p-6 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin text-indigo-500" />
                          Loading tutors...
                        </div>
                      ) : tutorsList.length === 0 ? (
                        <div className="p-6 text-center text-xs font-bold text-slate-400">
                          No matching tutors found with current filters.
                        </div>
                      ) : (
                        tutorsList.map((t) => {
                          const isSelected = selectedUserIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTutorSelection(t.id)}
                              className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors ${
                                isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-black text-slate-900 truncate">
                                    {t.name || "Unnamed Tutor"}
                                  </p>
                                  {t.city && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                      📍 {t.city}
                                    </span>
                                  )}
                                  {t.isGenuine ? (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black border border-emerald-200">
                                      ✓ Real Email
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                                      🤖 System
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {t.subjects?.slice(0, 3).join(", ") || "All Subjects"} · {t.email}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-indigo-900 font-bold px-1">
                      <span>{selectedUserIds.length} tutor(s) selected</span>
                      <span>Showing {tutorsList.length} tutors</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Target Count Preview Summary Bar */}
            <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl border ${previewLoading ? "bg-slate-50 border-slate-200" : "bg-blue-50/80 border-blue-200"}`}>
              <Users size={16} className={previewLoading ? "text-slate-400" : "text-blue-600"} />
              <div className="flex-1">
                <p className={`text-xs font-black ${previewLoading ? "text-slate-500" : "text-blue-900"}`}>
                  {previewLoading ? "Calculating matched tutors..." : `${preview?.count ?? 0} tutor(s) will receive this campaign`}
                </p>
                {preview && (
                  <p className="text-[10px] text-blue-700 mt-0.5 font-bold">
                    ✨ {preview.genuineCount ?? preview.count} Real Emails (Deliverability Protected) · {preview.dummyCount ?? 0} System Placeholders
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] font-extrabold">
                <MapPin size={11} className="text-emerald-600" />
                <span>Daily Geo-Rotation</span>
              </div>
            </div>

            {/* Channels */}
            <div>
              <label className={labelCls}>Delivery Channels *</label>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => toggleChannel(ch.key)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                      channels.includes(ch.key) ? ch.activeColor : ch.color
                    }`}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {channels.length === 0 && (
                <p className="text-[11px] text-rose-500 font-bold mt-1">Please select at least one delivery channel</p>
              )}
            </div>

            {/* Auto-activate toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 transition-all">
              <input
                type="checkbox"
                checked={autoActivate}
                onChange={(e) => setAutoActivate(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <div>
                <p className="text-xs font-black text-emerald-900">🚀 Activate campaign immediately upon creation</p>
                <p className="text-[10px] text-emerald-700">Will automatically begin sending daily geo-rotated leads via cron</p>
              </div>
            </label>
          </div>
        )}

        {/* ── STEP 2: Lead Settings & Fees Structure ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Geo Rotation Notice Banner */}
            <div className="p-3 rounded-2xl bg-fuchsia-50 border border-fuchsia-200 flex items-start gap-2.5">
              <Sparkles size={15} className="text-fuchsia-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-fuchsia-900">Daily Class &amp; Locality Rotation Engine</p>
                <p className="text-[11px] font-semibold text-fuchsia-700 mt-0.5">
                  Leads automatically rotate every 24 hours per tutor's qualified classes (e.g. Day 1: Class 4 @ ₹250/hr, Day 2: Class 5 @ ₹300/hr) with changing realistic rates and nearby localities.
                </p>
              </div>
            </div>

            {/* 1. Rate Type Switcher (Hourly vs Monthly) */}
            <div>
              <label className={labelCls}>Rate Type Option *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRateTypeChange("HOURLY")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-black transition-all ${
                    rateType === "HOURLY"
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold"
                  }`}
                >
                  <Clock size={15} />
                  <span>⏱️ Hourly Rate (₹ / hr)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeChange("MONTHLY")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-black transition-all ${
                    rateType === "MONTHLY"
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold"
                  }`}
                >
                  <Calendar size={15} />
                  <span>📅 Monthly Rate (₹ / month)</span>
                </button>
              </div>
            </div>

            {/* 2. Official Class Fee Benchmark Presets (from Handwritten Note) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + " mb-0"}>
                  Class Fee Benchmark Structure
                </label>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Standard Tariff
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Auto Adapt Card */}
                <button
                  type="button"
                  onClick={() => applyFeePreset("AUTO_ADAPT")}
                  className={`p-3 rounded-2xl border text-left col-span-1 sm:col-span-2 transition-all ${
                    feePreset === "AUTO_ADAPT"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={15} className="text-emerald-600" />
                      <p className="text-xs font-black text-slate-900">
                        🌟 Auto-Adapt by Tutor Profile (Recommended)
                      </p>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Daily Class Rotation
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 font-semibold">
                    Automatically generates leads matching the tutor's taught classes (1–5: ₹200–300/hr, 6–8: ₹200–400/hr, 9–10: ₹400–600/hr, 11–12: ₹500–800/hr).
                  </p>
                </button>

                {/* Class 1-5 */}
                <button
                  type="button"
                  onClick={() => applyFeePreset("1-5")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    feePreset === "1-5"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Class 1 to 5</p>
                  <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                    {rateType === "HOURLY" ? "₹200 – ₹300 / hr" : "₹2,500 – ₹4,500 / mo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Primary standard tariff</p>
                </button>

                {/* Class 6-8 */}
                <button
                  type="button"
                  onClick={() => applyFeePreset("6-8")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    feePreset === "6-8"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Class 6 to 8</p>
                  <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                    {rateType === "HOURLY" ? "₹200 – ₹400 / hr" : "₹3,500 – ₹6,000 / mo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Middle school tariff</p>
                </button>

                {/* Class 9-10 */}
                <button
                  type="button"
                  onClick={() => applyFeePreset("9-10")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    feePreset === "9-10"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Class 9 to 10</p>
                  <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                    {rateType === "HOURLY" ? "₹400 – ₹600 / hr" : "₹5,000 – ₹9,000 / mo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Secondary board tariff</p>
                </button>

                {/* Class 11-12 */}
                <button
                  type="button"
                  onClick={() => applyFeePreset("11-12")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    feePreset === "11-12"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Class 11 to 12</p>
                  <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                    {rateType === "HOURLY" ? "₹500 – ₹800 / hr" : "₹7,000 – ₹12,000 / mo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Senior secondary tariff</p>
                </button>
              </div>
            </div>

            {/* 3. Custom Budget Range Adjustment */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className={labelCls}>
                Active Budget Range ({rateType === "HOURLY" ? "₹/hour" : "₹/month"})
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-extrabold mb-1 block">Min Rate (₹)</label>
                  <input
                    type="number"
                    min={50}
                    value={budgetMin}
                    onChange={(e) => {
                      setBudgetMin(Number(e.target.value));
                      setFeePreset("CUSTOM");
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    className={cls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-extrabold mb-1 block">Max Rate (₹)</label>
                  <input
                    type="number"
                    min={budgetMin}
                    value={budgetMax}
                    onChange={(e) => {
                      setBudgetMax(Number(e.target.value));
                      setFeePreset("CUSTOM");
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    className={cls}
                  />
                </div>
              </div>
            </div>

            {/* 4. Leads per day slider */}
            <div>
              <label className={labelCls}>
                Leads per tutor per day: <span className="text-emerald-600 font-black">{leadsPerDay} lead(s)</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={leadsPerDay}
                onChange={(e) => setLeadsPerDay(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                <span>1 lead/day</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5 leads/day</span>
              </div>
            </div>

            {/* 5. Force Subjects (Optional) */}
            <div>
              <label className={labelCls}>
                Target Specific Subjects
                <span className="ml-1 normal-case text-slate-400 font-semibold">(optional — empty uses tutor's own profile subjects)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                      overrideSubjects.includes(s)
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Internal Notes */}
            <div>
              <label className={labelCls}>Internal Campaign Notes (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason or objective for running this campaign..."
                rows={2}
                className={cls + " resize-none"}
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Schedule & Human-Touch Launch ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Cron Schedule Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-2.5">
              <Clock size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-blue-900">⏰ Daily Automated Dispatch: 9:00 AM IST</p>
                <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                  All active campaigns execute automatically every morning. Leads geo-rotate through nearby localities based on each tutor's location.
                </p>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date (optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  className={cls}
                />
              </div>
              <div>
                <label className={labelCls}>End Date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  className={cls}
                />
              </div>
            </div>

            {/* Total Send Limit */}
            <div>
              <label className={labelCls}>Total Send Limit (optional)</label>
              <input
                type="number"
                min={1}
                value={totalLimit}
                onChange={(e) => setTotalLimit(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                placeholder="e.g. 500 — campaign automatically marks COMPLETED after N total sends"
                className={cls}
              />
            </div>

            {/* Comprehensive Review Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <p className="text-xs font-black text-slate-800">📋 Final Campaign Review</p>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Ready to Launch
                </span>
              </div>

              {[
                { label: "Campaign Name", value: name || "—" },
                { label: "Target Audience", value: `${TARGET_OPTIONS.find((o) => o.value === targetGroup)?.label ?? targetGroup} (${preview?.count ?? 0} tutors)` },
                { label: "Email Quota Safe", value: emailFilter === "GENUINE_ONLY" ? "Yes (Genuine emails only)" : emailFilter === "DUMMY_ONLY" ? "System accounts only" : "All accounts" },
                { label: "Delivery Channels", value: channels.map(c => CHANNELS.find(x => x.key === c)?.label || c).join(", ") || "None" },
                { label: "Rate Structure", value: rateType === "HOURLY" ? `₹${budgetMin} – ₹${budgetMax} / hour` : `₹${budgetMin.toLocaleString()} – ₹${budgetMax.toLocaleString()} / month` },
                { label: "Leads per Day", value: `${leadsPerDay} lead(s) per tutor daily` },
                { label: "Class Rotation", value: feePreset === "AUTO_ADAPT" ? "🌟 Auto-adapt by tutor's taught classes" : `Fixed Band (${feePreset})` },
                { label: "Auto-Start Status", value: autoActivate ? "Active immediately" : "Save as Draft" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">{row.label}</span>
                  <span className="text-slate-900 font-extrabold text-right">{String(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Modal Footer Navigation (Always Visible & Pinned) ── */}
      <div className="shrink-0 sticky bottom-0 z-20 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as any)}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-extrabold text-xs hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          {step === 1 ? "Cancel" : "← Back"}
        </button>

        <div className="flex items-center gap-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  if (!name.trim()) { setError("Campaign name is required"); return; }
                  if (channels.length === 0) { setError("Select at least one delivery channel"); return; }
                }
                if (step === 2) {
                  if (budgetMin <= 0 || budgetMax <= 0 || budgetMin > budgetMax) {
                    setError("Please specify a valid budget range (Min ≤ Max)");
                    return;
                  }
                }
                setError(null);
                setStep((s) => (s + 1) as any);
              }}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleLaunchCampaign}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="stroke-[3]" />}
              <span>{isPending ? "Creating Campaign..." : autoActivate ? "🚀 Create & Launch Campaign" : "💾 Save Campaign as Draft"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
