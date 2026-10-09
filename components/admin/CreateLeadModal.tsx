"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef } from "react";
import {
  FilePlus,
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  BookOpen,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  Mail,
  User,
  Users,
  Coins,
  Compass,
  Send,
  Zap,
  DollarSign,
  Clock,
  Layers,
} from "lucide-react";
import {
  adminCreateLeadAction,
  adminSearchParentsForLeadAction,
  type AdminCreateLeadInput,
} from "@/app/actions/admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { CLASS_LEVELS, BOARDS } from "@/lib/validations";
import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";
import { formatLeadNotifyTemplate } from "@/lib/lead-notify-template";
import { isTill5thClass, isTill8thClass, getLeadRateType, PUBLIC_TUTOR_SLOTS } from "@/lib/lead-utils";
import { coinCostFromTuitionFee, HOURLY_CLASSES_PER_MONTH, GROWTH_PLAN_COINS, GROWTH_PLAN_PRICE_INR } from "@/lib/subscription-plans";
import type { TeachingMode } from "@prisma/client";

type LeadNotifyChannel = "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP";

const NOTIFY_CHANNELS: { id: LeadNotifyChannel; label: string }[] = [
  { id: "IN_APP", label: "In-app" },
  { id: "PUSH", label: "Push" },
  { id: "EMAIL", label: "Email" },
  { id: "WHATSAPP", label: "WhatsApp" },
];

export type ResolvedLocation = {
  city: string;
  state: string;
  pincode: string;
  area: string;
  fullAddress: string;
  lat: number;
  lon: number;
  displayName: string;
};

const QUICK_CLASS_GROUPS = [
  { label: "Class 1-5", classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"] },
  { label: "Class 6-8", classes: ["Class 6", "Class 7", "Class 8"] },
  { label: "Class 9-10", classes: ["Class 9", "Class 10"] },
  { label: "Class 11-12", classes: ["Class 11", "Class 12"] },
  { label: "JEE & NEET", classes: ["IIT-JEE", "NEET"] },
];

const JUNIOR_CLASS_QUICK_PICKS = QUICK_CLASS_GROUPS.filter(
  (g) => g.label === "Class 1-5" || g.label === "Class 6-8"
).flatMap((g) => g.classes);

export function CreateLeadModal({
  onLeadCreated,
  triggerClassName,
  triggerLabel = "+ Create Lead Requirement",
  defaults,
}: {
  onLeadCreated?: (leadId: string) => void;
  triggerClassName?: string;
  triggerLabel?: string;
  defaults?: {
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    classLevel?: string;
    board?: string;
    subjects?: string[];
    city?: string;
    area?: string;
    pincode?: string;
    notes?: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Parent Selection Mode: "NEW" | "EXISTING"
  const [parentMode, setParentMode] = useState<"NEW" | "EXISTING">("NEW");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [parentSearchQuery, setParentSearchQuery] = useState("");
  const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
  const [isSearchingParents, setIsSearchingParents] = useState(false);

  // New Parent Fields
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [studentName, setStudentName] = useState("");

  // Lead Requirements
  const [classLevel, setClassLevel] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [mode, setMode] = useState<TeachingMode>("OFFLINE");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [showCategoryTree, setShowCategoryTree] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [budgetRateType, setBudgetRateType] = useState<"MONTHLY" | "HOURLY">("MONTHLY");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [radiusKm, setRadiusKm] = useState<string>("10");
  const [notifyMatchingTutors, setNotifyMatchingTutors] = useState(true);
  const [notifyChannels, setNotifyChannels] = useState<LeadNotifyChannel[]>([
    "IN_APP",
    "PUSH",
    "EMAIL",
    "WHATSAPP",
  ]);

  const feeQuote = useMemo(() => {
    const min = Number(budgetMin) || 0;
    const max = Number(budgetMax) || 0;
    if (!min && !max) return null;
    const fee = min && max ? Math.round((min + max) / 2) : max || min;
    const monthly = budgetRateType === "HOURLY" ? fee * HOURLY_CLASSES_PER_MONTH : fee;
    return {
      rateType: budgetRateType,
      budgetMin: min,
      budgetMax: max,
      fee,
      monthly,
      coinCost: coinCostFromTuitionFee({
        budgetMin: min || null,
        budgetMax: max || null,
        rateType: budgetRateType,
        classLevel,
      }),
    };
  }, [budgetMin, budgetMax, budgetRateType, classLevel]);

  const [publishedQuote, setPublishedQuote] = useState<{
    budgetMin: number;
    budgetMax: number;
    coinCost: number;
    rateType: "MONTHLY" | "HOURLY";
  } | null>(null);

  // Location search state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<ResolvedLocation[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ResolvedLocation | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [manualPincode, setManualPincode] = useState("");

  // Preferences & Notes
  const [tutorGenderPref, setTutorGenderPref] = useState("ANY");
  const [timingPreference, setTimingPreference] = useState("Evening (4 PM - 7 PM)");
  const [languagePref, setLanguagePref] = useState("Hindi & English");
  const [notes, setNotes] = useState("");
  const [leadSourceTag, setLeadSourceTag] = useState("WhatsApp Inquiries (Direct / Chat)");
  const [customLeadSource, setCustomLeadSource] = useState("");

  // Result state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Search existing parents
  useEffect(() => {
    if (parentMode !== "EXISTING") return;
    const timeout = setTimeout(async () => {
      setIsSearchingParents(true);
      try {
        const res = await adminSearchParentsForLeadAction(parentSearchQuery);
        if (res.success && res.data?.parents) {
          setParentSearchResults(res.data.parents);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingParents(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [parentSearchQuery, parentMode]);

  // Location Autocomplete
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const query = encodeURIComponent(`${locationQuery.trim()}, India`);
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${query}&limit=6&lang=en`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const mapped: ResolvedLocation[] = data.features.map((f: any) => {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates || [0, 0];
              const parts = [
                props.name,
                props.district || props.county,
                props.city,
                props.state,
                props.postcode,
              ].filter(Boolean);
              return {
                city: props.city || props.district || props.county || props.name || "",
                state: props.state || "",
                pincode: props.postcode || "",
                area: props.name || props.street || "",
                fullAddress: parts.join(", "),
                lat: coords[1],
                lon: coords[0],
                displayName: parts.join(", "),
              };
            });
            setLocationSuggestions(mapped);
          }
        }
      } catch (err) {
        console.error("Location search error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Flattened taxonomy subjects
  const allFlattenedSubjects = useMemo(() => {
    const list: { group: string; subject: string }[] = [];
    const seen = new Set<string>();
    Object.entries(TRUEMYTUTOR_TREE).forEach(([groupKey, group]) => {
      const gName = group.name || groupKey;
      Object.entries(group.subcategories || {}).forEach(([subKey, sub]) => {
        (sub.subjects || []).forEach((subj) => {
          const key = `${gName}:::${subj}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ group: gName, subject: subj });
          }
        });
      });
    });
    return list;
  }, []);

  const filteredTaxonomy = useMemo(() => {
    if (!subjectSearchQuery.trim()) return [];
    const q = subjectSearchQuery.trim().toLowerCase();
    return allFlattenedSubjects.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    ).slice(0, 18);
  }, [allFlattenedSubjects, subjectSearchQuery]);

  const selectClassWithAllSubjects = (cls: string) => {
    setClassLevel(cls);
    setSelectedSubjects(["All Subjects"]);
  };

  const selectAllSubjectsOnly = () => {
    setSelectedSubjects(["All Subjects"]);
  };

  const toggleSubject = (s: string) => {
    if (isTill8thClass(classLevel)) {
      if (s === "All Subjects") {
        setSelectedSubjects(["All Subjects"]);
        return;
      }
      setSelectedSubjects((prev) => {
        const withoutAll = prev.filter((item) => item !== "All Subjects");
        return withoutAll.includes(s)
          ? withoutAll.filter((item) => item !== s)
          : [...withoutAll, s];
      });
      return;
    }
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  useEffect(() => {
    if (isTill5thClass(classLevel) && mode === "ONLINE") {
      setMode("OFFLINE");
    }
  }, [classLevel, mode]);

  useEffect(() => {
    if (!classLevel) return;
    setBudgetRateType(getLeadRateType({ classLevel }));
  }, [classLevel]);

  const addCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customSubjectInput.trim();
    if (clean && !selectedSubjects.includes(clean)) {
      setSelectedSubjects((prev) => [...prev, clean]);
      setCustomSubjectInput("");
    }
  };

  const handleOpen = () => {
    setErrorMsg(null);
    setCreatedLeadId(null);
    if (defaults) {
      if (defaults.parentName) setParentName(defaults.parentName);
      if (defaults.parentPhone) setParentPhone(defaults.parentPhone);
      if (defaults.parentEmail) setParentEmail(defaults.parentEmail);
      if (defaults.classLevel) setClassLevel(defaults.classLevel);
      if (defaults.board) setBoard(defaults.board);
      if (defaults.subjects?.length) setSelectedSubjects(defaults.subjects);
      if (defaults.notes) setNotes(defaults.notes);
      if (defaults.city || defaults.area || defaults.pincode) {
        setShowManualLocation(true);
        setManualCity(defaults.city ?? "");
        setManualArea(defaults.area ?? "");
        setManualPincode(defaults.pincode ?? "");
        setLocationQuery([defaults.area, defaults.city, defaults.pincode].filter(Boolean).join(", "));
      }
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMsg(null);
    setCreatedLeadId(null);
    setPublishedQuote(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!classLevel) {
      setErrorMsg("Please select a class level.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setErrorMsg("Please select at least one subject for this lead enquiry.");
      return;
    }

    if (notifyMatchingTutors && notifyChannels.length === 0) {
      setErrorMsg("Choose at least one notification channel, or turn notifications off.");
      return;
    }

    if (!feeQuote) {
      setErrorMsg("Enter the tuition fee. Unlock coins are 5% of that amount.");
      return;
    }

    const effectiveCity = manualCity.trim() || selectedLocation?.city || undefined;
    const effectiveArea = manualArea.trim() || selectedLocation?.area || undefined;
    const effectivePincode = manualPincode.trim() || selectedLocation?.pincode || undefined;

    let normalizedParentPhone: string | undefined = undefined;
    if (parentMode === "NEW" && parentPhone.trim()) {
      let digits = parentPhone.trim().replace(/\D/g, "");
      if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
      else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

      if (digits.length !== 10) {
        setErrorMsg("Parent mobile number must be exactly 10 digits.");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(digits)) {
        setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        return;
      }
      normalizedParentPhone = digits;
    }

    const finalNotes = notes.trim();

    const finalSourceTag =
      leadSourceTag === "CUSTOM"
        ? (customLeadSource.trim() || "Custom / Staff Tag")
        : leadSourceTag;

    const payload: AdminCreateLeadInput = {
      parentProfileId: parentMode === "EXISTING" ? selectedParentId || undefined : undefined,
      parentName: parentMode === "NEW" ? parentName.trim() || undefined : undefined,
      parentPhone: normalizedParentPhone,
      parentEmail: parentMode === "NEW" ? parentEmail.trim() || undefined : undefined,
      studentName: studentName.trim() || (parentName.trim() ? `${parentName.trim()}'s Child` : undefined),
      subjects: selectedSubjects,
      classLevel,
      board: board || undefined,
      mode,
      budgetMin: feeQuote.budgetMin || undefined,
      budgetMax: feeQuote.budgetMax || undefined,
      rateType: feeQuote.rateType,
      city: effectiveCity,
      area: effectiveArea,
      pincode: effectivePincode,
      latitude: selectedLocation?.lat,
      longitude: selectedLocation?.lon,
      timingPreference: timingPreference.trim() || undefined,
      tutorGenderPref: tutorGenderPref || undefined,
      languagePref: languagePref.trim() || undefined,
      notes: finalNotes || undefined,
      leadSourceTag: finalSourceTag,
      radiusKm: radiusKm ? parseInt(radiusKm, 10) : 10,
      notifyMatchingTutors,
      notifyChannels: notifyMatchingTutors ? notifyChannels : [],
    };

    startTransition(async () => {
      const res = await adminCreateLeadAction(payload);
      if (!res.success) {
        setErrorMsg(res.error ?? "Failed to create lead enquiry.");
      } else {
        if (res.data) {
          setPublishedQuote({
            budgetMin: res.data.budgetMin,
            budgetMax: res.data.budgetMax,
            coinCost: res.data.coinCost,
            rateType: res.data.rateType,
          });
        }
        setCreatedLeadId(res.data?.leadId ?? "created");
        if (onLeadCreated && res.data?.leadId) {
          onLeadCreated(res.data.leadId);
        }
      }
    });
  };

  const handleCopyWhatsAppText = () => {
    const text = formatLeadNotifyTemplate({
      id: createdLeadId !== "created" ? createdLeadId : undefined,
      clientName: parentName || "Not Specified",
      subjects: selectedSubjects,
      classLevel,
      board,
      mode,
      area: selectedLocation?.area ?? undefined,
      city: selectedLocation?.city || manualCity || undefined,
      state: selectedLocation?.state ?? undefined,
      pincode: selectedLocation?.pincode ?? undefined,
      budgetMin: publishedQuote?.budgetMin ?? feeQuote?.budgetMin ?? null,
      budgetMax: publishedQuote?.budgetMax ?? feeQuote?.budgetMax ?? null,
      genderPreference: "Any",
      notes,
      timingPreference,
      schedule: timingPreference || "5 Days a Week",
      contactWhatsApp: "93191 93109",
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ActionOverlay
        isOpen={isPending}
        title="Publishing Student Requirement"
        subtitle="Configuring lead commercials, matching coordinates, and dispatching notifications..."
      />

      <button
        type="button"
        onClick={handleOpen}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white bg-[#2D9E6B] hover:bg-[#238357] cursor-pointer"
        }
      >
        <FilePlus size={16} />
        <span>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden my-auto text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#2D9E6B] shadow-xs">
                  <FilePlus size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-lg font-bold text-[#0F2540]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      Post New Student Lead
                    </h3>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-100/80 text-[#1F8255] px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Admin Lead Creator
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Create parent tuition enquiry with instant Indian geo-matching &amp; tutor dispatch
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-800 shrink-0">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {createdLeadId ? (
                /* Success View */
                <div className="space-y-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 p-6 text-emerald-950">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-[#2D9E6B] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <CheckCircle2 size={26} />
                    </div>
                    <div>
                      <h4
                        className="text-[#0F2540] font-bold text-lg"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        Lead Published Successfully! 🎉
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        The requirement is live in the tutor directory and matching notifications have been scheduled.
                      </p>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="space-y-3 rounded-2xl bg-white p-5 text-xs border border-emerald-200/60 shadow-xs text-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Class &amp; Board</span>
                        <span className="font-bold text-[#0F2540]">{classLevel} ({board})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Subjects</span>
                        <span className="font-bold text-emerald-700">{selectedSubjects.join(", ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Teaching Mode</span>
                        <span className="font-bold text-[#0F2540]">{mode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Budget &amp; Coins</span>
                        <span className="font-bold text-[#0F2540]">
                          ₹{publishedQuote?.budgetMin ?? feeQuote?.budgetMin}-₹{publishedQuote?.budgetMax ?? feeQuote?.budgetMax}
                          {" "}{publishedQuote?.rateType === "HOURLY" || feeQuote?.rateType === "HOURLY" ? "/hr" : "/mo"}
                          {" "}· {publishedQuote?.coinCost ?? feeQuote?.coinCost} coins
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 font-semibold block text-[11px]">Location</span>
                        <span className="font-semibold text-slate-700">
                          {selectedLocation?.fullAddress || manualCity || "Specified Area"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppText}
                      className="flex items-center gap-1.5 rounded-2xl px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "WhatsApp Text Copied!" : "Copy WhatsApp Enquiry"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-2xl px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Parent & Student Profile */}
                  <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                          1
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                          Parent / Student Profile
                        </label>
                      </div>

                      {/* Parent mode toggle */}
                      <div className="flex items-center rounded-xl bg-slate-200/70 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setParentMode("NEW")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            parentMode === "NEW"
                              ? "bg-white text-[#0F2540] shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          New Parent Lead
                        </button>
                        <button
                          type="button"
                          onClick={() => setParentMode("EXISTING")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            parentMode === "EXISTING"
                              ? "bg-white text-[#0F2540] shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Select Existing Parent
                        </button>
                      </div>
                    </div>

                    {parentMode === "EXISTING" ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={parentSearchQuery}
                            onChange={(e) => setParentSearchQuery(e.target.value)}
                            placeholder="Search existing parent by name, phone, or email..."
                            className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                          />
                          {isSearchingParents && (
                            <Loader2 size={14} className="absolute right-3.5 top-3 animate-spin text-[#2D9E6B]" />
                          )}
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {parentSearchResults.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedParentId(p.id)}
                              className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                                selectedParentId === p.id
                                  ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div>
                                <span className="font-bold text-[#0F2540]">{p.name}</span>
                                <span className="text-slate-500 font-medium ml-2">
                                  {p.phone || p.email}
                                </span>
                              </div>
                              {selectedParentId === p.id && (
                                <span className="flex items-center gap-1 text-[#2D9E6B] font-bold text-[11px]">
                                  <Check size={14} /> Selected
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="mb-1.5 block font-bold text-slate-700 text-xs">
                            Parent / Client Full Name
                          </label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                            <input
                              type="text"
                              value={parentName}
                              onChange={(e) => setParentName(e.target.value)}
                              placeholder="e.g. Ramesh Sharma"
                              className="w-full rounded-2xl pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block font-bold text-slate-700 text-xs">
                              Parent Mobile Number <span className="text-emerald-700 font-bold text-[10px]">(WhatsApp)</span>
                            </label>
                            {parentPhone.trim() && (
                              <span
                                className={`text-[10px] font-bold ${
                                  parentPhone.replace(/\D/g, "").length === 10 &&
                                  /^[6-9]/.test(parentPhone.replace(/\D/g, ""))
                                    ? "text-emerald-700 font-extrabold"
                                    : "text-amber-700"
                                }`}
                              >
                                {parentPhone.replace(/\D/g, "").length}/10 digits
                              </span>
                            )}
                          </div>
                          <div className="relative flex items-center">
                            <div className="absolute left-3.5 flex items-center gap-1 text-slate-500 font-bold text-xs pointer-events-none">
                              <span>🇮🇳 +91</span>
                            </div>
                            <input
                              type="tel"
                              value={parentPhone}
                              maxLength={10}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setParentPhone(digitsOnly);
                              }}
                              placeholder="98765 43210"
                              className="w-full rounded-2xl pl-16 pr-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-bold font-mono tracking-wide text-xs shadow-2xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block font-bold text-slate-700 text-xs">
                            Email <span className="text-slate-400 font-normal text-[10px]">(Auto-generated if blank)</span>
                          </label>
                          <input
                            type="email"
                            value={parentEmail}
                            onChange={(e) => setParentEmail(e.target.value)}
                            placeholder="parent@example.com (optional)"
                            className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Class, Board & Subjects */}
                  <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                        2
                      </span>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                        Class Level &amp; Subjects
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="mb-1.5 block font-bold text-slate-700 text-xs">
                          Class Level <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={classLevel}
                          onChange={(e) => {
                            const next = e.target.value;
                            setClassLevel(next);
                            if (isTill8thClass(next)) {
                              setSelectedSubjects(["All Subjects"]);
                            } else {
                              setSelectedSubjects((prev) =>
                                prev.filter((s) => s !== "All Subjects")
                              );
                            }
                          }}
                          className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                        >
                          <option value="">Select Class Level</option>
                          {CLASS_LEVELS.map((cl) => (
                            <option key={cl} value={cl}>{cl}</option>
                          ))}
                        </select>
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Class 1–8 quick pick (All Subjects)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {JUNIOR_CLASS_QUICK_PICKS.map((cls) => (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => selectClassWithAllSubjects(cls)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                  classLevel === cls && selectedSubjects.includes("All Subjects")
                                    ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                                }`}
                              >
                                {cls} · All Subjects
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block font-bold text-slate-700 text-xs">
                          Board
                        </label>
                        <select
                          value={board}
                          onChange={(e) => setBoard(e.target.value)}
                          className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                        >
                          {BOARDS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block font-bold text-slate-700 text-xs">
                          Teaching Mode <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value as TeachingMode)}
                          className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                        >
                          <option value="OFFLINE">Home Tuition (Offline)</option>
                          {!isTill5thClass(classLevel) ? (
                            <option value="ONLINE">Online Only</option>
                          ) : (
                            <option value="ONLINE" disabled>Online Only (Disabled for ≤ Class 5)</option>
                          )}
                          <option value="COACHING">Coaching / Institute</option>
                          <option value="EITHER">Either (Home / Online)</option>
                        </select>
                        {isTill5thClass(classLevel) && (
                          <p className="mt-1 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                            <span>🚸</span> Online classes disabled for Class 1–5 (requires offline tuition).
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Subject Selector */}
                    <div className="pt-2 space-y-2.5">
                      <label className="block font-bold text-slate-700 text-xs">
                        Selected Subjects ({selectedSubjects.length} selected)
                      </label>

                      {/* Selected chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-2xl bg-white border border-slate-200">
                        {selectedSubjects.length === 0 ? (
                          <span className="text-xs text-slate-400 font-medium">No subjects selected yet.</span>
                        ) : (
                          selectedSubjects.map((subj) => (
                            <span
                              key={subj}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200"
                            >
                              <span>{subj}</span>
                              <button
                                type="button"
                                onClick={() => toggleSubject(subj)}
                                className="text-emerald-700 hover:text-rose-600 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {isTill8thClass(classLevel) && (
                        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                          <button
                            type="button"
                            onClick={selectAllSubjectsOnly}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              selectedSubjects.length === 1 && selectedSubjects[0] === "All Subjects"
                                ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-sm"
                                : "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {selectedSubjects.includes("All Subjects") ? "✓" : "+"} All Subjects
                          </button>
                          <span className="text-[11px] font-semibold text-emerald-900">
                            Class 1–8 home tuition — use All Subjects for {classLevel || "this class"}.
                          </span>
                        </div>
                      )}

                      {/* Quick subject chips with streams */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Science:</span>
                          {["Chemistry", "Physics", "Mathematics", "Biology", "General Science", "Vedic Maths"].map((subj) => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => toggleSubject(subj)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                selectedSubjects.includes(subj)
                                  ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {selectedSubjects.includes(subj) ? "✓" : "+"} {subj}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">Commerce &amp; Arts:</span>
                          {["Accounts", "Economics", "Business Studies", "English", "Hindi", "Social Science", "Computer Science"].map((subj) => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => toggleSubject(subj)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                selectedSubjects.includes(subj)
                                  ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {selectedSubjects.includes(subj) ? "✓" : "+"} {subj}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search / Add custom subject */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={subjectSearchQuery}
                            onChange={(e) => setSubjectSearchQuery(e.target.value)}
                            placeholder="Search 500+ Indian subjects (e.g. Vedic Maths, JEE Chemistry)..."
                            className="w-full rounded-2xl pl-9 pr-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={customSubjectInput}
                          onChange={(e) => setCustomSubjectInput(e.target.value)}
                          placeholder="Or type custom subject"
                          className="w-48 rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={addCustomSubject}
                          className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      {/* Filtered suggestions */}
                      {filteredTaxonomy.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 max-h-32 overflow-y-auto">
                          {filteredTaxonomy.map((item, idx) => (
                            <button
                              key={`${item.group}-${item.subject}-${idx}`}
                              type="button"
                              onClick={() => toggleSubject(item.subject)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                selectedSubjects.includes(item.subject)
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50"
                              }`}
                            >
                              + {item.subject}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Indian Location & GPS Matching */}
                  <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                          3
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                          Location &amp; Coordinates
                        </label>
                        {mode === "ONLINE" ? (
                          <span className="text-[10px] text-teal-800 font-extrabold bg-teal-100/90 px-2.5 py-0.5 rounded-full border border-teal-300">
                            🌐 Pan-India Remote
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#2D9E6B] font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Instant Real GPS Search
                          </span>
                        )}
                      </div>

                      {mode !== "ONLINE" && (
                        <button
                          type="button"
                          onClick={() => setShowManualLocation(!showManualLocation)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          {showManualLocation ? "Hide Manual Fields" : "Manual Fields ▾"}
                        </button>
                      )}
                    </div>

                    {mode === "ONLINE" ? (
                      <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200/90 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Sparkles size={16} />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-teal-950">Online / Remote Tuition Listing</h4>
                            <span className="bg-teal-200 text-teal-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              All India
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-800 font-medium">
                            Physical GPS pinning and neighborhood radius limits are disabled for online tuition. All matching verified online tutors across India are eligible.
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-600">Student City (Optional):</span>
                            <input
                              type="text"
                              value={manualCity}
                              onChange={(e) => setManualCity(e.target.value)}
                              placeholder="e.g. New Delhi / Mumbai (optional)"
                              className="rounded-xl px-3 py-1.5 bg-white border border-teal-200 text-slate-900 text-xs font-semibold outline-none focus:border-teal-500 shadow-2xs w-full max-w-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={locationQuery}
                            onChange={(e) => {
                              setLocationQuery(e.target.value);
                              if (selectedLocation) setSelectedLocation(null);
                            }}
                            placeholder="Search locality, area, landmark, pincode (e.g. Sangam Vihar, Delhi, 110062)..."
                            className="w-full rounded-2xl pl-9 pr-9 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                          />
                          {isSearchingLocation && (
                            <Loader2 size={14} className="absolute right-3.5 top-3 animate-spin text-[#2D9E6B]" />
                          )}
                        </div>

                        {/* Suggestions dropdown */}
                        {locationSuggestions.length > 0 && !selectedLocation && (
                          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden divide-y divide-slate-100">
                            {locationSuggestions.map((loc, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedLocation(loc);
                                  setLocationQuery(loc.displayName);
                                  setManualCity(loc.city);
                                  setManualArea(loc.area);
                                  setManualPincode(loc.pincode);
                                  setLocationSuggestions([]);
                                }}
                                className="p-3 hover:bg-emerald-50/70 cursor-pointer text-xs flex items-center gap-2.5 transition-colors"
                              >
                                <MapPin size={15} className="text-[#2D9E6B] shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-[#0F2540] truncate">{loc.displayName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Lat: {loc.lat.toFixed(4)}, Lon: {loc.lon.toFixed(4)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedLocation && (
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-950">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-[#2D9E6B]" />
                              <span>{selectedLocation.fullAddress}</span>
                            </div>
                            <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                              {selectedLocation.lat.toFixed(3)}, {selectedLocation.lon.toFixed(3)}
                            </span>
                          </div>
                        )}

                        {showManualLocation && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div>
                              <label className="mb-1 block font-bold text-slate-700 text-xs">City</label>
                              <input
                                type="text"
                                value={manualCity}
                                onChange={(e) => setManualCity(e.target.value)}
                                placeholder="e.g. New Delhi"
                                className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block font-bold text-slate-700 text-xs">Area / Locality</label>
                              <input
                                type="text"
                                value={manualArea}
                                onChange={(e) => setManualArea(e.target.value)}
                                placeholder="e.g. Sangam Vihar"
                                className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block font-bold text-slate-700 text-xs">Pincode</label>
                              <input
                                type="text"
                                value={manualPincode}
                                onChange={(e) => setManualPincode(e.target.value)}
                                placeholder="110062"
                                className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] font-semibold text-xs shadow-2xs"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Step 4: Budget & Commercial Controls */}
                  <div className="space-y-3.5 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#2D9E6B] font-extrabold text-[10px]">
                          4
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#0F2540]">
                          5% Fee, Coins &amp; Match Settings
                        </label>
                      </div>

                    </div>

                    <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setBudgetRateType("MONTHLY")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                          budgetRateType === "MONTHLY" ? "bg-[#2D9E6B] text-white" : "text-slate-600"
                        }`}
                      >
                        Monthly ₹/mo
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetRateType("HOURLY")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                          budgetRateType === "HOURLY" ? "bg-[#0F2540] text-white" : "text-slate-600"
                        }`}
                      >
                        Hourly ₹/hr
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block font-bold text-slate-700 text-xs">
                          Fee min ({budgetRateType === "HOURLY" ? "₹/hr" : "₹/mo"})
                        </label>
                        <input
                          type="number"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder={budgetRateType === "HOURLY" ? "400" : "4500"}
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B] shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-slate-700 text-xs">
                          Fee max ({budgetRateType === "HOURLY" ? "₹/hr" : "₹/mo"})
                        </label>
                        <input
                          type="number"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder={budgetRateType === "HOURLY" ? "500" : "5000"}
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B] shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 text-xs text-emerald-950">
                      <p className="font-extrabold text-[#0F2540]">Unlock coins are 5% of this fee, inside the ₹{GROWTH_PLAN_PRICE_INR} plan ({GROWTH_PLAN_COINS} coins)</p>
                      {feeQuote ? (
                        <p className="mt-1 font-semibold text-emerald-900">
                          {feeQuote.rateType === "HOURLY"
                            ? `₹${feeQuote.fee.toLocaleString("en-IN")}/hr × ${HOURLY_CLASSES_PER_MONTH} classes = ₹${feeQuote.monthly.toLocaleString("en-IN")}/month. `
                            : `Fee ₹${feeQuote.fee.toLocaleString("en-IN")}/month. `}
                          5% of that fee is <span className="font-extrabold">{feeQuote.coinCost} coins</span>
                          {` (a ₹${GROWTH_PLAN_PRICE_INR} plan has ${GROWTH_PLAN_COINS} coins).`}
                          {" "}The card shows {PUBLIC_TUTOR_SLOTS} tutor slots.
                        </p>
                      ) : (
                        <p className="mt-1 font-semibold text-emerald-900">Enter the fee. Coins are 5% of that amount, scaled to the 60-coin plan.</p>
                      )}
                    </div>

                    {mode !== "ONLINE" && (
                      <div className="max-w-xs">
                        <label className="mb-1 block font-bold text-slate-700 text-xs">Radius (km)</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(e.target.value)}
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B] shadow-2xs"
                        />
                      </div>
                    )}

                    {/* Radius quick preset pills - only for OFFLINE/EITHER/COACHING */}
                    {mode !== "ONLINE" && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Radius Preset:</span>
                        {[5, 10, 15, 25, 50].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRadiusKm(String(r))}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              radiusKm === String(r)
                                ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {r} km {r === 50 ? "(Metro/NCR)" : r === 5 ? "(Local)" : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="mb-1 block font-bold text-slate-700 text-xs">Tutor Gender Preference</label>
                        <select
                          value={tutorGenderPref}
                          onChange={(e) => setTutorGenderPref(e.target.value)}
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B]"
                        >
                          <option value="ANY">No Preference (Any)</option>
                          <option value="FEMALE">Female Tutor Preferred</option>
                          <option value="MALE">Male Tutor Preferred</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-slate-700 text-xs">Timing Preference</label>
                        <input
                          type="text"
                          value={timingPreference}
                          onChange={(e) => setTimingPreference(e.target.value)}
                          placeholder="e.g. Evening 5 PM"
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-bold text-slate-700 text-xs">Language</label>
                        <input
                          type="text"
                          value={languagePref}
                          onChange={(e) => setLanguagePref(e.target.value)}
                          placeholder="e.g. English, Hindi"
                          className="w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B]"
                        />
                      </div>
                    </div>

                    {/* Mark Lead / Entry Source Dropdown */}
                    <div>
                      <label className="mb-1.5 flex items-center justify-between font-bold text-slate-700 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Layers size={14} className="text-[#2D9E6B]" />
                          <span>Mark Lead / Entry Source</span>
                        </span>
                        <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Source Tracking
                        </span>
                      </label>
                      <select
                        value={leadSourceTag}
                        onChange={(e) => setLeadSourceTag(e.target.value)}
                        className="w-full rounded-2xl px-3.5 py-2.5 bg-white border border-slate-200 text-slate-900 outline-none cursor-pointer focus:border-[#2D9E6B] font-semibold text-xs transition-all shadow-2xs"
                      >
                        <option value="WhatsApp Inquiries (Direct / Chat)">📱 WhatsApp Inquiries (Direct / Chat)</option>
                        <option value="Telecalling / Direct Call Entry">📞 Telecalling / Direct Call Entry</option>
                        <option value="Website / Organic Form Entry">🌐 Website / Organic Form Entry</option>
                        <option value="Offline / Pamphlet / Canopy Marketing">📋 Offline / Pamphlet / Canopy Marketing</option>
                        <option value="Staff Direct Entry / Walk-in">👥 Staff Direct Entry / Walk-in</option>
                        <option value="Batch Upload / Data Import">📦 Batch Upload / Data Import</option>
                        <option value="Referral / Partner Recommendation">🤝 Referral / Partner Recommendation</option>
                        <option value="CUSTOM">✍️ Other / Custom Tag…</option>
                      </select>
                      {leadSourceTag === "CUSTOM" && (
                        <input
                          type="text"
                          value={customLeadSource}
                          onChange={(e) => setCustomLeadSource(e.target.value)}
                          placeholder="Type custom source tag (e.g. Newspaper Ad, Event Nov)"
                          className="mt-2 w-full rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] text-xs font-semibold shadow-2xs"
                        />
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700 text-xs">Requirement Notes</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Student preparing for board exam, needs 4 classes per week with mock tests..."
                        className="w-full rounded-2xl p-3 bg-white border border-slate-200 text-slate-900 font-semibold text-xs outline-none focus:border-[#2D9E6B] resize-none"
                      />
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="notifyMatchingTutors"
                          checked={notifyMatchingTutors}
                          onChange={(e) => setNotifyMatchingTutors(e.target.checked)}
                          className="h-4 w-4 rounded text-[#2D9E6B] focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="notifyMatchingTutors" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Notify matching tutors when this enquiry is published
                        </label>
                      </div>
                      {notifyMatchingTutors && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-6">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Send on</span>
                          {NOTIFY_CHANNELS.map((channel) => {
                            const on = notifyChannels.includes(channel.id);
                            return (
                              <button
                                key={channel.id}
                                type="button"
                                onClick={() =>
                                  setNotifyChannels((prev) =>
                                    prev.includes(channel.id)
                                      ? prev.filter((item) => item !== channel.id)
                                      : [...prev, channel.id]
                                  )
                                }
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                  on
                                    ? "bg-[#0F2540] text-white border-[#0F2540]"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {on ? "✓ " : ""}
                                {channel.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Requirement Summary Preview Card */}
                  <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/80 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#2D9E6B]">
                      <Sparkles size={13} />
                      <span>Live Requirement Summary Preview</span>
                    </div>
                    <div className="text-xs text-slate-800 space-y-1 font-semibold">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[#0F2540] font-extrabold text-sm">
                          {selectedSubjects.length > 0 ? selectedSubjects.join(", ") : "Select Subject(s)"}
                        </strong>
                        <span className="text-slate-400">•</span>
                        <span>{classLevel || "Class Level"} ({board || "CBSE"})</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                          {mode === "OFFLINE" ? "Home Tuition" : mode === "ONLINE" ? "Online Only" : "Home / Online"} ({radiusKm} km radius)
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] flex flex-wrap items-center gap-2">
                        <span>📍 Location: {[manualArea, manualCity || selectedLocation?.city].filter(Boolean).join(", ") || "Location pending"}</span>
                        <span>•</span>
                        <span>
                          💰 Fee: {feeQuote
                            ? `₹${feeQuote.fee.toLocaleString("en-IN")}${feeQuote.rateType === "HOURLY" ? "/hr" : "/mo"}`
                            : "Enter a fee"}
                        </span>
                        <span>•</span>
                        <span>🪙 {feeQuote ? `${feeQuote.coinCost} of ${GROWTH_PLAN_COINS} coins` : "5% of the fee, in plan coins"} · {PUBLIC_TUTOR_SLOTS} slots shown</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Publishing Lead...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Publish Lead Requirement</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
