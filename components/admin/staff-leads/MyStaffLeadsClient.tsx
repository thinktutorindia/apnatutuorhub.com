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
  Layers, CheckCheck, Zap, Target, Award, FastForward, Volume2
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
import { LocationSearchInput, type LocationResult } from "@/components/ui/LocationSearchInput";
import { BOARDS, classesFromTaxonomySubjects } from "@/lib/validations";
import type { StaffLeadStatus, CallOutcome } from "@prisma/client";
import { StaffLeadTypeControl } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { getStaffRecordType, staffNotesWithoutTypeTags } from "@/lib/staff-lead-type";
import { getStaffNextStep } from "@/components/admin/staff-leads/StaffLeadWorkPlan";
import { StaffCrmPlaybook } from "@/components/admin/staff-leads/StaffCrmPlaybook";
import { CreateLeadModal } from "@/components/admin/CreateLeadModal";

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
  staffNotes: string | null;
  priority: number;
  nextFollowUpAt: string | Date | null;
  lastContactedAt: string | Date | null;
  isPromoted: boolean;
  promotedTutorProfileId: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  rawText?: string | null;
  assignedTo?: {
    id?: string;
    name: string | null;
    email?: string;
  } | null;
  _count: {
    callLogs: number;
    followUpReminders?: number;
  };
};

type CallLogItem = {
  id: string;
  outcome: CallOutcome | string;
  notes: string | null;
  calledAt: string | Date;
  calledBy: {
    id?: string;
    name: string | null;
    email: string;
  };
};

type ActivityLogItem = {
  id: string;
  outcome: string;
  notes: string | null;
  calledAt: string | Date;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    isPromoted: boolean;
  };
  calledBy: {
    id: string;
    name: string | null;
    email: string;
    subAdminRole: string | null;
  };
};

const POPULAR_LOCATIONS = [
  "South Delhi", "Karol Bagh", "Laxmi Nagar", "Rohini",
  "Dwarka", "Janakpuri", "Noida", "Gurgaon", "Ghaziabad", "Faridabad", "Pitampura", "Saket"
];

const QUICK_OUTCOMES: Array<{ outcome: CallOutcome; label: string; icon: string; cls: string }> = [
  { outcome: "ANSWERED", label: "Answered", icon: "✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { outcome: "CALLBACK_REQUESTED", label: "Callback", icon: "⏰", cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { outcome: "NO_ANSWER", label: "No Answer", icon: "📵", cls: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { outcome: "BUSY", label: "Busy", icon: "⏳", cls: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200" },
  { outcome: "NOT_INTERESTED", label: "Not Int.", icon: "✕", cls: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  NEW: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "New Lead" },
  ASSIGNED: { bg: "bg-[#E8F7F0]", text: "text-[#0F2540]", border: "border-emerald-200", label: "Assigned" },
  CONTACTED: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Contacted" },
  FOLLOW_UP: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", label: "Follow-Up Due" },
  INTERESTED: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", label: "Interested 🔥" },
  NOT_INTERESTED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Not Interested" },
  NO_ANSWER: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", label: "No Answer" },
  CONVERTED: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", label: "Converted ✓" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejected" },
  DUPLICATE: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "Duplicate" },
};

export type QueueTab =
  | "ALL"
  | "WORKED_TODAY"
  | "PENDING_LEFT"
  | "DUE"
  | "UPCOMING_TODAY"
  | "WORKED_YESTERDAY"
  | "FRESH_NEW"
  | "CALLBACKS"
  | "INTERESTED"
  | "NO_ANSWER"
  | "CONVERTED";

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
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TUTOR" | "PARENT">("ALL");
  const [sortBy, setSortBy] = useState<"FOLLOW_UP" | "NEWEST" | "NAME" | "CALLS">("FOLLOW_UP");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fast Power Dialer State (Speed Mode)
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [powerDialIndex, setPowerDialIndex] = useState(0);
  const [powerDialNotes, setPowerDialNotes] = useState("");
  const [powerDialFollowUp, setPowerDialFollowUp] = useState("");

  // Fast Follow-Up Modal State
  const [fastFollowUpLead, setFastFollowUpLead] = useState<Lead | null>(null);
  const [fastFollowUpDate, setFastFollowUpDate] = useState("");
  const [fastFollowUpNote, setFastFollowUpNote] = useState("");

  // Live Timer Tick for Real-time relative updates & Audio Chime
  const [nowTick, setNowTick] = useState(Date.now());
  const [lastChimedCount, setLastChimedCount] = useState(0);

  // Edit Modal State (with full platform system: SubjectPicker, class taxonomy, location presets)
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

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

  // Periodic Timer Tick for Real-Time Follow-up Countdowns (every 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Synthesizer Chime for Follow-up Notifications
  const playFollowUpChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore if user hasn't interacted yet
    }
  };

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper: Relative Follow-Up Time Badge
  const getFollowUpBadge = (nextFollowUpAt: string | Date | null) => {
    if (!nextFollowUpAt) return null;
    const dt = new Date(nextFollowUpAt);
    const diffMs = dt.getTime() - nowTick;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      const overdueMins = Math.abs(diffMins);
      const text = overdueMins < 60 ? `${overdueMins}m ago` : `${Math.floor(overdueMins / 60)}h ${overdueMins % 60}m ago`;
      return {
        label: `🚨 Overdue (${text})`,
        isOverdue: true,
        isDueNow: true,
        cls: "bg-rose-600 text-white font-black animate-pulse shadow-xs border border-rose-700",
        timeStr: dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        dateStr: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      };
    } else if (diffMins <= 30) {
      return {
        label: `⏰ Due in ${diffMins}m`,
        isOverdue: false,
        isDueNow: true,
        cls: "bg-amber-500 text-white font-black animate-pulse shadow-xs border border-amber-600",
        timeStr: dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        dateStr: "Today",
      };
    } else if (dt.toDateString() === new Date().toDateString()) {
      return {
        label: `🕒 Today at ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
        isOverdue: false,
        isDueNow: false,
        cls: "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold",
        timeStr: dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        dateStr: "Today",
      };
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = dt.toDateString() === tomorrow.toDateString();
      const prefix = isTomorrow ? "Tomorrow" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return {
        label: `📅 ${prefix} at ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
        isOverdue: false,
        isDueNow: false,
        cls: "bg-amber-50 text-amber-800 border border-amber-200 font-bold",
        timeStr: dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        dateStr: prefix,
      };
    }
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

  // Date constants for daily tabs
  const todayStr = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  // Priority queue for power dialing (Due follow-ups first, then untouched fresh leads, then retries/no-answers)
  const pendingQueue = leads.filter(
    (l) =>
      !l.isPromoted &&
      l.status !== "CONVERTED" &&
      l.status !== "REJECTED" &&
      l.status !== "NOT_INTERESTED" &&
      (!l.lastContactedAt ||
        new Date(l.lastContactedAt).toDateString() !== todayStr ||
        (l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() <= nowTick))
  ).sort((a, b) => {
    const aDue = a.nextFollowUpAt && new Date(a.nextFollowUpAt).getTime() <= nowTick ? 1 : 0;
    const bDue = b.nextFollowUpAt && new Date(b.nextFollowUpAt).getTime() <= nowTick ? 1 : 0;
    if (aDue !== bDue) return bDue - aDue;
    const aCalls = a._count?.callLogs ?? 0;
    const bCalls = b._count?.callLogs ?? 0;
    return aCalls - bCalls;
  });

  const currentPowerLead = pendingQueue[powerDialIndex] || null;

  const handleStartPowerDial = () => {
    if (pendingQueue.length === 0) {
      showMsg("success", "🎉 All pending leads have already been contacted today!");
      return;
    }
    setPowerDialIndex(0);
    setPowerDialNotes("");
    setPowerDialFollowUp("");
    setIsPowerDialing(true);
  };

  const handlePowerDialOutcome = (outcome: CallOutcome, quickFollowUpIso?: string | null) => {
    if (!currentPowerLead) return;
    const leadId = currentPowerLead.id;
    setPendingLeadId(leadId);

    startTransition(async () => {
      const followUpIso = quickFollowUpIso !== undefined ? quickFollowUpIso : (powerDialFollowUp ? new Date(powerDialFollowUp).toISOString() : null);
      const res = await logCallAction(
        leadId,
        outcome,
        powerDialNotes || `Power Dialed as ${outcome}`,
        followUpIso,
        powerDialNotes
      );

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
                  nextFollowUpAt: followUpIso ?? l.nextFollowUpAt,
                  staffNotes: powerDialNotes || l.staffNotes,
                  _count: { callLogs: l._count.callLogs + 1 },
                }
              : l
          )
        );

        playFollowUpChime();
        showMsg("success", `✓ Lead #${powerDialIndex + 1} (${currentPowerLead.name || "Tutor"}) logged as ${outcome}!`);

        // Advance to next lead in pending queue
        if (powerDialIndex + 1 < pendingQueue.length) {
          setPowerDialIndex((prev) => prev + 1);
          setPowerDialNotes("");
          setPowerDialFollowUp("");
        } else {
          setIsPowerDialing(false);
          showMsg("success", "🎉 Fantastic! You have completed all pending leads in your queue!");
        }
      } else {
        showMsg("error", res.error ?? "Failed to log power call");
      }
      setPendingLeadId(null);
    });
  };

  // 1. Filter and Sort Queue
  const filtered = leads.filter((l) => {
    if (activeTab === "WORKED_TODAY") {
      if (!l.lastContactedAt) return false;
      return new Date(l.lastContactedAt).toDateString() === todayStr;
    }
    if (activeTab === "PENDING_LEFT") {
      if (l.isPromoted || l.status === "CONVERTED" || l.status === "REJECTED" || l.status === "NOT_INTERESTED") return false;
      if (l.lastContactedAt && new Date(l.lastContactedAt).toDateString() === todayStr && (!l.nextFollowUpAt || new Date(l.nextFollowUpAt).getTime() > nowTick)) return false;
    }
    if (activeTab === "WORKED_YESTERDAY") {
      if (!l.lastContactedAt) return false;
      return new Date(l.lastContactedAt).toDateString() === yesterdayStr;
    }
    if (activeTab === "FRESH_NEW") {
      if ((l.status !== "ASSIGNED" && l.status !== "NEW") || (l._count?.callLogs ?? 0) > 0) return false;
    }
    if (activeTab === "DUE") {
      if (!l.nextFollowUpAt) return false;
      return new Date(l.nextFollowUpAt).getTime() <= nowTick;
    }
    if (activeTab === "UPCOMING_TODAY") {
      if (!l.nextFollowUpAt) return false;
      const d = new Date(l.nextFollowUpAt);
      return d.getTime() > nowTick && d.toDateString() === todayStr;
    }
    if (activeTab === "CALLBACKS") {
      if (l.status !== "FOLLOW_UP" && !l.nextFollowUpAt) return false;
    }
    if (activeTab === "INTERESTED") {
      if (l.status !== "INTERESTED") return false;
    }
    if (activeTab === "NO_ANSWER") {
      if (l.status !== "NO_ANSWER") return false;
    }
    if (activeTab === "CONVERTED") {
      if (!l.isPromoted && l.status !== "CONVERTED") return false;
    }
    if (typeFilter !== "ALL" && getStaffRecordType(l.staffNotes) !== typeFilter) return false;

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
        classes: classesFromTaxonomySubjects(editForm.subjects || []),
        status: editForm.status,
        staffNotes: editForm.staffNotes,
        priority: editForm.priority !== undefined ? Number(editForm.priority) : undefined,
        nextFollowUpAt: editForm.nextFollowUpAt,
      });

      if (res.success && res.data) {
        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? { ...l, ...res.data!.lead } as Lead : l))
        );
        showMsg("success", "✓ Lead profile updated successfully!");
        setEditingLead(null);
      } else {
        showMsg("error", res.error ?? "Failed to update lead");
      }
      setPendingLeadId(null);
    });
  };

  const applyPickedLocation = (result: LocationResult) => {
    const locLabel = [result.area, result.city].filter(Boolean).join(", ") || result.city;
    setEditForm((prev) => ({
      ...prev,
      location: locLabel || prev.location,
      pincode: result.pincode || prev.pincode,
      fullAddress: result.fullAddress || prev.fullAddress,
    }));
  };

  // 5. Open Call History
  const handleOpenHistory = async (lead: Lead) => {
    setHistoryLead(lead);
    setLoadingHistory(true);
    const res = await getLeadCallLogsAction(lead.id);
    if (res.success && res.data) {
      setCallHistoryLogs(res.data.callLogs as any);
    } else {
      setCallHistoryLogs([]);
    }
    setLoadingHistory(false);
  };

  // 6. Promote Single Lead (One-by-One)
  const handlePromoteSingle = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (target && getStaffRecordType(target.staffNotes) === "PARENT") {
      showMsg("error", "This is a parent requirement. Switch it to Tutor, or post it to Student Leads.");
      return;
    }
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
        showMsg(
          "success",
          res.data.temporaryPassword
            ? `✓ Lead moved to Primary Tutor Profiles. Temporary password: ${res.data.temporaryPassword}`
            : "✓ Lead moved to Primary Tutor Profiles!"
        );
      } else {
        showMsg("error", res.error ?? "Failed to promote lead");
      }
      setPendingLeadId(null);
    });
  };

  // 7. Bulk Promote Selected Leads
  const handleBulkPromote = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).filter((id) => {
      const row = leads.find((l) => l.id === id);
      return row && getStaffRecordType(row.staffNotes) !== "PARENT";
    });
    if (ids.length === 0) {
      showMsg("error", "Selected rows are parent requirements. Switch them to Tutor, or post each to Student Leads.");
      return;
    }
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

  // 8. Fast Follow-Up Scheduler Action
  const handleSaveFastFollowUp = () => {
    if (!fastFollowUpLead || !fastFollowUpDate) return;
    const leadId = fastFollowUpLead.id;
    setPendingLeadId(leadId);

    startTransition(async () => {
      const followUpIso = new Date(fastFollowUpDate).toISOString();
      const res = await logCallAction(
        leadId,
        "CALLBACK_REQUESTED",
        fastFollowUpNote ? `Callback requested: ${fastFollowUpNote}` : "Callback requested by tutor",
        followUpIso,
        fastFollowUpNote
      );

      if (res.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status: "FOLLOW_UP",
                  lastContactedAt: new Date().toISOString(),
                  nextFollowUpAt: followUpIso,
                  staffNotes: fastFollowUpNote ? `${fastFollowUpNote}` : l.staffNotes,
                  _count: { callLogs: l._count.callLogs + 1 },
                }
              : l
          )
        );
        showMsg("success", `✓ Follow-Up scheduled for ${new Date(followUpIso).toLocaleString("en-IN")}!`);
        setFastFollowUpLead(null);
        setFastFollowUpDate("");
        setFastFollowUpNote("");
      } else {
        showMsg("error", res.error ?? "Failed to schedule follow-up");
      }
      setPendingLeadId(null);
    });
  };

  // Dynamic Daily & Follow-Up Counts
  const pendingToWorkCount = leads.filter(
    (l) =>
      !l.isPromoted &&
      l.status !== "CONVERTED" &&
      l.status !== "REJECTED" &&
      l.status !== "NOT_INTERESTED" &&
      (!l.lastContactedAt ||
        new Date(l.lastContactedAt).toDateString() !== todayStr ||
        (l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() <= nowTick))
  ).length;

  const workedTodayCount = leads.filter((l) => l.lastContactedAt && new Date(l.lastContactedAt).toDateString() === todayStr).length;
  const workedYesterdayCount = leads.filter((l) => l.lastContactedAt && new Date(l.lastContactedAt).toDateString() === yesterdayStr).length;
  const dueCount = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() <= nowTick).length;
  const upcomingTodayCount = leads.filter((l) => {
    if (!l.nextFollowUpAt) return false;
    const d = new Date(l.nextFollowUpAt);
    return d.getTime() > nowTick && d.toDateString() === todayStr;
  }).length;
  const freshCount = leads.filter((l) => (l.status === "ASSIGNED" || l.status === "NEW") && (l._count?.callLogs ?? 0) === 0).length;
  const callbackCount = leads.filter((l) => l.status === "FOLLOW_UP" || l.nextFollowUpAt).length;
  const interestedCount = leads.filter((l) => l.status === "INTERESTED").length;
  const noAnswerCount = leads.filter((l) => l.status === "NO_ANSWER").length;
  const convertedCount = leads.filter((l) => l.isPromoted || l.status === "CONVERTED").length;
  const parentCount = leads.filter((l) => getStaffRecordType(l.staffNotes) === "PARENT").length;
  const tutorCount = leads.length - parentCount;
  const processedCount = leads.length - freshCount;
  const progressPercent = leads.length > 0 ? Math.round((processedCount / leads.length) * 100) : 100;
  const workedTodayAssignedPercent = leads.length > 0 ? Math.round((workedTodayCount / leads.length) * 100) : 0;

  // Trigger Sound Chime when new follow-up becomes due
  useEffect(() => {
    if (dueCount > lastChimedCount && dueCount > 0) {
      playFollowUpChime();
    }
    setLastChimedCount(dueCount);
  }, [dueCount, lastChimedCount]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Top Header & Mode Switcher ── */}
      <div className="ath-panel flex items-center justify-between flex-wrap gap-4 p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Staff CRM</span>
            <span className="text-[11px] font-700 text-slate-500">
              {leads.length} assigned leads
            </span>
          </div>
          <h1 className="text-2xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>My Calling Queue</h1>
          <p className="text-xs text-slate-600 mt-0.5 font-600">
            Call, edit, and classify. Switch Parent ↔ Tutor if the dump was wrong. Log past calls and book the next follow-up.
          </p>
        </div>

        {/* Action & Navigation Hub */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Power Dialer Fast Action */}
          <button
            type="button"
            onClick={handleStartPowerDial}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F5A623] hover:bg-[#e8960f] text-[#0F2540] text-xs font-800 cursor-pointer"
            title="Start Speed Power Dialing mode through all pending leads"
          >
            <Zap size={14} className="text-yellow-200" />
            <span>⚡ Power Dialer ({pendingQueue.length} Pending)</span>
          </button>

          <Link
            href="/admin/staff-leads/my-dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all"
          >
            <Clock size={14} /> My Shift &amp; Timer
          </Link>

          <Link
            href="/admin/staff-leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
          >
            <BarChart3 size={14} className="text-slate-500" /> Admin CRM
          </Link>

          {/* View Toggle (Queue vs Daily Activity) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveMainView("QUEUE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainView === "QUEUE"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck size={14} className={activeMainView === "QUEUE" ? "text-emerald-600" : ""} />
              Queue ({leads.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveMainView("ACTIVITY")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainView === "ACTIVITY"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity size={14} className={activeMainView === "ACTIVITY" ? "text-emerald-600" : ""} />
              Activity Logs
            </button>
          </div>
        </div>
      </div>

      {activeMainView === "QUEUE" && <StaffCrmPlaybook compact />}

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
          REAL-TIME LIVE FOLLOW-UP ALERT BANNER (High-Visibility Pulsing Alert)
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {dueCount > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white p-4 rounded-3xl shadow-lg border border-rose-400 flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl animate-bounce">
              🔔
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                <span>{dueCount} Callback Follow-Up{dueCount === 1 ? "" : "s"} Due Right Now!</span>
                <span className="text-[10px] uppercase font-extrabold bg-white/30 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Tutors asked to be contacted at this specific time. Dial immediately to secure active tuition opportunities.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("DUE")}
            className="px-5 py-2 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Clock size={14} className="text-rose-600" />
            <span>Open Due Follow-Ups ({dueCount}) →</span>
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          VIEW 1: MY ASSIGNED LEADS QUEUE
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {activeMainView === "QUEUE" && (
        <div className="space-y-5">
          {/* ── 4 DAILY WORK KPI CARDS (100% Real Database Assigned Leads Data) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Worked Today & Assigned Leads Progress */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                    <Zap size={16} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Worked Today</span>
                </div>
                <span className="text-[10px] font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {leads.length} Assigned Total
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900">{workedTodayCount}</div>
                <span className="text-xs font-bold text-slate-400">
                  of {leads.length} Assigned ({workedTodayAssignedPercent}%)
                </span>
              </div>

              {/* Progress Bar showing actual touched assigned leads */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${workedTodayAssignedPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-slate-500 font-bold">
                  {leads.length - workedTodayCount > 0
                    ? `${leads.length - workedTodayCount} assigned leads left today`
                    : "✓ All assigned leads touched today!"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("WORKED_TODAY")}
                  className="font-black text-teal-700 hover:underline cursor-pointer"
                >
                  View ({workedTodayCount}) →
                </button>
              </div>
            </div>

            {/* Card 2: Pending / Left to Work */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Clock size={16} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Left to Work</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {pendingToWorkCount} Pending
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900">{pendingToWorkCount}</div>
                <span className="text-xs font-bold text-slate-400">Leads in queue</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>🆕 <strong>{freshCount}</strong> Fresh</span>
                <span>·</span>
                <span>⏳ <strong>{noAnswerCount}</strong> Retries</span>
              </div>

              <div className="pt-0.5 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleStartPowerDial}
                  className="font-black text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Zap size={11} /> Start Dialing →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("PENDING_LEFT")}
                  className="font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Filter ({pendingToWorkCount})
                </button>
              </div>
            </div>

            {/* Card 3: Follow-Ups Due & Today */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dueCount > 0 ? "bg-rose-50 border border-rose-100 text-rose-600 animate-pulse" : "bg-amber-50 border border-amber-100 text-amber-600"}`}>
                    <RefreshCcw size={16} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Follow-Ups</span>
                </div>
                {dueCount > 0 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                    🚨 {dueCount} Due Now
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {callbackCount} Scheduled
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-900">{dueCount + upcomingTodayCount}</div>
                <span className="text-xs font-bold text-slate-400">Total for Today</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>🚨 <strong>{dueCount}</strong> Overdue/Now</span>
                <span>·</span>
                <span>🕒 <strong>{upcomingTodayCount}</strong> Later Today</span>
              </div>

              <div className="pt-0.5 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("DUE")}
                  className="font-black text-rose-700 hover:underline cursor-pointer"
                >
                  View Due ({dueCount}) →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("UPCOMING_TODAY")}
                  className="font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Later Today ({upcomingTodayCount})
                </button>
              </div>
            </div>

            {/* Card 4: Conversions & Interested */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Star size={16} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Conversions</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {convertedCount} Active
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-emerald-800">{convertedCount}</div>
                <span className="text-xs font-bold text-slate-400">Tutors Joined</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>🔥 <strong>{interestedCount}</strong> Hot Interested</span>
                <span>·</span>
                <span>✓ <strong>{convertedCount}</strong> Primary Active</span>
              </div>

              <div className="pt-0.5 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("INTERESTED")}
                  className="font-black text-emerald-700 hover:underline cursor-pointer"
                >
                  Interested ({interestedCount}) →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("CONVERTED")}
                  className="font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Converted ({convertedCount})
                </button>
              </div>
            </div>
          </div>

          {/* ── QUEUE SUB-TABS FILTER BAR (All Sub-Tabs Permanently Visible) ── */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Daily & Status Sub-Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Worked Today */}
              <button
                onClick={() => setActiveTab("WORKED_TODAY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "WORKED_TODAY"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                }`}
              >
                <Zap size={12} /> ⚡ Worked Today ({workedTodayCount})
              </button>

              {/* 2. Left / Pending to Work */}
              <button
                onClick={() => setActiveTab("PENDING_LEFT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "PENDING_LEFT"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100"
                }`}
              >
                <Clock size={12} /> ⏳ Left to Work ({pendingToWorkCount})
              </button>

              {/* 3. Follow-Ups Due Now */}
              <button
                onClick={() => setActiveTab("DUE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "DUE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : dueCount > 0
                    ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 animate-pulse"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Clock size={12} /> 🚨 Due Now ({dueCount})
              </button>

              {/* 4. Today's Upcoming Follow-ups */}
              <button
                onClick={() => setActiveTab("UPCOMING_TODAY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "UPCOMING_TODAY"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <Calendar size={12} /> 🕒 Later Today ({upcomingTodayCount})
              </button>

              {/* 5. Worked Yesterday */}
              <button
                onClick={() => setActiveTab("WORKED_YESTERDAY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "WORKED_YESTERDAY"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <History size={12} /> 📅 Yesterday ({workedYesterdayCount})
              </button>

              {/* 6. Fresh New Leads */}
              <button
                onClick={() => setActiveTab("FRESH_NEW")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "FRESH_NEW"
                    ? "bg-[#0F2540] text-white"
                    : "bg-[#E8F7F0] text-[#0F2540] border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Sparkles size={12} /> 🆕 Fresh Untouched ({freshCount})
              </button>

              {/* 7. All Callbacks */}
              <button
                onClick={() => setActiveTab("CALLBACKS")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "CALLBACKS"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                }`}
              >
                <RefreshCcw size={12} /> 📞 Call Backs ({callbackCount})
              </button>

              {/* 8. Interested */}
              <button
                onClick={() => setActiveTab("INTERESTED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "INTERESTED"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
                }`}
              >
                <Flame size={12} className="text-orange-500" /> 🔥 Interested ({interestedCount})
              </button>

              {/* 9. No Answer */}
              <button
                onClick={() => setActiveTab("NO_ANSWER")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "NO_ANSWER"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                <PhoneMissed size={12} /> ⏳ No Answer ({noAnswerCount})
              </button>

              {/* 10. Converted */}
              <button
                onClick={() => setActiveTab("CONVERTED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "CONVERTED"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 size={12} /> ✓ Converted ({convertedCount})
              </button>

              {/* 11. All Assigned */}
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

              <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:inline-block" />

              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                  typeFilter === "ALL" ? "bg-[#0F2540] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("TUTOR")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                  typeFilter === "TUTOR" ? "bg-[#2D9E6B] text-white" : "bg-[#E8F7F0] text-[#166534]"
                }`}
              >
                Tutors ({tutorCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("PARENT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                  typeFilter === "PARENT" ? "bg-[#2563EB] text-white" : "bg-[#E8F1FB] text-[#1D4ED8]"
                }`}
              >
                Parents ({parentCount})
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
                  Move selected tutors →
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-3.5">
            {sorted.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <UserCheck size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-800">
                    {leads.length === 0 ? "No Leads Currently in Your Assigned Queue" : "No Leads Match Selected Filter"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {leads.length === 0
                      ? "When Super Admin distributes leads from the master data pool, your assigned tutor pipeline will appear here automatically."
                      : "No tutor leads match the current tab and search query. Try selecting 'All Assigned' or clearing search."}
                  </p>
                </div>

                {isSuperAdmin && leads.length === 0 && (
                  <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                    <Link
                      href="/admin/staff-leads/assign"
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Users size={14} /> Assign Master Pool Leads →
                    </Link>
                    <Link
                      href="/admin/staff-leads/upload"
                      className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                    >
                      Upload New Master Leads
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              sorted.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const isLeadPending = pendingLeadId === lead.id;
                const statusStyle = STATUS_STYLES[lead.status] ?? STATUS_STYLES.NEW;
                const followUpBadge = getFollowUpBadge(lead.nextFollowUpAt);
                const recordType = getStaffRecordType(lead.staffNotes);
                const nextStep = getStaffNextStep({
                  type: recordType,
                  status: lead.status,
                  isPromoted: lead.isPromoted,
                  hasPhone: Boolean(lead.phone),
                  nextFollowUpAt: lead.nextFollowUpAt,
                });

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
                              {lead.name ?? <span className="text-slate-400 italic">Unknown contact</span>}
                            </h3>
                            <StaffLeadTypeControl
                              leadId={lead.id}
                              type={recordType}
                              onChanged={(_next, notes) => {
                                setLeads((prev) =>
                                  prev.map((row) => (row.id === lead.id ? { ...row, staffNotes: notes } : row))
                                );
                              }}
                            />

                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              {statusStyle.label}
                            </span>

                            {/* Relative Live Follow-Up Time Badge */}
                            {followUpBadge && (
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${followUpBadge.cls}`}>
                                <Clock size={11} />
                                <span>{followUpBadge.label}</span>
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
                          <p className="text-[11px] font-700 text-slate-500">
                            Next: <span className="text-[#0F2540]">{nextStep.title}</span>
                            <span className="font-600 text-slate-500"> — {nextStep.detail}</span>
                          </p>
                          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                            {lead.phone ? (
                              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-xl">
                                <a
                                  href={`tel:+91${lead.phone.replace(/\D/g, "")}`}
                                  className="font-mono font-black text-emerald-800 hover:underline flex items-center gap-1"
                                  title="Click to redirect to phone dialer"
                                >
                                  <Phone size={12} className="text-emerald-600" /> +91 {lead.phone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(lead.phone!, `phone-${lead.id}`)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1 p-0.5"
                                  title="Copy Phone"
                                >
                                  {copiedField === `phone-${lead.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                                </button>
                              </div>
                            ) : null}

                            {/* Direct Dialer Button */}
                            {lead.phone && (
                              <a
                                href={`tel:+91${lead.phone.replace(/\D/g, "")}`}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-all hover:scale-105"
                                title="Click to redirect to phone dialer"
                              >
                                <PhoneCall size={12} /> Call Now
                              </a>
                            )}

                            {/* WhatsApp Button */}
                            {lead.phone && (
                              <a
                                href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <MessageCircle size={12} /> WhatsApp
                              </a>
                            )}

                            {/* Alternate Phone Direct Dialer */}
                            {lead.altPhone && (
                              <a
                                href={`tel:+91${lead.altPhone.replace(/\D/g, "")}`}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-colors"
                                title="Dial Alternate Number"
                              >
                                <Phone size={11} className="text-slate-500" /> Alt: {lead.altPhone}
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
                          {/* Direct Dialer Button in Actions */}
                          {lead.phone && (
                            <a
                              href={`tel:+91${lead.phone.replace(/\D/g, "")}`}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all hover:scale-105"
                              title="Redirect to phone dialer"
                            >
                              <PhoneCall size={13} /> Dial Tutor
                            </a>
                          )}

                          {/* 1-Click Fast Follow-Up Scheduler Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setFastFollowUpLead(lead);
                              const d = new Date(Date.now() + 60 * 60000);
                              const pad = (n: number) => String(n).padStart(2, "0");
                              setFastFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                              setFastFollowUpNote(lead.staffNotes || "");
                            }}
                            className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Clock size={13} className="text-amber-600" /> Set Follow-Up
                          </button>

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

                          {!lead.isPromoted && lead.status !== "CONVERTED" && recordType === "PARENT" ? (
                            <CreateLeadModal
                              triggerLabel="Post to Student Leads"
                              triggerClassName="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] !text-white text-xs font-black inline-flex items-center gap-1.5"
                              defaults={{
                                parentName: lead.name ?? undefined,
                                parentPhone: lead.phone ?? undefined,
                                parentEmail: lead.email ?? undefined,
                                classLevel: lead.classes[0] ?? undefined,
                                board: lead.board ?? undefined,
                                subjects: lead.subjects,
                                city: lead.location ?? undefined,
                                pincode: lead.pincode ?? undefined,
                                notes: staffNotesWithoutTypeTags(lead.staffNotes) || undefined,
                              }}
                            />
                          ) : !lead.isPromoted && lead.status !== "CONVERTED" ? (
                            <button
                              type="button"
                              onClick={() => handlePromoteSingle(lead.id)}
                              disabled={isLeadPending}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isLeadPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                              Promote to tutor
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" /> {recordType === "PARENT" ? "Posted / closed" : "Tutor account live"}
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
                <h2 className="text-xl font-black text-slate-900">Edit contact</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change name, phone, subjects, and whether this row is a Parent or a Tutor.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-800 text-slate-500">This row is a</span>
                  <StaffLeadTypeControl
                    leadId={editingLead.id}
                    type={getStaffRecordType(editForm.staffNotes ?? editingLead.staffNotes)}
                    onChanged={(_next, notes) => {
                      setEditForm((prev) => ({ ...prev, staffNotes: notes }));
                      setEditingLead((prev) => (prev ? { ...prev, staffNotes: notes } : prev));
                      setLeads((prev) =>
                        prev.map((row) => (row.id === editingLead.id ? { ...row, staffNotes: notes } : row))
                      );
                    }}
                  />
                </div>
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
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">2. Exact location</h4>
                <p className="text-[11px] font-600 text-slate-500">
                  Search an area, pincode or landmark, or pick the pin on the map. This saves the exact city, pincode and address.
                </p>
                <LocationSearchInput
                  key={editingLead.id}
                  initialDisplay={[editForm.location, editForm.pincode].filter(Boolean).join(", ")}
                  defaultCity={editForm.location || ""}
                  defaultPincode={editForm.pincode || ""}
                  placeholder="Search area, landmark or 6-digit pincode…"
                  onSelectLocation={applyPickedLocation}
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">Quick areas:</span>
                  {POPULAR_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          location: loc,
                          fullAddress: editForm.fullAddress || loc,
                        })
                      }
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Area / City</label>
                    <input
                      type="text"
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Filled from search or map"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
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
                    <label className="block font-bold text-slate-700 mb-1">Full address from map / search</label>
                    <input
                      type="text"
                      value={editForm.fullAddress || ""}
                      onChange={(e) => setEditForm({ ...editForm, fullAddress: e.target.value })}
                      placeholder="Exact OSM address appears here after you pick a result"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Teaching Subjects Taxonomy */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                  3. Subjects from class taxonomy ({(editForm.subjects || []).length} selected)
                </h4>
                <p className="text-[11px] font-600 text-slate-500">
                  Pick subjects that already include the class (e.g. English for XI–XII). No separate grade list.
                </p>
                <SubjectPicker
                  value={editForm.subjects || []}
                  onChange={(subjects) => setEditForm({ ...editForm, subjects })}
                  hintText="Search or open a class group — subject names already carry the grade."
                />
              </div>

              {/* Section 5: Staff Status & Follow-Up Notes */}
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">4. Lead Status & Follow-Up Notes</h4>
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
                    onClick={() => {
                      setDetailedOutcome(o.outcome as CallOutcome);
                      if (o.outcome === "CALLBACK_REQUESTED" && !detailedFollowUpDate) {
                        const d = new Date(Date.now() + 120 * 60000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setDetailedFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }
                    }}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Schedule Next Follow-Up Date & Time (Optional)
                </label>
                {detailedFollowUpDate && (
                  <button
                    type="button"
                    onClick={() => setDetailedFollowUpDate("")}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Clear Follow-Up
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={detailedFollowUpDate}
                onChange={(e) => setDetailedFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
              />

              {/* Quick Follow-Up Presets */}
              <div className="space-y-1.5 mt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  ⚡ Quick Presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "+30m", mins: 30 },
                    { label: "+1h", mins: 60 },
                    { label: "+2h", mins: 120 },
                    { label: "+4h", mins: 240 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + p.mins * 60000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setDetailedFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(10, 0, 0, 0);
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setDetailedFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`);
                    }}
                    className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
                  >
                    🌅 Tomorrow 10 AM
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(17, 0, 0, 0);
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setDetailedFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`);
                    }}
                    className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all cursor-pointer"
                  >
                    🌆 Tomorrow 5 PM
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      d.setHours(11, 0, 0, 0);
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setDetailedFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T11:00`);
                    }}
                    className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer"
                  >
                    📅 In 2 Days 11 AM
                  </button>
                </div>
              </div>
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

      {/* ═════════════════════════════════════════════════════════════════════════════════
          FAST FOLLOW-UP DATE & TIME SCHEDULER MODAL (1-Click Callback Setup)
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {fastFollowUpLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Schedule Callback Follow-Up
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {fastFollowUpLead.name || "Tutor Lead"} {fastFollowUpLead.phone ? `· +91 ${fastFollowUpLead.phone}` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFastFollowUpLead(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick 1-Click Time Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                ⚡ 1-Click Callback Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "+15 Mins", calc: () => new Date(Date.now() + 15 * 60000) },
                  { label: "+30 Mins", calc: () => new Date(Date.now() + 30 * 60000) },
                  { label: "+1 Hour", calc: () => new Date(Date.now() + 60 * 60000) },
                  { label: "+2 Hours", calc: () => new Date(Date.now() + 120 * 60000) },
                  {
                    label: "Today 5 PM",
                    calc: () => {
                      const d = new Date();
                      d.setHours(17, 0, 0, 0);
                      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                      return d;
                    },
                  },
                  {
                    label: "Today 7 PM",
                    calc: () => {
                      const d = new Date();
                      d.setHours(19, 0, 0, 0);
                      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                      return d;
                    },
                  },
                  {
                    label: "Tomorrow 10:30 AM",
                    calc: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(10, 30, 0, 0);
                      return d;
                    },
                  },
                  {
                    label: "Tomorrow 4:00 PM",
                    calc: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(16, 0, 0, 0);
                      return d;
                    },
                  },
                  {
                    label: "Tomorrow 7:00 PM",
                    calc: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(19, 0, 0, 0);
                      return d;
                    },
                  },
                  {
                    label: "In 2 Days 11 AM",
                    calc: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      d.setHours(11, 0, 0, 0);
                      return d;
                    },
                  },
                  {
                    label: "In 3 Days",
                    calc: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 3);
                      d.setHours(11, 0, 0, 0);
                      return d;
                    },
                  },
                  {
                    label: "Next Monday 11 AM",
                    calc: () => {
                      const d = new Date();
                      const day = d.getDay();
                      const diff = (8 - day) % 7 || 7;
                      d.setDate(d.getDate() + diff);
                      d.setHours(11, 0, 0, 0);
                      return d;
                    },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      const d = item.calc();
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setFastFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                    }}
                    className="p-2 text-[11px] font-black rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-all text-slate-700 cursor-pointer truncate"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Datetime Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Exact Callback Date & Time:
              </label>
              <input
                type="datetime-local"
                value={fastFollowUpDate}
                onChange={(e) => setFastFollowUpDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* Quick Reason Suggestions & Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Callback Reason / Note:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  "Asked to call after tuition class",
                  "Travelling / Driving right now",
                  "Discussing timings with family",
                  "Wants trial tuition student details",
                  "Busy in school / meeting",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFastFollowUpNote(reason)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    + {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={fastFollowUpNote}
                onChange={(e) => setFastFollowUpNote(e.target.value)}
                placeholder="e.g. Teacher requested callback after 5 PM when free from tuition..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setFastFollowUpLead(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFastFollowUp}
                disabled={!fastFollowUpDate || pendingLeadId === fastFollowUpLead.id}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {pendingLeadId === fastFollowUpLead.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Clock size={14} />
                )}
                Save Callback Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════════
          SPEED POWER DIALER MODAL (1-Click Call, WhatsApp, Log & Auto-Advance)
         ═════════════════════════════════════════════════════════════════════════════════ */}
      {isPowerDialing && currentPowerLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden space-y-0 animate-in zoom-in-95">
            {/* Header with Power Dial Progress */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>⚡ Power Dialer Mode</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300">
                        Lead {powerDialIndex + 1} of {pendingQueue.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Lightning workflow: Dial, WhatsApp, click outcome to auto-advance to next lead.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (powerDialIndex + 1 < pendingQueue.length) {
                        setPowerDialIndex((prev) => prev + 1);
                        setPowerDialNotes("");
                        setPowerDialFollowUp("");
                      } else {
                        setIsPowerDialing(false);
                      }
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                  >
                    Skip →
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPowerDialing(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.round(((powerDialIndex + 1) / pendingQueue.length) * 100)}%` }}
                />
              </div>
            </div>

            {/* Body Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Tutor Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {currentPowerLead.name || "Tutor Lead"}
                    </h3>
                    <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                      +91 {currentPowerLead.phone || "No phone"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentPowerLead.phone && (
                      <a
                        href={`tel:+91${currentPowerLead.phone}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Phone size={13} /> Call +91 {currentPowerLead.phone}
                      </a>
                    )}
                    {currentPowerLead.phone && (
                      <a
                        href={`https://wa.me/91${currentPowerLead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hello ${currentPowerLead.name || "Tutor"}, greetings from ApnaTutorHub! We have tutoring requirements for ${
                            currentPowerLead.subjects.length ? currentPowerLead.subjects.slice(0, 2).join(", ") : "students"
                          } in ${currentPowerLead.location || "your locality"}. Are you available to accept new students?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {/* Details & Pills */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 pt-1">
                  {currentPowerLead.location && (
                    <span className="flex items-center gap-1 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <MapPin size={12} className="text-rose-500" /> {currentPowerLead.location}
                    </span>
                  )}
                  {currentPowerLead.qualification && (
                    <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      🎓 {currentPowerLead.qualification}
                    </span>
                  )}
                  {currentPowerLead.gender && (
                    <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {currentPowerLead.gender}
                    </span>
                  )}
                </div>

                {/* Subjects & Classes */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {currentPowerLead.subjects.map((s) => (
                    <span key={s} className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">
                      {s}
                    </span>
                  ))}
                  {currentPowerLead.classes.map((c) => (
                    <span key={c} className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg">
                      {c}
                    </span>
                  ))}
                </div>

                {currentPowerLead.staffNotes && (
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 italic">
                    Previous note: "{currentPowerLead.staffNotes}"
                  </p>
                )}
              </div>

              {/* Discussion Note Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Discussion Notes for this Call (Optional):
                </label>
                <input
                  type="text"
                  value={powerDialNotes}
                  onChange={(e) => setPowerDialNotes(e.target.value)}
                  placeholder="e.g. Discussed fee 800/hr, available 4 PM onwards in Sector 49..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Follow-up Quick Presets for Power Dialer */}
              <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <Clock size={13} /> Quick Callback Presets (Auto-sets follow-up date):
                  </span>
                  {powerDialFollowUp && (
                    <button
                      type="button"
                      onClick={() => setPowerDialFollowUp("")}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Callback
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "+30 Mins", calc: () => new Date(Date.now() + 30 * 60000) },
                    { label: "+1 Hour", calc: () => new Date(Date.now() + 60 * 60000) },
                    { label: "+2 Hours", calc: () => new Date(Date.now() + 120 * 60000) },
                    {
                      label: "Today 5 PM",
                      calc: () => {
                        const d = new Date();
                        d.setHours(17, 0, 0, 0);
                        if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                        return d;
                      },
                    },
                    {
                      label: "Tomorrow 10:30 AM",
                      calc: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(10, 30, 0, 0);
                        return d;
                      },
                    },
                    {
                      label: "Tomorrow 4 PM",
                      calc: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(16, 0, 0, 0);
                        return d;
                      },
                    },
                    {
                      label: "In 2 Days 11 AM",
                      calc: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        d.setHours(11, 0, 0, 0);
                        return d;
                      },
                    },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const d = p.calc();
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setPowerDialFollowUp(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        powerDialFollowUp
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {powerDialFollowUp && (
                  <p className="text-[11px] font-bold text-amber-800">
                    Callback Scheduled for: {new Date(powerDialFollowUp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>

              {/* Log Outcome & Auto-Advance (1-Click Action Buttons) */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  🎯 Click Call Outcome to Save &amp; Advance to Next Lead:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => handlePowerDialOutcome("ANSWERED")}
                    className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>✓ Answered &amp; Discussed</span>
                  </button>

                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => {
                      if (!powerDialFollowUp) {
                        const d = new Date(Date.now() + 60 * 60000);
                        handlePowerDialOutcome("CALLBACK_REQUESTED", d.toISOString());
                      } else {
                        handlePowerDialOutcome("CALLBACK_REQUESTED");
                      }
                    }}
                    className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Clock size={14} />
                    <span>⏰ Callback Requested</span>
                  </button>

                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => handlePowerDialOutcome("NO_ANSWER")}
                    className="p-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <PhoneMissed size={14} />
                    <span>📵 No Answer / Ringing</span>
                  </button>

                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => handlePowerDialOutcome("BUSY")}
                    className="p-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <PhoneCall size={14} />
                    <span>⏳ Busy / Waiting</span>
                  </button>

                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => handlePowerDialOutcome("CONVERTED")}
                    className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Star size={14} />
                    <span>🎉 Converted / Ready</span>
                  </button>

                  <button
                    type="button"
                    disabled={pendingLeadId === currentPowerLead.id}
                    onClick={() => handlePowerDialOutcome("NOT_INTERESTED")}
                    className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    <span>✕ Not Interested</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
