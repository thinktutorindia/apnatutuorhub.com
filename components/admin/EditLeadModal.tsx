"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef } from "react";
import {
  Edit3,
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  BookOpen,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  User,
  Coins,
  Compass,
  Save,
  Layers,
} from "lucide-react";
import {
  adminUpdateLeadAction,
  type AdminUpdateLeadInput,
} from "@/app/actions/admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { CLASS_LEVELS, BOARDS } from "@/lib/validations";
import { TRUEMYTUTOR_TREE } from "@/components/tutor/onboarding/steps/Step3Subjects";
import type { TeachingMode, LeadStatus } from "@prisma/client";

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

export interface EditLeadModalProps {
  lead: {
    id: string;
    subjects: string[];
    classLevel: string;
    board?: string | null;
    mode: TeachingMode | string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    city?: string | null;
    area?: string | null;
    pincode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timingPreference?: string | null;
    tutorGenderPref?: string | null;
    languagePref?: string | null;
    notes?: string | null;
    status: LeadStatus | string;
    coinCost: number;
    maxTutors: number;
    radiusKm: number;
    parentProfile?: {
      user?: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
    } | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditLeadModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: EditLeadModalProps) {
  const [isPending, startTransition] = useTransition();

  // Parent Fields
  const [parentName, setParentName] = useState(lead.parentProfile?.user?.name || "");
  const [parentPhone, setParentPhone] = useState(lead.parentProfile?.user?.phone || "");
  const [parentEmail, setParentEmail] = useState(lead.parentProfile?.user?.email || "");

  // Requirement Fields
  const [classLevel, setClassLevel] = useState(lead.classLevel || "Class 10");
  const [board, setBoard] = useState(lead.board || "CBSE");
  const [mode, setMode] = useState<TeachingMode>((lead.mode as TeachingMode) || "OFFLINE");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(lead.subjects || []);
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus>((lead.status as LeadStatus) || "ACTIVE");

  // Commercials & Location
  const [budgetMin, setBudgetMin] = useState<string>(lead.budgetMin ? String(lead.budgetMin) : "");
  const [budgetMax, setBudgetMax] = useState<string>(lead.budgetMax ? String(lead.budgetMax) : "");
  const [coinCost, setCoinCost] = useState<string>(String(lead.coinCost ?? 10));
  const [maxTutors, setMaxTutors] = useState<string>(String(lead.maxTutors ?? 5));
  const [radiusKm, setRadiusKm] = useState<string>(String(lead.radiusKm ?? 10));

  // Location search state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<ResolvedLocation[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ResolvedLocation | null>(null);
  const [manualCity, setManualCity] = useState(lead.city || "");
  const [manualArea, setManualArea] = useState(lead.area || "");
  const [manualPincode, setManualPincode] = useState(lead.pincode || "");

  // Preferences & Notes
  const [tutorGenderPref, setTutorGenderPref] = useState(lead.tutorGenderPref || "ANY");
  const [timingPreference, setTimingPreference] = useState(lead.timingPreference || "");
  const [languagePref, setLanguagePref] = useState(lead.languagePref || "Hindi & English");
  const [notes, setNotes] = useState(lead.notes || "");

  // Error / Success state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state whenever lead changes
  useEffect(() => {
    if (isOpen) {
      setParentName(lead.parentProfile?.user?.name || "");
      setParentPhone(lead.parentProfile?.user?.phone || "");
      setParentEmail(lead.parentProfile?.user?.email || "");
      setClassLevel(lead.classLevel || "Class 10");
      setBoard(lead.board || "CBSE");
      setMode((lead.mode as TeachingMode) || "OFFLINE");
      setSelectedSubjects(lead.subjects || []);
      setStatus((lead.status as LeadStatus) || "ACTIVE");
      setBudgetMin(lead.budgetMin ? String(lead.budgetMin) : "");
      setBudgetMax(lead.budgetMax ? String(lead.budgetMax) : "");
      setCoinCost(String(lead.coinCost ?? 10));
      setMaxTutors(String(lead.maxTutors ?? 5));
      setRadiusKm(String(lead.radiusKm ?? 10));
      setManualCity(lead.city || "");
      setManualArea(lead.area || "");
      setManualPincode(lead.pincode || "");
      setTutorGenderPref(lead.tutorGenderPref || "ANY");
      setTimingPreference(lead.timingPreference || "");
      setLanguagePref(lead.languagePref || "Hindi & English");
      setNotes(lead.notes || "");
      setErrorMsg(null);
      setSuccessMsg(null);
      setSelectedLocation(null);
    }
  }, [lead, isOpen]);

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
        const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=6&lang=en`);
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
    return allFlattenedSubjects
      .filter(
        (item) =>
          item.subject.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [allFlattenedSubjects, subjectSearchQuery]);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const addCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customSubjectInput.trim();
    if (clean && !selectedSubjects.includes(clean)) {
      setSelectedSubjects((prev) => [...prev, clean]);
      setCustomSubjectInput("");
    }
  };

  const handleSelectLocation = (loc: ResolvedLocation) => {
    setSelectedLocation(loc);
    setManualCity(loc.city);
    setManualArea(loc.area);
    setManualPincode(loc.pincode);
    setLocationQuery("");
    setLocationSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedSubjects.length === 0) {
      setErrorMsg("Please select at least one subject for this requirement.");
      return;
    }

    let normalizedParentPhone: string | undefined = undefined;
    if (parentPhone.trim()) {
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

    const payload: AdminUpdateLeadInput = {
      leadId: lead.id,
      subjects: selectedSubjects,
      classLevel,
      board: board || undefined,
      mode,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : undefined,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : undefined,
      city: manualCity.trim() || undefined,
      area: manualArea.trim() || undefined,
      pincode: manualPincode.trim() || undefined,
      latitude: selectedLocation?.lat ?? lead.latitude ?? undefined,
      longitude: selectedLocation?.lon ?? lead.longitude ?? undefined,
      timingPreference: timingPreference.trim() || undefined,
      tutorGenderPref: tutorGenderPref || undefined,
      languagePref: languagePref.trim() || undefined,
      notes: notes.trim() || undefined,
      coinCost: coinCost ? parseInt(coinCost, 10) : 10,
      maxTutors: maxTutors ? parseInt(maxTutors, 10) : 5,
      radiusKm: radiusKm ? parseInt(radiusKm, 10) : 10,
      status: status as any,
      parentName: parentName.trim() || undefined,
      parentPhone: normalizedParentPhone,
      parentEmail: parentEmail.trim() || undefined,
    };

    startTransition(async () => {
      const res = await adminUpdateLeadAction(payload);
      if (res.success) {
        setSuccessMsg("Lead requirement updated successfully!");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.error || "Failed to update lead requirement.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 text-slate-900">
        <ActionOverlay isOpen={isPending} title="Saving changes..." subtitle="Updating lead requirement" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-[#0F2540] text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-[#2D9E6B] flex items-center justify-center border border-emerald-400/30">
              <Edit3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Edit Lead Requirement
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30">
                  #{lead.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Modify student requirement details, pricing, slots, location, and status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-in fade-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 text-[#2D9E6B]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Lead Status & Teaching Mode */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#2D9E6B]" /> Lead Status &amp; Teaching Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Enquiry Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                >
                  <option value="ACTIVE">ACTIVE (Open for tutors)</option>
                  <option value="MATCHING">MATCHING (Auto matching tutors)</option>
                  <option value="APPLICATIONS_RECEIVED">APPLICATIONS RECEIVED</option>
                  <option value="BOOKED">BOOKED (Demo / class confirmed)</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="EXPIRED">EXPIRED (Past validity)</option>
                  <option value="CLOSED">CLOSED (Manually closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class Delivery Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["OFFLINE", "ONLINE", "COACHING", "EITHER"] as TeachingMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        mode === m
                          ? "bg-[#0F2540] text-white border-[#0F2540] shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {m === "OFFLINE"
                        ? "Home / Offline"
                        : m === "ONLINE"
                        ? "Online"
                        : m === "COACHING"
                        ? "Coaching"
                        : "Both / Either"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Class, Board & Subjects */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#2D9E6B]" /> Class Level, Board &amp; Subjects
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class / Grade Level</label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                >
                  {CLASS_LEVELS.map((cl) => (
                    <option key={cl} value={cl}>
                      {cl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Education Board</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                >
                  {BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Class Groups */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Select:</span>
              {QUICK_CLASS_GROUPS.map((grp) => (
                <button
                  key={grp.label}
                  type="button"
                  onClick={() => setClassLevel(grp.classes[0])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer border border-slate-200"
                >
                  {grp.label}
                </button>
              ))}
            </div>

            {/* Selected Subjects Tag Pills */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Selected Subjects ({selectedSubjects.length})
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                {selectedSubjects.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No subjects selected yet</span>
                ) : (
                  selectedSubjects.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 shadow-2xs"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className="hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Subject Search & Custom Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  placeholder="Search subject catalog (e.g. Maths, Physics)..."
                  className="w-full rounded-xl pl-8 pr-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                {filteredTaxonomy.length > 0 && (
                  <div className="absolute left-0 right-0 top-10 z-20 max-h-48 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl p-1 space-y-1">
                    {filteredTaxonomy.map((item) => {
                      const isSel = selectedSubjects.includes(item.subject);
                      return (
                        <button
                          key={`${item.group}-${item.subject}`}
                          type="button"
                          onClick={() => {
                            toggleSubject(item.subject);
                            setSubjectSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer ${
                            isSel ? "bg-emerald-50 text-emerald-900" : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span>{item.subject}</span>
                          <span className="text-[10px] text-slate-400">{item.group}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSubject();
                    }
                  }}
                  placeholder="Add custom subject..."
                  className="flex-1 rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
                <button
                  type="button"
                  onClick={() => addCustomSubject()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Commercials & Dispatch Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Coins size={14} className="text-[#2D9E6B]" /> Commercials, Coin Cost &amp; Quotas
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Budget (₹)</label>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Budget (₹)</label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Coins Cost</label>
                <input
                  type="number"
                  value={coinCost}
                  onChange={(e) => setCoinCost(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Tutors</label>
                <input
                  type="number"
                  value={maxTutors}
                  onChange={(e) => setMaxTutors(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Radius (Km)</label>
                <input
                  type="number"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Location & Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-[#2D9E6B]" /> Location &amp; Tuition Area
            </h4>

            <div className="relative">
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search area / pincode (e.g. Sangam Vihar, Delhi 110080)..."
                className="w-full rounded-xl pl-8 pr-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              {isSearchingLocation && (
                <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-[#2D9E6B]" />
              )}

              {locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-10 z-20 max-h-48 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl p-1 space-y-1">
                  {locationSuggestions.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                      <MapPin size={14} className="text-[#2D9E6B] shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-slate-900">{loc.area || loc.city}</p>
                        <p className="text-[10px] text-slate-500 truncate">{loc.fullAddress}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. South Delhi"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={manualArea}
                  onChange={(e) => setManualArea(e.target.value)}
                  placeholder="e.g. Sangam Vihar"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Postal Pincode</label>
                <input
                  type="text"
                  value={manualPincode}
                  onChange={(e) => setManualPincode(e.target.value)}
                  placeholder="e.g. 110080"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Parent / Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-[#2D9E6B]" /> Parent / Client Contact Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent Name</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Phone (10 digits)</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="e.g. 9818086142"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="e.g. parent@gmail.com"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Preferences & Notes */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={14} className="text-[#2D9E6B]" /> Preferences &amp; Requirement Notes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tutor Gender Preference</label>
                <select
                  value={tutorGenderPref}
                  onChange={(e) => setTutorGenderPref(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                >
                  <option value="ANY">Any Gender</option>
                  <option value="FEMALE">Female Tutor Preferred</option>
                  <option value="MALE">Male Tutor Preferred</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Timing Preference</label>
                <input
                  type="text"
                  value={timingPreference}
                  onChange={(e) => setTimingPreference(e.target.value)}
                  placeholder="e.g. Evening (4 PM - 7 PM)"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Language Preference</label>
                <input
                  type="text"
                  value={languagePref}
                  onChange={(e) => setLanguagePref(e.target.value)}
                  placeholder="e.g. Hindi & English"
                  className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#2D9E6B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Special Requirements &amp; Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any specific parent request, student weak areas, or timetable constraints..."
                className="w-full rounded-xl p-3 bg-white border border-slate-300 text-xs font-medium text-slate-900 outline-none focus:border-[#2D9E6B] resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>Save &amp; Update Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
