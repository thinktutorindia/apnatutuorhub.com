"use client";

import React, { useState, useTransition, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Phone, PhoneMissed, CheckCircle2, XCircle, RefreshCcw, Clock,
  ArrowRight, Search, Loader2, Star, UserCheck,
  CheckSquare, Square, Sparkles, X, PhoneCall,
  Calendar, Check, ShieldCheck, MessageCircle, Copy, ChevronDown,
  History, Plus, Flame, MapPin, Mail, BookOpen, GraduationCap,
  Filter, MoreHorizontal, Activity, Users, BarChart3, TrendingUp,
  Zap, Volume2, ArrowLeft, Send, Edit3, Trash2, Download,
  Layers, ChevronRight, Play, CheckCheck, Eye, VolumeX, HelpCircle, Keyboard,
  Settings
} from "lucide-react";
import {
  logCallAction,
  updateStaffLeadAction,
  getLeadCallLogsAction,
  bulkUpdateLeadStatusAction,
  promoteLeadToProfileAction,
  promoteLeadToStudentRequirementAction,
  bulkPromoteLeadsToProfilesAction,
  getStaffLeadActivityFeedAction,
  createSingleStaffLeadAction,
  deleteStaffLeadAction,
} from "@/app/actions/staff-leads.actions";
import type { StaffLeadStatus, CallOutcome } from "@prisma/client";
import { StaffLeadTypeBadge } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import { STATUS_META, statusMeta, formatDateShort, formatRelative } from "@/lib/staff-lead-ui";
import { StaffLeadLivePreview } from "@/components/admin/staff-leads/StaffLeadLivePreview";
import { StaffPowerDialer } from "@/components/admin/staff-leads/StaffPowerDialer";
import { SubjectTaxonomyPicker } from "@/components/admin/staff-leads/SubjectTaxonomyPicker";
import { StaffLeadsNavHeader } from "@/components/admin/staff-leads/StaffLeadsNavHeader";
import { StaffShiftGate, useStaffShiftGate } from "@/components/admin/staff-leads/StaffShiftGate";

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
  assignedTo?: { id: string; name: string | null; email: string } | null;
  batch?: { id: string; name: string } | null;
  _count: { callLogs: number };
};

type ViewMode = "SPLIT" | "TABLE" | "REPORT";
type QueueTab = "ALL" | "FRESH" | "FOLLOW_UP" | "INTERESTED" | "CONVERTED" | "NO_ANSWER" | "WORKED";

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "No Phone";
  const cleaned = phone.replace(/\D/g, "");
  const last10 = cleaned.slice(-10);
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
}

const OUTCOMES: Array<{
  outcome: CallOutcome;
  label: string;
  emoji: string;
  shortcut: string;
  activeClass: string;
  defaultClass: string;
}> = [
  {
    outcome: "ANSWERED",
    label: "Connected & Spoke",
    emoji: "📞",
    shortcut: "1",
    activeClass: "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30",
    defaultClass: "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  {
    outcome: "CALLBACK_REQUESTED",
    label: "Callback Needed",
    emoji: "🔔",
    shortcut: "2",
    activeClass: "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500/30",
    defaultClass: "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300",
  },
  {
    outcome: "BUSY",
    label: "Busy / Line Busy",
    emoji: "⏳",
    shortcut: "3",
    activeClass: "bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-500/30",
    defaultClass: "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300",
  },
  {
    outcome: "NO_ANSWER",
    label: "No Answer / Ringing",
    emoji: "📵",
    shortcut: "4",
    activeClass: "bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-500/30",
    defaultClass: "bg-orange-50 hover:bg-orange-100 text-orange-950 border-orange-300",
  },
  {
    outcome: "CONVERTED",
    label: "Converted / Enrolled",
    emoji: "🎉",
    shortcut: "5",
    activeClass: "bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-500/30",
    defaultClass: "bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-300",
  },
  {
    outcome: "NOT_INTERESTED",
    label: "Not Interested",
    emoji: "✕",
    shortcut: "6",
    activeClass: "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-500/30",
    defaultClass: "bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300",
  },
];

const QUICK_NOTE_CHIPS = [
  "Interested, asked to call back later",
  "Ready to take home tuition offline",
  "Demo class requested for this week",
  "Budget mismatch with parent requirement",
  "Looking for online classes only",
  "Number busy / call waiting",
  "Not reachable, try evening",
];

export function MyStaffLeadsClient({
  leads: initialLeads,
  isSuperAdmin = false,
}: {
  leads: Lead[];
  isSuperAdmin?: boolean;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as QueueTab | null;
  const leadIdParam = searchParams.get("leadId");

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeTab, setActiveTab] = useState<QueueTab>(
    tabParam && ["ALL", "FRESH", "FOLLOW_UP", "INTERESTED", "CONVERTED", "NO_ANSWER"].includes(tabParam)
      ? tabParam
      : "ALL"
  );
  const [viewMode, setViewMode] = useState<ViewMode>("SPLIT");
  const [mobileView, setMobileView] = useState<"QUEUE" | "DETAIL">("QUEUE");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TUTOR" | "PARENT">("ALL");
  const [retryFilter, setRetryFilter] = useState<"ALL" | "NEVER_ANSWERED" | "ATTEMPT_1" | "ATTEMPT_2" | "ATTEMPT_3_PLUS">("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    (leadIdParam && initialLeads.find((l) => l.id === leadIdParam)?.id) || initialLeads[0]?.id || ""
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Deep-link listener for tab and leadId URL parameters
  useEffect(() => {
    if (tabParam && ["ALL", "FRESH", "FOLLOW_UP", "INTERESTED", "CONVERTED", "NO_ANSWER"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (leadIdParam && leads.some((l) => l.id === leadIdParam)) {
      setSelectedLeadId(leadIdParam);
      setMobileView("DETAIL");
    }
  }, [leadIdParam, leads]);

  // Call console state
  const [consoleTab, setConsoleTab] = useState<"CALL" | "PREVIEW">("CALL");
  const [callOutcome, setCallOutcome] = useState<CallOutcome | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [fastMode, setFastMode] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [lastLoggedUndo, setLastLoggedUndo] = useState<{ leadId: string; prevStatus: StaffLeadStatus } | null>(null);

  // Modals & Tools
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [powerDialIndex, setPowerDialIndex] = useState(0);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState("0m");

  // Today's Work Report Feed & Shift Progress
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressData, setProgressData] = useState<{
    logs: any[];
    summary: { totalCalls: number; answered: number; callbacks: number; interested: number; converted: number; noAnswer: number };
  } | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Track last worked lead ID (with LocalStorage persistence)
  const [lastWorkedLeadId, setLastWorkedLeadId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("crm_last_worked_id");
      } catch {}
    }
    return null;
  });

  const lastWorkedLead = useMemo(() => {
    if (lastWorkedLeadId) {
      const found = leads.find((l) => l.id === lastWorkedLeadId);
      if (found) return found;
    }
    // Fallback to the lead with the newest lastContactedAt
    const contacted = leads.filter((l) => l.lastContactedAt);
    if (contacted.length > 0) {
      contacted.sort(
        (a, b) => new Date(b.lastContactedAt!).getTime() - new Date(a.lastContactedAt!).getTime()
      );
      return contacted[0];
    }
    return null;
  }, [leads, lastWorkedLeadId]);

  const fetchProgressReport = useCallback(() => {
    setLoadingProgress(true);
    getStaffLeadActivityFeedAction({ period: "today", limit: 50 })
      .then((res) => {
        if (res.success && res.data) {
          setProgressData({
            logs: res.data.logs,
            summary: res.data.summary,
          });
          setActivityFeed(res.data.logs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProgress(false));
  }, []);

  // Feedback & Copy
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Shift Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = Date.now() - sessionStartTime.getTime();
      const mins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) {
        setElapsedTime(`${hrs}h ${mins % 60}m`);
      } else {
        setElapsedTime(`${mins}m`);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Audio tone helper
  const playChime = (tone: "beep" | "fanfare") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (tone === "fanfare") {
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.setValueAtTime(659.25, t + 0.1);
        osc.frequency.setValueAtTime(783.99, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.start(t);
        osc.stop(t + 0.45);
      } else {
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(640, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch {}
  };

  // Metrics
  const stats = useMemo(() => {
    const total = leads.length;
    const now = new Date();
    const workedToday = leads.filter((l) => {
      if (!l.lastContactedAt) return false;
      return new Date(l.lastContactedAt).toDateString() === now.toDateString();
    }).length;
    const totalWorked = leads.filter((l) => (l._count?.callLogs || 0) > 0 || l.lastContactedAt !== null).length;

    const followUps = leads.filter((l) => l.nextFollowUpAt !== null);
    const dueNow = followUps.filter((l) => new Date(l.nextFollowUpAt!) <= now).length;
    const converted = leads.filter((l) => l.status === "CONVERTED").length;
    const interested = leads.filter((l) => l.status === "INTERESTED").length;
    const freshCount = leads.filter(
      (l) => (l.status === "NEW" || l.status === "ASSIGNED") && !l.lastContactedAt
    ).length;
    const pendingToWork = leads.filter((l) => ["NEW", "ASSIGNED", "NO_ANSWER", "FOLLOW_UP"].includes(l.status)).length;

    const retriesList = leads.filter((l) => ["NO_ANSWER", "BUSY"].includes(l.status));
    const retryCount = retriesList.length;
    const retryNeverAnswered = retriesList.filter((l) => (l._count?.callLogs || 0) === 0).length;
    const retryAttempt1 = retriesList.filter((l) => (l._count?.callLogs || 0) === 1).length;
    const retryAttempt2 = retriesList.filter((l) => (l._count?.callLogs || 0) === 2).length;
    const retryAttempt3Plus = retriesList.filter((l) => (l._count?.callLogs || 0) >= 3).length;

    return {
      total,
      workedToday,
      totalWorked,
      followUps: followUps.length,
      dueNow,
      converted,
      interested,
      freshCount,
      pendingToWork,
      retryCount,
      retryNeverAnswered,
      retryAttempt1,
      retryAttempt2,
      retryAttempt3Plus,
    };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (activeTab === "FRESH") {
      list = list.filter((l) => (l.status === "NEW" || l.status === "ASSIGNED") && !l.lastContactedAt);
    } else if (activeTab === "FOLLOW_UP") {
      list = list.filter((l) => l.nextFollowUpAt !== null);
    } else if (activeTab === "INTERESTED") {
      list = list.filter((l) => l.status === "INTERESTED");
    } else if (activeTab === "CONVERTED") {
      list = list.filter((l) => l.status === "CONVERTED");
    } else if (activeTab === "NO_ANSWER") {
      list = list.filter((l) => ["NO_ANSWER", "BUSY", "NOT_INTERESTED", "REJECTED", "DUPLICATE"].includes(l.status));
      if (retryFilter === "NEVER_ANSWERED") {
        list = list.filter((l) => (l._count?.callLogs || 0) === 0);
      } else if (retryFilter === "ATTEMPT_1") {
        list = list.filter((l) => (l._count?.callLogs || 0) === 1);
      } else if (retryFilter === "ATTEMPT_2") {
        list = list.filter((l) => (l._count?.callLogs || 0) === 2);
      } else if (retryFilter === "ATTEMPT_3_PLUS") {
        list = list.filter((l) => (l._count?.callLogs || 0) >= 3);
      }
    } else if (activeTab === "WORKED") {
      list = list.filter((l) => (l._count?.callLogs || 0) > 0 || l.lastContactedAt !== null);
      list.sort((a, b) => {
        const timeA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
        const timeB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    if (typeFilter !== "ALL") {
      list = list.filter((l) => getStaffRecordType(l.staffNotes) === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((l) => {
        return (
          l.name?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.location?.toLowerCase().includes(q) ||
          l.subjects.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    // Default sorting: Due follow-ups first, then new, then priority
    list.sort((a, b) => {
      if (a.nextFollowUpAt && !b.nextFollowUpAt) return -1;
      if (!a.nextFollowUpAt && b.nextFollowUpAt) return 1;
      if (a.nextFollowUpAt && b.nextFollowUpAt) {
        return new Date(a.nextFollowUpAt).getTime() - new Date(b.nextFollowUpAt).getTime();
      }
      return b.priority - a.priority;
    });

    return list;
  }, [leads, activeTab, typeFilter, search]);

  // Active lead (Strictly bound to active filtered queue so right console always matches left queue)
  const currentLead = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return null;
    const foundInFiltered = filteredLeads.find((l) => l.id === selectedLeadId);
    if (foundInFiltered) return foundInFiltered;
    return filteredLeads[0];
  }, [selectedLeadId, filteredLeads]);

  const currentLeadIndex = useMemo(() => {
    if (!currentLead) return 0;
    const idx = filteredLeads.findIndex((l) => l.id === currentLead.id);
    return idx >= 0 ? idx : 0;
  }, [filteredLeads, currentLead]);

  // Sync selectedLeadId when tab or filter changes so the console never shows an orphaned lead from another queue
  useEffect(() => {
    if (currentLead && currentLead.id !== selectedLeadId) {
      setSelectedLeadId(currentLead.id);
    }
  }, [currentLead?.id, selectedLeadId]);

  // Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy phone
  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast("Phone copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch call logs when active lead changes
  useEffect(() => {
    if (!currentLead) return;
    setCallOutcome(null);
    setCallNotes("");
    setFollowUpDate("");
    setLoadingLogs(true);
    getLeadCallLogsAction(currentLead.id)
      .then((res) => {
        if (res.success && res.data) setCallLogs(res.data.callLogs);
      })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [currentLead?.id]);

  // Load activity feed when REPORT tab is clicked
  useEffect(() => {
    if (viewMode === "REPORT") {
      setLoadingActivity(true);
      getStaffLeadActivityFeedAction({ limit: 50 })
        .then((res) => {
          if (res.success && res.data) setActivityFeed(res.data.logs);
        })
        .catch(() => {})
        .finally(() => setLoadingActivity(false));
    }
  }, [viewMode]);

  // ⚡ 1-Click Fast Auto-Advance Call Logger
  const logCallAndAdvance = useCallback((
    outcome: CallOutcome,
    notesOverride?: string,
    followUpOverride?: string | null
  ) => {
    if (!currentLead) return;

    const targetLead = currentLead;
    const leadId = targetLead.id;
    const prevStatus = targetLead.status;
    const notesToSave = notesOverride !== undefined ? notesOverride : (callNotes || `Logged via Calling Desk`);
    const followUpToSave = followUpOverride !== undefined ? followUpOverride : (followUpDate || null);

    let nextStatus: StaffLeadStatus = targetLead.status;
    if (outcome === "CONVERTED") nextStatus = "CONVERTED";
    else if (outcome === "CALLBACK_REQUESTED") nextStatus = "FOLLOW_UP";
    else if (outcome === "NO_ANSWER") nextStatus = "NO_ANSWER";
    else if (outcome === "NOT_INTERESTED") nextStatus = "NOT_INTERESTED";
    else if (outcome === "ANSWERED") nextStatus = "CONTACTED";
    else if (outcome === "BUSY") nextStatus = "NO_ANSWER";

    const leadName = targetLead.name && targetLead.name !== "Unknown Contact"
      ? targetLead.name
      : formatPhoneNumber(targetLead.phone);

    // Audio feedback
    if (outcome === "CONVERTED") {
      playChime("fanfare");
    } else {
      playChime("beep");
    }

    // Save undo info & last worked tracker
    setLastLoggedUndo({ leadId, prevStatus });
    setLastWorkedLeadId(leadId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("crm_last_worked_id", leadId);
      } catch {}
    }

    // 1. Optimistic Local State Update immediately
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        return {
          ...l,
          status: nextStatus,
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: followUpToSave ? new Date(followUpToSave).toISOString() : l.nextFollowUpAt,
          _count: { callLogs: l._count.callLogs + 1 },
        };
      })
    );

    // 2. Clear current draft inputs
    setCallOutcome(null);
    setCallNotes("");
    setFollowUpDate("");

    // 3. Instant Toast Feedback
    showToast(`⚡ ${outcome.replace(/_/g, " ")} logged for ${leadName}`);

    // 4. Advance immediately to next lead (0 latency)
    if (currentLeadIndex + 1 < filteredLeads.length) {
      setSelectedLeadId(filteredLeads[currentLeadIndex + 1].id);
    } else {
      showToast("🎉 Reached the end of this queue!");
    }

    // 5. Background Server Sync
    startTransition(async () => {
      try {
        const res = await logCallAction(leadId, outcome, notesToSave, followUpToSave);
        if (!res.success) {
          console.error("logCallAction notice:", res.error);
        }
        await updateStaffLeadAction(leadId, {
          status: nextStatus,
          nextFollowUpAt: followUpToSave ? new Date(followUpToSave) : undefined,
          staffNotes: notesToSave ? `${targetLead.staffNotes ? targetLead.staffNotes + "\n" : ""}${notesToSave}` : undefined,
        });
      } catch (err) {
        console.error("Failed to sync call log:", err);
      }
    });
  }, [currentLead, callNotes, followUpDate, currentLeadIndex, filteredLeads, soundEnabled]);

  // Undo last quick-logged call
  const handleUndoLastCall = async () => {
    if (!lastLoggedUndo) return;
    const { leadId, prevStatus } = lastLoggedUndo;
    setLastLoggedUndo(null);
    startTransition(async () => {
      await updateStaffLeadAction(leadId, { status: prevStatus });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: prevStatus } : l))
      );
      setSelectedLeadId(leadId);
      showToast("↩ Call log undone. Returned to contact.");
    });
  };

  // Action 2: Save in CRM Queue Only (No Primary DB) + Advance to Next Lead
  const handleSaveInQueueAndNext = async () => {
    if (!currentLead) return;

    // Always log the call so the lead moves from NEW/ASSIGNED to CONTACTED/FOLLOW_UP
    const outcome: CallOutcome =
      callOutcome || (followUpDate ? "CALLBACK_REQUESTED" : "ANSWERED");
    const notesToSave =
      callNotes.trim() ||
      (callOutcome ? `Call logged: ${callOutcome.replace(/_/g, " ")}` : "Contacted via Calling Desk");

    logCallAndAdvance(outcome, notesToSave, followUpDate || null);
  };
  const handleSaveAndNext = handleSaveInQueueAndNext;

  const advanceToNextLead = () => {
    if (currentLeadIndex + 1 < filteredLeads.length) {
      setSelectedLeadId(filteredLeads[currentLeadIndex + 1].id);
    } else {
      showToast("🎉 Reached the end of this queue!");
    }
  };

  const advanceToPrevLead = () => {
    if (currentLeadIndex > 0) {
      setSelectedLeadId(filteredLeads[currentLeadIndex - 1].id);
    }
  };

  // Keyboard navigation & quick shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "ArrowDown" || e.key === "]" || (e.altKey && e.key === "ArrowRight") || e.key === "j" || e.key === "J") {
        e.preventDefault();
        advanceToNextLead();
      } else if (e.key === "ArrowUp" || e.key === "[" || (e.altKey && e.key === "ArrowLeft") || e.key === "k" || e.key === "K") {
        e.preventDefault();
        advanceToPrevLead();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          handleMoveToPrimaryAndNext();
        } else {
          handleSaveInQueueAndNext();
        }
      } else if (e.key === "c" || e.key === "C" || e.key === " ") {
        e.preventDefault();
        if (currentLead?.phone) {
          window.location.href = `tel:+91${currentLead.phone.replace(/\D/g, "").slice(-10)}`;
          showToast(`📞 Dialing ${formatPhoneNumber(currentLead.phone)}`);
        }
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (currentLead?.phone) {
          const waUrl = `https://wa.me/91${currentLead.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
            `Hello ${currentLead.name || "there"}, greetings from ApnaTutorHub! We are actively assigning tuitions in ${currentLead.location || "your locality"}. When is a convenient time to speak for 2 minutes? Thank you!`
          )}`;
          window.open(waUrl, "_blank", "noopener,noreferrer");
          showToast(`💬 Opened WhatsApp for ${currentLead.name || "Lead"}`);
        }
      } else if (e.key === "1") {
        e.preventDefault();
        setCallOutcome("ANSWERED");
        playChime("beep");
      } else if (e.key === "2") {
        e.preventDefault();
        setCallOutcome("CALLBACK_REQUESTED");
        playChime("beep");
      } else if (e.key === "3") {
        e.preventDefault();
        if (fastMode) {
          logCallAndAdvance("BUSY", "Line busy / call waiting");
        } else {
          setCallOutcome("BUSY");
          playChime("beep");
        }
      } else if (e.key === "4") {
        e.preventDefault();
        if (fastMode) {
          logCallAndAdvance("NO_ANSWER", "No answer / ringing");
        } else {
          setCallOutcome("NO_ANSWER");
          playChime("beep");
        }
      } else if (e.key === "5") {
        e.preventDefault();
        setCallOutcome("CONVERTED");
        playChime("fanfare");
      } else if (e.key === "6") {
        e.preventDefault();
        if (fastMode) {
          logCallAndAdvance("NOT_INTERESTED", "Not looking now / rejected");
        } else {
          setCallOutcome("NOT_INTERESTED");
          playChime("beep");
        }
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("calling-desk-search") as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setConsoleTab((prev) => (prev === "CALL" ? "PREVIEW" : "CALL"));
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setIsEditLeadModalOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentLeadIndex, filteredLeads, consoleTab, soundEnabled, callOutcome, callNotes, followUpDate, fastMode, logCallAndAdvance]);

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    startTransition(async () => {
      const res = await deleteStaffLeadAction(leadId);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        showToast("Lead deleted.");
      }
    });
  };

  // Move / Promote Lead to Primary Database (User Directory for Tutors, Live Requirement for Parents)
  const [isPromotingLead, setIsPromotingLead] = useState(false);
  const handlePromoteLead = async (lead: Lead) => {
    if (lead.isPromoted) {
      showToast("This lead is already moved to Primary platform.");
      return;
    }

    const isParent = getStaffRecordType(lead.staffNotes) === "PARENT";
    const confirmPrompt = isParent
      ? `Publish this student requirement to the live platform for ${lead.name || "this student"}?`
      : `Move ${lead.name || "this tutor"} to Primary User Directory and create live tutor profile?`;

    if (!confirm(confirmPrompt)) return;

    setIsPromotingLead(true);
    try {
      if (isParent) {
        const res = await promoteLeadToStudentRequirementAction(lead.id, callNotes.trim() || undefined);
        if (res.success && res.data) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id
                ? {
                    ...l,
                    isPromoted: true,
                    status: "CONVERTED" as StaffLeadStatus,
                    lastContactedAt: new Date().toISOString(),
                    _count: { callLogs: l._count.callLogs + 1 },
                  }
                : l
            )
          );
          playChime("fanfare");
          showToast(`✓ Published live student requirement #${res.data.inquiryNumber}!`);
        } else {
          alert(res.error || "Failed to publish student requirement.");
        }
      } else {
        const res = await promoteLeadToProfileAction(lead.id, callNotes.trim() || undefined);
        if (res.success && res.data) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id
                ? {
                    ...l,
                    isPromoted: true,
                    status: "CONVERTED" as StaffLeadStatus,
                    promotedTutorProfileId: res.data!.tutorProfileId,
                    lastContactedAt: new Date().toISOString(),
                    _count: { callLogs: l._count.callLogs + 1 },
                  }
                : l
            )
          );
          playChime("fanfare");
          showToast("✓ Tutor successfully moved to Primary User Directory!");
        } else {
          alert(res.error || "Failed to move tutor to Primary User Directory.");
        }
      }
    } catch (err: any) {
      alert(err?.message || "An error occurred while moving lead to Primary.");
    } finally {
      setIsPromotingLead(false);
    }
  };

  // Action 1: Move to Primary Database + Save Notes + Advance to Next Lead
  const handleMoveToPrimaryAndNext = async () => {
    if (!currentLead) return;
    const lead = currentLead;
    const leadId = lead.id;

    // If already on Primary platform, log notes if present, show confirmation, and advance
    if (lead.isPromoted) {
      if (callNotes.trim() || callOutcome) {
        const outcome = callOutcome || "CONVERTED";
        await logCallAction(leadId, outcome, callNotes.trim() || "Verified on Primary Platform");
      }
      showToast("✓ Lead already on Primary Platform. Advancing to next lead...");
      setCallOutcome(null);
      setCallNotes("");
      setFollowUpDate("");
      advanceToNextLead();
      return;
    }

    const isParent = getStaffRecordType(lead.staffNotes) === "PARENT";
    const notesToSave = callNotes.trim() || "Converted & verified via Calling Desk. Moved to Primary Platform.";

    setIsPromotingLead(true);
    try {
      if (isParent) {
        const res = await promoteLeadToStudentRequirementAction(leadId, notesToSave);
        if (res.success && res.data) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    isPromoted: true,
                    status: "CONVERTED" as StaffLeadStatus,
                    lastContactedAt: new Date().toISOString(),
                    _count: { callLogs: l._count.callLogs + 1 },
                  }
                : l
            )
          );
          playChime("fanfare");
          showToast(`🎉 Converted & published live requirement #${res.data.inquiryNumber}!`);
        } else {
          alert(res.error || "Failed to publish student requirement.");
          setIsPromotingLead(false);
          return;
        }
      } else {
        const res = await promoteLeadToProfileAction(leadId, notesToSave);
        if (res.success && res.data) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    isPromoted: true,
                    status: "CONVERTED" as StaffLeadStatus,
                    promotedTutorProfileId: res.data!.tutorProfileId,
                    lastContactedAt: new Date().toISOString(),
                    _count: { callLogs: l._count.callLogs + 1 },
                  }
                : l
            )
          );
          playChime("fanfare");
          showToast("🎉 Tutor converted & moved to Primary User Directory!");
        } else {
          alert(res.error || "Failed to move tutor to Primary User Directory.");
          setIsPromotingLead(false);
          return;
        }
      }

      // Clear draft states
      setCallOutcome(null);
      setCallNotes("");
      setFollowUpDate("");
      setLastWorkedLeadId(leadId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("crm_last_worked_id", leadId);
        } catch {}
      }

      // Advance automatically to the next lead
      advanceToNextLead();
    } catch (err: any) {
      alert(err?.message || "An error occurred while moving lead to Primary.");
    } finally {
      setIsPromotingLead(false);
    }
  };

  // Bulk status
  const handleBulkStatus = async (status: StaffLeadStatus) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const res = await bulkUpdateLeadStatusAction(ids, status);
      if (res.success) {
        setLeads((prev) => prev.map((l) => (selectedIds.has(l.id) ? { ...l, status } : l)));
        setSelectedIds(new Set());
        showToast(`Updated ${ids.length} leads to ${STATUS_META[status]?.label || status}`);
      }
    });
  };

  // Export Today's Calls CSV
  const handleExportTodayCsv = () => {
    const todayLogs = activityFeed;
    const headers = ["Lead Name", "Phone", "Location", "Caller", "Outcome", "Notes", "Called At"];
    const rows = todayLogs.map((log) => [
      log.lead?.name || "Lead",
      log.lead?.phone || "",
      log.lead?.location || "",
      log.calledBy?.name || log.calledBy?.email || "",
      log.outcome,
      log.notes || "",
      new Date(log.calledAt).toLocaleString("en-IN"),
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-daily-work-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported today's call logs to CSV!");
  };

  return (
    <div className="space-y-2 sm:space-y-2.5 lg:pb-8 text-slate-900">
      {/* ── Shift Gate & Activity Tracker ── */}
      <StaffShiftGate />

      {/* ── Floating Toast with Undo ── */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F2540] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-500/30 animate-in slide-in-from-bottom-5">
          <Sparkles size={14} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          {lastLoggedUndo && (
            <button
              onClick={() => handleUndoLastCall()}
              className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-amber-300 font-extrabold text-[11px] cursor-pointer"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── Calling Desk Command Bar (Responsive 2-row layout on mobile) ── */}
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs p-2.5 sm:px-3.5 sm:py-2 ${
        mobileView === "DETAIL" ? "hidden lg:flex" : "flex"
      } flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-3`}>
        {/* Stage Pills (smooth horizontal swipe on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar shrink-0">
          {(
            [
              { key: "ALL" as QueueTab, label: `All (${leads.length})` },
              { key: "FRESH" as QueueTab, label: `New (${stats.freshCount})` },
              {
                key: "FOLLOW_UP" as QueueTab,
                label: stats.dueNow > 0 ? `Callbacks (${stats.dueNow} Due)` : `Callbacks (${stats.followUps})`,
                alert: stats.dueNow > 0,
              },
              { key: "INTERESTED" as QueueTab, label: `Interested (${stats.interested})` },
              { key: "CONVERTED" as QueueTab, label: `Converted (${stats.converted})` },
              { key: "NO_ANSWER" as QueueTab, label: `Retries (${stats.retryCount})` },
              {
                key: "WORKED" as QueueTab,
                label: stats.workedToday > 0 ? `Worked (${stats.workedToday} Today)` : `Worked (${stats.totalWorked})`,
              },
            ] as Array<{ key: QueueTab; label: string; alert?: boolean }>
          ).map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-[#0F2540] text-white shadow-xs font-black"
                    : t.alert
                    ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-black"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions Row (Unified compact row on mobile) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="calling-desk-search"
              type="text"
              placeholder="Search leads (/)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 bg-slate-200/70 px-1 py-0.2 rounded pointer-events-none">
                /
              </kbd>
            )}
          </div>

          {/* Right: Shift Progress, Add Lead & Settings */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {/* Shift Progress Pill (Full on desktop, compact on mobile) */}
            <button
              type="button"
              onClick={() => {
                setIsProgressModalOpen(true);
                fetchProgressReport();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0F2540] text-xs font-black cursor-pointer shadow-2xs transition-all shrink-0"
              title="View Today's Progress & Call Log"
            >
              <TrendingUp size={13} className="text-[#2D9E6B]" />
              <span>Shift: <strong className="text-emerald-800">{stats.workedToday}</strong> Calls</span>
              {stats.converted > 0 && (
                <span className="text-[10px] bg-[#2D9E6B] text-white px-1.5 py-0.2 rounded-md font-black">
                  {stats.converted}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsNewLeadModalOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#0F2540] hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
              title="Add a new lead"
            >
              <Plus size={14} />
              <span className="hidden xs:inline">Add Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 shrink-0"
              title="Desk Settings"
            >
              <Settings size={15} />
            </button>

          {isSettingsOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-40 space-y-1 text-xs font-bold animate-in fade-in">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsProgressModalOpen(true);
                  fetchProgressReport();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
              >
                <TrendingUp size={14} className="text-emerald-600" />
                <span>My Shift Progress &amp; Call Log</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSoundEnabled((prev) => !prev);
                  showToast(soundEnabled ? "Audio chimes muted" : "Audio chimes enabled");
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 size={14} className="text-emerald-600" /> : <VolumeX size={14} />}
                  <span>Sound Chimes</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{soundEnabled ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsShortcutsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
              >
                <Keyboard size={14} className="text-slate-500" />
                <span>Shortcuts Cheatsheet (?)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  handleExportTodayCsv();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
              >
                <Download size={14} className="text-slate-500" />
                <span>Export Today's Calls CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ── Mobile Queue vs Calling Desk Switcher (Phones / Small Screens) ── */}
      <div className={`lg:hidden ${
        mobileView === "DETAIL" ? "hidden" : "flex"
      } items-center p-1 bg-slate-200/90 rounded-2xl mb-3 border border-slate-300 shadow-2xs`}>
        <button
          type="button"
          onClick={() => setMobileView("QUEUE")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileView === "QUEUE"
              ? "bg-[#0F2540] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Filter size={13} />
          <span>Queue ({filteredLeads.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("DETAIL")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileView === "DETAIL"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <PhoneCall size={13} />
          <span>
            Calling Desk {currentLead ? `(${currentLeadIndex + 1}/${filteredLeads.length})` : ""}
          </span>
        </button>
      </div>

      {/* ── 2-Column Split Calling Desk ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Lead Queue List (5 cols) */}
        <div className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${
          mobileView === "DETAIL" ? "hidden lg:flex" : "flex"
        } flex-col h-[calc(100dvh-180px)] sm:h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] min-h-0 lg:min-h-[460px]`}>
          {/* List Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="font-extrabold text-[#0F2540] flex items-center gap-2">
              <span>Queue</span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-bold">
                {filteredLeads.length}
              </span>
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
              {(["ALL", "TUTOR", "PARENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                    typeFilter === t ? "bg-[#0F2540] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t === "ALL" ? "All" : t === "TUTOR" ? "Tutors" : "Parents"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Last Worked Quick-Resume Banner ── */}
          {lastWorkedLead && (
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 transition-colors shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 shrink-0 text-xs">🕒</span>
                <div className="min-w-0 truncate">
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Last Worked: </span>
                  <span className="font-black text-slate-800 text-xs">
                    {lastWorkedLead.name && lastWorkedLead.name !== "Unknown Contact"
                      ? lastWorkedLead.name
                      : formatPhoneNumber(lastWorkedLead.phone)}
                  </span>
                  {lastWorkedLead.lastContactedAt && (
                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                      • {timeAgo(lastWorkedLead.lastContactedAt)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== "ALL" && !filteredLeads.some((l) => l.id === lastWorkedLead.id)) {
                    setActiveTab("ALL");
                  }
                  setSelectedLeadId(lastWorkedLead.id);
                  setMobileView("DETAIL");
                  showToast(`Resumed: ${lastWorkedLead.name || formatPhoneNumber(lastWorkedLead.phone)}`);
                }}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#0F2540] text-[10px] font-black shrink-0 cursor-pointer shadow-2xs transition-all flex items-center gap-1 ml-2"
                title="Jump to last worked lead"
              >
                <span>Resume</span>
                <ArrowRight size={10} />
              </button>
            </div>
          )}

          {/* Dedicated Retry Sub-Filters */}
          {activeTab === "NO_ANSWER" && (
            <div className="p-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 shrink-0">
              <div className="flex items-center gap-1 flex-wrap text-[10px] font-bold">
                {[
                  { key: "ALL", label: `All (${stats.retryCount})` },
                  { key: "NEVER_ANSWERED", label: `Never Reached (${stats.retryNeverAnswered})` },
                  { key: "ATTEMPT_1", label: `Attempt 1 (${stats.retryAttempt1})` },
                  { key: "ATTEMPT_2", label: `Attempt 2 (${stats.retryAttempt2})` },
                  { key: "ATTEMPT_3_PLUS", label: `Attempt 3+ (${stats.retryAttempt3Plus})` },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setRetryFilter(chip.key as any)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      retryFilter === chip.key
                        ? "bg-[#0F2540] text-white shadow-2xs font-black"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scrollable Lead Cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredLeads.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <UserCheck size={36} className="mx-auto mb-2 opacity-30 text-[#0F2540]" />
                <p className="font-bold text-xs">No leads matching this filter</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = lead.id === currentLead?.id;
                const isDue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date();
                const isFresh = (lead.status === "NEW" || lead.status === "ASSIGNED") && !lead.lastContactedAt;
                const recType = getStaffRecordType(lead.staffNotes);
                const hasCustomName = Boolean(lead.name && lead.name.trim() !== "Unknown Contact");

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      setMobileView("DETAIL");
                    }}
                    className={`p-3 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-600 shadow-2xs ring-1 ring-emerald-500/20"
                        : "hover:bg-slate-50/80 border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                          recType === "PARENT"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {recType === "PARENT" ? "P" : "T"}
                      </div>

                      {/* Middle Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-[#0F2540] truncate">
                            {hasCustomName ? lead.name : formatPhoneNumber(lead.phone)}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                              recType === "PARENT"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {recType === "PARENT" ? "Parent" : "Tutor"}
                          </span>
                          {lead.isPromoted && (
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                              ✓ Primary
                            </span>
                          )}
                          {isFresh && !lead.isPromoted && (
                            <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                              New
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-semibold truncate">
                          {hasCustomName && lead.phone && (
                            <>
                              <span className="font-mono text-slate-700 font-bold">{formatPhoneNumber(lead.phone)}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="truncate">{lead.location || "Area unassigned"}</span>
                          {lead.lastContactedAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold text-[10px] shrink-0">
                                🕒 {timeAgo(lead.lastContactedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            lead.status === "CONVERTED"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : lead.status === "INTERESTED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : lead.status === "FOLLOW_UP"
                              ? isDue
                                ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                              : lead.status === "NO_ANSWER"
                              ? "bg-orange-50 text-orange-800 border border-orange-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {lead.status === "FOLLOW_UP"
                            ? isDue
                              ? "🚨 Due"
                              : "Callback"
                            : STATUS_META[lead.status]?.label || lead.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Calling Workspace & Console (7 cols) */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${
          mobileView === "QUEUE" ? "hidden lg:flex" : "flex"
        } flex-col h-[calc(100dvh-125px)] sm:h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] min-h-0 lg:min-h-[460px]`}>
          {currentLead ? (
            <>
              {/* Mobile Quick Navigation Bar */}
              <div className="lg:hidden px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMobileView("QUEUE")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs shadow-2xs active:scale-95 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Queue ({filteredLeads.length})</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={advanceToPrevLead}
                    disabled={currentLeadIndex === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-30 cursor-pointer text-white"
                    title="Previous Lead"
                  >
                    ← Prev
                  </button>
                  <span className="text-[11px] font-mono font-black text-emerald-400 px-1.5">
                    {currentLeadIndex + 1}/{filteredLeads.length}
                  </span>
                  <button
                    type="button"
                    onClick={advanceToNextLead}
                    disabled={currentLeadIndex + 1 >= filteredLeads.length}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-30 cursor-pointer text-white"
                    title="Next Lead"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Sticky Contact Header (Clean, Compact, Non-overlapping) */}
              <div className="p-2.5 sm:p-3.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shadow-2xs shrink-0 ${
                        getStaffRecordType(currentLead.staffNotes) === "PARENT"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {getStaffRecordType(currentLead.staffNotes) === "PARENT" ? "P" : "T"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm sm:text-base font-black text-[#0F2540] tracking-tight truncate">
                          {currentLead.name && currentLead.name !== "Unknown Contact"
                            ? currentLead.name
                            : formatPhoneNumber(currentLead.phone)}
                        </h2>
                        <span
                          className={`text-[9px] sm:text-xs font-black px-1.5 py-0.2 rounded-full ${
                            getStaffRecordType(currentLead.staffNotes) === "PARENT"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          }`}
                        >
                          {getStaffRecordType(currentLead.staffNotes) === "PARENT" ? "Parent" : "Tutor"}
                        </span>
                      </div>

                      {currentLead.name && currentLead.name !== "Unknown Contact" && currentLead.phone && (
                        <p className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 truncate">
                          {formatPhoneNumber(currentLead.phone)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Tools */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!currentLead.isPromoted ? (
                      <button
                        type="button"
                        onClick={() => handlePromoteLead(currentLead)}
                        disabled={isPromotingLead}
                        className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50 active:scale-95"
                        title={
                          getStaffRecordType(currentLead.staffNotes) === "PARENT"
                            ? "Publish live student requirement to platform"
                            : "Move tutor to Primary User Directory"
                        }
                      >
                        {isPromotingLead ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        <span className="hidden sm:inline">Move to Primary</span>
                      </button>
                    ) : (
                      <span className="p-1 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span className="hidden sm:inline">Primary ✓</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsEditLeadModalOpen(true)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Edit details (E)"
                    >
                      <Edit3 size={13} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLead(currentLead.id)}
                      className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Delete lead"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Info Bar: Location & Subjects */}
                <div className="text-[10px] sm:text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 flex-wrap bg-white/80 px-2 py-1 rounded-xl border border-slate-200/80">
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[130px] sm:max-w-none">{currentLead.location || "Location not recorded"}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 min-w-0 flex-1">
                    <BookOpen size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{currentLead.subjects.length > 0 ? currentLead.subjects.join(", ") : "General Subjects"}</span>
                  </span>
                  {currentLead.experienceYears && <span>• {currentLead.experienceYears}y exp</span>}
                </div>

                {/* Primary Action Buttons: Call & WhatsApp */}
                {currentLead.phone ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <a
                      href={`tel:+91${currentLead.phone.replace(/\D/g, "").slice(-10)}`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-all active:scale-[0.98]"
                      title="Direct call (C or Space)"
                    >
                      <PhoneCall size={15} />
                      <span>Call {formatPhoneNumber(currentLead.phone)}</span>
                    </a>

                    <a
                      href={`https://wa.me/91${currentLead.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                        `Hello ${currentLead.name || "there"}, greetings from ApnaTutorHub! We are actively assigning tuitions in ${
                          currentLead.location || "your locality"
                        }. Are you available for new tuition students this week?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] shrink-0"
                      title="Send WhatsApp message (W)"
                    >
                      <MessageCircle size={15} />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => copyPhone(currentLead.phone!, currentLead.id)}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Copy phone number"
                    >
                      {copiedId === currentLead.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-100 text-center text-xs font-bold text-slate-500">
                    No phone number recorded for this lead
                  </div>
                )}

                {/* Tab Switcher: Console vs Live Preview */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-[11px] sm:text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setConsoleTab("CALL")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        consoleTab === "CALL"
                          ? "bg-white text-[#0F2540] shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ⚡ Call Console
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsoleTab("PREVIEW")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        consoleTab === "PREVIEW"
                          ? "bg-white text-[#0F2540] shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Eye size={12} />
                      <span>Live {getStaffRecordType(currentLead.staffNotes) === "PARENT" ? "Parent" : "Tutor"} View</span>
                    </button>
                  </div>

                  {currentLead.isPromoted && (
                    <span className="text-[9px] sm:text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Live on Platform
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Body Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {consoleTab === "PREVIEW" ? (
                  <StaffLeadLivePreview
                    lead={currentLead}
                    onLeadPromoted={(upd) => {
                      setLeads((prev) =>
                        prev.map((l) => (l.id === currentLead.id ? ({ ...l, ...upd } as any) : l))
                      );
                    }}
                  />
                ) : (
                  <>
                    {/* Call Outcomes 3x2 Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <span>Call Outcomes</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">(Keys 1–6)</span>
                        </label>
                        {callOutcome && (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Selected: {OUTCOMES.find((o) => o.outcome === callOutcome)?.label}
                          </span>
                        )}
                      </div>

                      {/* 3x2 tactile grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        {OUTCOMES.map((item) => {
                          const isSelected = callOutcome === item.outcome;
                          const isInstantAdvance = item.outcome === "NO_ANSWER" || item.outcome === "BUSY" || item.outcome === "NOT_INTERESTED";

                          return (
                            <button
                              key={item.outcome}
                              type="button"
                              onClick={() => {
                                if (isInstantAdvance) {
                                  logCallAndAdvance(
                                    item.outcome,
                                    item.outcome === "NO_ANSWER"
                                      ? "No answer / ringing"
                                      : item.outcome === "BUSY"
                                      ? "Line busy / call waiting"
                                      : "Not interested at this time"
                                  );
                                } else {
                                  setCallOutcome(item.outcome);
                                  if (item.outcome === "CONVERTED") playChime("fanfare");
                                  else playChime("beep");
                                }
                              }}
                              className={`relative p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 sm:gap-1.5 group ${
                                isSelected
                                  ? `${item.activeClass} scale-[1.02]`
                                  : `${item.defaultClass} hover:scale-[1.01]`
                              }`}
                            >
                              <span
                                className={`absolute top-1.5 right-1.5 text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                                  isSelected ? "bg-black/20 text-white" : "bg-white/80 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {item.shortcut}
                              </span>

                              <span className="text-xl group-hover:scale-110 transition-transform">
                                {item.emoji}
                              </span>
                              <span className="text-xs font-extrabold text-center leading-tight">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Callback Schedule Presets */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Schedule Callback / Follow-Up:</span>
                        {followUpDate && (
                          <button
                            type="button"
                            onClick={() => setFollowUpDate("")}
                            className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                          >
                            Clear Schedule
                          </button>
                        )}
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: "+2 Hours", fn: () => new Date(Date.now() + 2 * 3600000) },
                          {
                            label: "Tomorrow 10 AM",
                            fn: () => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(10, 0, 0, 0);
                              return d;
                            },
                          },
                          {
                            label: "Tomorrow 5 PM",
                            fn: () => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(17, 0, 0, 0);
                              return d;
                            },
                          },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setFollowUpDate(preset.fn().toISOString().slice(0, 16))}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer border border-slate-200/60 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                        <input
                          type="datetime-local"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Quick Notes */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Call Notes &amp; Follow-up Details:
                      </label>
                      <textarea
                        rows={2}
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="Add notes from this call (e.g. parent fee budget, preferred timings, verified degree)..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white resize-none bg-slate-50/50"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {QUICK_NOTE_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setCallNotes((prev) => (prev ? `${prev}, ${chip}` : chip))}
                            className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200/60 transition-colors"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Past Conversation Timeline */}
                    <div className="pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-700 transition-colors cursor-pointer border border-slate-200/60"
                      >
                        <span className="flex items-center gap-1.5">
                          <History size={14} className="text-slate-500" />
                          <span>Past Call History ({callLogs.length})</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {showHistory ? "▲ Hide" : "▼ View"}
                        </span>
                      </button>
                      {showHistory && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 animate-in fade-in-50">
                          {loadingLogs ? (
                            <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" /> Loading conversation logs...
                            </div>
                          ) : callLogs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic p-2">No past conversations recorded yet for this contact.</p>
                          ) : (
                            callLogs.map((log) => (
                              <div
                                key={log.id}
                                className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-[#0F2540] flex items-center gap-1">
                                    <span>💬</span>
                                    <span>{log.outcome.replace(/_/g, " ")}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {new Date(log.calledAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {log.notes && (
                                  <p className="text-slate-700 font-medium bg-white/80 p-1.5 rounded-lg border border-slate-200/50">
                                    {log.notes}
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Staff: {log.calledBy?.name || log.calledBy?.email || "Agent"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Desktop Sticky Action Footer */}
              <div className="hidden lg:flex p-3 bg-white border-t border-slate-200 items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={advanceToPrevLead}
                    disabled={currentLeadIndex === 0}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Previous Lead (↑ or [)"
                  >
                    <ArrowLeft size={13} />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={advanceToNextLead}
                    disabled={currentLeadIndex + 1 >= filteredLeads.length}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Next Lead (↓ or ])"
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>

                  <span className="text-xs font-bold text-slate-500 ml-1">
                    Lead {currentLeadIndex + 1} of {filteredLeads.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {callOutcome && (
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hidden xl:inline-block">
                      {callOutcome.replace(/_/g, " ")}
                    </span>
                  )}

                  {/* ── BUTTON 1: Move/Save to Primary Database + Advance to Next Lead ── */}
                  <button
                    type="button"
                    disabled={isPending || isPromotingLead}
                    onClick={handleMoveToPrimaryAndNext}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 text-left border ${
                      currentLead.isPromoted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-200"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-violet-500 shadow-violet-200"
                    }`}
                    title="Moves lead to Primary Database (creates live User Directory profile or student requirement) + marks Converted in CRM queue + advances to next lead (Hotkey: Shift+Enter)"
                  >
                    {isPromotingLead ? (
                      <Loader2 size={16} className="animate-spin shrink-0" />
                    ) : currentLead.isPromoted ? (
                      <CheckCircle2 size={16} className="text-emerald-200 shrink-0" />
                    ) : (
                      <Sparkles size={16} className="text-amber-300 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>
                          {currentLead.isPromoted
                            ? "🚀 Primary DB ✓ & Next Lead"
                            : "🚀 Move to Primary & Next Lead"}
                        </span>
                        <kbd className="hidden sm:inline-block text-[9px] font-mono bg-white/20 px-1 py-0.2 rounded text-violet-100">
                          ⇧ Enter
                        </kbd>
                      </div>
                      <div className="text-[9px] opacity-90 font-medium tracking-tight">
                        {currentLead.isPromoted
                          ? "Already in Live Database • Advance"
                          : "Save in Primary DB + Queue Converted"}
                      </div>
                    </div>
                  </button>

                  {/* ── BUTTON 2: Save in CRM Queue Only (No Primary DB) + Advance to Next Lead ── */}
                  <button
                    type="button"
                    disabled={isPending || isPromotingLead}
                    onClick={handleSaveInQueueAndNext}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 text-left border ${
                      callOutcome || callNotes || followUpDate
                        ? "bg-[#0F2540] hover:bg-slate-900 text-white border-slate-700 ring-2 ring-slate-400/20"
                        : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                    }`}
                    title="Keeps contact in CRM queue for follow-up (does NOT add to primary database) + advances to next lead (Hotkey: Enter)"
                  >
                    <Clock size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>⏳ Save in Queue &amp; Next Lead</span>
                        <kbd className="hidden sm:inline-block text-[9px] font-mono bg-white/20 px-1 py-0.2 rounded text-slate-200">
                          Enter
                        </kbd>
                      </div>
                      <div className="text-[9px] text-slate-300 font-medium tracking-tight">
                        Keep in CRM Queue (No Primary DB)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile Ergonomic Action Footer (Both full buttons always visible and clearly labeled) */}
              <div className="lg:hidden p-2 bg-white border-t border-slate-200 shrink-0 shadow-lg space-y-1.5">
                {/* ── BUTTON 1: Move/Save to Primary Database + Advance to Next Lead ── */}
                <button
                  type="button"
                  disabled={isPending || isPromotingLead}
                  onClick={handleMoveToPrimaryAndNext}
                  className={`w-full py-2 px-3 rounded-xl font-black text-xs shadow-xs flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 text-left border ${
                    currentLead.isPromoted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-100"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-violet-500 shadow-violet-100"
                  }`}
                  title="Moves lead to Primary Database + marks Converted + advances to next lead"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isPromotingLead ? (
                      <Loader2 size={15} className="animate-spin shrink-0" />
                    ) : currentLead.isPromoted ? (
                      <CheckCircle2 size={15} className="text-emerald-200 shrink-0" />
                    ) : (
                      <Sparkles size={15} className="text-amber-300 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-black text-xs truncate">
                        {currentLead.isPromoted
                          ? "🚀 Primary DB ✓ & Next Lead"
                          : "🚀 Move to Primary & Next Lead"}
                      </div>
                      <div className="text-[9px] opacity-85 font-medium truncate">
                        {currentLead.isPromoted
                          ? "Already in Live Database • Advance"
                          : "Save in Primary DB + Queue Converted"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="shrink-0 opacity-80 ml-1" />
                </button>

                {/* ── BUTTON 2: Save in CRM Queue Only (No Primary DB) + Advance to Next Lead ── */}
                <button
                  type="button"
                  disabled={isPending || isPromotingLead}
                  onClick={handleSaveInQueueAndNext}
                  className="w-full py-2 px-3 rounded-xl bg-[#0F2540] hover:bg-slate-900 active:bg-black text-white font-black text-xs shadow-xs flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 border border-slate-700"
                  title="Keeps contact in CRM queue for follow-up + advances to next lead"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={15} className="text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-black text-xs truncate">
                        ⏳ Save in Queue &amp; Next Lead
                      </div>
                      <div className="text-[9px] text-slate-300 font-medium truncate">
                        Keep in CRM Queue (No Primary DB)
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-slate-400 ml-1" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <p className="font-extrabold text-sm">Select a lead from the queue to start calling</p>
              <button
                type="button"
                onClick={() => setMobileView("QUEUE")}
                className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Browse Queue</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── World-Class Power Dialer ── */}
      {isPowerDialing && filteredLeads.length > 0 && (
        <StaffPowerDialer
          leads={filteredLeads}
          initialIndex={powerDialIndex}
          onClose={() => setIsPowerDialing(false)}
          onLeadUpdated={(leadId, upd) => {
            setLeads((prev) =>
              prev.map((l) => (l.id === leadId ? ({ ...l, ...upd } as any) : l))
            );
          }}
        />
      )}

      {/* ── New Lead Modal (Full CRUD: Create) ── */}
      {isNewLeadModalOpen && (
        <CreateLeadModalCustom
          onClose={() => setIsNewLeadModalOpen(false)}
          onCreated={(newLead) => {
            setLeads((prev) => [newLead, ...prev]);
            setSelectedLeadId(newLead.id);
            setMobileView("DETAIL");
            setIsNewLeadModalOpen(false);
            showToast("New lead added to queue!");
          }}
        />
      )}

      {/* ── Edit Lead Modal (Full CRUD: Update) ── */}
      {isEditLeadModalOpen && currentLead && (
        <EditLeadModalCustom
          lead={currentLead}
          onClose={() => setIsEditLeadModalOpen(false)}
          onUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
            setIsEditLeadModalOpen(false);
            showToast("Lead details updated!");
          }}
        />
      )}

      {/* ── Keyboard Shortcuts Guide Modal ── */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-emerald-600" />
                <h3 className="text-base font-black text-[#0F2540]">Calling Desk Shortcuts</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Advance to Next Lead</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">↓ or Alt + →</kbd>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Return to Previous Lead</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">↑ or Alt + ←</kbd>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Save Outcome &amp; Next</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">Enter</kbd>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Quick Outcomes</span>
                <span className="font-mono text-[11px] font-bold text-slate-600">Keys 1 to 6</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Toggle Public Live Preview</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">P</kbd>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Edit Lead Information</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">E</kbd>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-700">Toggle Shortcuts Cheatsheet</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-black shadow-2xs">?</kbd>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-black cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shift Progress & Call Log Modal ── */}
      {isProgressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#0F2540]">My Shift Progress &amp; Call History</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Session duration: {elapsedTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTodayCsv}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProgressModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Shift Scorecard */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white border-b border-slate-100 shrink-0">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Calls Today</span>
                <span className="text-xl font-black text-[#0F2540]">{stats.workedToday}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
                <span className="text-[10px] font-black uppercase text-emerald-700 block">Answered / Spoke</span>
                <span className="text-xl font-black text-emerald-900">{progressData?.summary.answered ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/80 text-center">
                <span className="text-[10px] font-black uppercase text-blue-700 block">Callbacks Set</span>
                <span className="text-xl font-black text-blue-900">{stats.dueNow + stats.followUps}</span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200/80 text-center">
                <span className="text-[10px] font-black uppercase text-purple-700 block">Converted</span>
                <span className="text-xl font-black text-purple-900">{stats.converted}</span>
              </div>
            </div>

            {/* Chronological Recent Calls Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs font-black text-slate-700">
                <span>Recent Calls Log ({progressData?.logs?.length || 0})</span>
                <button
                  type="button"
                  onClick={fetchProgressReport}
                  disabled={loadingProgress}
                  className="text-[11px] text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 font-bold"
                >
                  <RefreshCcw size={11} className={loadingProgress ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingProgress ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs font-bold">Loading your call history...</p>
                </div>
              ) : !progressData?.logs || progressData.logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <Clock size={28} className="mx-auto mb-1.5 opacity-40 text-slate-500" />
                  <p className="text-xs font-bold text-slate-600">No calls logged yet in this shift</p>
                  <p className="text-[11px] text-slate-400 mt-1">Start dialing from the Calling Desk to see your live progress here!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {progressData.logs.map((log) => {
                    const outcomeMeta = OUTCOMES.find((o) => o.outcome === log.outcome);
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[#0F2540]">
                              {log.lead?.name || formatPhoneNumber(log.lead?.phone) || "Lead"}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${outcomeMeta?.defaultClass || "bg-slate-100 text-slate-700"}`}>
                              {outcomeMeta?.emoji || "📞"} {outcomeMeta?.label || log.outcome}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {timeAgo(log.calledAt)} ({new Date(log.calledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-[11px] text-slate-600 font-medium mt-1 truncate">
                              &ldquo;{log.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        {log.lead?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadId(log.lead.id);
                              setMobileView("DETAIL");
                              if (activeTab !== "ALL" && !filteredLeads.some((l) => l.id === log.lead.id)) {
                                setActiveTab("ALL");
                              }
                              setIsProgressModalOpen(false);
                              showToast(`Opened ${log.lead.name || "Lead"}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F2540] hover:text-white text-[#0F2540] font-extrabold text-[11px] transition-colors cursor-pointer shrink-0"
                          >
                            Open Lead &rarr;
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Custom Create Modal ── */
function CreateLeadModalCustom({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [recordType, setRecordType] = useState<"TUTOR" | "PARENT">("TUTOR");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [gender, setGender] = useState("");
  const [board, setBoard] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [staffNotes, setStaffNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CLASS_OPTIONS = [
    "Class 1-5",
    "Class 6-8",
    "Class 9-10",
    "Class 11-12",
    "Graduation",
    "Competitive Exams",
  ];

  const toggleClass = (cls: string) => {
    if (classes.includes(cls)) {
      setClasses(classes.filter((c) => c !== cls));
    } else {
      setClasses([...classes, cls]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const res = await createSingleStaffLeadAction({
      name,
      phone,
      altPhone: altPhone || undefined,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      location: location || undefined,
      fullAddress: fullAddress || undefined,
      pincode: pincode || undefined,
      qualification: qualification || undefined,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      gender: gender || undefined,
      board: board || undefined,
      classes,
      subjects,
      recordType,
      staffNotes: staffNotes || undefined,
    });
    setIsSubmitting(false);
    if (res.success && res.data) {
      onCreated({ ...res.data.lead, _count: { callLogs: 0 } });
    } else {
      setError(res.error || "Failed to create lead");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-[#0F2540]">Add New Lead to Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter contact information, location, and teaching profile</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Role Segment */}
          <div>
            <label className="block font-black text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
              Lead Role:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecordType("TUTOR")}
                className={`py-2 px-3 rounded-xl font-black cursor-pointer border text-center transition-all ${
                  recordType === "TUTOR"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Teacher / Tutor Profile
              </button>
              <button
                type="button"
                onClick={() => setRecordType("PARENT")}
                className={`py-2 px-3 rounded-xl font-black cursor-pointer border text-center transition-all ${
                  recordType === "PARENT"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Student / Parent Enquiry
              </button>
            </div>
          </div>

          {/* Section 1: Contact & Identity */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <span>Contact &amp; Identity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp number"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="Optional backup number"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@email.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Address */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-black text-slate-900 text-xs">Location &amp; Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. South Delhi, Rohini, Indirapuram"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 110001"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Street Address</label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="House/Flat number, building, landmark"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
              />
            </div>
          </div>

          {/* Section 3: Profile & Academics */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-black text-slate-900 text-xs">Profile &amp; Academics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qualification</label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate</option>
                  <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                  <option value="B.Sc Mathematics">B.Sc Mathematics</option>
                  <option value="M.Sc Physics">M.Sc Physics</option>
                  <option value="B.Com / M.Com">B.Com / M.Com</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="Ph.D">Ph.D</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Board</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                  <option value="IB / Cambridge">IB / Cambridge</option>
                  <option value="All Boards">All Boards</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Classes:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = classes.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#0F2540] text-white border-[#0F2540]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Teaching Subjects */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-black text-slate-900 text-xs">
              Teaching Subjects:
            </label>
            <SubjectTaxonomyPicker
              selectedSubjects={subjects}
              onChange={setSubjects}
            />
          </div>

          {/* Section 5: Staff Notes & Remarks */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-700 text-xs">
              Call Notes &amp; Conversation Remarks:
            </label>
            <textarea
              rows={2}
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="What did the candidate say? (e.g. fees discussed, preferred class, timing)..."
              className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-[#0F2540] text-xs"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {[
                "Spoke & interested",
                "Callback tomorrow",
                "Wants home tuition",
                "Wants online classes",
                "Fees agreed",
                "Details verified",
                "Wrong number",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setStaffNotes((prev) => (prev ? `${prev}, ${chip}` : chip))
                  }
                  className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200/80 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting ? "Creating..." : "Save to Queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Custom Edit Modal ── */
function EditLeadModalCustom({
  lead,
  onClose,
  onUpdated,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdated: (updated: Partial<Lead>) => void;
}) {
  const [name, setName] = useState(lead.name || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [altPhone, setAltPhone] = useState(lead.altPhone || "");
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || lead.phone || "");
  const [email, setEmail] = useState(lead.email || "");
  const [location, setLocation] = useState(lead.location || "");
  const [fullAddress, setFullAddress] = useState(lead.fullAddress || "");
  const [pincode, setPincode] = useState(lead.pincode || "");
  const [qualification, setQualification] = useState(lead.qualification || "");
  const [experienceYears, setExperienceYears] = useState<string>(
    lead.experienceYears !== null && lead.experienceYears !== undefined ? String(lead.experienceYears) : ""
  );
  const [gender, setGender] = useState(lead.gender || "");
  const [board, setBoard] = useState(lead.board || "");
  const [classes, setClasses] = useState<string[]>(lead.classes || []);
  const [subjects, setSubjects] = useState<string[]>(lead.subjects || []);
  const [status, setStatus] = useState<StaffLeadStatus>(lead.status);
  const [priority, setPriority] = useState(lead.priority || 0);
  const [staffNotes, setStaffNotes] = useState(lead.staffNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isParent = getStaffRecordType(staffNotes || lead.staffNotes) === "PARENT";

  const CLASS_OPTIONS = [
    "Class 1-5",
    "Class 6-8",
    "Class 9-10",
    "Class 11-12",
    "Graduation",
    "Competitive Exams",
  ];

  const toggleClass = (cls: string) => {
    if (classes.includes(cls)) {
      setClasses(classes.filter((c) => c !== cls));
    } else {
      setClasses([...classes, cls]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const res = await updateStaffLeadAction(lead.id, {
      name,
      phone,
      altPhone: altPhone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      location: location || null,
      fullAddress: fullAddress || null,
      pincode: pincode || null,
      qualification: qualification || null,
      experienceYears: experienceYears ? Number(experienceYears) : null,
      gender: gender || null,
      board: board || null,
      classes,
      subjects,
      status,
      priority,
      staffNotes: staffNotes || null,
    });
    setIsSubmitting(false);
    if (res.success && res.data) {
      onUpdated(res.data.lead);
    } else {
      setError(res.error || "Failed to save changes");
    }
  };

  const handlePromoteToPrimary = async () => {
    if (lead.isPromoted) return;

    const confirmPrompt = isParent
      ? `Publish this student requirement to the live platform for ${name || lead.name || "this student"}?`
      : `Move ${name || lead.name || "this tutor"} to Primary User Directory and create live tutor profile?`;

    if (!confirm(confirmPrompt)) return;

    setIsPromoting(true);
    setError(null);
    try {
      // 1. Auto-save current edits first so the primary profile has latest verified data
      const saveRes = await updateStaffLeadAction(lead.id, {
        name,
        phone,
        altPhone: altPhone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        location: location || null,
        fullAddress: fullAddress || null,
        pincode: pincode || null,
        qualification: qualification || null,
        experienceYears: experienceYears ? Number(experienceYears) : null,
        gender: gender || null,
        board: board || null,
        classes,
        subjects,
        status: "CONVERTED",
        priority,
        staffNotes: staffNotes || null,
      });

      if (!saveRes.success) {
        setError(saveRes.error || "Failed to save lead updates before moving to primary.");
        setIsPromoting(false);
        return;
      }

      // 2. Promote to primary live platform
      if (isParent) {
        const promoRes = await promoteLeadToStudentRequirementAction(lead.id);
        if (promoRes.success && promoRes.data) {
          onUpdated({
            ...saveRes.data!.lead,
            isPromoted: true,
            status: "CONVERTED",
          });
          onClose();
        } else {
          setError(promoRes.error || "Failed to publish student requirement.");
        }
      } else {
        const promoRes = await promoteLeadToProfileAction(lead.id);
        if (promoRes.success && promoRes.data) {
          onUpdated({
            ...saveRes.data!.lead,
            isPromoted: true,
            status: "CONVERTED",
            promotedTutorProfileId: promoRes.data.tutorProfileId,
          });
          onClose();
        } else {
          setError(promoRes.error || "Failed to move tutor to Primary User Directory.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while moving lead to primary.");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#0F2540]">Edit Lead Details</h3>
              {lead.isPromoted ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  <span>On Primary Platform</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {isParent ? "Student Lead" : "Tutor Lead"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Update contact info, location, profile &amp; teaching subjects
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Contact & Identity */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <span>Contact &amp; Identity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Primary phone"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp number"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="Backup contact number"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@email.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Address */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-black text-slate-900 text-xs">Location &amp; Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. South Delhi, Rohini, Indirapuram"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 110001"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Street Address</label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="House/Flat number, building, street, landmark"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
              />
            </div>
          </div>

          {/* Section 3: Profile & Academics */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-black text-slate-900 text-xs">Profile &amp; Academics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qualification</label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate</option>
                  <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                  <option value="B.Sc Mathematics">B.Sc Mathematics</option>
                  <option value="M.Sc Physics">M.Sc Physics</option>
                  <option value="B.Com / M.Com">B.Com / M.Com</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="Ph.D">Ph.D</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Board</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="">Select...</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                  <option value="IB / Cambridge">IB / Cambridge</option>
                  <option value="All Boards">All Boards</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Classes:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = classes.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#0F2540] text-white border-[#0F2540]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Teaching Subjects */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-black text-slate-900 text-xs">
              Teaching Subjects:
            </label>
            <SubjectTaxonomyPicker
              selectedSubjects={subjects}
              onChange={setSubjects}
            />
          </div>

          {/* Section 5: Call Disposition, Urgency & Staff Remarks */}
          <div className="space-y-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <span>Call Disposition &amp; Remarks</span>
                <span className="text-[10px] font-medium text-slate-400">
                  (How did the call go?)
                </span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Staff Review
              </span>
            </div>

            {/* Quick Status Selection Pills */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 text-[11px]">
                Lead Status / Call Result:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  {
                    val: "NEW" as StaffLeadStatus,
                    label: "Fresh Lead",
                    emoji: "🆕",
                    active: "bg-blue-600 text-white border-blue-700 shadow-2xs ring-2 ring-blue-500/20",
                    idle: "bg-blue-50/70 hover:bg-blue-100 text-blue-900 border-blue-200",
                  },
                  {
                    val: "CONTACTED" as StaffLeadStatus,
                    label: "Spoke / Connected",
                    emoji: "📞",
                    active: "bg-indigo-600 text-white border-indigo-700 shadow-2xs ring-2 ring-indigo-500/20",
                    idle: "bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border-indigo-200",
                  },
                  {
                    val: "INTERESTED" as StaffLeadStatus,
                    label: "Interested",
                    emoji: "⭐",
                    active: "bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-500/20",
                    idle: "bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200",
                  },
                  {
                    val: "FOLLOW_UP" as StaffLeadStatus,
                    label: "Callback Needed",
                    emoji: "🔔",
                    active: "bg-purple-600 text-white border-purple-700 shadow-2xs ring-2 ring-purple-500/20",
                    idle: "bg-purple-50/70 hover:bg-purple-100 text-purple-900 border-purple-200",
                  },
                  {
                    val: "CONVERTED" as StaffLeadStatus,
                    label: "Converted / Ready",
                    emoji: "🎉",
                    active: "bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-500/20",
                    idle: "bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-200",
                  },
                  {
                    val: "NO_ANSWER" as StaffLeadStatus,
                    label: "No Answer",
                    emoji: "📵",
                    active: "bg-rose-600 text-white border-rose-700 shadow-2xs ring-2 ring-rose-500/20",
                    idle: "bg-rose-50/70 hover:bg-rose-100 text-rose-900 border-rose-200",
                  },
                  {
                    val: "BUSY" as StaffLeadStatus,
                    label: "Line Busy",
                    emoji: "⏳",
                    active: "bg-orange-600 text-white border-orange-700 shadow-2xs ring-2 ring-orange-500/20",
                    idle: "bg-orange-50/70 hover:bg-orange-100 text-orange-900 border-orange-200",
                  },
                  {
                    val: "NOT_INTERESTED" as StaffLeadStatus,
                    label: "Not Interested",
                    emoji: "❌",
                    active: "bg-slate-700 text-white border-slate-800 shadow-2xs ring-2 ring-slate-500/20",
                    idle: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300",
                  },
                ].map((s) => {
                  const isSelected = status === s.val;
                  return (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setStatus(s.val)}
                      className={`px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        isSelected ? s.active : s.idle
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency / Priority Level */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-700 text-[11px]">
                Urgency / Priority Level:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  {
                    val: 0,
                    label: "Normal",
                    sub: "Standard queue",
                    emoji: "☕",
                    active: "bg-slate-800 text-white border-slate-900 shadow-2xs",
                    idle: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
                  },
                  {
                    val: 1,
                    label: "Medium",
                    sub: "Call today",
                    emoji: "⚡",
                    active: "bg-blue-600 text-white border-blue-700 shadow-2xs",
                    idle: "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200",
                  },
                  {
                    val: 2,
                    label: "High",
                    sub: "Hot lead",
                    emoji: "🔥",
                    active: "bg-amber-600 text-white border-amber-700 shadow-2xs",
                    idle: "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200",
                  },
                  {
                    val: 3,
                    label: "Urgent",
                    sub: "Call ASAP",
                    emoji: "🚨",
                    active: "bg-rose-600 text-white border-rose-700 shadow-2xs",
                    idle: "bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200",
                  },
                ].map((p) => {
                  const isSelected = priority === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPriority(p.val)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected ? p.active : p.idle
                      }`}
                    >
                      <span className="text-xs">{p.emoji}</span>
                      <span className="text-xs font-black leading-tight mt-0.5">{p.label}</span>
                      <span
                        className={`text-[9px] font-medium leading-tight ${
                          isSelected ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {p.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes with Quick Chips */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-700 text-[11px]">
                Call Notes &amp; Conversation Remarks:
              </label>
              <textarea
                rows={2}
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="What did the candidate say? (e.g. fee discussed, wants Class 9-10 Math, callback tomorrow 5 PM)..."
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-[#0F2540] text-xs"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {[
                  "Spoke & interested",
                  "Callback tomorrow",
                  "Wants home tuition",
                  "Wants online classes",
                  "Fees agreed",
                  "Details verified",
                  "Wrong number",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setStaffNotes((prev) => (prev ? `${prev}, ${chip}` : chip))
                    }
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200/80 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 flex-wrap">
            <div>
              {!lead.isPromoted ? (
                <button
                  type="button"
                  disabled={isSubmitting || isPromoting}
                  onClick={handlePromoteToPrimary}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                  title={
                    isParent
                      ? "Publish live student requirement to platform"
                      : "Create live tutor profile in Primary User Directory"
                  }
                >
                  {isPromoting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Move to Primary</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>On Primary Platform</span>
                  {lead.promotedTutorProfileId && (
                    <a
                      href={`/tutors/${lead.promotedTutorProfileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-extrabold hover:text-emerald-900 ml-1"
                    >
                      View Profile ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isPromoting}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isPromoting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
