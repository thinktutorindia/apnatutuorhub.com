"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import {
  PhoneCall, MessageCircle, X, ChevronRight, ChevronLeft,
  Zap, Clock, CheckCircle2, AlertCircle, Sparkles, Pause,
  Play, Volume2, ArrowRight, ShieldCheck, MapPin, BookOpen,
  Calendar, Loader2, Check, Flame, Edit3, Save, User,
  Award, GraduationCap, Copy, VolumeX, HelpCircle, ChevronDown,
  RotateCcw, FileText, CheckSquare, Square
} from "lucide-react";
import type { CallOutcome, StaffLeadStatus } from "@prisma/client";
import { logCallAction, updateStaffLeadAction } from "@/app/actions/staff-leads.actions";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import { SubjectTaxonomyPicker } from "@/components/admin/staff-leads/SubjectTaxonomyPicker";
import { StaffShiftGate, useStaffShiftGate } from "@/components/admin/staff-leads/StaffShiftGate";

export type StaffDialerLead = {
  id: string;
  name: string | null;
  phone: string | null;
  altPhone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  location: string | null;
  qualification?: string | null;
  experienceYears?: number | null;
  subjects: string[];
  classes?: string[];
  status: StaffLeadStatus;
  staffNotes: string | null;
  priority: number;
  nextFollowUpAt?: string | Date | null;
  lastContactedAt?: string | Date | null;
  isPromoted?: boolean;
  _count?: { callLogs: number };
  [key: string]: any;
};

interface Props {
  leads: StaffDialerLead[];
  initialIndex?: number;
  onClose: () => void;
  onLeadUpdated: (leadId: string, updated: Partial<StaffDialerLead>) => void;
}

const OUTCOME_OPTIONS: Array<{
  outcome: CallOutcome;
  key: string;
  label: string;
  emoji: string;
  color: string;
  badgeColor: string;
  nextStatus: StaffLeadStatus;
  type: "positive" | "neutral" | "negative";
}> = [
  {
    outcome: "ANSWERED",
    key: "1",
    label: "Connected / Spoke",
    emoji: "📞",
    color: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
    badgeColor: "bg-emerald-700 text-white",
    nextStatus: "CONTACTED",
    type: "positive",
  },
  {
    outcome: "CALLBACK_REQUESTED",
    key: "2",
    label: "Callback Scheduled",
    emoji: "🔔",
    color: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
    badgeColor: "bg-blue-700 text-white",
    nextStatus: "FOLLOW_UP",
    type: "positive",
  },
  {
    outcome: "BUSY",
    key: "3",
    label: "Line Busy / Waiting",
    emoji: "⏳",
    color: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/20",
    badgeColor: "bg-amber-600 text-slate-950",
    nextStatus: "NO_ANSWER",
    type: "neutral",
  },
  {
    outcome: "NO_ANSWER",
    key: "4",
    label: "No Answer / Ringing",
    emoji: "📵",
    color: "bg-orange-500 hover:bg-orange-400 text-white shadow-orange-900/20",
    badgeColor: "bg-orange-600 text-white",
    nextStatus: "NO_ANSWER",
    type: "neutral",
  },
  {
    outcome: "CONVERTED",
    key: "5",
    label: "Enrolled / Converted",
    emoji: "🎉",
    color: "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20",
    badgeColor: "bg-teal-700 text-white",
    nextStatus: "CONVERTED",
    type: "positive",
  },
  {
    outcome: "NOT_INTERESTED",
    key: "6",
    label: "Not Interested",
    emoji: "✕",
    color: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20",
    badgeColor: "bg-rose-700 text-white",
    nextStatus: "NOT_INTERESTED",
    type: "negative",
  },
];

const QUICK_NOTES = [
  "Interested in home tuition offline",
  "Requested callback in the evening",
  "Budget mismatch with requirement",
  "Number busy, retry scheduled",
  "Demo class trial scheduled",
  "Looking for online tutoring only",
];

export function StaffPowerDialer({
  leads,
  initialIndex = 0,
  onClose,
  onLeadUpdated,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [sessionCallCount, setSessionCallCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [hasDialed, setHasDialed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { isOffShift } = useStaffShiftGate();

  // Call Stopwatch
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Script & Talking Points View
  const [showScripts, setShowScripts] = useState(false);
  const [scriptTab, setScriptTab] = useState<"TUTOR" | "PARENT">("TUTOR");

  // WhatsApp Templates Dropdown
  const [showWaTemplates, setShowWaTemplates] = useState(false);

  // Inline Lead Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAltPhone, setEditAltPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editExperience, setEditExperience] = useState<number>(0);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editPriority, setEditPriority] = useState<number>(0);

  const currentLead = leads[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / Math.max(leads.length, 1)) * 100);
  const cleanPhone = currentLead?.phone ? currentLead.phone.replace(/\D/g, "").slice(-10) : "";
  const isParent = getStaffRecordType(currentLead?.staffNotes) === "PARENT";

  // Auto-detect default script tab based on lead record type
  useEffect(() => {
    setScriptTab(isParent ? "PARENT" : "TUTOR");
  }, [isParent, currentIndex]);

  // Call stopwatch timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callActive) {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callActive]);

  // Reset states on lead change
  useEffect(() => {
    setNotes("");
    setFollowUpDate("");
    setHasDialed(false);
    setCallActive(false);
    setCallSeconds(0);
    setShowWaTemplates(false);

    if (currentLead) {
      setEditName(currentLead.name || "");
      setEditPhone(currentLead.phone || "");
      setEditAltPhone(currentLead.altPhone || "");
      setEditLocation(currentLead.location || "");
      setEditQualification(currentLead.qualification || "");
      setEditExperience(currentLead.experienceYears || 0);
      setEditSubjects(currentLead.subjects || []);
      setEditPriority(currentLead.priority || 0);
      setIsEditing(false);
    }
  }, [currentIndex, currentLead?.id]);

  // Audio tone generator
  const playTone = (type: "beep" | "fanfare") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "fanfare") {
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
        osc.start(t);
        osc.stop(t + 0.45);
      } else {
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch {
      // Ignore audio context errors
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const copyNumber = () => {
    if (!cleanPhone) return;
    navigator.clipboard.writeText(cleanPhone);
    setCopied(true);
    showToast("Phone number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialClick = () => {
    setHasDialed(true);
    setCallActive(true);
    setCallSeconds(0);
    playTone("beep");
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Log outcome & advance
  const handleOutcome = (option: typeof OUTCOME_OPTIONS[0]) => {
    if (!currentLead) return;

    // Stop call timer
    setCallActive(false);

    startTransition(async () => {
      const durationNote = callSeconds > 0 ? ` (Talk duration: ${formatTimer(callSeconds)})` : "";
      const fullNote = notes ? `${notes}${durationNote}` : `Power Dialer: ${option.label}${durationNote}`;

      // 1. Log call
      await logCallAction(currentLead.id, option.outcome, fullNote);

      // 2. Update lead status
      await updateStaffLeadAction(currentLead.id, {
        status: option.nextStatus,
        nextFollowUpAt: followUpDate ? new Date(followUpDate) : currentLead.nextFollowUpAt,
        staffNotes: notes ? `${currentLead.staffNotes ? currentLead.staffNotes + "\n" : ""}${notes}` : undefined,
      });

      onLeadUpdated(currentLead.id, {
        status: option.nextStatus,
        lastContactedAt: new Date().toISOString(),
        nextFollowUpAt: followUpDate ? new Date(followUpDate).toISOString() : currentLead.nextFollowUpAt,
        _count: { callLogs: (currentLead._count?.callLogs || 0) + 1 },
      });

      setSessionCallCount((prev) => prev + 1);

      if (option.outcome === "CONVERTED") {
        playTone("fanfare");
      } else {
        playTone("beep");
      }

      showToast(`✓ Logged: ${option.label}`);

      // Advance to next lead
      if (currentIndex + 1 < leads.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        showToast("🎉 All leads in queue completed!");
        setTimeout(() => onClose(), 1500);
      }
    });
  };

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside form inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "1") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[0]);
      } else if (e.key === "2") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[1]);
      } else if (e.key === "3") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[2]);
      } else if (e.key === "4") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[3]);
      } else if (e.key === "5") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[4]);
      } else if (e.key === "6") {
        e.preventDefault();
        handleOutcome(OUTCOME_OPTIONS[5]);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (cleanPhone) {
          handleDialClick();
          window.open(`tel:+91${cleanPhone}`, "_self");
        }
      } else if (e.key === "s" || e.key === "S" || e.key === "ArrowRight") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setIsEditing((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, cleanPhone, notes, followUpDate, callSeconds, leads.length]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead) return;

    startTransition(async () => {
      const res = await updateStaffLeadAction(currentLead.id, {
        name: editName.trim() || null,
        phone: editPhone.trim() || null,
        altPhone: editAltPhone.trim() || null,
        location: editLocation.trim() || null,
        qualification: editQualification.trim() || null,
        experienceYears: editExperience,
        subjects: editSubjects,
        priority: editPriority,
      });

      if (res.success && res.data) {
        onLeadUpdated(currentLead.id, res.data.lead as any);
        showToast("Lead details updated!");
        setIsEditing(false);
      } else {
        alert(res.error || "Failed to update lead details");
      }
    });
  };

  const handleSkip = () => {
    if (currentIndex + 1 < leads.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // WhatsApp message templates
  const waTemplates = [
    {
      title: "1. Missed Call Follow-up",
      text: `Hello ${currentLead?.name || "there"}, we tried calling you from ApnaTutorHub regarding tuition matching in ${
        currentLead?.location || "your locality"
      }. When is a convenient time to speak for 2 minutes? Thank you!`,
    },
    {
      title: "2. Tuition Openings in Locality",
      text: `Hello ${currentLead?.name || "there"}, greetings from ApnaTutorHub! We are actively assigning home & online tuitions in ${
        currentLead?.location || "your area"
      } for ${currentLead?.subjects?.join(", ") || "academic subjects"}. Are you available for new student inquiries this week?`,
    },
    {
      title: "3. Demo Class Confirmation",
      text: `Hello ${currentLead?.name || "there"}, we would like to confirm your schedule for a demo class trial for ${
        currentLead?.subjects?.join(", ") || "tuitions"
      }. Please reply with your preferred day and time! Best regards, ApnaTutorHub.`,
    },
    {
      title: "4. Verified Profile Registration",
      text: `Hello ${currentLead?.name || "there"}, please complete your verified tutor registration on ApnaTutorHub to receive direct student leads: https://apnatutorhub.com`,
    },
  ];

  if (!currentLead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-xl font-black text-[#0F2540]">Power Dial Queue Finished!</h3>
          <p className="text-xs text-slate-500 font-semibold">
            You completed calls for all queued leads and recorded <strong>{sessionCallCount} calls</strong> in this session.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#0F2540] hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer shadow-md transition-all"
          >
            Return to Calling Desk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black animate-in slide-in-from-top-4">
          <Sparkles size={14} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] relative">
        {/* ── Shift Gate Overlay when Off-Shift ── */}
        {isOffShift && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-4">
              <StaffShiftGate />
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Close Dialer &amp; Return to Desk
              </button>
            </div>
          </div>
        )}

        {/* ── Top Telemetry Bar ── */}
        <div className="bg-[#0F2540] text-white px-5 py-3 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
              <Zap size={13} className="fill-slate-950" />
              <span>POWER DIALER</span>
            </div>
            <span className="text-xs font-extrabold text-slate-200">
              Lead <strong className="text-white">{currentIndex + 1}</strong> of {leads.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-slate-400" />}
            </button>

            {/* Edit Lead Button */}
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditing
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="Edit complete lead info (Hotkey: E)"
            >
              <Edit3 size={13} />
              <span>{isEditing ? "Exit Edit" : "Edit [E]"}</span>
            </button>

            {/* Session Call Streak */}
            <div className="flex items-center gap-1 text-xs font-black text-emerald-400 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
              <Flame size={14} className="fill-emerald-400" />
              <span>{sessionCallCount} Calls</span>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Dialer (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Progress Strip ── */}
        <div className="w-full bg-slate-100 h-1.5 shrink-0">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-[#16A34A] h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ── INLINE COMPLETE LEAD EDITOR ── */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0F2540]">✏️ Edit Lead Profile</h3>
                <p className="text-xs text-slate-400">Update contact data without leaving the dialer</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Phone (+91):</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternate Phone:</label>
                <input
                  type="tel"
                  value={editAltPhone}
                  onChange={(e) => setEditAltPhone(e.target.value)}
                  placeholder="Optional alternate mobile"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / Locality:</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. South Delhi, Gurgaon"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Qualification:</label>
                <input
                  type="text"
                  value={editQualification}
                  onChange={(e) => setEditQualification(e.target.value)}
                  placeholder="e.g. B.Tech / M.Sc Mathematics"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Experience (Years):</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={editExperience}
                  onChange={(e) => setEditExperience(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0F2540]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Canonical Subjects (Centralized Taxonomy):
              </label>
              <SubjectTaxonomyPicker
                selectedSubjects={editSubjects}
                onChange={setEditSubjects}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── MAIN CALLING VIEW ── */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* Contact Information Card */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-[#0F2540] truncate">
                      {currentLead.name || "Unknown Contact"}
                    </h2>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        isParent
                          ? "bg-blue-100 text-blue-900 border border-blue-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      {isParent ? "Student / Parent Enquiry" : "Teacher / Tutor Profile"}
                    </span>
                    {currentLead.priority > 0 && (
                      <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        P{currentLead.priority} Priority
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-bold">
                      <MapPin size={13} className="text-emerald-600" />
                      {currentLead.location || "Location not recorded"}
                    </span>
                    <span>•</span>
                    <span className="text-slate-700 font-bold">
                      📚 {currentLead.subjects.length > 0 ? currentLead.subjects.join(", ") : "General Academic Subjects"}
                    </span>
                    {currentLead.qualification && <span>• {currentLead.qualification}</span>}
                    {currentLead.experienceYears !== undefined && currentLead.experienceYears !== null && (
                      <span>• {currentLead.experienceYears} yrs exp</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past Calls</span>
                  <p className="text-base font-black text-[#0F2540]">
                    {currentLead._count?.callLogs || 0}
                  </p>
                </div>
              </div>

              {/* ── Direct Dial & Live Stopwatch Action Ribbon ── */}
              {cleanPhone ? (
                <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                  {/* Dial Now Primary CTA */}
                  <a
                    href={`tel:+91${cleanPhone}`}
                    onClick={handleDialClick}
                    className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.98] ${
                      callActive
                        ? "bg-emerald-700 text-white ring-4 ring-emerald-300 animate-pulse"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    <PhoneCall size={20} />
                    <span>DIAL NOW: +91 {cleanPhone}</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                      [Space]
                    </span>
                  </a>

                  {/* Stopwatch Indicator */}
                  {callActive && (
                    <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-900 font-mono font-black text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span>{formatTimer(callSeconds)}</span>
                    </div>
                  )}

                  {/* WhatsApp Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWaTemplates((v) => !v)}
                      className="py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Send WhatsApp Template (Hotkey: W)"
                    >
                      <MessageCircle size={17} />
                      <span>WhatsApp</span>
                      <ChevronDown size={14} className="opacity-70" />
                    </button>

                    {showWaTemplates && (
                      <div className="absolute right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[280px] sm:min-w-[340px] animate-in fade-in-50">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          Select WhatsApp Template:
                        </div>
                        <div className="space-y-1 mt-1">
                          {waTemplates.map((tpl, i) => (
                            <a
                              key={i}
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(tpl.text)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setShowWaTemplates(false)}
                              className="block p-2.5 rounded-xl hover:bg-teal-50 text-left transition-colors text-xs text-slate-700"
                            >
                              <p className="font-extrabold text-teal-800 text-[11px]">{tpl.title}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{tpl.text}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copy Number */}
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copy Phone"
                  >
                    {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-900 text-xs font-bold rounded-xl text-center">
                  ⚠️ No valid phone number recorded for this contact.
                </div>
              )}
            </div>

            {/* ── Interactive Telecaller Talking Points & Script Accordion ── */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setShowScripts((v) => !v)}
                className="w-full px-4 py-2.5 bg-slate-50/70 hover:bg-slate-100/70 text-slate-800 flex items-center justify-between text-xs font-extrabold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" />
                  <span>Call Scripts &amp; Pitch Talking Points</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full">
                    {scriptTab === "TUTOR" ? "Tutor Script" : "Parent Script"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>{showScripts ? "Hide" : "Show Script"}</span>
                  <ChevronDown size={13} className={`transition-transform ${showScripts ? "rotate-180" : ""}`} />
                </div>
              </button>

              {showScripts && (
                <div className="p-4 space-y-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/30 to-white">
                  <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setScriptTab("TUTOR")}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        scriptTab === "TUTOR"
                          ? "bg-emerald-700 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      🎓 Tutor Pitch
                    </button>
                    <button
                      type="button"
                      onClick={() => setScriptTab("PARENT")}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        scriptTab === "PARENT"
                          ? "bg-blue-700 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      👨‍👩‍👧 Parent Inquiry Script
                    </button>
                  </div>

                  {scriptTab === "TUTOR" ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl leading-relaxed text-slate-700">
                        <strong className="text-emerald-900 block mb-1">Opening Pitch:</strong>
                        &quot;Namaste <strong>{currentLead.name || "Sir/Ma'am"}</strong>, I am calling from ApnaTutorHub. We received your tutor profile for home and online tutoring in <strong>{currentLead.location || "your locality"}</strong>. We have parents requesting tuitions for <strong>{currentLead.subjects.length > 0 ? currentLead.subjects.join(", ") : "academics"}</strong>. Are you currently available for new tuition assignments?&quot;
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-600">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          💰 Ask fee expectation
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          🚗 Home vs Online mode?
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          ⏰ Available timing slots?
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          📚 Boards taught?
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl leading-relaxed text-slate-700">
                        <strong className="text-blue-900 block mb-1">Opening Pitch:</strong>
                        &quot;Namaste <strong>{currentLead.name || "ji"}</strong>, calling from ApnaTutorHub regarding your inquiry for a home/online tutor in <strong>{currentLead.location || "your locality"}</strong> for <strong>{currentLead.subjects.length > 0 ? currentLead.subjects.join(", ") : "your child"}</strong>. I am here to match the best teacher according to your budget and timing. Let me quickly verify a few details.&quot;
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-600">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          🎯 Class / Grade &amp; Board
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          📅 Days per week (3 / 5)
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          💵 Monthly Budget limit
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          🗓️ Demo class day &amp; time
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 1-Click Call Outcome Selector with Hotkey Badges ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                <span>Select Outcome to Save &amp; Advance:</span>
                <span className="text-[11px] font-bold text-slate-500 lowercase">
                  Press keys <kbd className="px-1 rounded bg-slate-100 border text-[10px] font-mono">1</kbd> to <kbd className="px-1 rounded bg-slate-100 border text-[10px] font-mono">6</kbd>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {OUTCOME_OPTIONS.map((opt) => (
                  <button
                    key={opt.outcome}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOutcome(opt)}
                    className={`py-3 px-3 rounded-2xl font-black text-xs shadow-xs flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-95 ${opt.color}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="text-base">{opt.emoji}</span>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ${opt.badgeColor}`}>
                      [{opt.key}]
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Quick Notes & Callback Scheduler ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-400">
                  Quick Call Notes:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type quick call details or click a chip below..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2540] resize-none"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {QUICK_NOTES.slice(0, 3).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNotes((prev) => (prev ? `${prev}, ${chip}` : chip))}
                      className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-400">
                  Callback Date/Time (Optional):
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
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                />
              </div>
            </div>

          </div>
        )}

        {/* ── Footer Navigation & Hotkeys ── */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            title="Previous lead (←)"
          >
            <ChevronLeft size={14} /> <span>Prev [←]</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
              title="Skip without outcome (S or →)"
            >
              <span>Skip [S]</span>
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#0F2540] text-white text-xs font-black hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              Close Dialer [Esc]
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
