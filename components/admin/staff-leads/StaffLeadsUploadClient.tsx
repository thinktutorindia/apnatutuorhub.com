"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ParsedLead } from "@/lib/gemini-lead-extractor";
import {
  Upload, Sparkles, CheckCircle2, Loader2, X, Edit2, Save,
  AlertCircle, ChevronRight, FileText, Users, Trash2, Search,
  Filter, Eye, Check, AlertTriangle, HelpCircle, ShieldCheck,
  Phone, Mail, MapPin, BookOpen, GraduationCap, Copy, ChevronDown, Plus, PlusCircle, Tag, SlidersHorizontal, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { SUBJECT_TAXONOMY, CLASS_LEVELS, SUBJECTS } from "@/lib/validations";

type TabMode =
  | "READY"
  | "COMPLETE"
  | "HAS_PHONE"
  | "HAS_NAME"
  | "HAS_LOCATION"
  | "HAS_SUBJECTS"
  | "LOCATION_ONLY"
  | "SUBJECT_ONLY"
  | "PHONE_ONLY"
  | "HAS_EMAIL"
  | "DUPLICATES"
  | "ALL";

// ─── Real Dynamic Profile Completeness & Quality Score ─────────────────────────

function computeLeadQuality(lead: ParsedLead): {
  score: number;
  tier: "Complete" | "High" | "Partial" | "Incomplete";
  color: "emerald" | "blue" | "amber" | "rose";
  breakdown: string[];
} {
  if (!lead) {
    return { score: 0, tier: "Incomplete", color: "rose", breakdown: ["✗ No data"] };
  }

  let score = 0;
  const breakdown: string[] = [];

  const hasPhone = Boolean(lead.phone && lead.phone.replace(/\D/g, "").length === 10);
  const hasEmail = Boolean(lead.email && lead.email.includes("@"));
  const hasLocation = Boolean(lead.location && lead.location.trim().length > 1);
  const hasSubjects = Boolean(lead.subjects && Array.isArray(lead.subjects) && lead.subjects.length > 0);
  const hasClasses = Boolean(lead.classes && Array.isArray(lead.classes) && lead.classes.length > 0);

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
    breakdown.push(`✓ ${lead.subjects?.length ?? 0} Subject(s) (+10%)`);
  }

  if (hasClasses) {
    score += 10;
    breakdown.push(`✓ ${lead.classes?.length ?? 0} Class(es) (+10%)`);
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [junkCount, setJunkCount] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [totalPhonesCount, setTotalPhonesCount] = useState(0);
  const [totalEmailsCount, setTotalEmailsCount] = useState(0);
  const [totalDuplicatesCount, setTotalDuplicatesCount] = useState(0);
  const [totalReadyCount, setTotalReadyCount] = useState(0);
  const [totalWithNamesCount, setTotalWithNamesCount] = useState(0);
  const [totalWithLocationsCount, setTotalWithLocationsCount] = useState(0);
  const [totalWithSubjectsCount, setTotalWithSubjectsCount] = useState(0);
  const [totalCompleteProfilesCount, setTotalCompleteProfilesCount] = useState(0);
  const [totalLocationOnlyCount, setTotalLocationOnlyCount] = useState(0);
  const [totalSubjectOnlyCount, setTotalSubjectOnlyCount] = useState(0);
  const [totalPhoneOnlyCount, setTotalPhoneOnlyCount] = useState(0);
  const [isPreviewCapped, setIsPreviewCapped] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<ParsedLead>>({});
  const [manuallyExcludedIds, setManuallyExcludedIds] = useState<Set<number>>(new Set());
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
    setUploadedFile(file);
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

  const handleParse = async () => {
    if (!rawText.trim() && !uploadedFile) {
      setError("Please paste or upload some lead data first");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      let res: Response;
      if (uploadedFile) {
        const fd = new FormData();
        fd.append("file", uploadedFile);
        res = await fetch("/api/admin/staff-leads/preview", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/admin/staff-leads/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Parsing failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const data = json.data;
      setLeads(data.leads);
      setJunkCount(data.junkCount);
      setTotalMessages(data.totalMessages);
      setTotalLeadsCount(data.totalLeadsCount ?? data.leads.length);
      setTotalPhonesCount(data.totalPhonesCount ?? data.leads.filter((l: any) => Boolean(l.phone)).length);
      setTotalEmailsCount(data.totalEmailsCount ?? data.leads.filter((l: any) => Boolean(l.email)).length);
      setTotalDuplicatesCount(data.totalDuplicatesCount ?? data.leads.filter((l: any) => l.isDuplicate).length);
      setTotalReadyCount(data.totalReadyCount ?? data.leads.filter((l: any) => !l.isDuplicate).length);
      setTotalWithNamesCount(data.totalWithNamesCount ?? data.leads.filter((l: any) => Boolean(l.name && l.name.trim().length > 1)).length);
      setTotalWithLocationsCount(data.totalWithLocationsCount ?? data.leads.filter((l: any) => Boolean(l.location && l.location.trim().length > 1)).length);
      setTotalWithSubjectsCount(data.totalWithSubjectsCount ?? data.leads.filter((l: any) => Boolean((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0))).length);
      setTotalCompleteProfilesCount(data.totalCompleteProfilesCount ?? data.leads.filter((l: any) => Boolean(l.name && l.phone && l.location && ((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0)))).length);
      setTotalLocationOnlyCount(data.totalLocationOnlyCount ?? data.leads.filter((l: any) => Boolean(l.location && (!l.subjects || l.subjects.length === 0) && (!l.classes || l.classes.length === 0))).length);
      setTotalSubjectOnlyCount(data.totalSubjectOnlyCount ?? data.leads.filter((l: any) => Boolean(((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0)) && !l.location)).length);
      setTotalPhoneOnlyCount(data.totalPhoneOnlyCount ?? data.leads.filter((l: any) => Boolean(l.phone && !l.location && (!l.subjects || l.subjects.length === 0))).length);
      setIsPreviewCapped(Boolean(data.isPreviewCapped));
      setManuallyExcludedIds(new Set());

      // If all leads are duplicates, default active tab to DUPLICATES so user immediately sees why
      const allDup = data.leads.length > 0 && data.leads.every((l: any) => l.isDuplicate);
      setActiveTab(allDup ? "DUPLICATES" : "READY");
      setStep("preview");
    } catch (err: any) {
      console.error("[handleParse]", err);
      setError(err?.message || "Failed to process file. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const name = batchName.trim() || (uploadedFileName ? uploadedFileName.replace(/\.[^/.]+$/, "") : `Batch ${new Date().toLocaleDateString("en-IN")}`);
      let res: Response;

      if (uploadedFile) {
        const fd = new FormData();
        fd.append("file", uploadedFile);
        fd.append("batchName", name);
        fd.append("excludeDuplicates", String(excludeDuplicates));
        fd.append("requireContactMethod", String(requireContactMethod));
        fd.append("requireBothPhoneAndEmail", String(requireBothPhoneAndEmail));
        res = await fetch("/api/admin/staff-leads/confirm", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/admin/staff-leads/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchName: name,
            rawText,
            excludeDuplicates,
            requireContactMethod,
            requireBothPhoneAndEmail,
          }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Save failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSavedBatchId(json.data.batchId);
      setStep("done");
    } catch (err: any) {
      console.error("[handleConfirm]", err);
      setError(err?.message || "Save failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
  
  const displayTotalLeads = totalLeadsCount > 0 ? totalLeadsCount : leads.length;
  const displayTotalPhones = totalPhonesCount > 0 ? totalPhonesCount : leads.filter((l) => Boolean(l.phone)).length;
  const displayTotalEmails = totalEmailsCount > 0 ? totalEmailsCount : leads.filter((l) => Boolean(l.email)).length;
  const displayTotalDuplicates = totalDuplicatesCount > 0 ? totalDuplicatesCount : duplicateLeads.length;
  const displayTotalReady = totalReadyCount > 0 ? totalReadyCount : readyToSaveLeads.length;
  const displayTotalNames = totalWithNamesCount > 0 ? totalWithNamesCount : leads.filter((l) => Boolean(l.name && l.name.trim().length > 1)).length;
  const displayTotalLocations = totalWithLocationsCount > 0 ? totalWithLocationsCount : leads.filter((l) => Boolean(l.location && l.location.trim().length > 1)).length;
  const displayTotalSubjects = totalWithSubjectsCount > 0 ? totalWithSubjectsCount : leads.filter((l) => Boolean((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0))).length;
  const displayTotalComplete = totalCompleteProfilesCount > 0 ? totalCompleteProfilesCount : leads.filter((l) => Boolean(l.name && l.phone && l.location && ((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0)))).length;
  const displayTotalLocationOnly = totalLocationOnlyCount > 0 ? totalLocationOnlyCount : leads.filter((l) => Boolean(l.location && (!l.subjects || l.subjects.length === 0) && (!l.classes || l.classes.length === 0))).length;
  const displayTotalSubjectOnly = totalSubjectOnlyCount > 0 ? totalSubjectOnlyCount : leads.filter((l) => Boolean(((l.subjects && l.subjects.length > 0) || (l.classes && l.classes.length > 0)) && !l.location)).length;
  const displayTotalPhoneOnly = totalPhoneOnlyCount > 0 ? totalPhoneOnlyCount : leads.filter((l) => Boolean(l.phone && !l.location && (!l.subjects || l.subjects.length === 0))).length;
  const totalBothPhoneAndEmail = leads.filter((l) => Boolean(l.phone && l.email)).length;

  // Filtered List based on tab and filters
  const filteredIndexedLeads = leads
    .map((lead, originalIndex) => ({ lead, originalIndex }))
    .filter(({ lead, originalIndex }) => {
      // Tab: DUPLICATES
      if (activeTab === "DUPLICATES") {
        if (!lead.isDuplicate) return false;
      }
      // Tab: READY
      else if (activeTab === "READY") {
        if (manuallyExcludedIds.has(originalIndex)) return false;
        if (excludeDuplicates && lead.isDuplicate) return false;
        if (requireContactMethod && !lead.phone && !lead.email) return false;
        if (requireBothPhoneAndEmail && (!lead.phone || !lead.email)) return false;
      }
      // Tab: COMPLETE (Name + Phone + Location + Subjects)
      else if (activeTab === "COMPLETE") {
        const hasName = Boolean(lead.name && lead.name.trim().length > 1);
        const hasPhone = Boolean(lead.phone);
        const hasLoc = Boolean(lead.location && lead.location.trim().length > 1);
        const hasSub = Boolean((lead.subjects && lead.subjects.length > 0) || (lead.classes && lead.classes.length > 0));
        if (!(hasName && hasPhone && hasLoc && hasSub)) return false;
      }
      // Tab: HAS_PHONE
      else if (activeTab === "HAS_PHONE") {
        if (!lead.phone) return false;
      }
      // Tab: HAS_NAME
      else if (activeTab === "HAS_NAME") {
        if (!lead.name || lead.name.trim().length <= 1) return false;
      }
      // Tab: HAS_LOCATION
      else if (activeTab === "HAS_LOCATION") {
        if (!lead.location || lead.location.trim().length <= 1) return false;
      }
      // Tab: HAS_SUBJECTS
      else if (activeTab === "HAS_SUBJECTS") {
        const hasSub = (lead.subjects && lead.subjects.length > 0) || (lead.classes && lead.classes.length > 0);
        if (!hasSub) return false;
      }
      // Tab: LOCATION_ONLY
      else if (activeTab === "LOCATION_ONLY") {
        const hasLoc = Boolean(lead.location && lead.location.trim().length > 1);
        const hasSub = Boolean((lead.subjects && lead.subjects.length > 0) || (lead.classes && lead.classes.length > 0));
        if (!hasLoc || hasSub) return false;
      }
      // Tab: SUBJECT_ONLY
      else if (activeTab === "SUBJECT_ONLY") {
        const hasLoc = Boolean(lead.location && lead.location.trim().length > 1);
        const hasSub = Boolean((lead.subjects && lead.subjects.length > 0) || (lead.classes && lead.classes.length > 0));
        if (!hasSub || hasLoc) return false;
      }
      // Tab: PHONE_ONLY
      else if (activeTab === "PHONE_ONLY") {
        const hasLoc = Boolean(lead.location && lead.location.trim().length > 1);
        const hasSub = Boolean((lead.subjects && lead.subjects.length > 0) || (lead.classes && lead.classes.length > 0));
        if (!lead.phone || hasLoc || hasSub) return false;
      }
      // Tab: HAS_EMAIL
      else if (activeTab === "HAS_EMAIL") {
        if (!lead.email) return false;
      }
      // Tab: ALL (no exclusion)

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(query);
        const matchPhone = lead.phone?.toLowerCase().includes(query);
        const matchEmail = lead.email?.toLowerCase().includes(query);
        const matchLoc = lead.location?.toLowerCase().includes(query);
        const matchSub = (lead.subjects || []).some((s) => s?.toLowerCase().includes(query));
        const matchClass = (lead.classes || []).some((c) => c?.toLowerCase().includes(query));
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
          <strong className="text-emerald-700 font-extrabold">{displayTotalReady.toLocaleString()} valid leads</strong> have been saved into the CRM database.
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
        <div className="ath-panel p-6 space-y-4">
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
                <h1 className="text-2xl font-800 text-[#0F2540] flex items-center gap-2.5" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Bulk Upload Review
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                    <Sparkles size={12} /> High-Speed Lead Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>Wrong type? Click Parent / Tutor on each row before saving.</span>
                  <span>·</span>
                  <span>Extracted <strong>{displayTotalLeads.toLocaleString()} leads</strong> from <strong>{totalMessages.toLocaleString()} records</strong></span>
                  <span>·</span>
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 inline-flex items-center gap-1">
                    <Phone size={11} /> {displayTotalPhones.toLocaleString()} Phones
                  </span>
                  <span>·</span>
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 inline-flex items-center gap-1">
                    <Users size={11} /> {displayTotalNames.toLocaleString()} Names
                  </span>
                  <span>·</span>
                  <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 inline-flex items-center gap-1">
                    <MapPin size={11} /> {displayTotalLocations.toLocaleString()} Locations
                  </span>
                  <span>·</span>
                  <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 inline-flex items-center gap-1">
                    <BookOpen size={11} /> {displayTotalSubjects.toLocaleString()} Subjects
                  </span>
                  <span>·</span>
                  <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 inline-flex items-center gap-1">
                    <Sparkles size={11} /> {displayTotalComplete.toLocaleString()} Combined Full Data
                  </span>
                  <span>·</span>
                  <span><strong className="text-amber-700">{displayTotalDuplicates.toLocaleString()} duplicates in DB</strong></span>
                  {isPreviewCapped && (
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      (Showing first {leads.length} in fast table view)
                    </span>
                  )}
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
                disabled={isSubmitting || displayTotalReady === 0}
                className="px-7 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Ingesting {displayTotalReady.toLocaleString()} Leads…</>
                ) : (
                  <><CheckCircle2 size={16} /> Confirm &amp; Save All {displayTotalReady.toLocaleString()} Leads</>
                )}
              </button>
            </div>
          </div>

          {/* Comprehensive Data Breakdown Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            {/* 1. Phone Numbers */}
            <div
              onClick={() => setActiveTab("HAS_PHONE")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "HAS_PHONE"
                  ? "bg-blue-100 border-blue-400 ring-2 ring-blue-400/20 shadow-xs"
                  : "bg-blue-50/70 border-blue-200/80 hover:bg-blue-100/60"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Phone size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-blue-700 truncate">Phone Numbers</p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {displayTotalPhones.toLocaleString()}
                  <span className="text-[10px] font-semibold text-slate-500 ml-1 font-normal">
                    ({Math.round((displayTotalPhones / (displayTotalLeads || 1)) * 100)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* 2. Names */}
            <div
              onClick={() => setActiveTab("HAS_NAME")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "HAS_NAME"
                  ? "bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs"
                  : "bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100/60"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-indigo-700 truncate">With Names</p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {displayTotalNames.toLocaleString()}
                  <span className="text-[10px] font-semibold text-slate-500 ml-1 font-normal">
                    ({Math.round((displayTotalNames / (displayTotalLeads || 1)) * 100)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* 3. Locations */}
            <div
              onClick={() => setActiveTab("HAS_LOCATION")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "HAS_LOCATION"
                  ? "bg-teal-100 border-teal-400 ring-2 ring-teal-400/20 shadow-xs"
                  : "bg-teal-50/70 border-teal-200/80 hover:bg-teal-100/60"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MapPin size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-teal-700 truncate">With Location</p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {displayTotalLocations.toLocaleString()}
                  <span className="text-[10px] font-semibold text-slate-500 ml-1 font-normal">
                    ({Math.round((displayTotalLocations / (displayTotalLeads || 1)) * 100)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* 4. Subjects & Classes */}
            <div
              onClick={() => setActiveTab("HAS_SUBJECTS")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "HAS_SUBJECTS"
                  ? "bg-sky-100 border-sky-400 ring-2 ring-sky-400/20 shadow-xs"
                  : "bg-sky-50/70 border-sky-200/80 hover:bg-sky-100/60"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-sky-700 truncate">With Subjects</p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {displayTotalSubjects.toLocaleString()}
                  <span className="text-[10px] font-semibold text-slate-500 ml-1 font-normal">
                    ({Math.round((displayTotalSubjects / (displayTotalLeads || 1)) * 100)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* 5. Complete Combined Data (Full Profile) */}
            <div
              onClick={() => setActiveTab("COMPLETE")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "COMPLETE"
                  ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-800 truncate">Combined Full Data</p>
                <p className="text-base font-black text-emerald-950 leading-tight">
                  {displayTotalComplete.toLocaleString()}
                  <span className="text-[10px] font-bold text-emerald-700 ml-1">
                    (100% Rich)
                  </span>
                </p>
              </div>
            </div>

            {/* 6. DB Duplicates */}
            <div
              onClick={() => setActiveTab("DUPLICATES")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === "DUPLICATES"
                  ? "bg-amber-100 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                  : "bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/60"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-700 truncate">DB Duplicates</p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {displayTotalDuplicates.toLocaleString()}
                  <span className="text-[10px] font-semibold text-amber-700 ml-1 font-normal">
                    (Already in DB)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Simple Tab Switcher + Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
            {/* Direct Tabs with Granular Breakdowns */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab("READY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "READY"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 size={13} /> Ready to Save ({displayTotalReady.toLocaleString()})
              </button>

              <button
                onClick={() => setActiveTab("COMPLETE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "COMPLETE"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <Sparkles size={13} /> Combined Full Data ({displayTotalComplete.toLocaleString()})
              </button>

              <button
                onClick={() => setActiveTab("HAS_NAME")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "HAS_NAME"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                <Users size={12} /> With Name ({displayTotalNames.toLocaleString()})
              </button>

              <button
                onClick={() => setActiveTab("HAS_PHONE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "HAS_PHONE"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                }`}
              >
                <Phone size={12} /> With Phone ({displayTotalPhones.toLocaleString()})
              </button>

              <button
                onClick={() => setActiveTab("HAS_LOCATION")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "HAS_LOCATION"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                }`}
              >
                <MapPin size={12} /> With Location ({displayTotalLocations.toLocaleString()})
              </button>

              <button
                onClick={() => setActiveTab("HAS_SUBJECTS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "HAS_SUBJECTS"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
                }`}
              >
                <BookOpen size={12} /> With Subjects ({displayTotalSubjects.toLocaleString()})
              </button>

              {displayTotalLocationOnly > 0 && (
                <button
                  onClick={() => setActiveTab("LOCATION_ONLY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "LOCATION_ONLY"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <MapPin size={12} /> Location Only ({displayTotalLocationOnly.toLocaleString()})
                </button>
              )}

              {displayTotalSubjectOnly > 0 && (
                <button
                  onClick={() => setActiveTab("SUBJECT_ONLY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "SUBJECT_ONLY"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  <BookOpen size={12} /> Subject Only ({displayTotalSubjectOnly.toLocaleString()})
                </button>
              )}

              {displayTotalPhoneOnly > 0 && (
                <button
                  onClick={() => setActiveTab("PHONE_ONLY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "PHONE_ONLY"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Phone size={12} /> Phone Only ({displayTotalPhoneOnly.toLocaleString()})
                </button>
              )}

              <button
                onClick={() => setActiveTab("HAS_EMAIL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "HAS_EMAIL"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Mail size={12} /> With Email ({displayTotalEmails.toLocaleString()})
              </button>

              {displayTotalDuplicates > 0 && (
                <button
                  onClick={() => setActiveTab("DUPLICATES")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "DUPLICATES"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck size={12} /> In Database ({displayTotalDuplicates.toLocaleString()})
                </button>
              )}

              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Raw ({displayTotalLeads.toLocaleString()})
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
                These <strong>{displayTotalDuplicates.toLocaleString()} leads</strong> match phone numbers or emails already registered in your database.
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
        {activeTab === "READY" && displayTotalReady === 0 && displayTotalDuplicates > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">All {displayTotalDuplicates.toLocaleString()} Leads Already Exist in Your System</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All extracted phone numbers &amp; emails were matched against existing tutors in your database. To prevent duplicates, they are excluded from the upload queue.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab("DUPLICATES")}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-sm"
              >
                Review {displayTotalDuplicates.toLocaleString()} Duplicates →
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
                    <th className="py-3.5 px-4 min-w-[200px]">Contact &amp; type</th>
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
                                    <button
                                      type="button"
                                      title="Click to mark as Tutor"
                                      onClick={() =>
                                        setLeads((prev) =>
                                          prev.map((row, idx) =>
                                            idx === originalIndex ? { ...row, leadType: "TUTOR" } : row
                                          )
                                        )
                                      }
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                                    >
                                      Parent — click to Tutor
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      title="Click to mark as Parent"
                                      onClick={() =>
                                        setLeads((prev) =>
                                          prev.map((row, idx) =>
                                            idx === originalIndex ? { ...row, leadType: "PARENT_LEAD" } : row
                                          )
                                        )
                                      }
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"
                                    >
                                      Tutor — click to Parent
                                    </button>
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

                          {/* Subjects & Classes with Taxonomy Selector */}
                          <td className="py-3.5 px-4 min-w-[280px]">
                            {isEditing ? (
                              <div className="space-y-2 p-2 bg-white border border-blue-200 rounded-xl shadow-xs">
                                {/* Selected Subjects Chips */}
                                <div>
                                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 mb-1 flex items-center gap-1">
                                    <BookOpen size={10} /> Selected Subjects ({editBuffer.subjects?.length ?? 0})
                                  </div>
                                  <div className="flex flex-wrap gap-1 min-h-[26px] p-1 bg-slate-50 border border-slate-200 rounded-md">
                                    {(editBuffer.subjects && editBuffer.subjects.length > 0) ? (
                                      editBuffer.subjects.map((sub) => (
                                        <span
                                          key={sub}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow-xs"
                                        >
                                          {sub}
                                          <button
                                            type="button"
                                            onClick={() => setEditBuffer((b) => ({ ...b, subjects: (b.subjects ?? []).filter((s) => s !== sub) }))}
                                            className="hover:text-rose-200 cursor-pointer ml-0.5 font-black text-xs"
                                          >
                                            ✕
                                          </button>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Click taxonomy subjects below to add</span>
                                    )}
                                  </div>
                                </div>

                                {/* System Taxonomy Quick Toggle Cloud */}
                                <div className="max-h-36 overflow-y-auto space-y-1.5 p-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-left">
                                  {SUBJECT_TAXONOMY.map((group) => (
                                    <div key={group.group}>
                                      <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
                                        {group.group}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {group.subjects.map((sub) => {
                                          const isSelected = (editBuffer.subjects ?? []).includes(sub);
                                          return (
                                            <button
                                              key={sub}
                                              type="button"
                                              onClick={() => {
                                                const cur = editBuffer.subjects ?? [];
                                                const next = isSelected ? cur.filter((x) => x !== sub) : [...cur, sub];
                                                setEditBuffer((b) => ({ ...b, subjects: next }));
                                              }}
                                              className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                                                isSelected
                                                  ? "bg-blue-600 text-white font-bold shadow-xs"
                                                  : "bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                                              }`}
                                            >
                                              {isSelected ? "✓ " : "+ "}{sub}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Selected Classes Chips & Quick Select */}
                                <div className="pt-1 border-t border-slate-100">
                                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 mb-1 flex items-center gap-1">
                                    <GraduationCap size={10} /> Classes / Grades
                                  </div>
                                  <div className="flex flex-wrap gap-1 mb-1.5">
                                    {(editBuffer.classes && editBuffer.classes.length > 0) ? (
                                      editBuffer.classes.map((cls) => (
                                        <span
                                          key={cls}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded shadow-xs"
                                        >
                                          {cls}
                                          <button
                                            type="button"
                                            onClick={() => setEditBuffer((b) => ({ ...b, classes: (b.classes ?? []).filter((c) => c !== cls) }))}
                                            className="hover:text-rose-200 cursor-pointer ml-0.5 font-black text-xs"
                                          >
                                            ✕
                                          </button>
                                        </span>
                                      ))
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {["Nursery / KG", "Class 1 to 5", "Class 6 to 8", "Class 9 to 10", "Class 11 to 12", "Competitive Exams"].map((cls) => {
                                      const isSelected = (editBuffer.classes ?? []).includes(cls);
                                      return (
                                        <button
                                          key={cls}
                                          type="button"
                                          onClick={() => {
                                            const cur = editBuffer.classes ?? [];
                                            const next = isSelected ? cur.filter((c) => c !== cls) : [...cur, cls];
                                            setEditBuffer((b) => ({ ...b, classes: next }));
                                          }}
                                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-purple-700 text-white font-bold shadow-xs"
                                              : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                                          }`}
                                        >
                                          {isSelected ? "✓ " : "+ "}{cls}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {lead.subjects.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {(isSubjectsExpanded ? lead.subjects : lead.subjects.slice(0, 5)).map((s) => (
                                      <span key={s} className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                                        {s}
                                      </span>
                                    ))}
                                    {lead.subjects.length > 5 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandSubjects(originalIndex)}
                                        className="text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                                      >
                                        {isSubjectsExpanded ? "Hide" : `+${lead.subjects.length - 5}`}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {lead.classes.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {(isClassesExpanded ? lead.classes : lead.classes.slice(0, 3)).map((c) => (
                                      <span key={c} className="text-[11px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
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
                disabled={isSubmitting || displayTotalReady === 0}
                className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer ml-auto"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm &amp; Save All {displayTotalReady.toLocaleString()} Leads to CRM
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
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Staff CRM</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>Bulk Upload</h1>
          <p className="text-sm text-slate-600 mt-1 font-600">Paste a WhatsApp export. Gemini extracts contacts — mark each as Tutor or Parent before saving.</p>
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

      <div className="pt-2">
        <button
          onClick={handleParse}
          disabled={isSubmitting || (!rawText.trim() && !uploadedFile)}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-base hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <><Loader2 size={20} className="animate-spin" /> Processing &amp; Structuring Leads…</>
          ) : (
            <><Sparkles size={20} /> Extract &amp; Review Leads →</>
          )}
        </button>
      </div>
    </div>
  );
}
