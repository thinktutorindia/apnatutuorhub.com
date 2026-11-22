"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  MapPin,
  BookOpen,
  X,
  Check,
  Sparkles,
  AlertCircle,
  Building2,
  Plus,
  Loader2,
  Navigation,
} from "lucide-react";
import { updateTutorQuickPreferencesAction } from "@/app/actions/tutor.actions";

interface QuickProfileUpdateModalProps {
  initialCity?: string | null;
  initialAddress?: string | null;
  initialSubjects?: string[] | null;
  initialClassLevels?: string[] | null;
  initialTeachingMode?: string | null;
}

const STORAGE_KEY = "ath_quick_pref_modal_v1";

const MAJOR_CITIES = [
  "Delhi",
  "Noida",
  "Greater Noida",
  "Gurugram",
  "Ghaziabad",
  "Faridabad",
];

const LOCALITY_SUGGESTIONS: Record<string, string[]> = {
  Delhi: [
    "Rohini",
    "Dwarka",
    "Janakpuri",
    "Saket",
    "South Patel Nagar",
    "Laxmi Nagar",
    "Pitampura",
    "Karol Bagh",
    "Sangam Vihar",
    "Mayur Vihar",
    "Vasant Kunj",
    "Model Town",
    "Derawal Nagar",
  ],
  Noida: [
    "Sector 62",
    "Sector 18",
    "Sector 137",
    "Sector 75",
    "Sector 50",
    "Sector 101",
    "Sector 49",
    "Sector 12",
    "Sector 76",
    "Barola",
  ],
  Gurugram: [
    "DLF Phase 1",
    "DLF Phase 5",
    "Sector 56",
    "Sector 14",
    "Sector 49",
    "Sohna Road",
    "Golf Course Road",
    "Sushant Lok",
  ],
  Ghaziabad: [
    "Indirapuram",
    "Vaishali",
    "Vasundhara",
    "Raj Nagar Extension",
    "Kaushambi",
    "Crossings Republik",
  ],
  Faridabad: [
    "Sector 15",
    "Sector 16",
    "NIT",
    "Green Field",
    "Charmwood Village",
    "Sector 21C",
  ],
  "Greater Noida": [
    "Alpha 1",
    "Beta 2",
    "Omega 1",
    "Pari Chowk",
    "Knowledge Park",
    "Gaur City",
  ],
};

// Preset packs adhering to the strict class-subject taxonomy
const PRESET_PACKS = [
  {
    category: "Class 1–8 (Foundation)",
    items: [
      {
        label: "All Subjects (Class 1–8)",
        subjects: [
          "All Subjects for Class 1",
          "All Subjects for Class 2",
          "All Subjects for Class 3",
          "All Subjects for Class 4",
          "All Subjects for Class 5",
          "All Subjects for Class 6",
          "All Subjects for Class 7",
          "All Subjects for Class 8",
        ],
      },
      {
        label: "Primary (Class 1–5)",
        subjects: [
          "All Subjects for Class 1",
          "All Subjects for Class 2",
          "All Subjects for Class 3",
          "All Subjects for Class 4",
          "All Subjects for Class 5",
        ],
      },
      {
        label: "Middle (Class 6–8)",
        subjects: [
          "All Subjects for Class 6",
          "All Subjects for Class 7",
          "All Subjects for Class 8",
        ],
      },
    ],
  },
  {
    category: "Class 9 & 10 (Secondary)",
    items: [
      {
        label: "Mathematics (Class IX & X)",
        subjects: ["Mathematics for Class IX", "Mathematics for Class X"],
      },
      {
        label: "Science (Class IX & X)",
        subjects: ["Science for Class IX", "Science for Class X"],
      },
      {
        label: "Social Science (Class IX & X)",
        subjects: ["Social Science for Class IX", "Social Science for Class X"],
      },
      {
        label: "English (Class IX & X)",
        subjects: ["English for Class IX", "English for Class X"],
      },
      {
        label: "Hindi (Class IX & X)",
        subjects: ["Hindi for Class IX", "Hindi for Class X"],
      },
    ],
  },
  {
    category: "Class 11 & 12 Science",
    items: [
      {
        label: "Physics (Class XI & XII)",
        subjects: ["Physics for Class XI", "Physics for Class XII"],
      },
      {
        label: "Chemistry (Class XI & XII)",
        subjects: ["Chemistry for Class XI", "Chemistry for Class XII"],
      },
      {
        label: "Mathematics (Class XI & XII)",
        subjects: ["Mathematics for Class XI", "Mathematics for Class XII"],
      },
      {
        label: "Biology (Class XI & XII)",
        subjects: ["Biology for Class XI", "Biology for Class XII"],
      },
      {
        label: "Computer Science (Class XI & XII)",
        subjects: ["Computer Science for Class XI", "Computer Science for Class XII"],
      },
    ],
  },
  {
    category: "Class 11 & 12 Commerce & Humanities",
    items: [
      {
        label: "Accountancy (Class XI & XII)",
        subjects: ["Accountancy for Class XI", "Accountancy for Class XII"],
      },
      {
        label: "Business Studies (Class XI & XII)",
        subjects: ["Business Studies for Class XI", "Business Studies for Class XII"],
      },
      {
        label: "Economics (Class XI & XII)",
        subjects: ["Economics for Class XI", "Economics for Class XII"],
      },
      {
        label: "History (Class XI & XII)",
        subjects: ["History for Class XI", "History for Class XII"],
      },
      {
        label: "Political Science (Class XI & XII)",
        subjects: ["Political Science for Class XI", "Political Science for Class XII"],
      },
    ],
  },
];

export function QuickProfileUpdateModal({
  initialCity,
  initialAddress,
  initialSubjects,
  initialTeachingMode,
}: QuickProfileUpdateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isMissingInfo =
    !initialCity ||
    initialCity === "null" ||
    !initialAddress ||
    initialAddress === "null" ||
    !initialSubjects ||
    initialSubjects.length === 0;

  const [city, setCity] = useState(
    initialCity && initialCity !== "null" ? initialCity : "Delhi"
  );
  const [address, setAddress] = useState(
    initialAddress && initialAddress !== "null" ? initialAddress : ""
  );
  const [subjects, setSubjects] = useState<string[]>(
    initialSubjects && initialSubjects.length > 0 ? initialSubjects : []
  );
  const [teachingMode, setTeachingMode] = useState<"OFFLINE" | "ONLINE" | "EITHER">(
    initialTeachingMode === "OFFLINE" || initialTeachingMode === "ONLINE"
      ? initialTeachingMode
      : "EITHER"
  );
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  // Auto-open on login if missing info or on first session visit
  useEffect(() => {
    // Listen for custom trigger to open anytime
    const handleTrigger = () => setIsOpen(true);
    window.addEventListener("ath:open-quick-profile-modal", handleTrigger);

    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (isMissingInfo) {
        // High priority: missing info opens immediately
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("ath:open-quick-profile-modal", handleTrigger);
        };
      } else if (!dismissed) {
        // Polite prompt on login
        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("ath:open-quick-profile-modal", handleTrigger);
        };
      }
    } catch {
      if (isMissingInfo) setIsOpen(true);
    }

    return () => {
      window.removeEventListener("ath:open-quick-profile-modal", handleTrigger);
    };
  }, [isMissingInfo]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {}
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!subjects.includes(trimmed)) {
      setSubjects((prev) => [...prev, trimmed]);
    }
    setCustomSubjectInput("");
  };

  const handleTogglePreset = (presetSubjects: string[]) => {
    const allIncluded = presetSubjects.every((s) => subjects.includes(s));
    if (allIncluded) {
      setSubjects((prev) => prev.filter((s) => !presetSubjects.includes(s)));
    } else {
      setSubjects((prev) => Array.from(new Set([...prev, ...presetSubjects])));
    }
  };

  const handleRemoveSubject = (sub: string) => {
    setSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const handleSave = () => {
    setMessage(null);
    if (!city.trim()) {
      setMessage({ text: "Please choose or enter your city.", type: "error" });
      return;
    }
    if (!address.trim() || address.trim().length < 2) {
      setMessage({ text: "Please enter your locality / sector / area.", type: "error" });
      return;
    }
    if (subjects.length === 0) {
      setMessage({ text: "Please select at least one teaching subject.", type: "error" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateTutorQuickPreferencesAction({
          city: city.trim(),
          address: address.trim(),
          subjects,
          teachingMode,
        });

        if (res.success) {
          setMessage({
            text: "✅ Teaching preferences updated successfully! Refreshing matching leads...",
            type: "success",
          });
          try {
            sessionStorage.setItem(STORAGE_KEY, "saved");
          } catch {}
          setTimeout(() => {
            setIsOpen(false);
            window.location.reload();
          }, 1200);
        } else {
          setMessage({
            text: res.error || "Failed to update. Please check details and try again.",
            type: "error",
          });
        }
      } catch (err: any) {
        setMessage({
          text: err.message || "An unexpected error occurred. Please try again.",
          type: "error",
        });
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl text-xs font-800 text-slate-800 hover:text-emerald-700 hover:border-emerald-300 transition-all cursor-pointer group"
        title="Click to update your teaching location & subjects"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <MapPin size={13} className="text-emerald-600 group-hover:scale-110 transition-transform" />
        <span>Location & Subjects</span>
      </button>
    );
  }

  const currentSuggestions = LOCALITY_SUGGESTIONS[city] || LOCALITY_SUGGESTIONS["Delhi"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-profile-title"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <Navigation size={22} className="rotate-45" />
              </div>
              <div>
                <h2
                  id="quick-profile-title"
                  className="text-lg sm:text-xl font-black text-[#0F2540] tracking-tight"
                >
                  Update Teaching Location & Subjects
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set your exact locality in Delhi NCR and subjects to get verified student inquiries.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {isMissingInfo && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>
                Your profile needs your teaching locality and subjects to receive tuition leads near you.
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 size={14} className="text-emerald-600" />
                <span>1. Select City</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Delhi NCR & major cities</span>
            </div>

            {/* City Buttons */}
            <div className="flex flex-wrap gap-2">
              {MAJOR_CITIES.map((c) => {
                const isSelected = city.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCity(c);
                      // Clear address if switching cities so tutor sets accurate locality
                      if (!address.toLowerCase().includes(c.toLowerCase())) {
                        setAddress("");
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0F2540] text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Locality Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-600" />
                <span>Teaching Locality / Sector / Area</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={`e.g. ${currentSuggestions[0]}, ${city}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Locality Quick Pills */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Popular areas in {city} (tap to select):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentSuggestions.slice(0, 10).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setAddress(loc)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Teaching Mode */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>2. Teaching Mode</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "EITHER", label: "Both (Offline & Online)" },
                { id: "OFFLINE", label: "Home Tuition (Offline)" },
                { id: "ONLINE", label: "Online Classes Only" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTeachingMode(m.id as any)}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    teachingMode === m.id
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/10 font-black"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Teaching Subjects & Classes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-600" />
                <span>3. Teaching Classes & Subjects</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                {subjects.length} Selected
              </span>
            </div>

            {/* Presets by Category */}
            <div className="space-y-3">
              {PRESET_PACKS.map((pack) => (
                <div key={pack.category} className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                    {pack.category}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pack.items.map((item) => {
                      const isSelected = item.subjects.every((s) => subjects.includes(s));
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleTogglePreset(item.subjects)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Subject Adder */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Add other specific subject (e.g. French, Spanish, Guitar, Coding):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSubject();
                    }
                  }}
                  placeholder="Type subject name..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 text-xs font-medium text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus size={14} className="inline mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Selected Subjects Cloud */}
            {subjects.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Currently Selected Subjects:</span>
                  <button
                    type="button"
                    onClick={() => setSubjects([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {subjects.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label={`Remove ${sub}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message / Status Feedback */}
        {message && (
          <div
            className={`mx-6 mb-2 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {message.type === "success" ? (
              <Sparkles size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            {isMissingInfo ? "Dismiss" : "Keep Current"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-700/20 hover:scale-[1.02] active:scale-98 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Save & Update Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
