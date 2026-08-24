"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Loader2, Users, AlertCircle, Check, Mail, Bell, Smartphone, MapPin, Sparkles } from "lucide-react";
import { createDummyCampaignAction, previewCampaignTargetsAction } from "@/app/actions/dummy-campaign.actions";
import type { DummyTargetGroup } from "@prisma/client";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const TARGET_OPTIONS: Array<{ value: DummyTargetGroup; label: string; emoji: string; description: string }> = [
  { value: "ALL_TUTORS",  emoji: "🌐", label: "All Tutors",      description: "Every active tutor on the platform" },
  { value: "NEW_7D",      emoji: "🆕", label: "New (7 days)",    description: "Tutors who joined in the last week" },
  { value: "NEW_14D",     emoji: "🆕", label: "New (14 days)",   description: "Joined in last 2 weeks" },
  { value: "NEW_30D",     emoji: "🆕", label: "New (30 days)",   description: "Joined in last month" },
  { value: "VERIFIED",    emoji: "✅", label: "Verified",        description: "KYC-verified tutors only" },
  { value: "UNVERIFIED",  emoji: "⏳", label: "Unverified",      description: "Not yet KYC-verified" },
  { value: "SUBSCRIBED",  emoji: "💎", label: "Subscribed",      description: "On a paid plan" },
  { value: "FREE_TIER",   emoji: "🆓", label: "Free Tier",       description: "On the free plan" },
  { value: "CUSTOM",      emoji: "🎯", label: "Custom",          description: "Pick specific user IDs" },
];

const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi",
  "Science", "Social Science", "Computer Science", "Accountancy",
  "Economics", "History", "Geography", "Sanskrit", "French",
];

const CHANNELS = [
  { key: "EMAIL",  label: "Email",    icon: <Mail size={14} />,       color: "text-blue-600 bg-blue-50 border-blue-200", activeColor: "bg-blue-500 text-white border-blue-500" },
  { key: "PUSH",   label: "Web Push", icon: <Smartphone size={14} />, color: "text-purple-600 bg-purple-50 border-purple-200", activeColor: "bg-purple-500 text-white border-purple-500" },
  { key: "IN_APP", label: "Bell",     icon: <Bell size={14} />,       color: "text-amber-600 bg-amber-50 border-amber-200", activeColor: "bg-amber-500 text-white border-amber-500" },
];

export function DummyCampaignForm({ onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetGroup, setTargetGroup] = useState<DummyTargetGroup>("NEW_7D");
  const [customUserIds, setCustomUserIds] = useState("");
  const [emailFilter, setEmailFilter] = useState<"GENUINE_ONLY" | "DUMMY_ONLY" | "ALL">("GENUINE_ONLY");
  const [channels, setChannels] = useState<string[]>(["IN_APP", "PUSH"]);
  const [leadsPerDay, setLeadsPerDay] = useState(1);
  const [overrideSubjects, setOverrideSubjects] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState(800);
  const [budgetMax, setBudgetMax] = useState(3000);
  const [totalLimit, setTotalLimit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoActivate, setAutoActivate] = useState(true);

  // Preview
  const [preview, setPreview] = useState<{ count: number; genuineCount?: number; dummyCount?: number; sample: Array<{ id: string; name: string | null; email: string }> } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      const result = await previewCampaignTargetsAction({
        targetGroup,
        customUserIds: customUserIds.split("\n").map((s) => s.trim()).filter(Boolean),
        emailFilter,
      });
      if (result.success && result.data) setPreview(result.data);
      setPreviewLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [targetGroup, customUserIds, emailFilter]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const toggleSubject = (s: string) => {
    setOverrideSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (channels.length === 0) { setError("Select at least one delivery channel"); return; }
    setError(null);
    startTransition(async () => {
      const result = await createDummyCampaignAction({
        name: name.trim(),
        description: description.trim() || undefined,
        targetGroup,
        customUserIds: customUserIds.split("\n").map((s) => s.trim()).filter(Boolean),
        channels,
        leadsPerDay,
        overrideSubjects,
        budgetMin,
        budgetMax,
        totalLimit: totalLimit ? parseInt(totalLimit) : null,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      if (!result.success) { setError(result.error ?? "Failed"); return; }

      // Auto-activate if toggled
      if (autoActivate && result.data) {
        const { toggleCampaignStatusAction } = await import("@/app/actions/dummy-campaign.actions");
        await toggleCampaignStatusAction(result.data.id, "ACTIVE");
      }
      onSuccess();
    });
  };

  const cls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all";
  const labelCls = "block text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-1.5";

  // Steps
  const stepTitles = [
    "Who & Channels",
    "Lead Settings",
    "Schedule",
  ];

  return (
    <div className="flex flex-col">
      {/* Step indicator */}
      <div className="flex items-center gap-0 px-5 pt-4 pb-0">
        {stepTitles.map((title, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <React.Fragment key={num}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${done ? "bg-emerald-500 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {done ? <Check size={10} /> : num}
                </div>
                <span className={`text-[11px] font-extrabold ${active ? "text-slate-800" : "text-slate-400"}`}>{title}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">

        {/* ── STEP 1: Who & Channels ── */}
        {step === 1 && (
          <>
            <div>
              <label className={labelCls}>Campaign Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Welcome Leads for New Tutors"' className={cls} autoFocus />
            </div>

            <div>
              <label className={labelCls}>Target Audience *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <label key={opt.value}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      targetGroup === opt.value
                        ? "border-emerald-400 bg-emerald-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}>
                    <input type="radio" name="tg" value={opt.value} checked={targetGroup === opt.value}
                      onChange={() => setTargetGroup(opt.value)} className="hidden" />
                    <span className="text-base">{opt.emoji}</span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Quota Saver / Authenticity Filter */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelCls + " mb-0"}>Email Quota Protection &amp; Targeting</label>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Resend Quota Saver
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { value: "GENUINE_ONLY", label: "✨ Genuine Emails Only", sub: "Real Gmail/Yahoo (Quota Saver)" },
                  { value: "ALL", label: "🌐 All Tutors", sub: "Include placeholder accounts" },
                  { value: "DUMMY_ONLY", label: "🤖 Dummy Accounts Only", sub: "@apnatutorhub.com test accounts" },
                ].map((item) => (
                  <label
                    key={item.value}
                    onClick={() => setEmailFilter(item.value as any)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      emailFilter === item.value
                        ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 font-extrabold text-slate-900"
                        : "bg-white/60 border-slate-200 hover:bg-white text-slate-600 font-semibold"
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailFilter"
                      value={item.value}
                      checked={emailFilter === item.value}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <p className="text-xs">{item.label}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">{item.sub}</p>
                  </label>
                ))}
              </div>
            </div>

            {targetGroup === "CUSTOM" && (
              <div>
                <label className={labelCls}>User IDs (one per line)</label>
                <textarea value={customUserIds} onChange={(e) => setCustomUserIds(e.target.value)}
                  placeholder="Paste user IDs here..." rows={3} className={cls + " resize-none font-mono text-xs"} />
              </div>
            )}

            {/* Target count preview */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${previewLoading ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200"}`}>
              <Users size={14} className={previewLoading ? "text-slate-400" : "text-blue-500"} />
              <div className="flex-1">
                <p className={`text-xs font-extrabold ${previewLoading ? "text-slate-500" : "text-blue-700"}`}>
                  {previewLoading ? "Counting tutors..." : `${preview?.count ?? 0} tutors will receive this campaign`}
                </p>
                {preview && (
                  <p className="text-[10px] text-blue-600 mt-0.5 font-medium">
                    ✨ {preview.genuineCount ?? preview.count} Genuine Tutors · {preview.dummyCount ?? 0} Auto-assigned (Quota Safe)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={11} className="text-emerald-500" />
                <p className="text-[10px] font-bold text-emerald-600">Geo-matched daily</p>
              </div>
            </div>

            {/* Channels */}
            <div>
              <label className={labelCls}>Delivery Channels *</label>
              <div className="flex gap-2">
                {CHANNELS.map((ch) => (
                  <button key={ch.key} type="button" onClick={() => toggleChannel(ch.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                      channels.includes(ch.key) ? ch.activeColor : ch.color
                    }`}>
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {channels.length === 0 && <p className="text-[11px] text-rose-500 mt-1">Pick at least one channel</p>}
            </div>

            {/* Auto-activate toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-emerald-200 bg-emerald-50">
              <input type="checkbox" checked={autoActivate} onChange={(e) => setAutoActivate(e.target.checked)}
                className="w-4 h-4 accent-emerald-600" />
              <div>
                <p className="text-sm font-extrabold text-emerald-800">🚀 Auto-activate after creating</p>
                <p className="text-[11px] text-emerald-600">Campaign starts sending immediately via daily cron</p>
              </div>
            </label>
          </>
        )}

        {/* ── STEP 2: Lead Settings ── */}
        {step === 2 && (
          <>
            <div className="p-3 rounded-xl bg-fuchsia-50 border border-fuchsia-200 flex items-start gap-2">
              <Sparkles size={13} className="text-fuchsia-500 mt-0.5 shrink-0" />
              <p className="text-[11px] font-bold text-fuchsia-700">
                Leads are geo-matched daily using each tutor's GPS location. They rotate through nearby areas automatically (Sangam Vihar → Batra → Khanpur etc.)
              </p>
            </div>

            {/* Leads per day */}
            <div>
              <label className={labelCls}>Leads per tutor per day: <span className="text-emerald-600">{leadsPerDay}</span></label>
              <input type="range" min={1} max={5} value={leadsPerDay}
                onChange={(e) => setLeadsPerDay(Number(e.target.value))} className="w-full accent-emerald-500" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1 lead</span><span>2</span><span>3</span><span>4</span><span>5 leads</span>
              </div>
            </div>

            {/* Budget range */}
            <div>
              <label className={labelCls}>Budget Range (₹/month)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold mb-1 block">Min ₹</label>
                  <input type="number" min={100} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} className={cls} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold mb-1 block">Max ₹</label>
                  <input type="number" min={budgetMin} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} className={cls} />
                </div>
              </div>
            </div>

            {/* Override subjects */}
            <div>
              <label className={labelCls}>
                Force Subjects
                <span className="ml-1 normal-case text-slate-400 font-semibold">(optional — empty = use tutor's own subjects)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSubject(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                      overrideSubjects.includes(s)
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Internal Notes (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Remind yourself why this campaign was created..." rows={2}
                className={cls + " resize-none"} />
            </div>
          </>
        )}

        {/* ── STEP 3: Schedule ── */}
        {step === 3 && (
          <>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-extrabold text-blue-700">⏰ Cron fires daily at 9:00 AM IST</p>
              <p className="text-[11px] text-blue-600 mt-0.5">All active campaigns run automatically every day. Use start/end dates to limit when it runs.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date (optional)</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cls} />
              </div>
              <div>
                <label className={labelCls}>End Date (optional)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Total Send Limit (optional)</label>
              <input type="number" min={1} value={totalLimit} onChange={(e) => setTotalLimit(e.target.value)}
                placeholder="e.g. 500 — campaign auto-stops after this many total sends" className={cls} />
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-extrabold text-slate-700 mb-2">📋 Campaign Summary</p>
              {[
                { label: "Name", value: name || "—" },
                { label: "Target", value: TARGET_OPTIONS.find((o) => o.value === targetGroup)?.label ?? targetGroup },
                { label: "Channels", value: channels.join(", ") || "None" },
                { label: "Leads/day", value: leadsPerDay },
                { label: "Budget", value: `₹${budgetMin.toLocaleString()}–₹${budgetMax.toLocaleString()}/mo` },
                { label: "Auto-start", value: autoActivate ? "Yes" : "No" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">{row.label}</span>
                  <span className="text-slate-800 font-extrabold">{String(row.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as any)}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50 transition-all">
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step < 3 ? (
            <button type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) { setError("Campaign name is required"); return; }
                if (step === 1 && channels.length === 0) { setError("Select at least one channel"); return; }
                setError(null);
                setStep((s) => (s + 1) as any);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-extrabold text-sm transition-all">
              Next →
            </button>
          ) : (
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 transition-all disabled:opacity-60">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isPending ? "Creating..." : autoActivate ? "Create & Activate" : "Create Campaign"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
