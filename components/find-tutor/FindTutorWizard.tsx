"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Monitor,
  Home,
  Users,
  MapPin,
  CheckCircle2,
  Star,
  ShieldCheck,
  Award,
  Lock,
  X,
  Search,
  Loader2,
  Sparkles,
  IndianRupee,
  ChevronDown,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { searchTutorsPublic, type PublicTutorResult } from "@/app/actions/public.actions";
import {
  searchSmartSubjects,
  getRelevantClassesForSubject,
  ALL_STRUCTURED_CLASSES,
} from "@/lib/subject-matcher";
import Link from "next/link";
import { getWhatsAppSupportLink } from "@/lib/support";

// ─── Data ─────────────────────────────────────────────────────────────────────

const POPULAR_SUBJECTS = [
  { label: "Mathematics", emoji: "🔢" },
  { label: "Physics", emoji: "⚛️" },
  { label: "Chemistry", emoji: "🧪" },
  { label: "Biology", emoji: "🧬" },
  { label: "English", emoji: "📖" },
  { label: "Hindi", emoji: "🇮🇳" },
  { label: "Accountancy", emoji: "📊" },
  { label: "Economics", emoji: "💹" },
  { label: "Computer Science", emoji: "💻" },
  { label: "Python", emoji: "🐍" },
  { label: "Social Studies", emoji: "🌍" },
  { label: "Sanskrit", emoji: "🕉️" },
];

const BOARDS = [
  { value: "CBSE", label: "CBSE", desc: "Central Board of Secondary Education" },
  { value: "ICSE", label: "ICSE / ISC", desc: "Indian Certificate of Secondary Education" },
  { value: "State Board", label: "State Board", desc: "Your state's education board" },
  { value: "IB", label: "IB", desc: "International Baccalaureate" },
  { value: "Other", label: "Other / Not sure", desc: "All curriculums" },
];

const MODES = [
  { value: "EITHER", label: "All Modes (Home & Online)", desc: "Flexible format", icon: Users },
  { value: "OFFLINE", label: "Home Tuition", desc: "Tutor visits your home", icon: Home },
  { value: "ONLINE", label: "Online Only", desc: "Live 1-on-1 video classes", icon: Monitor },
  { value: "COACHING", label: "Coaching Centre", desc: "At institute/centre", icon: GraduationCap },
];

const BUDGET_RANGES = [
  { label: "Up to ₹3,000/mo", max: 3000 },
  { label: "₹3,000–₹6,000/mo", max: 6000 },
  { label: "₹6,000–₹10,000/mo", max: 10000 },
  { label: "₹10,000–₹15,000/mo", max: 15000 },
  { label: "Above ₹15,000/mo", max: 99999 },
];

const POPULAR_CITIES = [
  "Delhi",
  "Noida",
  "Gurgaon",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Lucknow",
  "Chandigarh",
];

// ─── State ────────────────────────────────────────────────────────────────────

interface WizardState {
  subject: string;
  classLevel: string;
  board: string;
  mode: string;
  budgetMax: number;
  city: string;
}

const TOTAL_STEPS = 6;

// ─── Step 1: Subject ──────────────────────────────────────────────────────────

function StepSubject({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchSmartSubjects(searchQuery.trim(), 8);
  }, [searchQuery]);

  const isPopular = POPULAR_SUBJECTS.some((s) => s.label === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          What subject do you need help with?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">Pick a subject or search from 300+ courses.</p>
      </div>

      {value && !isPopular && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border-2 border-[#2D9E6B] text-[#0F2540] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#2D9E6B] shrink-0" />
            <span className="text-xs font-semibold text-slate-600">Selected:</span>
            <span className="text-sm font-black text-[#0F2540]">{value}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Popular Subject Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {POPULAR_SUBJECTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              onChange(s.label);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 text-sm font-bold transition-all text-left cursor-pointer ${
              value === s.label
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <span className="text-lg shrink-0">{s.emoji}</span>
            <span className="truncate">{s.label}</span>
            {value === s.label && <CheckCircle2 size={14} className="ml-auto text-[#2D9E6B] shrink-0" />}
          </button>
        ))}
      </div>

      {/* Smart Search with Autocomplete Dropdown & Typo Tolerance */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Search or type any other subject:
          </label>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Typo-tolerant • 300+ subjects
          </span>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            placeholder="e.g. Psychology, Organic Chem, Spoken English, French, Coding..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold outline-none focus:border-[#2D9E6B] text-slate-900 bg-white shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Live Dropdown Suggestions */}
        {isFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 max-h-64 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    onChange(item.name);
                    setSearchQuery("");
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-[#0F2540]">
                      {item.name}
                    </span>
                    {item.matchType === "synonym" && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        Best Match
                      </span>
                    )}
                    {item.matchType === "fuzzy" && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                        Did you mean?
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 shrink-0">
                    {item.category}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  No predefined category match.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onChange(searchQuery.trim());
                    setSearchQuery("");
                    setIsFocused(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0F2540] font-bold text-xs cursor-pointer text-center"
                >
                  Use &quot;{searchQuery.trim()}&quot; as custom subject →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Class ────────────────────────────────────────────────────────────

function StepClass({
  value,
  onChange,
  subject,
}: {
  value: string;
  onChange: (v: string) => void;
  subject: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const { recommendedClasses, otherClasses, suggestedNotice } = useMemo(() => {
    return getRelevantClassesForSubject(subject);
  }, [subject]);

  const isSelectedInOther = otherClasses.some((c) => c.label === value);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which class or level?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Select student&apos;s current class for <strong className="text-[#0F2540]">{subject || "your subject"}</strong>.
        </p>
      </div>

      {suggestedNotice && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#E8F7F0] border border-emerald-200 text-[#0F2540] text-xs font-semibold">
          <Sparkles size={16} className="text-[#2D9E6B] shrink-0" />
          <span>{suggestedNotice}</span>
        </div>
      )}

      {/* Recommended Classes for this Subject */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Recommended for {subject || "Subject"}
          </span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {recommendedClasses.length} best match{recommendedClasses.length !== 1 ? "es" : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {recommendedClasses.map((cl) => (
            <button
              key={cl.label}
              type="button"
              onClick={() => onChange(cl.label)}
              className={`p-3.5 rounded-2xl border-2 text-sm font-bold transition-all text-left cursor-pointer ${
                value === cl.label
                  ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs ring-2 ring-[#2D9E6B]/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">{cl.label}</span>
                {value === cl.label && <CheckCircle2 size={15} className="text-[#2D9E6B] shrink-0" />}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-1">{cl.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Other Classes Toggle & Grid */}
      {otherClasses.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center justify-between w-full py-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <span>Need a different school or college grade?</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
              {showAll || isSelectedInOther ? "Hide other grades ↑" : `View all other grades (${otherClasses.length}) ↓`}
            </span>
          </button>

          {(showAll || isSelectedInOther) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              {otherClasses.map((cl) => (
                <button
                  key={cl.label}
                  type="button"
                  onClick={() => onChange(cl.label)}
                  className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all text-left cursor-pointer ${
                    value === cl.label
                      ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">{cl.label}</span>
                    {value === cl.label && <CheckCircle2 size={13} className="text-[#2D9E6B] shrink-0" />}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 mt-0.5">{cl.sub}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Board ────────────────────────────────────────────────────────────

function StepBoard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which board or curriculum?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">This helps us match tutors who specialise in your syllabus.</p>
      </div>
      <div className="space-y-2.5">
        {BOARDS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.value)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all cursor-pointer ${
              value === b.value
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs ring-2 ring-[#2D9E6B]/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <div className="text-left">
              <div className="font-extrabold">{b.label}</div>
              <div className="text-xs font-medium text-slate-400">{b.desc}</div>
            </div>
            {value === b.value && <CheckCircle2 size={18} className="text-[#2D9E6B] shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Mode ─────────────────────────────────────────────────────────────

function StepMode({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          How do you prefer to learn?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">Choose home tuition, live online classes, or either format.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={`flex items-start gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                value === m.value
                  ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs ring-2 ring-[#2D9E6B]/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${value === m.value ? "bg-[#2D9E6B] text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-sm">{m.label}</div>
                <div className="text-xs font-medium text-slate-400 mt-0.5">{m.desc}</div>
              </div>
              {value === m.value && <CheckCircle2 size={16} className="text-[#2D9E6B] mt-0.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Budget ───────────────────────────────────────────────────────────

function StepBudget({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [customInput, setCustomInput] = useState(
    value && !BUDGET_RANGES.some((b) => b.max === value) ? String(value) : ""
  );

  const handleCustomChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setCustomInput(numeric);
    if (numeric) {
      const parsed = parseInt(numeric, 10);
      if (parsed > 0) onChange(parsed);
    }
  };

  const handlePresetClick = (max: number) => {
    onChange(max);
    setCustomInput("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          What&apos;s your monthly budget?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Select a quick range or enter your exact custom budget per month.
        </p>
      </div>

      <div className="space-y-2">
        {BUDGET_RANGES.map((b) => (
          <button
            key={b.max}
            type="button"
            onClick={() => handlePresetClick(b.max)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
              value === b.max && !customInput
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540] shadow-xs ring-2 ring-[#2D9E6B]/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <span>{b.label}</span>
            {value === b.max && !customInput && <CheckCircle2 size={18} className="text-[#2D9E6B]" />}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200/80 space-y-2.5">
        <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IndianRupee size={14} className="text-[#2D9E6B]" /> Or Enter Custom Monthly Budget:
          </span>
          {value > 0 && customInput && (
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              Selected: ₹{value.toLocaleString("en-IN")}/mo
            </span>
          )}
        </label>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={customInput}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="e.g. 4500, 7500, 20000"
            className="w-full pl-8 pr-16 py-3 bg-white rounded-xl border-2 border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-[#2D9E6B]"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/ month</span>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500">Quick set:</span>
          {[2500, 4000, 5000, 7500, 12000, 20000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setCustomInput(String(amt));
                onChange(amt);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                value === amt && customInput === String(amt)
                  ? "bg-[#0F2540] text-white border-[#0F2540]"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[#2D9E6B]"
              }`}
            >
              ₹{amt.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: City ─────────────────────────────────────────────────────────────

function StepCity({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which city are you in?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">We&apos;ll prioritise tutors near your locality. You can also skip this.</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your city (e.g. Delhi, Pune, Mumbai, Bangalore)"
        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold outline-none focus:border-[#2D9E6B] text-slate-900 bg-white"
      />
      <div>
        <p className="text-xs font-bold text-slate-400 mb-2">Popular cities</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`px-3.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                value.toLowerCase() === c.toLowerCase()
                  ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Guest Signup Gate Modal ───────────────────────────────────────────────────

function GuestSignupGate({
  isOpen,
  onClose,
  tutorId,
  callbackParams,
}: {
  isOpen: boolean;
  onClose: () => void;
  tutorId?: string;
  callbackParams: string;
}) {
  if (!isOpen) return null;
  const cb = encodeURIComponent(`/find-tutor?${callbackParams}`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X size={18} />
        </button>
        <div className="px-6 pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#2D9E6B] shadow-sm">
            <Lock size={26} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Unlock Tutor Contact Details
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
              Create a free parent account to view verified phone numbers, chat directly, and request free demo classes with this tutor.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <a
              href={`/register?role=parent&callbackUrl=${cb}`}
              className="block w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white font-black text-sm transition-all shadow-md shadow-emerald-500/20 cursor-pointer text-center"
            >
              Sign Up Free — Under 1 Minute 🚀
            </a>
            <a
              href={`/login?callbackUrl=${cb}`}
              className="block w-full py-2.5 px-6 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
            >
              Already have an account? Sign In
            </a>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">100% free for parents · No credit card required</p>
        </div>
      </div>
    </div>
  );
}

// ─── Preply-Style Horizontal Tutor Card ────────────────────────────────────────

function PreplyTutorCard({
  tutor,
  onContactClick,
}: {
  tutor: PublicTutorResult;
  onContactClick: (tutorId: string) => void;
}) {
  const displayName = tutor.name?.trim() || "Verified Tutor";
  const initial = displayName[0]?.toUpperCase() || "T";
  const modeLabel =
    tutor.teachingMode === "ONLINE" ? "Online Only"
    : tutor.teachingMode === "OFFLINE" ? "Home Tuition"
    : tutor.teachingMode === "COACHING" ? "Coaching Centre"
    : "Home & Online Tuition";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 overflow-hidden group p-5 sm:p-7 flex flex-col md:flex-row gap-6 items-start">
      {/* Left: Avatar & Badges */}
      <div className="flex md:flex-col items-center gap-3 shrink-0">
        <div className="relative">
          <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#0F2540] via-[#1a3a60] to-[#2D9E6B] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md">
            {initial}
          </div>
          {/* Online green indicator */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Active on ApnaTutorHub" />
        </div>

        <div className="flex flex-col items-center md:items-center text-center">
          {/* Rating */}
          <div className="flex items-center gap-1 text-xs font-black text-[#0F2540]">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span>{tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : "5.0"}</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({tutor.totalReviews > 0 ? tutor.totalReviews : "New"})
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 mt-0.5">
            {tutor.experience > 0 ? `${tutor.experience} yrs exp` : "Verified"}
          </span>
        </div>
      </div>

      {/* Center: Details, Bio & Flowing Subjects */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-black text-[#0F2540] tracking-tight hover:text-[#2D9E6B] transition-colors">
            {displayName}
          </h3>
          {tutor.isVerified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black">
              <ShieldCheck size={12} className="text-[#2D9E6B]" />
              KYC Verified Teacher
            </span>
          )}
          {tutor.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-black">
              <Award size={12} className="text-amber-500" />
              <span>Super Tutor</span>
            </span>
          )}
        </div>

        {/* Qualification & Locality */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs font-semibold text-slate-600">
          {tutor.qualification && (
            <span className="text-slate-800 font-bold">{tutor.qualification}</span>
          )}
          <span className="flex items-center gap-1 text-slate-500">
            <Monitor size={12} className="text-slate-400" />
            {modeLabel}
          </span>
          {tutor.city && (
            <span className="flex items-center gap-1 text-slate-500">
              <MapPin size={12} className="text-slate-400" />
              {tutor.city}
              {tutor.state ? `, ${tutor.state}` : ""}
            </span>
          )}
        </div>

        {/* Subjects Badges — Flowing Horizontal */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tutor.subjects.slice(0, 6).map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-800 text-[11px] font-bold border border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200 transition-colors"
            >
              {s}
            </span>
          ))}
          {tutor.subjects.length > 6 && (
            <span className="px-2 py-1 rounded-xl bg-slate-50 text-slate-400 text-[11px] font-semibold">
              +{tutor.subjects.length - 6} more
            </span>
          )}
        </div>

        {/* Bio Excerpt */}
        {tutor.bio && (
          <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-2 pt-1">
            {tutor.bio}
          </p>
        )}
      </div>

      {/* Right Column: Pricing & Action Buttons */}
      <div className="w-full md:w-44 shrink-0 flex md:flex-col justify-between md:justify-center items-center md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
        <div className="text-left md:text-right">
          <div className="text-xl font-black text-[#0F2540]">
            ₹{tutor.feeMin ? tutor.feeMin.toLocaleString("en-IN") : "500"}
          </div>
          <div className="text-[10px] font-semibold text-slate-400">per hour</div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full">
          <button
            type="button"
            onClick={() => onContactClick(tutor.id)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-800 text-xs min-h-11 text-center"
          >
            Book Free Demo
          </button>
          <a
            href={getWhatsAppSupportLink(`Hi, I want to talk about a tutor for my child (${displayName}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3 py-2 rounded-xl border-2 border-[#2D9E6B] text-[#2D9E6B] font-800 text-xs min-h-11 inline-flex items-center justify-center text-center"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Preply-Style Top Sticky Filter Bar ────────────────────────────────────────

function PreplyFilterBar({
  state,
  onChange,
  onReset,
}: {
  state: WizardState;
  onChange: <K extends keyof WizardState>(key: K, val: WizardState[K]) => void;
  onReset: () => void;
}) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [subjectQuery, setSubjectQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const subjectSuggestions = useMemo(() => {
    if (!subjectQuery.trim()) return [];
    return searchSmartSubjects(subjectQuery.trim(), 6);
  }, [subjectQuery]);

  const activeFilterCount = [
    Boolean(state.subject),
    Boolean(state.classLevel),
    state.board !== "CBSE",
    state.mode !== "EITHER",
    Boolean(state.city),
    state.budgetMax < 99999,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3.5 sm:p-4 space-y-3" ref={containerRef}>
      {/* Top Filter Buttons Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider hidden sm:inline-flex items-center gap-1 mr-1">
          <Filter size={13} /> Filters:
        </span>

        {/* 1. Subject Filter Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === "subject" ? null : "subject")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              state.subject
                ? "bg-emerald-50 border-[#2D9E6B] text-[#0F2540] shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>Subject: <strong>{state.subject || "All Subjects"}</strong></span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === "subject" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "subject" && (
            <div className="absolute left-0 top-full mt-2 z-40 w-[min(18rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 space-y-2 animate-in zoom-in-95 duration-150">
              <input
                type="text"
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                placeholder="Search subject (e.g. Maths, Physics, Psychology)..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-[#2D9E6B]"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {subjectQuery.trim() ? (
                  subjectSuggestions.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        onChange("subject", s.name);
                        setActiveDropdown(null);
                        setSubjectQuery("");
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-emerald-50 rounded-lg flex items-center justify-between cursor-pointer"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.category}</span>
                    </button>
                  ))
                ) : (
                  POPULAR_SUBJECTS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        onChange("subject", s.label);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Class Level Filter Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === "class" ? null : "class")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              state.classLevel
                ? "bg-emerald-50 border-[#2D9E6B] text-[#0F2540] shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>Class: <strong>{state.classLevel || "All Grades"}</strong></span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === "class" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "class" && (
            <div className="absolute left-0 top-full mt-2 z-40 w-[min(16rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 max-h-60 overflow-y-auto space-y-1 animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  onChange("classLevel", "");
                  setActiveDropdown(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                All Classes / Any Level
              </button>
              {ALL_STRUCTURED_CLASSES.map((cl) => (
                <button
                  key={cl.label}
                  type="button"
                  onClick={() => {
                    onChange("classLevel", cl.label);
                    setActiveDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg flex items-center justify-between cursor-pointer ${
                    state.classLevel === cl.label ? "bg-emerald-50 text-[#2D9E6B]" : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span>{cl.label}</span>
                  <span className="text-[10px] text-slate-400">{cl.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Delivery Mode Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === "mode" ? null : "mode")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              state.mode !== "EITHER"
                ? "bg-emerald-50 border-[#2D9E6B] text-[#0F2540] shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>Format: <strong>{MODES.find((m) => m.value === state.mode)?.label.split(" ")[0] || "All"}</strong></span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === "mode" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "mode" && (
            <div className="absolute left-0 top-full mt-2 z-40 w-[min(14rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1 animate-in zoom-in-95 duration-150">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    onChange("mode", m.value);
                    setActiveDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer ${
                    state.mode === m.value ? "bg-emerald-50 text-[#2D9E6B]" : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <m.icon size={14} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Budget Range Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === "budget" ? null : "budget")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              state.budgetMax < 99999
                ? "bg-emerald-50 border-[#2D9E6B] text-[#0F2540] shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>Budget: <strong>{state.budgetMax < 99999 ? `≤ ₹${state.budgetMax.toLocaleString("en-IN")}` : "Any Price"}</strong></span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === "budget" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "budget" && (
            <div className="absolute left-0 top-full mt-2 z-40 w-[min(16rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 space-y-2 animate-in zoom-in-95 duration-150">
              <span className="text-[11px] font-bold text-slate-500 block">Monthly Price Range:</span>
              <div className="space-y-1">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b.max}
                    type="button"
                    onClick={() => {
                      onChange("budgetMax", b.max);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      state.budgetMax === b.max ? "bg-emerald-50 text-[#2D9E6B]" : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. City Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === "city" ? null : "city")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              state.city
                ? "bg-emerald-50 border-[#2D9E6B] text-[#0F2540] shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>City: <strong>{state.city || "All India"}</strong></span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === "city" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "city" && (
            <div className="absolute left-0 sm:right-0 top-full mt-2 z-40 w-[min(16rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 space-y-2 animate-in zoom-in-95 duration-150">
              <input
                type="text"
                value={state.city}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="Type your city name..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-[#2D9E6B]"
              />
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pt-1">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange("city", c);
                      setActiveDropdown(null);
                    }}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                      state.city.toLowerCase() === c.toLowerCase()
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Active Filter Tags Row */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-xs">
        <span className="text-[11px] font-semibold text-slate-400">Active filters:</span>
        {state.subject && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 font-bold text-[11px]">
            {state.subject}
            <button onClick={() => onChange("subject", "")} className="hover:text-rose-700 cursor-pointer">
              <X size={12} />
            </button>
          </span>
        )}
        {state.classLevel && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-900 font-bold text-[11px]">
            {state.classLevel}
            <button onClick={() => onChange("classLevel", "")} className="hover:text-rose-700 cursor-pointer">
              <X size={12} />
            </button>
          </span>
        )}
        {state.city && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F7F0] text-[#0F2540] font-bold text-[11px]">
            📍 {state.city}
            <button onClick={() => onChange("city", "")} className="hover:text-rose-700 cursor-pointer">
              <X size={12} />
            </button>
          </span>
        )}
        {state.mode !== "EITHER" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-bold text-[11px]">
            {MODES.find((m) => m.value === state.mode)?.label}
            <button onClick={() => onChange("mode", "EITHER")} className="hover:text-rose-700 cursor-pointer">
              <X size={12} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Results Full-Width Directory View ─────────────────────────────────────────

function PreplyResultsView({
  tutors,
  total,
  fallbackReason,
  state,
  onFilterChange,
  onResetFilters,
  onContactClick,
  onRestartWizard,
}: {
  tutors: PublicTutorResult[];
  total: number;
  fallbackReason?: string;
  state: WizardState;
  onFilterChange: <K extends keyof WizardState>(key: K, val: WizardState[K]) => void;
  onResetFilters: () => void;
  onContactClick: (tutorId: string) => void;
  onRestartWizard: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Top Preply Filter Bar */}
      <PreplyFilterBar state={state} onChange={onFilterChange} onReset={onResetFilters} />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            {total > 0 ? `${total} Verified Tutors` : "No tutors matched"} for{" "}
            <span className="text-[#2D9E6B]">{state.subject || "All Subjects"}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {state.classLevel || "All Grades"} · {state.board} · {state.city || "All India"}
          </p>
        </div>

        <button
          type="button"
          onClick={onRestartWizard}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D9E6B] hover:text-[#1F8255] hover:underline cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw size={13} />
          <span>Start Questionnaire Over</span>
        </button>
      </div>

      {/* Graceful Fallback Notice */}
      {fallbackReason && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-3 animate-in fade-in shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="font-bold text-amber-950">{fallbackReason}</p>
            <p className="text-[11px] text-amber-800 font-normal">
              You can adjust the filters above to explore more tutors across India.
            </p>
          </div>
        </div>
      )}

      {/* Tutor Cards Stream */}
      {tutors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-3xl">
            🔍
          </div>
          <div>
            <h3 className="font-black text-lg text-[#0F2540]">No tutors found for this combination</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
              Try removing city or grade constraints using the filter bar above.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-6 py-2.5 rounded-2xl bg-[#2D9E6B] text-white font-bold text-xs cursor-pointer shadow-md"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tutors.map((t) => (
            <PreplyTutorCard key={t.id} tutor={t} onContactClick={onContactClick} />
          ))}
        </div>
      )}

      {/* Bottom Signup Nudge Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0F2540] via-[#152e4d] to-[#0A192F] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Zap size={14} /> 100% Free For Parents
          </div>
          <h3 className="text-xl font-black" style={{ fontFamily: "Poppins, sans-serif" }}>
            Want matched tutors to reach out to you directly?
          </h3>
          <p className="text-xs text-slate-300 font-medium max-w-xl">
            Post your tuition requirement in 60 seconds. Our algorithm connects you with top tutors in your area over WhatsApp &amp; phone.
          </p>
        </div>
        <a
          href="/register?role=parent"
          className="px-6 py-3.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-black text-sm transition-all shadow-lg shadow-emerald-500/30 shrink-0 text-center cursor-pointer"
        >
          Post Free Tuition Request →
        </a>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export function FindTutorWizard({
  initialSubject = "",
  initialCity = "",
  initialClassLevel = "",
}: {
  initialSubject?: string;
  initialCity?: string;
  initialClassLevel?: string;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicTutorResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>(undefined);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateTargetId, setGateTargetId] = useState<string>("");

  const [state, setState] = useState<WizardState>({
    subject: initialSubject,
    classLevel: initialClassLevel,
    board: "CBSE",
    mode: "EITHER",
    budgetMax: 10000,
    city: initialCity,
  });

  const update = useCallback(<K extends keyof WizardState>(key: K, val: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: val }));
  }, []);

  const runSearch = useCallback(async (customState?: WizardState) => {
    setLoading(true);
    const targetState = customState || state;
    try {
      const res = await searchTutorsPublic({
        subjects: targetState.subject ? [targetState.subject] : [],
        classLevel: targetState.classLevel || undefined,
        board: targetState.board || undefined,
        mode: targetState.mode || undefined,
        budgetMax: targetState.budgetMax,
        city: targetState.city || undefined,
      });
      setResults(res.tutors);
      setTotal(res.total);
      setFallbackReason(res.fallbackReason);
    } finally {
      setLoading(false);
    }
  }, [state]);

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      await runSearch();
      setStep(TOTAL_STEPS + 1);
    }
  };

  const handleBack = () => {
    if (step === TOTAL_STEPS + 1) {
      setStep(TOTAL_STEPS);
      setResults(null);
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  };

  const handleFilterChange = <K extends keyof WizardState>(key: K, val: WizardState[K]) => {
    const nextState = { ...state, [key]: val };
    setState(nextState);
    runSearch(nextState);
  };

  const handleResetFilters = () => {
    const resetState: WizardState = {
      subject: "",
      classLevel: "",
      board: "CBSE",
      mode: "EITHER",
      budgetMax: 99999,
      city: "",
    };
    setState(resetState);
    runSearch(resetState);
  };

  const handleContactClick = (tutorId: string) => {
    setGateTargetId(tutorId);
    setGateOpen(true);
  };

  const callbackParams = new URLSearchParams({
    subject: state.subject,
    classLevel: state.classLevel,
    board: state.board,
    mode: state.mode,
    budgetMax: String(state.budgetMax),
    city: state.city,
  }).toString();

  const showResults = step === TOTAL_STEPS + 1 && results !== null;

  return (
    <div className="relative">
      {/* Signup gate modal */}
      <GuestSignupGate
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        tutorId={gateTargetId}
        callbackParams={callbackParams}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-[#2D9E6B]" />
            <p className="text-sm font-extrabold text-[#0F2540]">Finding verified tutors...</p>
          </div>
        </div>
      )}

      {showResults && results ? (
        <PreplyResultsView
          tutors={results}
          total={total}
          fallbackReason={fallbackReason}
          state={state}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onContactClick={handleContactClick}
          onRestartWizard={() => {
            setStep(1);
            setResults(null);
          }}
        />
      ) : (
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Left: Questionnaire Card */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">
                🎓
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2D9E6B]">
                  Free to Browse
                </p>
                <h1 className="text-base font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Find Your Perfect Tutor
                </h1>
              </div>
            </div>

            {/* Progress steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-800 ${
                      n < step
                        ? "bg-[#2D9E6B] text-white"
                        : n === step
                          ? "bg-[#0F2540] text-white"
                          : "bg-[#F0F4F8] text-[#64748B] border border-[#E2E8F0]"
                    }`}
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-700 text-[#64748B]">
                <span>Step {step} of {TOTAL_STEPS}</span>
                <span>{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
              </div>
              <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2D9E6B]"
                  style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>

            {/* Questionnaire Step Content */}
            <div key={step} className="animate-in fade-in duration-200">
              {step === 1 && <StepSubject value={state.subject} onChange={(v) => update("subject", v)} />}
              {step === 2 && (
                <StepClass
                  value={state.classLevel}
                  onChange={(v) => update("classLevel", v)}
                  subject={state.subject}
                />
              )}
              {step === 3 && <StepBoard value={state.board} onChange={(v) => update("board", v)} />}
              {step === 4 && <StepMode value={state.mode} onChange={(v) => update("mode", v)} />}
              {step === 5 && <StepBudget value={state.budgetMax} onChange={(v) => update("budgetMax", v)} />}
              {step === 6 && <StepCity value={state.city} onChange={(v) => update("city", v)} />}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !state.subject}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-black text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{step === TOTAL_STEPS ? "Search Matching Tutors" : "Continue"}</span>
                <ArrowRight size={16} />
              </button>

              {step > 2 && step < TOTAL_STEPS && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 cursor-pointer"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          {/* Right: Trust & How It Works Sidebar */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: "Verified Tutors", value: "500+" },
                { icon: ShieldCheck, label: "KYC Approved", value: "100%" },
                { icon: Star, label: "Avg Rating", value: "4.7★" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center space-y-1">
                  <div className="mx-auto w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Icon size={16} className="text-[#2D9E6B]" />
                  </div>
                  <p className="text-base font-black text-[#0F2540]">{value}</p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h3 className="text-sm font-black text-[#0F2540]">How it works</h3>
              {[
                { step: "1", title: "Tell us what you need", desc: "Subject, class, board & location — takes 60 seconds." },
                { step: "2", title: "Browse matched tutors", desc: "See verified tutors with ratings, subjects & fee range." },
                { step: "3", title: "Sign up & connect", desc: "Create a free account to see phone numbers & chat directly." },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-xl bg-[#0F2540] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#0F2540]">{item.title}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-4 space-y-2">
              <p className="text-xs font-black text-[#0F2540]">✅ Always free for parents</p>
              <p className="text-xs font-semibold text-slate-600">
                Browsing tutors costs nothing. No subscription, no credit card needed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
