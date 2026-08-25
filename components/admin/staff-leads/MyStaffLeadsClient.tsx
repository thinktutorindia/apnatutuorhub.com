"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  Phone, PhoneMissed, CheckCircle2, XCircle, RefreshCcw, Clock,
  AlertTriangle, ArrowRight, Search, Loader2, Star, UserCheck,
  CheckSquare, Square, Sparkles, Send, Edit3, Save, X, PhoneCall,
  Calendar, Check, ShieldCheck, MessageCircle, Copy, ChevronDown,
  History, Plus, Tag, Flame, MapPin, Mail, BookOpen, GraduationCap,
  Filter, MoreHorizontal, Activity, Users, BarChart3, TrendingUp,
  Layers, CheckCheck
} from "lucide-react";
import {
  logCallAction,
  updateStaffLeadAction,
  getLeadCallLogsAction,
  bulkUpdateLeadStatusAction,
  promoteLeadToProfileAction,
  bulkPromoteLeadsToProfilesAction,
  getStaffLeadActivityFeedAction,
} from "@/app/actions/staff-leads.actions";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { CLASS_LEVELS, BOARDS } from "@/lib/validations";
import type { StaffLeadStatus, CallOutcome } from "@prisma/client";

export type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  altPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  fullAddress: string | null;
  pincode: string | null;
  qualification: string | null;
  experienceYears: number | null;
  gender: string | null;
  board: string | null;
  subjects: string[];
  classes: string[];
  status: StaffLeadStatus;
  lastContactedAt: string | Date | null;
  nextFollowUpAt: string | Date | null;
  staffNotes: string | null;
  priority: number;
  isPromoted: boolean;
  promotedTutorProfileId: string | null;
  rawText: string | null;
  createdAt: string | Date;
  _count: { callLogs: number };
};

type CallLogItem = {
  id: string;
  outcome: CallOutcome;
  notes: string | null;
  calledAt: Date;
  calledBy: { name: string | null; email: string };
};

type ActivityLogItem = {
  id: string;
  outcome: CallOutcome;
  notes: string | null;
  calledAt: Date | string;
  calledBy: { id: string; name: string | null; email: string; subAdminRole: string | null };
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    subjects: string[];
    status: StaffLeadStatus;
    isPromoted: boolean;
  };
};

const POPULAR_LOCATIONS = [
  "South Delhi", "Karol Bagh", "Laxmi Nagar", "Rohini",
  "Dwarka", "Janakpuri", "Noida", "Gurgaon", "Ghaziabad", "Faridabad", "Pitampura", "Saket"
];

const POPULAR_SUBJECTS_PRESETS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Science",
  "English", "Social Studies", "Economics", "Accountancy", "Business Studies",
  "Computer Science", "Hindi", "Sanskrit", "All Primary Subjects"
];

const QUICK_CLASS_PRESETS = [
  { label: "Class 1-5", items: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"] },
  { label: "Class 6-8", items: ["Class 6", "Class 7", "Class 8"] },
  { label: "Class 9-10", items: ["Class 9", "Class 10"] },
  { label: "Class 11-12", items: ["Class 11", "Class 12"] },
  { label: "IIT-JEE / NEET", items: ["IIT-JEE", "NEET"] },
];

const QUICK_OUTCOMES: { outcome: CallOutcome; label: string; icon: React.ReactNode; cls: string }[] = [
  { outcome: "ANSWERED", label: "Answered", icon: <CheckCircle2 size={12} />, cls: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200" },
  { outcome: "NO_ANSWER", label: "No Answer", icon: <PhoneMissed size={12} />, cls: "bg-orange-50 text-orange-800 hover:bg-orange-100 border-orange-200" },
  { outcome: "CALLBACK_REQUESTED", label: "Callback", icon: <RefreshCcw size={12} />, cls: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200" },
  { outcome: "NOT_INTERESTED", label: "Not Int.", icon: <XCircle size={12} />, cls: "bg-red-50 text-red-800 hover:bg-red-100 border-red-200" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  NEW: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", label: "New Lead" },
  ASSIGNED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Assigned" },
  CONTACTED: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", label: "Contacted" },
  FOLLOW_UP: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", label: "Follow-Up Due" },
  INTERESTED: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", label: "Interested 🔥" },
  NOT_INTERESTED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Not Interested" },
  NO_ANSWER: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", label: "No Answer" },
  CONVERTED: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", label: "Converted ✓" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejected" },
  DUPLICATE: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "Duplicate" },
};

export function MyStaffLeadsClient({
  leads: initialLeads,
  isSuperAdmin = false,
}: {
  leads: Lead[];
  isSuperAdmin?: boolean;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeMainView, setActiveMainView] = useState<"QUEUE" | "ACTIVITY">("QUEUE");

  // Queue View State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DUE" | "UNPROMOTED" | "INTERESTED" | "CONVERTED">("ALL");
  const [sortBy, setSortBy] = useState<"FOLLOW_UP" | "NEWEST" | "NAME" | "CALLS">("FOLLOW_UP");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Modal State (with full platform system: SubjectPicker, class taxonomy, location presets)
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [editCustomSubject, setEditCustomSubject] = useState("");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Detailed Call Log Modal State
  const [logCallLead, setLogCallLead] = useState<Lead | null>(null);
  const [detailedOutcome, setDetailedOutcome] = useState<CallOutcome>("ANSWERED");
  const [detailedNotes, setDetailedNotes] = useState("");
  const [detailedFollowUpDate, setDetailedFollowUpDate] = useState("");

  // History Drawer State
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [callHistoryLogs, setCallHistoryLogs] = useState<CallLogItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Daily & Historical Activity View State
  const [activityPeriod, setActivityPeriod] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");
  const [activityStaffFilter, setActivityStaffFilter] = useState<string>("all");
  const [activityOutcomeFilter, setActivityOutcomeFilter] = useState<string>("all");
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [activitySummary, setActivitySummary] = useState({
    totalCalls: 0,
    answered: 0,
    callbacks: 0,
    interested: 0,
    converted: 0,
    noAnswer: 0,
  });
  const [staffSummaryList, setStaffSummaryList] = useState<any[]>([]);
  const [allStaffList, setAllStaffList] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [, startTransition] = useTransition();

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fetch Activity Feed
  const fetchActivityFeed = async (
    period = activityPeriod,
    staffId = activityStaffFilter,
    outcome = activityOutcomeFilter
  ) => {
    setLoadingActivity(true);
    const res = await getStaffLeadActivityFeedAction({
      period,
      staffId: staffId === "all" ? undefined : staffId,
      outcome: outcome === "all" ? undefined : outcome,
    });
    if (res.success && res.data) {
      setActivityLogs(res.data.logs as any);
      setActivitySummary(res.data.summary);
      setStaffSummaryList(res.data.staffSummary);
      setAllStaffList(res.data.allStaff);
    }
    setLoadingActivity(false);
  };

  useEffect(() => {
    if (activeMainView === "ACTIVITY") {
      fetchActivityFeed(activityPeriod, activityStaffFilter, activityOutcomeFilter);
    }
  }, [activeMainView, activityPeriod, activityStaffFilter, activityOutcomeFilter]);

  // 1. Filter and Sort Queue
  const filtered = leads.filter((l) => {
    if (activeTab === "DUE") {
      if (!l.nextFollowUpAt) return false;
      return new Date(l.nextFollowUpAt) <= new Date();
    }
    if (activeTab === "UNPROMOTED") {
      if (l.isPromoted || l.status === "CONVERTED") return false;
    }
    if (activeTab === "INTERESTED") {
      if (l.status !== "INTERESTED") return false;
    }
    if (activeTab === "CONVERTED") {
      if (!l.isPromoted && l.status !== "CONVERTED") return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.altPhone?.includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      l.qualification?.toLowerCase().includes(q) ||
      l.subjects.some((s) => s.toLowerCase().includes(q)) ||
      l.classes.some((c) => c.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "FOLLOW_UP") {
      if (!a.nextFollowUpAt && !b.nextFollowUpAt) return 0;
      if (!a.nextFollowUpAt) return 1;
      if (!b.nextFollowUpAt) return -1;
      return new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime();
    }
    if (sortBy === "NEWEST") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "NAME") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "CALLS") {
      return b._count.callLogs - a._count.callLogs;
    }
    return 0;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((l) => l.id)));
    }
  };

  // 2. Quick Log Call
  const handleQuickLog = (leadId: string, outcome: CallOutcome) => {
    setPendingLeadId(leadId);
    startTransition(async () => {
      const res = await logCallAction(leadId, outcome, `Quick logged as ${outcome}`, null);
      if (res.success) {
        const statusMap: Record<CallOutcome, StaffLeadStatus> = {
          ANSWERED: "CONTACTED",
          NO_ANSWER: "NO_ANSWER",
          BUSY: "NO_ANSWER",
          WRONG_NUMBER: "REJECTED",
          CALLBACK_REQUESTED: "FOLLOW_UP",
          CONVERTED: "CONVERTED",
          NOT_INTERESTED: "NOT_INTERESTED",
        };
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status: statusMap[outcome],
                  lastContactedAt: new Date().toISOString(),
                  _count: { callLogs: l._count.callLogs + 1 },
                }
              : l
          )
        );
        showMsg("success", `✓ Call outcome "${outcome}" logged!`);
      } else {
        showMsg("error", res.error ?? "Failed to log call");
      }
      setPendingLeadId(null);
    });
  };

  // 3. Save Detailed Call Log
  const handleSaveDetailedCallLog = () => {
    if (!logCallLead) return;
    const leadId = logCallLead.id;
    setPendingLeadId(leadId);

    startTransition(async () => {
      const followUpDate = detailedFollowUpDate ? new Date(detailedFollowUpDate).toISOString() : null;
      const res = await logCallAction(leadId, detailedOutcome, detailedNotes, followUpDate);

      if (res.success) {
        const statusMap: Record<CallOutcome, StaffLeadStatus> = {
          ANSWERED: "CONTACTED",
          NO_ANSWER: "NO_ANSWER",
          BUSY: "NO_ANSWER",
          WRONG_NUMBER: "REJECTED",
          CALLBACK_REQUESTED: "FOLLOW_UP",
          CONVERTED: "CONVERTED",
          NOT_INTERESTED: "NOT_INTERESTED",
        };
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status: statusMap[detailedOutcome],
                  lastContactedAt: new Date().toISOString(),
                  nextFollowUpAt: followUpDate ?? l.nextFollowUpAt,
                  staffNotes: detailedNotes || l.staffNotes,
                  _count: { callLogs: l._count.callLogs + 1 },
                }
              : l
          )
        );
        showMsg("success", "✓ Detailed call log saved!");
        setLogCallLead(null);
        setDetailedNotes("");
        setDetailedFollowUpDate("");
      } else {
        showMsg("error", res.error ?? "Failed to save call log");
      }
      setPendingLeadId(null);
    });
  };

  // 4. Save Edit Lead Modal (Unified with system taxonomy)
  const handleSaveEdit = () => {
    if (!editingLead) return;
    setPendingLeadId(editingLead.id);

    startTransition(async () => {
      const res = await updateStaffLeadAction(editingLead.id, {
        name: editForm.name,
        phone: editForm.phone,
        altPhone: editForm.altPhone,
        whatsapp: editForm.whatsapp,
        email: editForm.email,
        location: editForm.location,
        fullAddress: editForm.fullAddress,
        pincode: editForm.pincode,
        qualification: editForm.qualification,
        experienceYears: editForm.experienceYears ? Number(editForm.experienceYears) : null,
        gender: editForm.gender,
        board: editForm.board,
        subjects: editForm.subjects,
        classes: editForm.classes,
        status: editForm.status,
        staffNotes: editForm.staffNotes,
        priority: editForm.priority,
        nextFollowUpAt: editForm.nextFollowUpAt,
      });

      if (res.success && res.data) {
        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? { ...l, ...res.data!.lead } : l))
        );
        showMsg("success", "✓ Lead profile updated successfully!");
        setEditingLead(null);
      } else {
        showMsg("error", res.error ?? "Failed to update lead");
      }
      setPendingLeadId(null);
    });
  };

  // Helper: Toggle Subject in Edit Form
  const toggleEditSubject = (subj: string) => {
    const current = editForm.subjects || [];
    if (current.includes(subj)) {
      setEditForm({ ...editForm, subjects: current.filter((s) => s !== subj) });
    } else {
      setEditForm({ ...editForm, subjects: [...current, subj] });
    }
  };

  const addCustomEditSubject = () => {
    const s = editCustomSubject.trim();
    if (!s) return;
    const current = editForm.subjects || [];
    if (!current.includes(s)) {
      setEditForm({ ...editForm, subjects: [...current, s] });
    }
    setEditCustomSubject("");
  };

  // Helper: Toggle Class in Edit Form
  const toggleEditClass = (cls: string) => {
    const current = editForm.classes || [];
    if (current.includes(cls)) {
      setEditForm({ ...editForm, classes: current.filter((c) => c !== cls) });
    } else {
      setEditForm({ ...editForm, classes: [...current, cls] });
    }
  };

  const addClassGroup = (items: string[]) => {
    const current = new Set(editForm.classes || []);
    items.forEach((c) => current.add(c));
    setEditForm({ ...editForm, classes: Array.from(current) });
  };

  // 5. Open Call History
  const handleOpenHistory = async (lead: Lead) => {
    setHistoryLead(lead);
    setLoadingHistory(true);
    const res = await getLeadCallLogsAction(lead.id);
    if (res.success && res.data) {
      setCallHistoryLogs(res.data.callLogs);
    } else {
      setCallHistoryLogs([]);
    }
    setLoadingHistory(false);
  };

  // 6. Promote Single Lead (One-by-One)
  const handlePromoteSingle = (leadId: string) => {
    setPendingLeadId(leadId);
    startTransition(async () => {
      const res = await promoteLeadToProfileAction(leadId);
      if (res.success && res.data) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  isPromoted: true,
                  status: "CONVERTED",
                  promotedTutorProfileId: res.data!.tutorProfileId,
                }
              : l
          )
        );
        showMsg("success", "✓ Lead moved to Primary Tutor Profiles!");
      } else {
        showMsg("error", res.error ?? "Failed to promote lead");
      }
      setPendingLeadId(null);
    });
  };

  // 7. Bulk Promote Selected Leads
  const handleBulkPromote = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setPendingLeadId("bulk");

    startTransition(async () => {
      const res = await bulkPromoteLeadsToProfilesAction(ids);
      if (res.success && res.data) {
        setLeads((prev) =>
          prev.map((l) =>
            ids.includes(l.id)
              ? { ...l, isPromoted: true, status: "CONVERTED" }
              : l
          )
        );
        setSelectedIds(new Set());
        showMsg(
          "success",
          `✓ Successfully moved ${res.data.promotedCount} leads to Primary Tutor Profiles!`
        );
      } else {
        showMsg("error", res.error ?? "Failed to move leads");
      }
      setPendingLeadId(null);
    });
  };

  const dueCount = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= new Date()).length;
  const interestedCount = leads.filter((l) => l.status === "INTERESTED").length;
  const convertedCount = leads.filter((l) => l.isPromoted || l.status === "CONVERTED").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Top Header & Mode Switcher ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Staff Portal · CRM
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {leads.length} Assigned Leads Queue
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff CRM Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log daily calls, edit tutor details with full taxonomy, schedule follow-ups, and track all team activities.
          </p>
        </div>

        {/* View Toggle (Queue vs Daily Activity) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMainView("QUEUE")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeMainView === "QUEUE"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={14} className={activeMainView === "QUEUE" ? "text-emerald-600" : ""} />
            My Leads Queue ({leads.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView("ACTIVITY")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeMainView === "ACTIVITY"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity size={14} className={activeMainView === "ACTIVITY" ? "text-blue-600" : ""} />
            Daily Activity & Logs
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          VIEW 1: MY ASSIGNED LEADS QUEUE
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {activeMainView === "QUEUE" && (
        <div className="space-y-4">
          {/* Queue Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Assigned ({leads.length})
              </button>

              {dueCount > 0 && (
                <button
                  onClick={() => setActiveTab("DUE")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "DUE"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <Clock size={12} /> Due Now ({dueCount})
                </button>
              )}

              <button
                onClick={() => setActiveTab("UNPROMOTED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === "UNPROMOTED"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Active Queue ({leads.length - convertedCount})
              </button>

              {interestedCount > 0 && (
                <button
                  onClick={() => setActiveTab("INTERESTED")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "INTERESTED"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <Flame size={12} className="text-orange-500" /> Interested ({interestedCount})
                </button>
              )}

              <button
                onClick={() => setActiveTab("CONVERTED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "CONVERTED"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 size={12} /> Converted ({convertedCount})
              </button>
            </div>

            {/* Search & Bulk Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {sorted.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedIds.size === sorted.length ? (
                    <>
                      <CheckSquare size={13} className="text-emerald-600" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square size={13} className="text-slate-400" /> Select All ({sorted.length})
                    </>
                  )}
                </button>
              )}

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkPromote}
                  disabled={pendingLeadId === "bulk"}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {pendingLeadId === "bulk" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Move {selectedIds.size} to Primary →
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-3.5">
            {sorted.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 space-y-3">
                <UserCheck size={44} className="mx-auto text-slate-300" />
                <h3 className="font-extrabold text-base text-slate-800">No leads found in this queue</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You are all caught up! New leads assigned by Super Admin will appear here automatically.
                </p>
              </div>
            ) : (
              sorted.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const isLeadPending = pendingLeadId === lead.id;
                const statusStyle = STATUS_STYLES[lead.status] ?? STATUS_STYLES.NEW;
                const isDue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date();

                const waText = encodeURIComponent(
                  `Hello ${lead.name || "Tutor"}, greetings from ApnaTutorHub! We are currently assigning home & online tuitions for ${
                    lead.subjects.length ? lead.subjects.slice(0, 2).join(", ") : "students"
                  } in ${lead.location || "your area"}. Are you available to accept new students this week?`
                );

                return (
                  <div
                    key={lead.id}
                    className={`bg-white border rounded-3xl p-5 shadow-xs transition-all ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/10"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-[300px]">
                        <button
                          type="button"
                          onClick={() => toggleSelect(lead.id)}
                          className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={19} className="text-emerald-600" />
                          ) : (
                            <Square size={19} className="text-slate-300 hover:text-slate-400" />
                          )}
                        </button>

                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-base">
                              {lead.name ?? <span className="text-slate-400 italic">Unknown Tutor</span>}
                            </h3>

                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              {statusStyle.label}
                            </span>

                            {isDue && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                                <Clock size={10} /> Follow-Up Due
                              </span>
                            )}

                            {lead.isPromoted && (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <ShieldCheck size={11} className="text-emerald-600" /> Primary Tutor Active
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenHistory(lead)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={11} /> {lead._count.callLogs} call{lead._count.callLogs === 1 ? "" : "s"}
                            </button>
                          </div>

                          {/* Contact Details */}
                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            {lead.phone ? (
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                                <a
                                  href={`tel:+91${lead.phone}`}
                                  className="font-mono font-black text-emerald-800 hover:underline flex items-center gap-1"
                                >
                                  <Phone size={12} className="text-emerald-600" /> +91 {lead.phone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(lead.phone!, `phone-${lead.id}`)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                                  title="Copy Phone"
                                >
                                  {copiedField === `phone-${lead.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                                </button>
                              </div>
                            ) : null}

                            {lead.phone && (
                              <a
                                href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <MessageCircle size={12} /> WhatsApp
                              </a>
                            )}

                            {lead.email && (
                              <div className="flex items-center gap-1 text-slate-600 font-medium">
                                <Mail size={12} className="text-slate-400" />
                                <span>{lead.email}</span>
                              </div>
                            )}

                            {lead.location && (
                              <div className="flex items-center gap-1 text-slate-600 font-medium">
                                <MapPin size={12} className="text-slate-400" />
                                <span>{lead.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Subjects & Classes Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {lead.qualification && (
                              <span className="text-[11px] font-extrabold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                🎓 {lead.qualification} {lead.experienceYears ? `· ${lead.experienceYears}y exp` : ""}
                              </span>
                            )}

                            {lead.gender && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                {lead.gender}
                              </span>
                            )}

                            {lead.subjects.slice(0, 4).map((s) => (
                              <span key={s} className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">
                                {s}
                              </span>
                            ))}
                            {lead.subjects.length > 4 && (
                              <span className="text-[10px] font-bold text-slate-400">+{lead.subjects.length - 4} more</span>
                            )}

                            {lead.classes.slice(0, 3).map((c) => (
                              <span key={c} className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg">
                                {c}
                              </span>
                            ))}
                          </div>

                          {lead.staffNotes && (
                            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 italic">
                              "{lead.staffNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Standard Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLead(lead);
                              setEditForm({ ...lead });
                            }}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} className="text-slate-500" /> Edit Details
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setLogCallLead(lead);
                              setDetailedOutcome("ANSWERED");
                              setDetailedNotes(lead.staffNotes || "");
                            }}
                            className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <PhoneCall size={13} /> Detailed Call Log
                          </button>

                          {!lead.isPromoted && lead.status !== "CONVERTED" ? (
                            <button
                              type="button"
                              onClick={() => handlePromoteSingle(lead.id)}
                              disabled={isLeadPending}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isLeadPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                              Move to Primary ✓
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" /> Primary Active
                            </span>
                          )}
                        </div>

                        {/* Quick Outcome Logs */}
                        <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Quick Log:</span>
                          {QUICK_OUTCOMES.map(({ outcome, label, icon, cls }) => (
                            <button
                              key={outcome}
                              type="button"
                              onClick={() => handleQuickLog(lead.id, outcome)}
                              disabled={isLeadPending}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-50 ${cls}`}
                            >
                              {icon}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          VIEW 2: STAFF DAILY ACTIVITY LOGS & PERFORMANCE DASHBOARD
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {activeMainView === "ACTIVITY" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Controls & Period Selector */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
            {/* Period Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "week", label: "This Week (7d)" },
                { key: "month", label: "This Month (30d)" },
                { key: "all", label: "All Time" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActivityPeriod(p.key as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activityPeriod === p.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Staff Member & Outcome Filter Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap">
              {isSuperAdmin && (
                <select
                  value={activityStaffFilter}
                  onChange={(e) => setActivityStaffFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">👥 All Staff Members</option>
                  {allStaffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={activityOutcomeFilter}
                onChange={(e) => setActivityOutcomeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">🎯 All Outcomes</option>
                <option value="ANSWERED">Answered</option>
                <option value="CALLBACK_REQUESTED">Callback Requested</option>
                <option value="CONVERTED">Converted / Ready</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>

              <button
                type="button"
                onClick={() => fetchActivityFeed()}
                disabled={loadingActivity}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Refresh Activity"
              >
                <RefreshCcw size={14} className={loadingActivity ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Total Calls</span>
                <PhoneCall size={14} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{activitySummary.totalCalls}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">In selected period</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Answered</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{activitySummary.answered}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Tutors spoken with</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Callbacks</span>
                <RefreshCcw size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-700">{activitySummary.callbacks}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Scheduled follow-ups</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Interested</span>
                <Flame size={14} className="text-orange-500" />
              </div>
              <div className="text-2xl font-black text-orange-700">{activitySummary.interested}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Hot tutor leads</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Converted</span>
                <Star size={14} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-700">{activitySummary.converted}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Moved to primary</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-extrabold uppercase">No Answer</span>
                <PhoneMissed size={14} className="text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-700">{activitySummary.noAnswer}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Unreachable / busy</div>
            </div>
          </div>

          {/* Staff Breakdown Leaderboard Table (Super Admin Only) */}
          {isSuperAdmin && staffSummaryList.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Team Staff Performance Summary</h3>
                  <p className="text-xs text-slate-400">Calls logged and tutor conversions across all sub-admin staff members.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-5">Staff Member</th>
                      <th className="py-3 px-5">Department</th>
                      <th className="py-3 px-5 text-center">Calls in Period</th>
                      <th className="py-3 px-5 text-center">Answered</th>
                      <th className="py-3 px-5 text-center">Converted</th>
                      <th className="py-3 px-5 text-right">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {staffSummaryList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {s.name || s.email}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                            {s.subAdminRole || "Staff"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-black text-slate-900">
                          {s.totalCalls}
                        </td>
                        <td className="py-3.5 px-5 text-center text-emerald-700 font-bold">
                          {s.answered}
                        </td>
                        <td className="py-3.5 px-5 text-center text-purple-700 font-black">
                          {s.converted}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-400 text-[11px]">
                          {s.lastActive
                            ? new Date(s.lastActive).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                            : "No activity yet"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chronological Activity Feed Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Live Activity & Discussion Logs</h3>
                <p className="text-xs text-slate-400">Detailed records of calls made, notes taken, and outcomes logged.</p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {activityLogs.length} logs recorded
              </span>
            </div>

            {loadingActivity ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">Loading activity feed...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Activity size={36} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No activity logged for this period</p>
                <p className="text-xs text-slate-400">Start logging calls in the Assigned Queue to populate this feed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all flex items-start justify-between gap-4 flex-wrap"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">
                          {item.lead.name || "Tutor Lead"}
                        </span>
                        {item.lead.phone && (
                          <span className="font-mono text-xs text-slate-500 font-bold">
                            (+91 {item.lead.phone})
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-black text-slate-800">
                          {item.outcome}
                        </span>
                        {item.lead.isPromoted && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            ✓ Primary Tutor
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                          "{item.notes}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
                        <span>
                          Handled by: <strong className="text-slate-600">{item.calledBy.name || item.calledBy.email}</strong> ({item.calledBy.subAdminRole || "Staff"})
                        </span>
                        {item.lead.location && (
                          <span>· Area: <strong className="text-slate-600">{item.lead.location}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-bold text-slate-400">
                      {new Date(item.calledAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          UNIFIED ADVANCED EDIT LEAD MODAL (With SubjectPicker, Classes, Location presets)
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Edit Tutor Profile Details</h2>
                <p className="text-xs text-slate-400">
                  Update taxonomy, subjects, location, contact, qualification, and staff follow-up schedule.
                </p>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Section 1: Basic Contact & Personal Info */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">1. Contact & Personal Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="e.g. Deepika Arora"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="e.g. 9811223344"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp / Alt Phone</label>
                    <input
                      type="text"
                      value={editForm.altPhone || ""}
                      onChange={(e) => setEditForm({ ...editForm, altPhone: e.target.value })}
                      placeholder="e.g. 9811998877"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="e.g. tutor@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={editForm.gender || ""}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Highest Qualification</label>
                    <input
                      type="text"
                      value={editForm.qualification || ""}
                      onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                      placeholder="e.g. M.Sc. Mathematics, B.Ed"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Teaching Experience (Years)</label>
                    <input
                      type="number"
                      value={editForm.experienceYears ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 4"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Board Specialization</label>
                    <select
                      value={editForm.board || ""}
                      onChange={(e) => setEditForm({ ...editForm, board: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                    >
                      <option value="">Any / All Boards</option>
                      {BOARDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Location & Address */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">2. Location & Area</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Primary Area / City</label>
                    <input
                      type="text"
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="e.g. Karol Bagh, South Delhi"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    {/* Quick Popular Location Presets */}
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">Presets:</span>
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, location: loc })}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={editForm.pincode || ""}
                      onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                      placeholder="e.g. 110005"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Full Detailed Address</label>
                    <input
                      type="text"
                      value={editForm.fullAddress || ""}
                      onChange={(e) => setEditForm({ ...editForm, fullAddress: e.target.value })}
                      placeholder="e.g. Flat 302, Pocket B, Janakpuri, New Delhi"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Teaching Subjects Taxonomy */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                    3. Teaching Subjects ({(editForm.subjects || []).length} Selected)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSubjectPicker(!showSubjectPicker)}
                    className="text-[11px] font-black text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen size={12} /> {showSubjectPicker ? "Hide Taxonomy Tree" : "Open Full Subject Taxonomy Tree"}
                  </button>
                </div>

                {/* Selected Subjects Tag Cloud */}
                <div className="flex items-center gap-1.5 flex-wrap min-h-[32px] p-2.5 bg-white border border-slate-200 rounded-xl">
                  {(editForm.subjects || []).length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">No subjects selected yet. Click presets or browse below.</span>
                  ) : (
                    (editForm.subjects || []).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => toggleEditSubject(s)}
                          className="text-blue-400 hover:text-blue-800 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick Subject Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Popular Presets:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {POPULAR_SUBJECTS_PRESETS.map((p) => {
                      const isPicked = (editForm.subjects || []).includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleEditSubject(p)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isPicked
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isPicked ? "✓ " : "+ "}
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Subject Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editCustomSubject}
                    onChange={(e) => setEditCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomEditSubject())}
                    placeholder="Type custom subject & press Enter (e.g. Vedic Maths, French)..."
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomEditSubject}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Full Subject Taxonomy Picker */}
                {showSubjectPicker && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <SubjectPicker
                      value={editForm.subjects || []}
                      onChange={(subjects) => setEditForm({ ...editForm, subjects })}
                      hintText="Browse full subject taxonomy or search to select."
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Classes & Grades */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                  4. Classes / Grades ({(editForm.classes || []).length} Selected)
                </h4>

                {/* Quick Class Group Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Quick Groups:</span>
                  {QUICK_CLASS_PRESETS.map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => addClassGroup(g.items)}
                      className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-purple-700 hover:bg-purple-50 cursor-pointer"
                    >
                      + {g.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, classes: Array.from(CLASS_LEVELS) })}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, classes: [] })}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Individual Class Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {CLASS_LEVELS.map((cls) => {
                    const isSelected = (editForm.classes || []).includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleEditClass(cls)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected ? "✓ " : ""}
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Staff Status & Follow-Up Notes */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">5. Lead Status & Follow-Up Notes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lead Status</label>
                    <select
                      value={editForm.status || "NEW"}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StaffLeadStatus })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer font-bold"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="FOLLOW_UP">Follow-Up Due</option>
                      <option value="INTERESTED">Interested 🔥</option>
                      <option value="NOT_INTERESTED">Not Interested</option>
                      <option value="NO_ANSWER">No Answer</option>
                      <option value="CONVERTED">Converted ✓</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Next Follow-Up Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.nextFollowUpAt ? new Date(editForm.nextFollowUpAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setEditForm({ ...editForm, nextFollowUpAt: e.target.value ? new Date(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Internal Discussion Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.staffNotes || ""}
                      onChange={(e) => setEditForm({ ...editForm, staffNotes: e.target.value })}
                      placeholder="Add discussion points, fees expected, timings, etc..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={pendingLeadId === editingLead.id}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {pendingLeadId === editingLead.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          DETAILED CALL LOG MODAL
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {logCallLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Log Call: {logCallLead.name || "Tutor"}
                </h2>
                <p className="text-xs text-slate-400 font-mono">+91 {logCallLead.phone}</p>
              </div>
              <button
                onClick={() => setLogCallLead(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Call Outcome</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { outcome: "ANSWERED", label: "Answered & Discussed", icon: <CheckCircle2 size={13} /> },
                  { outcome: "CALLBACK_REQUESTED", label: "Callback Requested", icon: <RefreshCcw size={13} /> },
                  { outcome: "NO_ANSWER", label: "No Answer / Ringing", icon: <PhoneMissed size={13} /> },
                  { outcome: "BUSY", label: "Busy / Call Waiting", icon: <PhoneCall size={13} /> },
                  { outcome: "NOT_INTERESTED", label: "Not Interested", icon: <XCircle size={13} /> },
                  { outcome: "CONVERTED", label: "Ready to Join / Converted", icon: <Star size={13} /> },
                ].map((o) => (
                  <button
                    key={o.outcome}
                    type="button"
                    onClick={() => setDetailedOutcome(o.outcome as CallOutcome)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      detailedOutcome === o.outcome
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Call Notes / Discussion Summary</label>
              <textarea
                rows={3}
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value)}
                placeholder="e.g. Teacher is available from 4 PM to 8 PM in Laxmi Nagar. Wants 700/hr for class 10 Maths."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Schedule Next Follow-Up Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={detailedFollowUpDate}
                onChange={(e) => setDetailedFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setLogCallLead(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDetailedCallLog}
                disabled={pendingLeadId === logCallLead.id}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {pendingLeadId === logCallLead.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Log Call & Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          CALL HISTORY TIMELINE MODAL
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {historyLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Call History: {historyLead.name || "Tutor"}
                </h2>
                <p className="text-xs text-slate-400 font-mono">+91 {historyLead.phone}</p>
              </div>
              <button
                onClick={() => setHistoryLead(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">Loading previous call logs...</p>
              </div>
            ) : callHistoryLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <History size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No calls logged yet</p>
                <p className="text-[11px] text-slate-400">Use the quick outcome buttons on the card to record calls.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callHistoryLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                        {log.outcome}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(log.calledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-slate-700 italic bg-white p-2 rounded-xl border border-slate-100">
                        "{log.notes}"
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold">
                      Called by: {log.calledBy.name || log.calledBy.email}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t text-right">
              <button
                type="button"
                onClick={() => setHistoryLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
