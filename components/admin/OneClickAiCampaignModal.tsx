"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X, Sparkles, MessageCircle, Smartphone, Mail, Bell, MapPin,
  Users, CheckSquare, Square, Loader2, Coins, IndianRupee, ShieldCheck,
  Send, AlertCircle, CheckCircle2, ChevronRight, Filter, BookOpen, GraduationCap,
} from "lucide-react";
import {
  getTutorsForCampaignTargetAction,
  dispatchOneClickAiCampaignAction,
} from "@/app/actions/dummy-campaign.actions";
import { calculateCampaignResourceUsage, WHATSAPP_COST_PER_MSG_INR } from "@/lib/dummy-campaign-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDispatched?: () => void;
}

const CHANNELS = [
  { key: "WHATSAPP", label: "WhatsApp (Aqua)", icon: <MessageCircle size={14} />, color: "text-emerald-700 bg-emerald-50 border-emerald-300", activeColor: "bg-emerald-600 text-white border-emerald-600" },
  { key: "IN_APP",   label: "In-App Bell",     icon: <Bell size={14} />,          color: "text-amber-600 bg-amber-50 border-amber-200",     activeColor: "bg-amber-500 text-white border-amber-500" },
  { key: "PUSH",     label: "Web Push",        icon: <Smartphone size={14} />,    color: "text-purple-600 bg-purple-50 border-purple-200",   activeColor: "bg-purple-500 text-white border-purple-500" },
  { key: "EMAIL",    label: "Email Alert",     icon: <Mail size={14} />,          color: "text-blue-600 bg-blue-50 border-blue-200",         activeColor: "bg-blue-500 text-white border-blue-500" },
];

export function OneClickAiCampaignModal({ isOpen, onClose, onDispatched }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    sentCount: number;
    failedCount: number;
    tutorCount: number;
    consumedCredits: number;
    consumedInr: number;
    details: string;
  } | null>(null);

  // Filters
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [channels, setChannels] = useState<string[]>(["WHATSAPP", "IN_APP"]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [budgetMin, setBudgetMin] = useState(350);
  const [budgetMax, setBudgetMax] = useState(900);
  const [rateType, setRateType] = useState<"HOURLY" | "MONTHLY">("HOURLY");

  // Tutors List & Selection
  const [tutors, setTutors] = useState<Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    hasPhone: boolean;
    city: string | null;
    address: string | null;
    latitude?: number | null;
    longitude?: number | null;
    teachingRadius?: number;
    subjects: string[];
    classLevels: string[];
    isVerified: boolean;
    isGenuine?: boolean;
  }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch Tutors when filters change
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsFetching(true);
    const timeout = setTimeout(async () => {
      const res = await getTutorsForCampaignTargetAction({
        search: search.trim() || undefined,
        city: cityFilter.trim() || undefined,
        subject: subjectFilter.trim() || undefined,
        emailFilter: "ALL",
        limit: 80,
      });

      if (active) {
        setIsFetching(false);
        if (res.success && res.data) {
          setTutors(res.data.tutors);
          // By default, pre-select all tutors (1-click ready!)
          setSelectedIds(res.data.tutors.map((t) => t.id));
        }
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isOpen, search, cityFilter, subjectFilter]);

  if (!isOpen) return null;

  const toggleChannel = (key: string) => {
    if (channels.includes(key)) {
      setChannels(channels.filter((c) => c !== key));
    } else {
      setChannels([...channels, key]);
    }
  };

  const toggleSelectTutor = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === tutors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tutors.map((t) => t.id));
    }
  };

  const resourceUsage = calculateCampaignResourceUsage(selectedIds.length, channels);

  const handleDispatch = () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one teacher");
      return;
    }
    if (channels.length === 0) {
      setError("Please select at least one delivery channel");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await dispatchOneClickAiCampaignAction({
        tutorIds: selectedIds,
        channels,
        radiusKm,
        budgetMin,
        budgetMax,
        rateType,
      });

      if (!res.success) {
        setError(res.error ?? "Failed to dispatch AI campaign");
        return;
      }

      setSuccessResult(res.data!);
      if (onDispatched) onDispatched();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0F2540] via-[#1A3C5E] to-[#2D9E6B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  1-Click AI WhatsApp &amp; Nearby Lead Campaign
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-900">
                  Strict 5km
                </span>
              </div>
              <p className="text-xs text-slate-200 font-500">
                AI matches nearby localities (≤5km), subjects &amp; classes. Select tutors in 1 click and send!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successResult ? (
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-950">Campaign Dispatched Successfully!</h3>
                <p className="text-xs font-semibold text-emerald-800 max-w-md mx-auto">
                  {successResult.details}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-slate-500">Tutors Sent</p>
                  <p className="text-base font-black text-slate-900">{successResult.tutorCount}</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-slate-500">Deliveries Sent</p>
                  <p className="text-base font-black text-emerald-700">{successResult.sentCount}</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-slate-500">AI Credits Used</p>
                  <p className="text-base font-black text-purple-700">{successResult.consumedCredits}</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-slate-500">WhatsApp Cost</p>
                  <p className="text-base font-black text-slate-900">₹{successResult.consumedInr.toFixed(2)}</p>
                </div>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSuccessResult(null)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Send Another Campaign
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#2D9E6B] text-white text-xs font-bold hover:bg-[#238357]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Radius & Channels Control Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strict Radius Filter */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#2D9E6B]" /> Strict Radius Filter
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {radiusKm === 5 ? "Strict 5km Active" : `${radiusKm}km Radius`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { km: 5, label: "5 km", sub: "Strict Nearby" },
                      { km: 10, label: "10 km", sub: "Neighborhood" },
                      { km: 25, label: "25 km", sub: "City-wide" },
                    ].map((r) => (
                      <button
                        key={r.km}
                        type="button"
                        onClick={() => setRadiusKm(r.km)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          radiusKm === r.km
                            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 font-black text-slate-900 shadow-2xs"
                            : "bg-white/60 border-slate-200 hover:bg-white text-slate-600 font-bold"
                        }`}
                      >
                        <p className="text-xs font-extrabold">{r.label}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Channels */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-600" /> Dispatch Channels
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => toggleChannel(ch.key)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          channels.includes(ch.key) ? ch.activeColor : ch.color
                        }`}
                      >
                        {ch.icon} {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resource & Amount Consumption Widget */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-emerald-600" />
                    <p className="text-xs font-black text-slate-900">Campaign Resource &amp; Cost Calculation</p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-950 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    {resourceUsage.summaryText}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-bold">Selected Teachers</p>
                    <p className="text-sm font-black text-slate-900">{resourceUsage.tutorCount}</p>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-bold">AI Credits</p>
                    <p className="text-sm font-black text-purple-700">{resourceUsage.aiCredits} Credits</p>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-bold">WhatsApp Messages</p>
                    <p className="text-sm font-black text-emerald-700">{resourceUsage.whatsAppMsgCount}</p>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 font-bold">Est. WhatsApp Spend</p>
                    <p className="text-sm font-black text-slate-900">₹{resourceUsage.whatsAppEstimatedInr.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Tutor Search & Quick Filters Toolbar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-slate-700" />
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Target Teachers ({selectedIds.length} of {tutors.length} selected)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-extrabold text-[#2D9E6B] hover:text-[#238357] cursor-pointer inline-flex items-center gap-1"
                  >
                    {selectedIds.length === tutors.length ? "Deselect All" : "⚡ 1-Click Select All Matched"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone, email..."
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
                  />
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="Filter by city (e.g. Delhi)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
                  />
                  <input
                    type="text"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    placeholder="Filter by subject (e.g. Maths)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
                  />
                </div>
              </div>

              {/* Tutors Scrollable List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                {isFetching ? (
                  <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold">Scanning teachers in {radiusKm}km radius...</span>
                  </div>
                ) : tutors.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-500">
                    No active teachers match the search query. Try broadening your filters.
                  </div>
                ) : (
                  tutors.map((t) => {
                    const isSelected = selectedIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectTutor(t.id)}
                        className={`flex items-center justify-between p-3 gap-3 transition-colors cursor-pointer ${
                          isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button type="button" className="text-slate-400 shrink-0">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#2D9E6B]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-extrabold text-slate-900 truncate">
                                {t.name || "Teacher"}
                              </p>
                              {t.city && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  📍 {t.city}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                ≤{radiusKm}km radius
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-500">
                              📚 {t.subjects.slice(0, 3).join(", ") || "All Subjects"} · 🎓 {t.classLevels.slice(0, 2).join(", ") || "Classes"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {t.hasPhone ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <MessageCircle size={10} /> {t.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              No Phone
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Live WhatsApp Notification Bubble Preview */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <MessageCircle size={13} className="text-emerald-600" /> WhatsApp Message Live Preview
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Auto-filled with tutor's exact subject &amp; 5km locality</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 text-xs font-mono text-slate-800 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-emerald-800">🎯 *New Student Requirement Alert — ApnaTutorHub*</p>
                  <p>Hello {"{Teacher}"}, a new student requirement matching your profile was just posted!</p>
                  <p>📍 *Locality:* Main Market, {"{City}"} (Within {radiusKm} km)</p>
                  <p>📚 *Subjects:* {"{Taught Subjects}"}</p>
                  <p>🎓 *Class:* Class 10 (CBSE)</p>
                  <p>💰 *Budget:* ₹{budgetMin}–₹{budgetMax}/{rateType === "HOURLY" ? "hr" : "mo"}</p>
                  <p className="text-blue-600 font-bold">👉 Tap to view &amp; unlock: https://apnatutorhub.com/tutor/leads?...</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successResult && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs font-bold text-slate-600">
              <span>{selectedIds.length} teachers selected</span>
              <span className="mx-2">·</span>
              <span className="text-purple-700">{resourceUsage.aiCredits} Credits</span>
              {channels.includes("WHATSAPP") && (
                <>
                  <span className="mx-2">·</span>
                  <span className="text-emerald-700 font-extrabold">~₹{resourceUsage.whatsAppEstimatedInr.toFixed(2)} WhatsApp</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={isPending || selectedIds.length === 0 || channels.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-emerald-600 hover:from-[#238357] hover:to-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send Campaign (1-Click)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
