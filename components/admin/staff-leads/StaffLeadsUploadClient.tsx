"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
  parseLeadBatchPreviewAction,
  confirmBatchUploadAction,
  type StaffLeadInput,
} from "@/app/actions/staff-leads.actions";
import type { ParsedLead } from "@/lib/gemini-lead-extractor";
import {
  Upload, Sparkles, CheckCircle2, Loader2, X, Edit2, Save,
  AlertCircle, ChevronRight, FileText, Users, Trash2, Search,
  Filter, Eye, Check, AlertTriangle, HelpCircle, ShieldCheck,
  Phone, Mail, MapPin, BookOpen, GraduationCap, Copy, ChevronDown,
  SlidersHorizontal, RefreshCw
} from "lucide-react";
import Link from "next/link";

type TabMode = "READY" | "DUPLICATES" | "ALL";

// ─── Real Dynamic Profile Completeness & Quality Score ─────────────────────────

function computeLeadQuality(lead: ParsedLead): {
  score: number;
  tier: "Complete" | "High" | "Partial" | "Incomplete";
  color: "emerald" | "blue" | "amber" | "rose";
  breakdown: string[];
} {
  let score = 0;
  const breakdown: string[] = [];

  const hasPhone = Boolean(lead.phone && lead.phone.replace(/\D/g, "").length === 10);
  const hasEmail = Boolean(lead.email && lead.email.includes("@"));
  const hasLocation = Boolean(lead.location && lead.location.trim().length > 1);
  const hasSubjects = Boolean(lead.subjects && lead.subjects.length > 0);
  const hasClasses = Boolean(lead.classes && lead.classes.length > 0);

  if (hasPhone) {
    score += 40;
    breakdown.push("✓ Valid 10-Digit Phone (+40%)");
  } else {
    breakdown.push("✗ Missing Phone (0%)");
  }

  if (hasEmail) {
    score += 25;
    breakdown.push("✓ Email Address (+25%)");
  } else {
    breakdown.push("✗ Missing Email (0%)");
  }

  if (hasLocation) {
    score += 15;
    breakdown.push("✓ Location / Area (+15%)");
  }

  if (hasSubjects) {
    score += 10;
    breakdown.push(`✓ ${lead.subjects.length} Subject(s) (+10%)`);
  }

  if (hasClasses) {
    score += 10;
    breakdown.push(`✓ ${lead.classes.length} Class(es) (+10%)`);
  }

  if (score >= 80) return { score, tier: "Complete", color: "emerald", breakdown };
  if (score >= 60) return { score, tier: "High", color: "blue", breakdown };
  if (score >= 40) return { score, tier: "Partial", color: "amber", breakdown };
  return { score, tier: "Incomplete", color: "rose", breakdown };
}

export function StaffLeadsUploadClient() {
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [rawText, setRawText] = useState("");
  const [batchName, setBatchName] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [junkCount, setJunkCount] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<ParsedLead>>({});
  const [manuallyExcludedIds, setManuallyExcludedIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedBatchId, setSavedBatchId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<TabMode>("READY");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Filter toggles
  const [excludeDuplicates, setExcludeDuplicates] = useState(true);
  const [requireContactMethod, setRequireContactMethod] = useState(true); // Phone OR Email
  const [requireBothPhoneAndEmail, setRequireBothPhoneAndEmail] = useState(false);

  const [expandedSubjectsRows, setExpandedSubjectsRows] = useState<Set<number>>(new Set());
  const [expandedClassesRows, setExpandedClassesRows] = useState<Set<number>>(new Set());
  const [selectedInspectLead, setSelectedInspectLead] = useState<{ lead: ParsedLead; index: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpandSubjects = (index: number) => {
    setExpandedSubjectsRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleExpandClasses = (index: number) => {
    setExpandedClassesRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setError(null);
    setUploadedFileName(file.name);
    if (!batchName) {
      setBatchName(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleParse = () => {
    if (!rawText.trim()) { setError("Please paste some data first"); return; }
    setError(null);
    startTransition(async () => {
      const res = await parseLeadBatchPreviewAction(rawText);
      if (!res.success || !res.data) { setError(res.error ?? "Parsing failed"); return; }
      setLeads(res.data.leads);
      setJunkCount(res.data.junkCount);
      setTotalMessages(res.data.totalMessages);
      setManuallyExcludedIds(new Set());

      // If all leads are duplicates, default active tab to DUPLICATES so user immediately sees why
      const allDup = res.data.leads.length > 0 && res.data.leads.every((l) => l.isDuplicate);
      setActiveTab(allDup ? "DUPLICATES" : "READY");
      setStep("preview");
    });
  };

  const handleConfirm = () => {
    // Only save leads that match the current save criteria and not manually removed
    const toSave = leads.filter((lead, i) => {
      if (manuallyExcludedIds.has(i)) return false;
      const hasContact = Boolean(lead.phone || lead.email);
      if (requireContactMethod && !hasContact) return false;
      if (requireBothPhoneAndEmail && (!lead.phone || !lead.email)) return false;
      if (excludeDuplicates && lead.isDuplicate) return false;
      return true;
    }) as StaffLeadInput[];

    if (toSave.length === 0) {
      setError("No valid leads available to save. If all leads are duplicates, toggle 'Auto-Exclude DB Duplicates' in Filters to allow saving them.");
      return;
    }

    startTransition(async () => {
      const res = await confirmBatchUploadAction(
        batchName || `Batch ${new Date().toLocaleDateString("en-IN")}`,
        rawText,
        toSave
      );
      if (!res.success || !res.data) { setError(res.error ?? "Save failed"); return; }
      setSavedBatchId(res.data.batchId);
      setStep("done");
    });
  };

  const startEdit = (i: number) => {
    setEditingId(i);
    setEditBuffer({ ...leads[i] });
  };

  const saveEdit = (i: number) => {
    setLeads((prev) => prev.map((l, idx) => idx === i ? { ...l, ...editBuffer } as ParsedLead : l));
    setEditingId(null);
  };

  const toggleExcludeRow = (i: number) => {
    setManuallyExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // Dynamic counts based on criteria
  const readyToSaveLeads = leads.filter((l, i) => {
    if (manuallyExcludedIds.has(i)) return false;
    const hasContact = Boolean(l.phone || l.email);
    if (requireContactMethod && !hasContact) return false;
    if (requireBothPhoneAndEmail && (!l.phone || !l.email)) return false;
    if (excludeDuplicates && l.isDuplicate) return false;
    return true;
  });

  const duplicateLeads = leads.filter((l) => l.isDuplicate);
  const totalMissingContact = leads.filter((l) => !l.phone && !l.email).length;

  // Filtered List based on tab and filters
  const filteredIndexedLeads = leads
    .map((lead, originalIndex) => ({ lead, originalIndex }))
    .filter(({ lead, originalIndex }) => {
      // Tab 1: DUPLICATES
      if (activeTab === "DUPLICATES") {
        if (!lead.isDuplicate) return false;
      }
      // Tab 2: READY
      else if (activeTab === "READY") {
        if (manuallyExcludedIds.has(originalIndex)) return false;
        if (excludeDuplicates && lead.isDuplicate) return false;
        if (requireContactMethod && !lead.phone && !lead.email) return false;
        if (requireBothPhoneAndEmail && (!lead.phone || !lead.email)) return false;
      }
      // Tab 3: ALL (no exclusion)

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(query);
        const matchPhone = lead.phone?.toLowerCase().includes(query);
        const matchEmail = lead.email?.toLowerCase().includes(query);
        const matchLoc = lead.location?.toLowerCase().includes(query);
        const matchSub = lead.subjects.some((s) => s.toLowerCase().includes(query));
        const matchClass = lead.classes.some((c) => c.toLowerCase().includes(query));
        return matchName || matchPhone || matchEmail || matchLoc || matchSub || matchClass;
      }
      return true;
    });

  // ── Done Step ──
  if (step === "done") {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
          <CheckCircle2 size={42} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Leads Successfully Uploaded!</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          <strong className="text-emerald-700 font-extrabold">{readyToSaveLeads.length} valid leads</strong> (with phone or email) have been saved to the staging CRM database.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/admin/staff-leads/manage"
            className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200">
            Open CRM Management Center →
          </Link>
          <Link href="/admin/staff-leads/assign"
            className="px-6 py-3.5 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all">
            Assign to Staff
          </Link>
          <button onClick={() => { setStep("paste"); setRawText(""); setLeads([]); setBatchName(""); setManuallyExcludedIds(new Set()); setSavedBatchId(null); }}
            className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
            + Upload Another Batch
          </button>
        </div>
      </div>
    );
  }

  // ── Preview Step ──
  if (step === "preview") {
    return (
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("paste")}
                className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                title="Back to text / file editor"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
                  Lead Extraction Review &amp; Staging
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                    <Sparkles size={12} /> High-Speed Lead Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extracted <strong>{leads.length} tutor leads</strong> from <strong>{totalMessages} messages</strong> · <strong>{readyToSaveLeads.length} ready to save</strong> · <strong>{duplicateLeads.length} in database</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("paste")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ← Edit Raw Input
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending || readyToSaveLeads.length === 0}
                className="px-7 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm &amp; Save {readyToSaveLeads.length} Leads
              </button>
            </div>
          </div>

          {/* Simple Tab Switcher + Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
            {/* Direct Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("READY")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "READY"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 size={14} /> Ready to Save ({readyToSaveLeads.length})
              </button>

              {duplicateLeads.length > 0 && (
                <button
                  onClick={() => setActiveTab("DUPLICATES")}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "DUPLICATES"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <AlertTriangle size={14} /> Duplicates in DB ({duplicateLeads.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Extracted ({leads.length})
              </button>
            </div>

            {/* Filter Settings Popover + Search */}
            <div className="flex items-center gap-2.5">
              <div className="relative" ref={filterMenuRef}>
                <button
                  onClick={() => setFilterMenuOpen((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    filterMenuOpen || !excludeDuplicates || requireBothPhoneAndEmail
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal size={14} className="text-emerald-600" />
                  <span>Filters</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${filterMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Filter Popover */}
                {filterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 space-y-3 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Save Criteria</span>
                      <button
                        onClick={() => {
                          setExcludeDuplicates(true);
                          setRequireContactMethod(true);
                          setRequireBothPhoneAndEmail(false);
                        }}
                        className="text-[10px] text-emerald-600 font-bold hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-slate-700">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={excludeDuplicates}
                          onChange={(e) => setExcludeDuplicates(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-400 w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Auto-Exclude DB Duplicates</p>
                          <p className="text-[11px] text-slate-400">Excludes {duplicateLeads.length} leads already in system</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requireContactMethod}
                          onChange={(e) => setRequireContactMethod(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-400 w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Require Phone OR Email</p>
                          <p className="text-[11px] text-slate-400">Filters out uncontactable records</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requireBothPhoneAndEmail}
                          onChange={(e) => setRequireBothPhoneAndEmail(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-400 w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Require Both Phone &amp; Email</p>
                          <p className="text-[11px] text-slate-400">Strict mode for 100% full profiles</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* In-table Search */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-2.5 text-red-700 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Informative Banner on Duplicates Tab */}
        {activeTab === "DUPLICATES" && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-800 gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-600 flex-shrink-0" />
              <span>
                These <strong>{duplicateLeads.length} leads</strong> match phone numbers or emails already registered in your database.
              </span>
            </div>
            {!excludeDuplicates && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Duplicate filter disabled — you can save these leads
              </span>
            )}
          </div>
        )}

        {/* All Duplicates Info Box on Ready Tab */}
        {activeTab === "READY" && readyToSaveLeads.length === 0 && duplicateLeads.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">All {duplicateLeads.length} Leads Already Exist in Your System</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All extracted phone numbers &amp; emails were matched against existing tutors in your database. To prevent duplicates, they are excluded from the upload queue.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab("DUPLICATES")}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-sm"
              >
                Review {duplicateLeads.length} Duplicates →
              </button>
              <button
                onClick={() => setExcludeDuplicates(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Allow Uploading Duplicates
              </button>
            </div>
          </div>
        )}

        {/* Main Leads Table */}
        {(activeTab !== "READY" || readyToSaveLeads.length > 0) && (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Tutor Profile &amp; Status</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Phone Number</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Email Address</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Location &amp; Address</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Subjects &amp; Classes</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Profile Quality</th>
                    <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredIndexedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <FileText size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-sm">No leads match the selected filter</p>
                        <p className="text-xs mt-0.5">Switch tabs or adjust search query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredIndexedLeads.map(({ lead, originalIndex }) => {
                      const isManuallyExcluded = manuallyExcludedIds.has(originalIndex);
                      const isEditing = editingId === originalIndex;
                      const quality = computeLeadQuality(lead);
                      const isSubjectsExpanded = expandedSubjectsRows.has(originalIndex);
                      const isClassesExpanded = expandedClassesRows.has(originalIndex);

                      return (
                        <tr
                          key={originalIndex}
                          className={`transition-colors group ${
                            lead.isDuplicate
                              ? "bg-amber-50/30 hover:bg-amber-50/60"
                              : isManuallyExcluded
                              ? "opacity-40 bg-slate-50"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {originalIndex + 1}
                          </td>

                          {/* Name & Duplicate details */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <input
                                className="w-full border rounded-lg px-2.5 py-1 text-xs"
                                value={editBuffer.name ?? ""}
                                onChange={(e) => setEditBuffer((b) => ({ ...b, name: e.target.value }))}
                                placeholder="Full Name"
                              />
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-extrabold text-slate-900 text-sm">
                                    {lead.name ?? <span className="text-slate-400 italic font-normal">{lead.leadType === "PARENT_LEAD" ? "Parent Requirement" : "Tutor Lead"}</span>}
                                  </p>
                                  {lead.leadType === "PARENT_LEAD" ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                      Parent
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      Tutor
                                    </span>
                                  )}
                                  {lead.budgetFee && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                      💰 {lead.budgetFee}
                                    </span>
                                  )}
                                  {lead.appliedCodes && lead.appliedCodes.length > 0 && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                      🏷️ {lead.appliedCodes.join(", ")}
                                    </span>
                                  )}
                                </div>
                                {lead.isDuplicate && (
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md">
                                    <AlertTriangle size={10} className="shrink-0 text-amber-600" />
                                    <span>{lead.duplicateDetail ?? "Already in Database"}</span>
                                  </div>
                                )}
                                {lead.qualification && (
                                  <span className="text-[11px] text-slate-500 font-medium block">
                                    🎓 {lead.qualification} {lead.experienceYears ? `· ${lead.experienceYears} yrs exp` : ""}
                                  </span>
                                )}
                                {lead.operationalNotes && (
                                  <span className="text-[10px] text-slate-500 italic block">
                                    📝 {lead.operationalNotes}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <input
                                className="w-full border rounded-lg px-2.5 py-1 text-xs font-mono"
                                value={editBuffer.phone ?? ""}
                                onChange={(e) => setEditBuffer((b) => ({ ...b, phone: e.target.value }))}
                                placeholder="10 digit phone"
                              />
                            ) : lead.phone ? (
                              <span className="font-mono font-extrabold text-slate-900 flex items-center gap-1.5 text-xs whitespace-nowrap">
                                <Phone size={12} className="text-emerald-600 shrink-0" />
                                +91 {lead.phone}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">No phone</span>
                            )}
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <input
                                className="w-full border rounded-lg px-2.5 py-1 text-xs"
                                value={editBuffer.email ?? ""}
                                onChange={(e) => setEditBuffer((b) => ({ ...b, email: e.target.value }))}
                                placeholder="tutor@gmail.com"
                              />
                            ) : lead.email ? (
                              <span className="text-slate-800 font-medium whitespace-nowrap flex items-center gap-1.5">
                                <Mail size={12} className="text-blue-500 shrink-0" />
                                {lead.email}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">Not provided</span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <input
                                className="w-full border rounded-lg px-2.5 py-1 text-xs"
                                value={editBuffer.location ?? ""}
                                onChange={(e) => setEditBuffer((b) => ({ ...b, location: e.target.value }))}
                                placeholder="Area / City"
                              />
                            ) : lead.location ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800 flex items-center gap-1">
                                  <MapPin size={12} className="text-rose-500 shrink-0" />
                                  {lead.location}
                                </span>
                                {lead.pincode && <span className="text-[10px] text-slate-400 block font-mono">PIN: {lead.pincode}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">Location missing</span>
                            )}
                          </td>

                          {/* Subjects & Classes with Interactive Expander */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input
                                  className="w-full border rounded-lg px-2.5 py-1 text-xs"
                                  value={(editBuffer.subjects ?? []).join(", ")}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, subjects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                                  placeholder="Subjects (comma separated)"
                                />
                                <input
                                  className="w-full border rounded-lg px-2.5 py-1 text-xs"
                                  value={(editBuffer.classes ?? []).join(", ")}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, classes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                                  placeholder="Classes (comma separated)"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {lead.subjects.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {(isSubjectsExpanded ? lead.subjects : lead.subjects.slice(0, 3)).map((s) => (
                                      <span key={s} className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                                        {s}
                                      </span>
                                    ))}
                                    {lead.subjects.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandSubjects(originalIndex)}
                                        className="text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                                      >
                                        {isSubjectsExpanded ? "Hide" : `+${lead.subjects.length - 3}`}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {lead.classes.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {(isClassesExpanded ? lead.classes : lead.classes.slice(0, 3)).map((c) => (
                                      <span key={c} className="text-[11px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-100">
                                        {c}
                                      </span>
                                    ))}
                                    {lead.classes.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandClasses(originalIndex)}
                                        className="text-[10px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                                      >
                                        {isClassesExpanded ? "Hide" : `+${lead.classes.length - 3}`}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {lead.subjects.length === 0 && lead.classes.length === 0 && (
                                  <span className="text-slate-300 italic text-[11px]">No subjects / classes</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Profile Quality */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1" title={quality.breakdown.join("\n")}>
                              <div className="flex items-center gap-1.5">
                                <span className={`flex h-2 w-2 rounded-full ${
                                  quality.color === "emerald" ? "bg-emerald-500" : quality.color === "blue" ? "bg-blue-500" : quality.color === "amber" ? "bg-amber-500" : "bg-rose-500"
                                }`} />
                                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                                  quality.color === "emerald"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : quality.color === "blue"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : quality.color === "amber"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
                                }`}>
                                  {quality.score}% {quality.tier}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => saveEdit(originalIndex)}
                                  className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                                  title="Save changes"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : isManuallyExcluded ? (
                              <button
                                onClick={() => toggleExcludeRow(originalIndex)}
                                className="text-xs text-emerald-600 font-extrabold hover:underline cursor-pointer"
                              >
                                Include
                              </button>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedInspectLead({ lead, index: originalIndex })}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                  title="Inspect raw snippet"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => startEdit(originalIndex)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                  title="Edit lead fields"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => toggleExcludeRow(originalIndex)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Exclude from upload"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-500">
                Showing <strong>{filteredIndexedLeads.length}</strong> of <strong>{leads.length}</strong> total records.
              </span>
              <button
                onClick={handleConfirm}
                disabled={isPending || readyToSaveLeads.length === 0}
                className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer ml-auto"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm &amp; Save {readyToSaveLeads.length} Leads to CRM
              </button>
            </div>
          </div>
        )}

        {/* Inspect Raw Snippet Modal */}
        {selectedInspectLead && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900">Lead #{selectedInspectLead.index + 1} — Raw WhatsApp Inspector</h3>
                </div>
                <button onClick={() => setSelectedInspectLead(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Original Raw Message</p>
                <pre className="bg-slate-900 text-emerald-300 font-mono text-xs p-4 rounded-2xl whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {selectedInspectLead.lead.rawText}
                </pre>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Name:</span>
                  <span className="font-bold text-slate-800">{selectedInspectLead.lead.name ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Phone:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedInspectLead.lead.phone ?? "Missing"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Email:</span>
                  <span className="font-bold text-slate-800 break-all">{selectedInspectLead.lead.email ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Location:</span>
                  <span className="font-bold text-slate-800">{selectedInspectLead.lead.location ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Qualification:</span>
                  <span className="font-bold text-slate-800">{selectedInspectLead.lead.qualification ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Quality Score:</span>
                  <span className="font-bold text-emerald-600">{computeLeadQuality(selectedInspectLead.lead).score}% {computeLeadQuality(selectedInspectLead.lead).tier}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedInspectLead(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
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

  // ── Paste Step ──
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Upload Raw Lead Data</h1>
          <p className="text-sm text-slate-500 mt-1">Paste your entire WhatsApp chat export or tutor profiles below. Gemini AI will extract &amp; structure the data automatically.</p>
        </div>
        <Link href="/admin/staff-leads" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
          ← Back to CRM
        </Link>
      </div>

      {/* Info badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "Paste WhatsApp Dump", desc: "Entire chat export with timestamps or CSV" },
          { icon: Sparkles, label: "AI Parses Automatically", desc: "Gemini extracts phone, email, subjects, locations" },
          { icon: ShieldCheck, label: "Strict De-duplication", desc: "Prevents existing phone/email duplicates" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Batch name */}
      <div>
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Batch Name (optional)</label>
        <input
          type="text"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder={`Aug 25 WhatsApp Dump`}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
        />
      </div>

      {/* Input Mode Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setInputMode("paste")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            inputMode === "paste"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <FileText size={16} /> Paste Raw Text / WhatsApp Dump
        </button>
        <button
          type="button"
          onClick={() => setInputMode("file")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            inputMode === "file"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Upload size={16} /> Upload File (.txt, .csv, .json, .log)
        </button>
      </div>

      {/* Mode 1: Paste Text */}
      {inputMode === "paste" && (
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            Paste Your WhatsApp Data / Tutor Profiles
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`[7:12 pm, 17/08/2026] +91 755 956 3565: Tutor Profile\n\nTutor Name- Somya Raj\nContact no.- 6395322935\nEmail - somyarajgit9@gmail.com\n...\n\nPaste hundreds of messages — AI handles all formats!`}
            className="w-full h-72 px-4 py-3 border border-slate-200 rounded-2xl text-sm font-mono text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white placeholder-slate-300"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            {rawText.length > 0 ? `${rawText.length.toLocaleString()} characters pasted` : "Supports WhatsApp timestamps, CV blobs, plain profiles, numbered lists — any format"}
          </p>
        </div>
      )}

      {/* Mode 2: File Upload (Drag & Drop) */}
      {inputMode === "file" && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white cursor-pointer ${
              isDragging ? "border-emerald-500 bg-emerald-50/50" : "border-slate-300 hover:border-emerald-400"
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".txt,.csv,.tsv,.json,.log"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Upload size={28} />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {uploadedFileName ? (
                  <span className="text-emerald-600">Selected: {uploadedFileName}</span>
                ) : (
                  "Drag & Drop your WhatsApp Chat export / CSV / text file here"
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">or click to browse from computer (supports .txt, .csv, .json, .log)</p>
            </label>
          </div>

          {rawText && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {uploadedFileName ?? "Loaded file"} — {rawText.length.toLocaleString()} characters loaded
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setRawText(""); setUploadedFileName(null); }}
                className="text-xs text-red-500 hover:underline cursor-pointer"
              >
                Clear file
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={isPending || !rawText.trim()}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-base hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
      >
        {isPending ? (
          <><Loader2 size={20} className="animate-spin" /> Processing &amp; Structuring Leads…</>
        ) : (
          <><Sparkles size={20} /> Extract &amp; Structure Leads → Preview</>
        )}
      </button>
    </div>
  );
}
