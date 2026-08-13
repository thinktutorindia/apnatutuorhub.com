"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Loader2, Users, AlertCircle, Check } from "lucide-react";
import { createDummyCampaignAction, previewCampaignTargetsAction } from "@/app/actions/dummy-campaign.actions";
import type { DummyTargetGroup } from "@prisma/client";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const TARGET_OPTIONS: Array<{ value: DummyTargetGroup; label: string; description: string }> = [
  { value: "ALL_TUTORS",  label: "All Tutors",           description: "Every active tutor on the platform" },
  { value: "NEW_7D",      label: "New (last 7 days)",    description: "Tutors who registered in the last week" },
  { value: "NEW_14D",     label: "New (last 14 days)",   description: "Tutors registered in the last 2 weeks" },
  { value: "NEW_30D",     label: "New (last 30 days)",   description: "Tutors registered in the last month" },
  { value: "VERIFIED",    label: "Verified Tutors",      description: "KYC-verified tutors only" },
  { value: "UNVERIFIED",  label: "Unverified Tutors",    description: "Tutors not yet KYC-verified" },
  { value: "SUBSCRIBED",  label: "Subscribed (Paid)",    description: "Tutors on a paid subscription plan" },
  { value: "FREE_TIER",   label: "Free Tier",            description: "Tutors on the free plan" },
  { value: "CUSTOM",      label: "Custom User IDs",      description: "Specify exact user IDs to target" },
];

const SUBJECT_OPTIONS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Science", "Social Science", "Computer Science", "Accountancy", "Economics", "History", "Geography", "Sanskrit", "French"];

export function DummyCampaignForm({ onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetGroup, setTargetGroup] = useState<DummyTargetGroup>("ALL_TUTORS");
  const [customUserIds, setCustomUserIds] = useState("");
  const [excludeUserIds, setExcludeUserIds] = useState("");
  const [channels, setChannels] = useState<string[]>(["IN_APP", "PUSH"]);
  const [leadsPerDay, setLeadsPerDay] = useState(1);
  const [randomizeDaily, setRandomizeDaily] = useState(true);
  const [overrideSubjects, setOverrideSubjects] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState(800);
  const [budgetMax, setBudgetMax] = useState(3000);
  const [totalLimit, setTotalLimit] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<{ count: number; sample: Array<{ id: string; name: string | null; email: string }> } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview target users when group changes
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      const result = await previewCampaignTargetsAction({
        targetGroup,
        customUserIds: customUserIds.split("\n").map((s) => s.trim()).filter(Boolean),
        excludeUserIds: excludeUserIds.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (result.success && result.data) setPreview(result.data);
      setPreviewLoading(false);
    }, 600);
    return () => clearTimeout(timeout);
  }, [targetGroup, customUserIds, excludeUserIds]);

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
        excludeUserIds: excludeUserIds.split("\n").map((s) => s.trim()).filter(Boolean),
        channels,
        leadsPerDay,
        randomizeDaily,
        overrideSubjects,
        budgetMin,
        budgetMax,
        totalLimit: totalLimit ? parseInt(totalLimit) : null,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? "Failed to create campaign");
      }
    });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all";
  const labelCls = "block text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">

      {/* Campaign Name */}
      <div>
        <label className={labelCls}>Campaign Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., New Tutor Welcome Leads"
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Internal notes about this campaign..."
          rows={2}
          className={inputCls + " resize-none"}
        />
      </div>

      {/* Target Group */}
      <div>
        <label className={labelCls}>Target Audience *</label>
        <div className="grid grid-cols-1 gap-2">
          {TARGET_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                targetGroup === opt.value
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="targetGroup"
                value={opt.value}
                checked={targetGroup === opt.value}
                onChange={() => setTargetGroup(opt.value)}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <p className="text-sm font-extrabold text-slate-800">{opt.label}</p>
                <p className="text-[11px] text-slate-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Custom User IDs */}
      {targetGroup === "CUSTOM" && (
        <div>
          <label className={labelCls}>User IDs (one per line)</label>
          <textarea
            value={customUserIds}
            onChange={(e) => setCustomUserIds(e.target.value)}
            placeholder="cmabcd1234&#10;cmefgh5678"
            rows={4}
            className={inputCls + " resize-none font-mono text-xs"}
          />
        </div>
      )}

      {/* Exclude User IDs */}
      <div>
        <label className={labelCls}>Exclude User IDs (optional, one per line)</label>
        <textarea
          value={excludeUserIds}
          onChange={(e) => setExcludeUserIds(e.target.value)}
          placeholder="User IDs to never send to..."
          rows={2}
          className={inputCls + " resize-none font-mono text-xs"}
        />
      </div>

      {/* Target Preview */}
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Users size={14} />
          <span className="text-xs font-extrabold">
            {previewLoading ? "Calculating..." : preview ? `${preview.count} tutors will receive this campaign` : "Select a target group"}
          </span>
        </div>
        {preview && preview.sample.length > 0 && (
          <div className="mt-2 space-y-1">
            {preview.sample.slice(0, 5).map((u) => (
              <p key={u.id} className="text-[10px] text-blue-600 font-semibold">{u.name || "—"} · {u.email}</p>
            ))}
            {preview.count > 5 && <p className="text-[10px] text-blue-500">+ {preview.count - 5} more...</p>}
          </div>
        )}
      </div>

      {/* Delivery Channels */}
      <div>
        <label className={labelCls}>Delivery Channels *</label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "EMAIL",  label: "📧 Email" },
            { key: "PUSH",   label: "📱 Web Push" },
            { key: "IN_APP", label: "🔔 In-App Bell" },
          ].map((ch) => (
            <button
              key={ch.key}
              type="button"
              onClick={() => toggleChannel(ch.key)}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold border transition-all ${
                channels.includes(ch.key)
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Per Day */}
      <div>
        <label className={labelCls}>Leads Per Tutor Per Day: <span className="text-emerald-600">{leadsPerDay}</span></label>
        <input
          type="range"
          min={1}
          max={10}
          value={leadsPerDay}
          onChange={(e) => setLeadsPerDay(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>1 lead</span><span>5</span><span>10 leads</span>
        </div>
      </div>

      {/* Budget Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Budget Min (₹/mo)</label>
          <input type="number" min={100} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Budget Max (₹/mo)</label>
          <input type="number" min={budgetMin} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      {/* Override Subjects */}
      <div>
        <label className={labelCls}>Override Subjects (optional — leave empty to use tutor's own)</label>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                overrideSubjects.includes(s)
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Date (optional)</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Date (optional)</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Total Limit */}
      <div>
        <label className={labelCls}>Total Send Limit (optional — blank = unlimited)</label>
        <input
          type="number"
          min={1}
          value={totalLimit}
          onChange={(e) => setTotalLimit(e.target.value)}
          placeholder="e.g., 1000 (auto-stops after this many sends)"
          className={inputCls}
        />
      </div>

      {/* Randomize Daily */}
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
        <input
          type="checkbox"
          checked={randomizeDaily}
          onChange={(e) => setRandomizeDaily(e.target.checked)}
          className="w-4 h-4 accent-emerald-600"
        />
        <div>
          <p className="text-sm font-extrabold text-slate-800">Randomize daily (recommended)</p>
          <p className="text-[11px] text-slate-500">Generate different lead content each day for variety</p>
        </div>
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-500/25 transition-all disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isPending ? "Creating..." : "Create Campaign"}
        </button>
      </div>
    </form>
  );
}
