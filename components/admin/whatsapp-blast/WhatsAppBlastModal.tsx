"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  X, MessageCircle, Sparkles, Send, MapPin, Users, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Search, CheckSquare, Square,
  Filter, ArrowRight, Bot, IndianRupee, Clock, ChevronRight, ChevronLeft, ShieldCheck,
  TrendingUp, TrendingDown, Flame, Check, HelpCircle, Globe, Home
} from "lucide-react";
import Link from "next/link";
import {
  getInterestedLeadsAction,
  getUserDirectoryBlastTargetsAction,
  sendDummyNotificationsToInterestedLeadsAction,
  autoSyncWhatsAppInterestedLeadsAction,
  type InterestedLead,
  type NotifDeliveryResult,
} from "@/app/actions/interested-leads.actions";
import { editWhatsAppPitchWithAIAction } from "@/app/actions/ai-message-edit.actions";
import {
  resolveBlastFee,
  blastFeeBandForLead,
  BLAST_FEE_BAND_DEFAULTS,
  BLAST_FEE_BAND_LABELS,
  type BlastFeeBandKey,
  type BlastFeeOverrides,
} from "@/lib/whatsapp-blast-fees";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const DEFAULT_OFFLINE_TEMPLATE = `Namaste {{name}} ji 🙏

Apna Tutor Hub se aapke area ke liye ek verified tuition student requirement aayi hai:

📚 *Class:* {{class}} ({{subject}})
📍 *Location:* {{location}} ({{distance}})
💰 *Monthly Fee:* {{fee}}
⏰ *Timing:* 5 days/week (Evening)
🏡 *Teaching Mode:* Home Tuition (In-Person Nearby)

Student ke parent demo class schedule karna chahte hain.

💼 *Commission Based Plan (Kam Upfront Se Shuru Karein):*
• Registration Fee: ₹1,257 (6 Months Validity)
• 5 Verified Student Leads Unlock
• Platform Commission: 1st month fee ka 50%, aur 2nd month se sirf 5% monthly commission

Agar aap yeh tuition lene ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko parent se direct connect kara degi.`;

function inferPriceAdjustment(prompt: string): "INCREASE" | "DECREASE" | "NONE" {
  const lower = prompt.toLowerCase();
  if (/\b(decrease|kam|ghata|lower)\b/i.test(lower)) return "DECREASE";
  if (/\b(increase|badha|bada|high|zyada)\b/i.test(lower)) return "INCREASE";
  if (/\bprice\b/i.test(lower) && /\d+\s*%/.test(lower)) return "INCREASE";
  return "NONE";
}

const DEFAULT_ONLINE_TEMPLATE = `Namaste {{name}} ji 🙏

Apna Tutor Hub se verified 1-on-1 Online Tuition requirement aayi hai:

📚 *Class:* {{class}} ({{subject}})
💻 *Teaching Mode:* 1-on-1 Online Class (Zoom / Google Meet)
💰 *Tuition Fee:* {{fee}}
⏰ *Timing:* Flexible Evening Schedule
📍 *Student Location:* Online (Remote Pan-India)

Student ke parent demo class arrange karwana chahte hain.

💼 *Commission Based Plan (Kam Upfront Se Shuru Karein):*
• Registration Fee: ₹1,257 (6 Months Validity)
• 5 Verified Student Leads Unlock
• Platform Commission: 1st month fee ka 50%, aur 2nd month se sirf 5% monthly commission

Agar aap yeh online tuition accept karne ke liye interested hain, toh abhi *YES* ya *1* reply kijiye. Hamari team aapko student details share kar degi.`;

export function WhatsAppBlastModal({ isOpen, onClose, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition();

  // Leads state
  const [leads, setLeads] = useState<InterestedLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [within5KmCount, setWithin5KmCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "WITHIN_5KM" | "ONLINE_ONLY">("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "CLASS_1_8" | "CLASS_9_12">("ALL");
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(null);
  const [audienceSource, setAudienceSource] = useState<"INTERESTED" | "USER_DIRECTORY">("INTERESTED");
  /** ALL = mixed · SESSION_OPEN = freeform OK · TEMPLATE_ONLY = outside 24h → approved Meta template */
  const [sessionFilter, setSessionFilter] = useState<"ALL" | "SESSION_OPEN" | "TEMPLATE_ONLY">("ALL");
  const [approvedTemplateChoice, setApprovedTemplateChoice] = useState<"tuition_enquiry_direct" | "tutor_location_details">("tuition_enquiry_direct");

  // Admin-controlled fees per class band — substituted into {{fee}} for both the
  // live preview AND the actual dispatch (passed to the server action on send).
  const [feeOverrides, setFeeOverrides] = useState<BlastFeeOverrides>({ ...BLAST_FEE_BAND_DEFAULTS });
  const [showFeeControl, setShowFeeControl] = useState(false);

  // Dual Templates state (5km In-Person vs Online Mode)
  const [offlineTemplate, setOfflineTemplate] = useState<string>(DEFAULT_OFFLINE_TEMPLATE);
  const [onlineTemplate, setOnlineTemplate] = useState<string>(DEFAULT_ONLINE_TEMPLATE);
  const [activeTemplateTab, setActiveTemplateTab] = useState<"OFFLINE" | "ONLINE">("OFFLINE");

  // AI Chat state
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    explanation: string;
    warnings: string[];
    isValid: boolean;
  } | null>(null);
  const [aiChatLog, setAiChatLog] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{
    current: number;
    total: number;
    batchIndex: number;
    totalBatches: number;
    sent: number;
    failed: number;
    simulated: number;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    simulated: number;
    failed: number;
    results: NotifDeliveryResult[];
  } | null>(null);

  // Load leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const opts = {
        limit: 1500,
        filterMode,
        classFilter,
        radiusKm: 5,
      };
      const res =
        audienceSource === "USER_DIRECTORY"
          ? await getUserDirectoryBlastTargetsAction(opts)
          : await getInterestedLeadsAction(opts);
      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotalCount(res.data.total);
        setWithin5KmCount(res.data.within5KmCount);
        setOnlineCount(res.data.onlineCount);
        setSelectedIds(res.data.leads.map((l) => l.id));
        setFocusedLeadId(res.data.leads[0]?.id ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen, filterMode, classFilter, audienceSource]);

  // Sync inbound WhatsApp replies
  const handleSyncInbound = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await autoSyncWhatsAppInterestedLeadsAction();
      if (res.success && res.data) {
        setSyncFeedback(`✓ Synced all WhatsApp inbound replies! ${res.data.totalInterestedInDb} active leads ready.`);
        await fetchLeads();
        if (onRefresh) onRefresh();
      } else {
        setSyncFeedback(res.error || "Sync completed");
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || "Sync error");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sessionCounts = useMemo(() => {
    let sessionOpen = 0;
    let templateOnly = 0;
    let unreachable = 0;
    for (const lead of leads) {
      if (!lead.whatsAppReachable) unreachable += 1;
      else if (lead.within24hSession) sessionOpen += 1;
      else templateOnly += 1;
    }
    return { sessionOpen, templateOnly, unreachable };
  }, [leads]);

  const displayedLeads = useMemo(() => {
    let rows = leads;
    if (sessionFilter === "SESSION_OPEN") {
      rows = rows.filter((l) => l.whatsAppReachable && l.within24hSession);
    } else if (sessionFilter === "TEMPLATE_ONLY") {
      rows = rows.filter((l) => l.whatsAppReachable && !l.within24hSession);
    }

    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, "");
    return rows.filter((lead) => {
      const phoneDigits = `${lead.phone || ""}${lead.whatsapp || ""}`.replace(/\D/g, "");
      if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
      const haystack = [
        lead.name,
        lead.phone,
        lead.whatsapp,
        lead.location,
        lead.email,
        lead.recommendedSubject,
        lead.classLabel,
        lead.batchName,
        lead.source,
        ...(lead.subjects || []),
        ...(lead.classes || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, search, sessionFilter]);

  // When switching to Outside 24h / Session filters, auto-select that cohort
  useEffect(() => {
    if (sessionFilter === "ALL") return;
    const rows =
      sessionFilter === "SESSION_OPEN"
        ? leads.filter((l) => l.whatsAppReachable && l.within24hSession)
        : leads.filter((l) => l.whatsAppReachable && !l.within24hSession);
    setSelectedIds(rows.map((l) => l.id));
    setFocusedLeadId(rows[0]?.id ?? null);
  }, [sessionFilter, leads]);

  const handleSelectAll = () => {
    setSelectedIds(displayedLeads.map((l) => l.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Current active template string based on tab
  const activeTemplate = activeTemplateTab === "OFFLINE" ? offlineTemplate : onlineTemplate;
  const setActiveTemplate = (val: string) => {
    if (activeTemplateTab === "OFFLINE") setOfflineTemplate(val);
    else setOnlineTemplate(val);
  };

  // AI template editor
  const handleAiEdit = async (customPrompt?: string, priceAdjustment?: "INCREASE" | "DECREASE") => {
    const promptToUse = customPrompt || aiInstruction;
    if (!promptToUse.trim()) return;

    setIsAiEditing(true);
    setAiFeedback(null);
    try {
      const categoryHint = activeTemplateTab === "OFFLINE" ? "CLASS_1_8" : "ONLINE";
      const res = await editWhatsAppPitchWithAIAction({
        currentTemplate: activeTemplate,
        instruction: promptToUse,
        categoryHint,
        chatHistory: aiChatLog,
        priceAdjustment: priceAdjustment || inferPriceAdjustment(promptToUse),
      });

      if (res.success && res.data) {
        setActiveTemplate(res.data.revisedTemplate);
        const assistantText = [
          res.data.aiExplanation,
          res.data.validationReport.warnings.length
            ? `Notes: ${res.data.validationReport.warnings.join(" ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        setAiChatLog((prev) => [
          ...prev,
          { role: "user", text: promptToUse },
          { role: "assistant", text: assistantText },
        ]);
        setAiFeedback({
          explanation: res.data.aiExplanation,
          warnings: res.data.validationReport.warnings,
          isValid: res.data.validationReport.isValid,
        });
        setAiInstruction("");
      } else {
        const errText = res.error || "Failed to update template";
        setAiChatLog((prev) => [...prev, { role: "user", text: promptToUse }, { role: "assistant", text: errText }]);
        setAiFeedback({
          explanation: errText,
          warnings: [],
          isValid: false,
        });
      }
    } catch (err: any) {
      setAiFeedback({
        explanation: err?.message || "AI error",
        warnings: [],
        isValid: false,
      });
    } finally {
      setIsAiEditing(false);
    }
  };

  // Focused lead for live preview
  const focusedLead = useMemo(() => {
    if (focusedLeadId) {
      const found = leads.find((l) => l.id === focusedLeadId);
      if (found) return found;
    }
    if (selectedIds.length > 0) {
      return leads.find((l) => selectedIds.includes(l.id)) || leads[0] || null;
    }
    return leads[0] || null;
  }, [leads, focusedLeadId, selectedIds]);

  // Which fee bands exist in the selected audience (badges in the Fee Control panel)
  const selectedBandCounts = useMemo(() => {
    const counts: Record<BlastFeeBandKey, number> = { "1-5": 0, "6-8": 0, "9-10": 0, "11-12": 0 };
    for (const l of leads) {
      if (!selectedIds.includes(l.id)) continue;
      const band = blastFeeBandForLead(l);
      if (band) counts[band] += 1;
    }
    return counts;
  }, [leads, selectedIds]);

  // Selected (displayed) leads in list order — used to cycle the live preview
  const previewCycle = useMemo(
    () => displayedLeads.filter((l) => selectedIds.includes(l.id)),
    [displayedLeads, selectedIds]
  );

  const cyclePreview = (dir: 1 | -1) => {
    if (!previewCycle.length) return;
    const idx = previewCycle.findIndex((l) => l.id === focusedLead?.id);
    const nextIdx = idx === -1 ? 0 : (idx + dir + previewCycle.length) % previewCycle.length;
    const nextLead = previewCycle[nextIdx];
    setFocusedLeadId(nextLead.id);
    setActiveTemplateTab(nextLead.deliveryMode === "OFFLINE_5KM" ? "OFFLINE" : "ONLINE");
  };

  // Lead preview text
  const forceApprovedTemplate = sessionFilter === "TEMPLATE_ONLY";

  const livePreviewText = useMemo(() => {
    if (!focusedLead) return activeTemplate;

    const rawName = (focusedLead.name || "").trim();
    const isJunkOrMissingName =
      !rawName ||
      /^\+?\d+$/.test(rawName) ||
      /^(tutor|teacher|user|student|lead|parent|sir|madam|ji|whatsapp\s*user|unknown|test)$/i.test(rawName);
    const cleanFirstName = isJunkOrMissingName ? "" : rawName.split(" ")[0].trim();

    const is5Km = focusedLead.deliveryMode === "OFFLINE_5KM";
    const loc = is5Km && focusedLead.location ? focusedLead.location : "Online (Remote Pan-India)";
    const dist = is5Km ? (focusedLead.distanceKm ? `~${focusedLead.distanceKm} km nearby` : "Within 5 km") : "";
    const mode = is5Km ? "Home Tuition (In-Person Nearby)" : "1-on-1 Online Class (Zoom / Google Meet)";
    const modeLine = is5Km ? "Home Tuition (Offline)" : "Online Class";

    let safeClass = focusedLead.classLabel || "Class 5";
    if (safeClass.includes("-") || safeClass.includes("–") || safeClass.toLowerCase().includes("1 to 8")) {
      safeClass = "Class 5";
    }

    // Admin-controlled fee per class band — the exact same resolver the server
    // dispatch uses, so what the admin sees here is what the tutor receives.
    const effectiveFee = resolveBlastFee(focusedLead, feeOverrides);

    const usesApprovedTemplate =
      forceApprovedTemplate || (Boolean(focusedLead.whatsAppReachable) && !focusedLead.within24hSession);

    // Outside 24h → preview the Meta template tutors actually receive
    if (usesApprovedTemplate) {
      if (approvedTemplateChoice === "tutor_location_details") {
        return `*Approved template: tutor_location_details (Marketing)*\n\nHello! 👋\n\nThank you for connecting apnatutorhub.com\n\nPlease share the following details so we can assign suitable tuition:\n\n1️⃣ Your Location / Area\n2️⃣ Subjects you want to teach\n3️⃣ Classes you want to teach (e.g., Nursery–5th, 6th–8th, 9th–10th, 11th–12th)\n\n*(Meta Approved ID: 39080956 · Dispatched strictly to 24h-closed recipients)*`;
      }
      const inquiryCode = focusedLead.id.replace(/\W/g, "").slice(-6).toUpperCase() || "ATH001";
      const clientDisplayName = "Parent";
      return `*Approved template: tuition_enquiry_direct (Utility)*\n\nWe recently received an Enquiry for you with following details:\n\n🆕 Enquiry ID : #${inquiryCode}\n💬 Name : ${clientDisplayName}\n📝 Class : ${safeClass} (${focusedLead.recommendedSubject})\n📚 Subject : ${modeLine}\n📍 Area : ${loc}\n💵 Budget : ${effectiveFee}\n📌 Mode : Any (Male or Female Tutor)\n\nPlease check this and Respond\nContact 08062180653\nApnaTutorHub (Reply STOP to Unsubscribe)`;
    }

    // Use offlineTemplate if lead is within 5km, else onlineTemplate
    const tpl = is5Km ? offlineTemplate : onlineTemplate;

    let out = tpl;
    if (cleanFirstName) {
      out = out
        .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, `Namaste ${cleanFirstName} ji 🙏`)
        .replace(/Namaste\s*\{\{name\}\}/gi, `Namaste ${cleanFirstName} ji 🙏`)
        .replace(/\{\{name\}\}/gi, cleanFirstName);
    } else {
      out = out
        .replace(/Namaste\s*\{\{name\}\}\s*ji(?:\s*🙏)?/gi, "Namaste ji 🙏")
        .replace(/Namaste\s*\{\{name\}\}/gi, "Namaste ji 🙏")
        .replace(/\{\{name\}\}/gi, "Sir/Ma'am");
    }

    // Clean distance placeholder: if online, strip any "( {{distance}} )" or "{{distance}}"
    if (!is5Km) {
      out = out.replace(/\s*\(\s*\{\{distance\}\}\s*\)/gi, "").replace(/\{\{distance\}\}/gi, "");
    } else {
      out = out.replace(/\{\{distance\}\}/gi, dist);
    }

    return out
      .replace(/\{\{phone\}\}/gi, focusedLead.phone || focusedLead.whatsapp || "")
      .replace(/\{\{class\}\}/gi, safeClass)
      .replace(/\{\{subject\}\}/gi, focusedLead.recommendedSubject)
      .replace(/\{\{fee\}\}/gi, effectiveFee)
      .replace(/\{\{location\}\}/gi, loc)
      .replace(/\{\{mode\}\}/gi, mode);
  }, [focusedLead, offlineTemplate, onlineTemplate, activeTemplate, forceApprovedTemplate, feeOverrides]);

  // Selected leads breakdown
  const selectedBreakdown = useMemo(() => {
    const selectedLeads = leads.filter((l) => selectedIds.includes(l.id));
    const offlineCount = selectedLeads.filter((l) => l.deliveryMode === "OFFLINE_5KM").length;
    const onlineCount = selectedLeads.filter((l) => l.deliveryMode === "ONLINE").length;
    return { offlineCount, onlineCount, total: selectedLeads.length };
  }, [leads, selectedIds]);

  // Validation alerts based on business rules
  const validationAlerts = useMemo(() => {
    const alerts: string[] = [];
    const lowerOffline = offlineTemplate.toLowerCase();
    const lowerOnline = onlineTemplate.toLowerCase();

    // Check Class 9-12 rules
    if (lowerOffline.includes("class 9") || lowerOffline.includes("class 10") || lowerOffline.includes("class 11") || lowerOffline.includes("class 12")) {
      if (lowerOffline.includes("all subjects")) {
        alerts.push("⚠️ 5km Template: Class 9–12 leads must be subject-specific (never 'All Subjects').");
      }
      if (lowerOffline.includes("/month") || lowerOffline.includes("/mo") || lowerOffline.includes("per month")) {
        alerts.push("⚠️ 5km Template: Class 9–12 leads must be HOURLY rate only (never monthly).");
      }
    }

    // Check Class 1-8 rules
    if (lowerOffline.includes("class 1") || lowerOffline.includes("class 2") || lowerOffline.includes("class 6") || lowerOffline.includes("class 8")) {
      if (lowerOffline.includes("/hr") || lowerOffline.includes("/hour") || lowerOffline.includes("per hour")) {
        alerts.push("⚠️ 5km Template: Class 1–8 leads must be MONTHLY rate only (never hourly).");
      }
    }

    return alerts;
  }, [offlineTemplate, onlineTemplate]);

  // Send Blast in safe chunks of 25 to prevent Vercel/serverless HTTP timeouts
  const handleSendBlast = async () => {
    if (selectedIds.length === 0) return;

    const tplName = approvedTemplateChoice === "tutor_location_details"
      ? "tutor_location_details (Location Intake)"
      : "tuition_enquiry_direct (Tuition Enquiry)";
    const confirmMsg = forceApprovedTemplate
      ? `Dispatch APPROVED TEMPLATE [${tplName}] to ${selectedIds.length} tutors outside the 24h session?\n\n• Meta blocks freeform text outside 24h — strictly the approved template will be sent.\n• Template: ${approvedTemplateChoice}`
      : `Are you sure you want to dispatch WhatsApp notifications to ${selectedIds.length} tutors?\n\n• ${selectedBreakdown.offlineCount} tutors with 5km location will receive the 5km In-Person pitch.\n• ${selectedBreakdown.onlineCount} tutors without location will receive the Online Mode pitch.\n• Tutors outside 24h auto-fallback to approved template [${tplName}].\n• Fees per class: 1–5 ${feeOverrides["1-5"] || BLAST_FEE_BAND_DEFAULTS["1-5"]} · 6–8 ${feeOverrides["6-8"] || BLAST_FEE_BAND_DEFAULTS["6-8"]} · 9–10 ${feeOverrides["9-10"] || BLAST_FEE_BAND_DEFAULTS["9-10"]} · 11–12 ${feeOverrides["11-12"] || BLAST_FEE_BAND_DEFAULTS["11-12"]}`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);
    setSendError(null);

    const selected = leads.filter((l) => selectedIds.includes(l.id));
    const CHUNK_SIZE = 25;
    const totalBatches = Math.ceil(selected.length / CHUNK_SIZE);

    let accSent = 0;
    let accSimulated = 0;
    let accFailed = 0;
    const accResults: NotifDeliveryResult[] = [];

    try {
      for (let i = 0; i < selected.length; i += CHUNK_SIZE) {
        const chunk = selected.slice(i, i + CHUNK_SIZE);
        const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const currentProcessed = Math.min(i + CHUNK_SIZE, selected.length);

        setSendProgress({
          current: currentProcessed,
          total: selected.length,
          batchIndex,
          totalBatches,
          sent: accSent,
          failed: accFailed,
          simulated: accSimulated,
        });

        const chunkLeadIds = chunk.filter((l) => l.sourceType !== "USER_DIRECTORY").map((l) => l.id);
        const chunkDirIds = chunk.filter((l) => l.sourceType === "USER_DIRECTORY").map((l) => l.id);

        try {
          const res = await sendDummyNotificationsToInterestedLeadsAction({
            leadIds: chunkLeadIds,
            directoryUserIds: chunkDirIds,
            offlineTemplate,
            onlineTemplate,
            channels: ["WHATSAPP"],
            forceApprovedTemplate,
            approvedTemplateId: approvedTemplateChoice,
            feeOverrides,
          });

          if (res.success && res.data) {
            accSent += res.data.sent;
            accSimulated += res.data.simulated;
            accFailed += res.data.failed;
            accResults.push(...res.data.results);
          } else {
            accFailed += chunk.length;
            setSendError(res.error || `Batch ${batchIndex} encountered an issue`);
          }
        } catch (chunkErr: any) {
          console.error(`Error in dispatch batch ${batchIndex}:`, chunkErr);
          accFailed += chunk.length;
          setSendError(chunkErr?.message || `Network error during batch ${batchIndex}`);
        }

        setSendProgress({
          current: currentProcessed,
          total: selected.length,
          batchIndex,
          totalBatches,
          sent: accSent,
          failed: accFailed,
          simulated: accSimulated,
        });
      }

      setSendResult({
        sent: accSent,
        simulated: accSimulated,
        failed: accFailed,
        results: accResults,
      });

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSendError(err?.message || "Unexpected error while sending blast");
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-[#0F2540] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 shadow-xs">
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight">Direct WhatsApp Blast — Interested Leads</h2>
                <span className="text-[10px] bg-emerald-400/25 text-emerald-100 border border-emerald-400/40 font-black px-2.5 py-0.5 rounded-full">
                  {totalCount} Total WhatsApp Replies Available
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                📍 5km within radius gets Home Tuition · 🌐 Without location gets Online Mode · Strictly no junk leads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {audienceSource === "INTERESTED" && (
              <button
                onClick={handleSyncInbound}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                title="Sync all 717 inbound WhatsApp chat replies into CRM"
              >
                <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                <span>{isSyncing ? "Syncing 717..." : "⚡ Sync All 717 Replies"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sync feedback banner */}
        {syncFeedback && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* ── Summary Distribution Strip ── */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSessionFilter("ALL");
                setFilterMode("ALL");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
                sessionFilter === "ALL" && filterMode === "ALL"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
              title="Show all active leads"
            >
              <Users size={13} className={sessionFilter === "ALL" && filterMode === "ALL" ? "text-emerald-400" : "text-emerald-600"} />
              <span>{leads.length} Active Leads</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode((prev) => (prev === "WITHIN_5KM" ? "ALL" : "WITHIN_5KM"));
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
                filterMode === "WITHIN_5KM"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-emerald-100/80 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
              }`}
              title="Filter to tutors with verified location within 5km"
            >
              <Home size={12} className={filterMode === "WITHIN_5KM" ? "text-white" : "text-emerald-700"} />
              <span>{within5KmCount} within 5km radius (Home Tuition)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode((prev) => (prev === "ONLINE_ONLY" ? "ALL" : "ONLINE_ONLY"));
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
                filterMode === "ONLINE_ONLY"
                  ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                  : "bg-blue-100/80 text-blue-800 border-blue-300 hover:bg-blue-200"
              }`}
              title="Filter to tutors without exact location (Online Mode)"
            >
              <Globe size={12} className={filterMode === "ONLINE_ONLY" ? "text-white" : "text-blue-700"} />
              <span>{onlineCount} without location (Online Mode)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSessionFilter((prev) => (prev === "TEMPLATE_ONLY" ? "ALL" : "TEMPLATE_ONLY"));
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
                sessionFilter === "TEMPLATE_ONLY"
                  ? "bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400/40"
                  : "bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200"
              }`}
              title="Filter strictly to tutors outside 24h Meta session (approved template only)"
            >
              <Clock size={12} className={sessionFilter === "TEMPLATE_ONLY" ? "text-white" : "text-amber-700"} />
              <span>{sessionCounts.templateOnly} outside 24h (approved template)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSessionFilter((prev) => (prev === "SESSION_OPEN" ? "ALL" : "SESSION_OPEN"));
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
                sessionFilter === "SESSION_OPEN"
                  ? "bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-400/40"
                  : "bg-teal-100/90 text-teal-900 border-teal-300 hover:bg-teal-200"
              }`}
              title="Filter to tutors with open 24h session (custom text allowed)"
            >
              <MessageCircle size={12} className={sessionFilter === "SESSION_OPEN" ? "text-white" : "text-teal-700"} />
              <span>{sessionCounts.sessionOpen} inside 24h (custom text OK)</span>
            </button>
          </div>

          <div className="text-[11px] font-black text-slate-500">
            Selected: <strong className="text-slate-900">{selectedBreakdown.total}</strong> ({selectedBreakdown.offlineCount} 5km · {selectedBreakdown.onlineCount} Online)
          </div>
        </div>

        {/* ── Main Body Grid ── */}
        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* ── Left Column: Audience Selection & 5km Filter (5 cols) ── */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col min-h-0 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-800">Target Audience List</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {selectedIds.length} of {displayedLeads.length} shown
                  {search.trim() ? ` (filtered from ${leads.length})` : ` selected`}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer transition-all"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Audience source: WhatsApp replies vs User Directory */}
            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audience source</span>
                <Link
                  href="/admin/users?role=TUTOR"
                  target="_blank"
                  className="text-[10px] font-bold text-blue-700 hover:underline"
                >
                  Open User Directory ↗
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAudienceSource("INTERESTED");
                    setSessionFilter("ALL");
                    setSearch("");
                  }}
                  className={`p-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                    audienceSource === "INTERESTED" && sessionFilter === "ALL"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📱 WhatsApp Interested Leads
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudienceSource("USER_DIRECTORY");
                    setSessionFilter("ALL");
                    setSearch("");
                  }}
                  className={`p-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                    audienceSource === "USER_DIRECTORY" && sessionFilter === "ALL"
                      ? "bg-blue-50 border-blue-500 text-blue-950 ring-1 ring-blue-500/30"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  👥 User Directory (Tutors)
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSessionFilter("TEMPLATE_ONLY");
                  setSearch("");
                }}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionFilter === "TEMPLATE_ONLY"
                    ? "bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500/40"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50/60 hover:border-amber-300"
                }`}
                title="Tutors whose Meta 24h session is closed — send approved Meta template only"
              >
                <p className="text-[11px] font-black flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-700" />
                    Outside 24h · Approved Template
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    {sessionCounts.templateOnly} tutors
                  </span>
                </p>
                <p className="text-[9px] font-semibold text-slate-500 mt-1">
                  Freeform text is blocked by Meta · Uses approved Meta template
                </p>
              </button>

              {sessionFilter === "TEMPLATE_ONLY" && (
                <div className="rounded-xl bg-amber-50/90 border border-amber-300 p-3 text-[11px] font-semibold text-amber-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">Select Approved Template</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Meta Approved
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      approvedTemplateChoice === "tuition_enquiry_direct"
                        ? "bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/30 text-amber-950 font-bold"
                        : "bg-white/60 border-amber-200/80 text-amber-900 hover:bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="approvedTplChoice"
                        checked={approvedTemplateChoice === "tuition_enquiry_direct"}
                        onChange={() => setApprovedTemplateChoice("tuition_enquiry_direct")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="text-left">
                        <p className="text-[11px] font-black">🎓 Tuition Enquiry (Utility)</p>
                        <p className="text-[10px] font-normal text-amber-800">
                          <code>tuition_enquiry_direct</code> · Sends matched lead with parent, class, subject & fee.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      approvedTemplateChoice === "tutor_location_details"
                        ? "bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/30 text-amber-950 font-bold"
                        : "bg-white/60 border-amber-200/80 text-amber-900 hover:bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="approvedTplChoice"
                        checked={approvedTemplateChoice === "tutor_location_details"}
                        onChange={() => setApprovedTemplateChoice("tutor_location_details")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="text-left">
                        <p className="text-[11px] font-black">📍 Location & Class Intake (Marketing)</p>
                        <p className="text-[10px] font-normal text-amber-800">
                          <code>tutor_location_details</code> · Asks tutors to share Location, Subjects & Classes.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-amber-200 text-[10px]">
                    <span className="text-amber-800 font-medium">Meta Delivery: 100% compliant</span>
                    <button
                      type="button"
                      onClick={() => setSessionFilter("SESSION_OPEN")}
                      className="font-black text-teal-800 underline hover:text-teal-900 cursor-pointer"
                    >
                      Show {sessionCounts.sessionOpen} inside 24h →
                    </button>
                  </div>
                </div>
              )}
              {sessionFilter === "SESSION_OPEN" && (
                <div className="rounded-xl bg-teal-50/80 border border-teal-200 px-2.5 py-2 text-[10px] font-semibold text-teal-950 flex items-center justify-between gap-2">
                  <span>Showing tutors with open 24h session — full Hinglish pitch OK.</span>
                  <button
                    type="button"
                    onClick={() => setSessionFilter("ALL")}
                    className="text-[10px] font-black text-slate-700 underline cursor-pointer shrink-0"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>

            {/* 5km Radius & Mode Filters */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <MapPin size={11} className="text-emerald-600" /> Location Filter
                </span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Strict Dual-Mode Matching
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "ALL", label: "👥 All Leads", sub: `${leads.length} tutors` },
                  { key: "WITHIN_5KM", label: "📍 5km Nearby Only", sub: `${within5KmCount} nearby` },
                  { key: "ONLINE_ONLY", label: "🌐 Online Only", sub: `${onlineCount} remote` },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterMode(item.key as any)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      filterMode === item.key
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-1 ring-emerald-500/30"
                        : "bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-[11px] leading-tight">{item.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>

              {/* Class Filter */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400">Class:</span>
                {[
                  { key: "ALL", label: "All Classes" },
                  { key: "CLASS_1_8", label: "Class 1–8 (₹/mo)" },
                  { key: "CLASS_9_12", label: "Class 9–12 (₹/hr)" },
                ].map((cf) => (
                  <button
                    key={cf.key}
                    type="button"
                    onClick={() => setClassFilter(cf.key as any)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                      classFilter === cf.key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, locality, subject..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Leads List Box */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={20} className="animate-spin text-emerald-500" />
                  <p className="text-xs font-bold">Loading WhatsApp leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <p>No leads found. Click below to sync all 717 WhatsApp replies.</p>
                  <button
                    onClick={handleSyncInbound}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
                  >
                    ⚡ Sync All 717 Replies Now
                  </button>
                </div>
              ) : displayedLeads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold space-y-2">
                  {sessionFilter === "TEMPLATE_ONLY" ? (
                    <>
                      <p>No tutors outside the 24h window in this audience.</p>
                      <button
                        type="button"
                        onClick={() => setSessionFilter("ALL")}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-black cursor-pointer"
                      >
                        Show all leads
                      </button>
                    </>
                  ) : search.trim() ? (
                    <p>No leads match &quot;{search.trim()}&quot;. Try name, phone, locality, or subject.</p>
                  ) : (
                    <p>No leads match this filter.</p>
                  )}
                </div>
              ) : (
                displayedLeads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);
                  const isFocused = focusedLeadId === lead.id;
                  const is5Km = lead.deliveryMode === "OFFLINE_5KM";

                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setFocusedLeadId(lead.id);
                        setActiveTemplateTab(is5Km ? "OFFLINE" : "ONLINE");
                      }}
                      className={`p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                        isFocused
                          ? "bg-emerald-100/70 border-l-4 border-emerald-600"
                          : isChecked
                          ? "bg-emerald-50/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelect(lead.id, e as any)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {lead.name || "WhatsApp Tutor"}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {lead.sourceType === "USER_DIRECTORY" && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-300">
                                Directory
                              </span>
                            )}
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                              is5Km
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-blue-100 text-blue-900 border border-blue-300"
                            }`}>
                              {is5Km ? "📍 5km In-Person" : "🌐 Online Mode"}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {lead.phone || lead.whatsapp} · {is5Km ? lead.location : "No Location (Online)"}
                        </p>
                        <p className="text-[9px] mt-0.5 font-bold">
                          {lead.whatsAppReachable ? (
                            lead.within24hSession ? (
                              <span className="text-emerald-700">
                                ● WhatsApp active · 24h session open (custom text OK)
                              </span>
                            ) : (
                              <span className="text-amber-800">
                                ● WhatsApp active · outside 24h → approved template
                              </span>
                            )
                          ) : (
                            <span className="text-rose-600">
                              ● No WhatsApp chat on this number — will skip send
                            </span>
                          )}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                            {lead.classLabel}
                          </span>
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {resolveBlastFee(lead, feeOverrides)}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[130px]">
                            {lead.recommendedSubject}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-bold flex items-center justify-between px-1">
              <span>Selected for dispatch: <strong className="text-slate-900">{selectedIds.length}</strong></span>
              <span className="text-emerald-700 font-black">Ready</span>
            </div>
          </div>

          {/* ── Right Column: Dual Message Preview & AI Editor (7 cols) ── */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col min-h-0 space-y-3 bg-white">
            
            {/* Template Mode Tabs & AI Trigger */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-700">Template Mode:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-black">
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("OFFLINE")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeTemplateTab === "OFFLINE"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Home size={12} />
                    <span>📍 5km In-Person ({selectedBreakdown.offlineCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("ONLINE")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activeTemplateTab === "ONLINE"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe size={12} />
                    <span>🌐 Online Mode ({selectedBreakdown.onlineCount})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Reset Template Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeTemplateTab === "OFFLINE") setOfflineTemplate(DEFAULT_OFFLINE_TEMPLATE);
                    else setOnlineTemplate(DEFAULT_ONLINE_TEMPLATE);
                  }}
                  title="Reset to official high-conversion template"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  ↺ Reset
                </button>

                {/* Chat with AI Button */}
                <button
                  type="button"
                  onClick={() => setShowAiChat(!showAiChat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                    showAiChat
                      ? "bg-purple-600 text-white ring-2 ring-purple-600/30"
                      : "bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 text-purple-900 border border-purple-300 hover:bg-purple-100"
                  }`}
                >
                  <Bot size={14} className={showAiChat ? "text-white" : "text-purple-600"} />
                  <span>🤖 Chat with AI (Edit Template)</span>
                </button>
              </div>
            </div>

            {/* Instruction banner */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              <span>
                {activeTemplateTab === "OFFLINE"
                  ? "Editing 5km In-Person Template (sent strictly to tutors with verified location within 5km)"
                  : "Editing Online Mode Template (sent strictly to tutors without location for remote 1-on-1)"}
              </span>
              <span className="font-bold text-slate-800">
                {activeTemplateTab === "OFFLINE" ? "Class 1–8: Monthly · Class 9–12: Hourly" : "Online Class: Hourly/Monthly"}
              </span>
            </div>

            {/* ── Fee Control (per class band) — admin overrides for {{fee}} ── */}
            <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeeControl(!showFeeControl)}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <IndianRupee size={13} className="text-amber-700" />
                  <span className="text-[11px] font-black text-amber-950">
                    Fee Control — {"{{fee}}"} per Class Band
                  </span>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md border border-amber-300">
                    {showFeeControl ? "Hide ▲" : "Edit Fees ▼"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeeOverrides({ ...BLAST_FEE_BAND_DEFAULTS })}
                  title="Reset all fees to system defaults"
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                >
                  ↺ Defaults
                </button>
              </div>
              <p className="text-[10px] text-amber-900/80 font-semibold mt-1">
                You control the fee quoted to each tutor, by their class. Applies to {"{{fee}}"} in both
                templates AND the approved-template Budget line — preview updates live.
              </p>
              {showFeeControl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                  {(Object.keys(BLAST_FEE_BAND_DEFAULTS) as BlastFeeBandKey[]).map((band) => (
                    <div key={band} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-700 shrink-0 w-[112px]">
                        {BLAST_FEE_BAND_LABELS[band]}
                      </span>
                      <input
                        type="text"
                        value={feeOverrides[band] ?? ""}
                        onChange={(e) =>
                          setFeeOverrides((prev) => ({ ...prev, [band]: e.target.value }))
                        }
                        placeholder={BLAST_FEE_BAND_DEFAULTS[band]}
                        className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-amber-300 bg-white text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <span
                        className="text-[9px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0"
                        title={`${selectedBandCounts[band]} selected tutors in this class band`}
                      >
                        {selectedBandCounts[band]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Interactive AI Chat Drawer ── */}
            {showAiChat && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 border border-purple-200 space-y-2.5 animate-in fade-in slide-in-from-top duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    <p className="text-xs font-black text-purple-950">
                      AI Assistant for {activeTemplateTab === "OFFLINE" ? "5km Nearby" : "Online Mode"} Template
                    </p>
                  </div>
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-2 py-0.5 rounded-md">
                    Guardrails: 5km Localities Only · No Junk City
                  </span>
                </div>

                {aiChatLog.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl bg-white/80 border border-purple-100 p-2 space-y-1.5">
                    {aiChatLog.slice(-12).map((msg, i) => (
                      <div
                        key={`${msg.role}-${i}`}
                        className={`text-[11px] leading-snug rounded-lg px-2 py-1.5 ${
                          msg.role === "user"
                            ? "bg-purple-100 text-purple-950 font-semibold"
                            : "bg-slate-50 text-slate-800 font-medium border border-slate-100"
                        }`}
                      >
                        <span className="font-black text-[9px] uppercase tracking-wide block mb-0.5">
                          {msg.role === "user" ? "You" : "AI"}
                        </span>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Action Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Increase fees by 15% and keep natural coordinator Hinglish tone", "INCREASE")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    <TrendingUp size={11} className="text-emerald-600" /> Increase Price (+15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Include Commission Based Plan details: ₹1,257 registration fee, 6 months validity, 5 leads, 50% 1st month + 5% recurring from 2nd month")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    💼 Commission Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Add student parent demo tomorrow notice in polite Delhi-NCR coordinator Hinglish")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer flex items-center gap-1"
                  >
                    <Flame size={11} className="text-rose-500" /> Demo Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiEdit("Make phrasing natural Delhi-NCR tuition coordinator Hinglish, remove robot generic English words")}
                    disabled={isAiEditing}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:border-purple-400 text-purple-900 text-[10px] font-black cursor-pointer"
                  >
                    🗣️ Coordinator Hinglish
                  </button>
                </div>

                {/* Custom Prompt Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAiEdit();
                      }
                    }}
                    placeholder="e.g. 'Price badha do aur chemistry trial mention karo'..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAiEdit()}
                    disabled={isAiEditing || !aiInstruction.trim()}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {isAiEditing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{isAiEditing ? "Updating..." : "Ask AI"}</span>
                  </button>
                </div>

                {/* AI Rationale / Feedback */}
                {aiFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold border ${
                    aiFeedback.isValid ? "bg-white border-emerald-300 text-slate-800" : "bg-amber-50 border-amber-300 text-amber-900"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{aiFeedback.explanation}</span>
                    </p>
                    {aiFeedback.warnings.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 text-[11px] text-amber-800 space-y-0.5">
                        {aiFeedback.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Validation Rule Warnings (If any) */}
            {validationAlerts.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold space-y-1">
                {validationAlerts.map((a, i) => (
                  <p key={i}>{a}</p>
                ))}
              </div>
            )}

            {/* Editable Template Textarea & Live Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[220px]">
              
              {/* Box 1: Raw Template (Editable) */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {activeTemplateTab === "OFFLINE" ? "5km In-Person Template" : "Online Mode Template"}
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {"{{name}}, {{fee}}, {{subject}}, {{class}}, {{location}}, {{distance}}"}
                  </span>
                </div>
                <textarea
                  value={activeTemplate}
                  onChange={(e) => setActiveTemplate(e.target.value)}
                  rows={10}
                  className="flex-1 w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono resize-none"
                />
              </div>

              {/* Box 2: Live WhatsApp Message Preview */}
              <div className="flex flex-col min-h-0 bg-[#EFEAE2] rounded-2xl p-3 border border-slate-300 shadow-2xs">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-black/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 truncate">
                      Live Preview for: <strong className="text-slate-900">{focusedLead?.name || "Tutor"}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {focusedLead && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                        focusedLead.deliveryMode === "OFFLINE_5KM"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-blue-100 text-blue-900 border border-blue-300"
                      }`}>
                        {focusedLead.deliveryMode === "OFFLINE_5KM" ? "📍 5km In-Person" : "🌐 Online Mode"}
                      </span>
                    )}
                    {/* Cycle through every selected recipient — verify each exact message */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg px-1 py-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => cyclePreview(-1)}
                        disabled={!previewCycle.length}
                        title="Previous selected recipient"
                        className="p-0.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer disabled:opacity-40"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="text-[9px] font-black text-slate-600 min-w-[34px] text-center">
                        {previewCycle.length
                          ? `${Math.max(0, previewCycle.findIndex((l) => l.id === focusedLead?.id)) + 1} / ${previewCycle.length}`
                          : "0 / 0"}
                      </span>
                      <button
                        type="button"
                        onClick={() => cyclePreview(1)}
                        disabled={!previewCycle.length}
                        title="Next selected recipient"
                        className="p-0.5 rounded text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer disabled:opacity-40"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-3.5 shadow-xs border border-black/5 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {livePreviewText}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 gap-2">
                  <span>
                    Channel:{" "}
                    <strong>
                      {forceApprovedTemplate ||
                      (focusedLead?.whatsAppReachable && !focusedLead?.within24hSession)
                        ? "Approved template (tuition_enquiry_direct)"
                        : "Aqua session text (24h)"}
                    </strong>
                  </span>
                  <span>Length: {livePreviewText.length} chars</span>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold">
                  ✓ Preview uses the exact dispatch logic (same fee resolver, same 5km routing). Dispatch
                  re-checks the 24h session live — if it opens/closes after load, the channel switches
                  automatically. Use ◀ ▶ to verify every selected tutor.
                </p>
              </div>
            </div>

            {/* ── Live Batch Progress Bar (While Sending) ── */}
            {isSending && sendProgress && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                    <span>Dispatching WhatsApp Blast ({sendProgress.current} / {sendProgress.total} Tutors)</span>
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {Math.round((sendProgress.current / sendProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/15 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(4, Math.round((sendProgress.current / sendProgress.total) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                  <span>Batch {sendProgress.batchIndex} of {sendProgress.totalBatches} (25 tutors/batch)</span>
                  <span className="text-emerald-300 font-bold">{sendProgress.sent} Sent · {sendProgress.failed} Skipped/Failed</span>
                </div>
              </div>
            )}

            {/* ── Error Banner (If any) ── */}
            {sendError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  <span>{sendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSendError(null)}
                  className="text-rose-500 hover:text-rose-800 text-[10px] uppercase font-black"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── Dispatch Results Panel (If sent) ── */}
            {sendResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs space-y-1.5">
                <p className="font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Dispatch Complete! {sendResult.sent} Sent · {sendResult.simulated} Simulated · {sendResult.failed} Failed</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  {sendResult.failed > 0
                    ? `${sendResult.failed} skipped/failed (usually 24h Meta session closed or missing WhatsApp). Approved template used wherever possible.`
                    : sendResult.simulated > 0
                    ? "Aqua WhatsApp API is in test/simulation mode. Messages were validated and CRM interaction logged."
                    : "WhatsApp messages dispatched successfully via Aqua API."}
                </p>
              </div>
            )}

            {/* ── Bottom Modal Action Strip ── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className={forceApprovedTemplate ? "text-amber-600" : "text-emerald-600"} />
                <span className="text-xs text-slate-600 font-semibold">
                  {forceApprovedTemplate ? (
                    <>
                      Channel: <strong className="text-amber-900">Approved template only (outside 24h)</strong>
                    </>
                  ) : (
                    <>
                      Auto-Routing:{" "}
                      <strong className="text-slate-800">
                        {selectedBreakdown.offlineCount} Nearby (5km) + {selectedBreakdown.onlineCount} Online Mode
                      </strong>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBlast}
                  disabled={isSending || selectedIds.length === 0 || validationAlerts.length > 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    forceApprovedTemplate
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>
                    {isSending
                      ? "Sending..."
                      : forceApprovedTemplate
                      ? `Send Approved Template to ${selectedIds.length}`
                      : `Dispatch WhatsApp to ${selectedIds.length} Tutors`}
                  </span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
