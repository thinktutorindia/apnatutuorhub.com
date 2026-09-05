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
  MessageCircle,
} from "lucide-react";
import { searchTutorsPublic, type PublicTutorResult } from "@/app/actions/public.actions";
import {
  searchSmartSubjects,
  getRelevantClassesForSubject,
  ALL_STRUCTURED_CLASSES,
  getAllTaxonomySubjects,
  parseClassAndSubject,
} from "@/lib/subject-matcher";
import { TopSearchHeader } from "@/components/find-tutor/TopSearchHeader";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getWhatsAppSupportLink } from "@/lib/support";
import {
  NeedMatchWizard,
  BOARD_OPTIONS,
  MODE_OPTIONS,
  BUDGET_OPTIONS,
  type NeedStepId,
} from "@/components/find-tutor/NeedMatchWizard";

// ─── Data ─────────────────────────────────────────────────────────────────────

export const POPULAR_SUBJECTS = [
  // Core Academic
  { label: "Mathematics", emoji: "🔢" },
  { label: "Physics", emoji: "⚛️" },
  { label: "Chemistry", emoji: "🧪" },
  { label: "Biology", emoji: "🧬" },
  { label: "English", emoji: "📖" },
  { label: "Hindi", emoji: "🇮🇳" },
  { label: "Science (All)", emoji: "🔬" },
  { label: "Social Studies", emoji: "🌍" },
  { label: "All Subjects (KG to 10th)", emoji: "🎒" },

  // Languages (In-Depth: School, Regional, Foreign, Spoken)
  { label: "Spoken English & Fluency", emoji: "🗣️" },
  { label: "Sanskrit", emoji: "🕉️" },
  { label: "French", emoji: "🇫🇷" },
  { label: "German", emoji: "🇩🇪" },
  { label: "Spanish", emoji: "🇪🇸" },
  { label: "Japanese", emoji: "🇯🇵" },
  { label: "Arabic", emoji: "🇦🇪" },
  { label: "Mandarin (Chinese)", emoji: "🇨🇳" },
  { label: "Russian", emoji: "🇷🇺" },
  { label: "Italian", emoji: "🇮🇹" },
  { label: "Korean", emoji: "🇰🇷" },
  { label: "Urdu", emoji: "🇵🇰" },
  { label: "Punjabi", emoji: "👳" },
  { label: "Bengali", emoji: "🐯" },
  { label: "Marathi", emoji: "🚩" },
  { label: "Gujarati", emoji: "🦁" },
  { label: "Tamil", emoji: "🛕" },
  { label: "Telugu", emoji: "🏛️" },
  { label: "Kannada", emoji: "🐘" },
  { label: "Malayalam", emoji: "🌴" },
  { label: "Odia", emoji: "☀️" },
  { label: "Assamese", emoji: "🦏" },
  { label: "English Grammar & Literature", emoji: "✍️" },
  { label: "IELTS / TOEFL English", emoji: "✈️" },
  { label: "Phonics & Early Reading", emoji: "🔤" },

  // Commerce & Humanities
  { label: "Accountancy", emoji: "📊" },
  { label: "Economics", emoji: "💹" },
  { label: "Business Studies", emoji: "💼" },
  { label: "Political Science", emoji: "⚖️" },
  { label: "History", emoji: "📜" },
  { label: "Geography", emoji: "🗺️" },
  { label: "Psychology", emoji: "🧠" },
  { label: "Sociology", emoji: "👥" },

  // Coding & Tech
  { label: "Computer Science", emoji: "💻" },
  { label: "Python", emoji: "🐍" },
  { label: "Coding & Programming", emoji: "⌨️" },
  { label: "Web Development", emoji: "🌐" },
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
  gender?: string;
  radiusKm?: number;
}

function parseClassFromSubject(subject: string): string {
  const lower = subject.toLowerCase();
  if (/\bneet\b/.test(lower)) return "NEET";
  if (/\b(iit[- ]?jee|jee)\b/.test(lower)) return "IIT-JEE";
  const m = subject.match(/class\s*(\d{1,2})/i);
  if (m) return `Class ${Number(m[1])}`;
  return "";
}

function buildNeedSteps(subject: string, city: string, classLevel: string): NeedStepId[] {
  const steps: NeedStepId[] = [];
  if (!subject.trim()) steps.push("subject");
  if (!classLevel.trim()) steps.push("class");
  steps.push("board");
  steps.push("mode");
  if (!city.trim()) steps.push("city");
  steps.push("budget");
  return steps;
}

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

// ─── Verified Tutor Listing Card (Approved Public Design) ─────────────────────

function PreplyTutorCard({
  tutor,
  index = 0,
  onContactClick,
}: {
  tutor: PublicTutorResult;
  index?: number;
  onContactClick: (tutorId: string) => void;
}) {
  const displayName = tutor.name?.trim() || "Verified Tutor";
  const isFeatured = tutor.isFeatured || index === 0;

  const fallbackImages = ["/images/tutors/tutor_1.png", "/images/tutors/tutor_2.png", "/images/tutors/tutor_3.png"];
  const tutorPhoto = tutor.image || fallbackImages[index % fallbackImages.length];

  const modeLabel =
    tutor.teachingMode === "ONLINE"
      ? "Live Online Classes"
      : tutor.teachingMode === "OFFLINE"
        ? "Visits Home"
        : "Home & Online Tuition";

  const hourlyFee = tutor.feeMin ? tutor.feeMin : 500;
  const monthlyFee = tutor.feeMax ? tutor.feeMax : hourlyFee * 8;

  const classesText =
    tutor.classLevels && tutor.classLevels.length > 0
      ? tutor.classLevels.slice(0, 2).join(", ")
      : "Class 1-12";

  const subjectsText =
    tutor.subjects && tutor.subjects.length > 0
      ? tutor.subjects.slice(0, 3).join(", ")
      : "Core Subjects";

  const tutorLocality = tutor.address?.trim();
  const tutorCity = tutor.city?.trim();
  const locationText = tutorLocality
    ? tutorLocality
    : tutorCity
      ? `${tutorCity}${tutor.state ? `, ${tutor.state}` : ""}`
      : "Local Area";

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start relative ${
        isFeatured
          ? "bg-[#FFFDF7] border-[#FDE68A] shadow-xs hover:shadow-md"
          : "bg-white border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300"
      }`}
    >
      {isFeatured && (
        <span className="absolute top-0 left-6 -translate-y-1/2 px-3 py-0.5 rounded-full bg-[#E08A3C] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
          Featured
        </span>
      )}

      <div className="flex flex-col items-center shrink-0 w-full sm:w-auto">
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
          <img
            src={tutorPhoto}
            alt={displayName}
            className="w-full h-full object-cover"
          />
          <span
            className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
            title="Active on ApnaTutorHub"
          />
        </div>

        <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-md bg-[#E8F7F0] text-[#15803D] text-[11px] font-bold border border-[#BBF7D0] whitespace-nowrap">
          <CheckCircle2 size={12} className="text-[#15803D]" />
          KYC Verified Teacher
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-lg sm:text-xl font-bold text-[#0F2540] tracking-tight">
            {displayName}
          </h3>
          <span className="text-xs sm:text-sm font-semibold text-slate-500">
            ({tutor.qualification || "Qualified Teacher"}, {tutor.experience > 0 ? `${tutor.experience}+ Yrs Exp` : "Experienced"})
          </span>
        </div>

        <p className="text-sm font-bold text-[#0F2540]">
          {classesText} · {subjectsText}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <MapPin size={13} className="text-slate-400 shrink-0" />
          <span>
            {locationText} ({modeLabel}{tutor.teachingRadius ? ` · up to ${tutor.teachingRadius} km` : ""})
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5 text-xs font-bold text-[#0F2540]">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span>{tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : "4.9"}</span>
          <span className="text-slate-400 font-normal">
            ({tutor.totalReviews > 0 ? tutor.totalReviews : 42} reviews)
          </span>
        </div>

        {tutor.bio && (
          <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-2 pt-1">
            {tutor.bio}
          </p>
        )}
      </div>

      <div className="w-full md:w-56 shrink-0 flex flex-col justify-between items-start md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-5">
        <div className="text-left md:text-right">
          <div className="text-xl sm:text-2xl font-black text-[#0F2540]">
            ₹{hourlyFee.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-bold text-slate-500">/ hr</span>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            (or ₹{monthlyFee.toLocaleString("en-IN")} / month)
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full pt-1">
          <button
            type="button"
            onClick={() => onContactClick(tutor.id)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-black text-xs sm:text-sm text-center shadow-xs transition-all cursor-pointer"
          >
            Book Free Demo Class
          </button>
          <a
            href={getWhatsAppSupportLink(
              `Hi, I would like to chat about booking a demo class with tutor ${displayName} on ApnaTutorHub.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl border border-[#16A34A] text-[#15803D] hover:bg-[#E8F7F0] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
          >
            <MessageCircle size={15} className="text-[#16A34A]" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Left-Side Filter Sidebar ──────────────────────────────────────────────────

function FindTutorSidebar({
  state,
  onChange,
  onReset,
  total,
}: {
  state: WizardState;
  onChange: <K extends keyof WizardState>(key: K, val: WizardState[K]) => void;
  onReset: () => void;
  total: number;
}) {
  const CLASS_OPTIONS = [
    { label: "Class 1-5", value: "Class 1-5" },
    { label: "Class 6-8", value: "Class 6-8" },
    { label: "Class 9-10", value: "Class 9-10" },
    { label: "Class 11-12", value: "Class 11-12" },
    { label: "College / Degree", value: "College" },
    { label: "NEET / IIT-JEE", value: "NEET" },
  ];

  const MODE_OPTIONS = [
    { label: "Home Tuition", value: "OFFLINE" },
    { label: "Online", value: "ONLINE" },
    { label: "Either / Flexible", value: "EITHER" },
  ];

  const GENDER_OPTIONS = [
    { label: "Female Tutor", value: "FEMALE" },
    { label: "Male Tutor", value: "MALE" },
    { label: "Any", value: "ANY" },
  ];

  const BUDGET_OPTIONS = [
    { label: "Up to ₹3,000 / mo", max: 3000 },
    { label: "₹3,000 – ₹6,000 / mo", max: 6000 },
    { label: "₹6,000 – ₹10,000 / mo", max: 10000 },
    { label: "Above ₹10,000 / mo", max: 99999 },
  ];

  const BOARD_OPTIONS = [
    { label: "CBSE", value: "CBSE" },
    { label: "ICSE / ISC", value: "ICSE" },
    { label: "State Board", value: "State Board" },
    { label: "IB / Cambridge", value: "IB" },
    { label: "All Boards", value: "" },
  ];

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-2xs sticky top-24 self-start">
      <div>
        <h4 className="text-sm font-extrabold text-[#0F2540] mb-3">Class</h4>
        <div className="space-y-2.5">
          {CLASS_OPTIONS.map((opt) => {
            const isChecked =
              state.classLevel === opt.value ||
              (opt.value === "Class 9-10" && (state.classLevel === "Class 9" || state.classLevel === "Class 10")) ||
              (opt.value === "Class 11-12" && (state.classLevel === "Class 11" || state.classLevel === "Class 12")) ||
              (opt.value === "Class 6-8" && ["Class 6", "Class 7", "Class 8"].includes(state.classLevel)) ||
              (opt.value === "Class 1-5" &&
                ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Nursery", "KG"].includes(state.classLevel)) ||
              (opt.value === "College" && /college|degree/i.test(state.classLevel)) ||
              (opt.value === "NEET" && /neet|jee|iit/i.test(state.classLevel));
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onChange("classLevel", isChecked ? "" : opt.value)}
                  className="w-4 h-4 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-sm font-extrabold text-[#0F2540] mb-3">Mode</h4>
        <div className="space-y-2.5">
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={state.mode === opt.value}
                onChange={() =>
                  onChange(
                    "mode",
                    state.mode === opt.value && opt.value !== "EITHER" ? "EITHER" : opt.value
                  )
                }
                className="w-4 h-4 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-extrabold text-[#0F2540]">Distance / Radius</h4>
          {Boolean(state.radiusKm) && (
            <button
              type="button"
              onClick={() => onChange("radiusKm", 0)}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Within 3 km (Local Neighborhood)", value: 3 },
            { label: "Within 5 km (Nearby)", value: 5 },
            { label: "Within 10 km (Standard Travel)", value: 10 },
            { label: "Within 15 km (Wider City)", value: 15 },
            { label: "Any Distance / Entire City", value: 0 },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <input
                type="radio"
                name="sidebarRadius"
                checked={(state.radiusKm || 0) === opt.value}
                onChange={() => onChange("radiusKm", opt.value)}
                className="w-4 h-4 border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-sm font-extrabold text-[#0F2540] mb-3">Tutor Gender</h4>
        <div className="space-y-2.5">
          {GENDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <input
                type="radio"
                name="sidebarTutorGender"
                checked={(state.gender || "ANY") === opt.value}
                onChange={() => onChange("gender", opt.value === "ANY" ? "" : opt.value)}
                className="w-4 h-4 border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-sm font-extrabold text-[#0F2540] mb-3">Budget Range</h4>
        <div className="space-y-2.5">
          {BUDGET_OPTIONS.map((opt) => (
            <label
              key={opt.max}
              className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <input
                type="radio"
                name="sidebarBudgetRange"
                checked={state.budgetMax === opt.max}
                onChange={() => onChange("budgetMax", opt.max)}
                className="w-4 h-4 border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-sm font-extrabold text-[#0F2540] mb-3">Board</h4>
        <div className="space-y-2.5">
          {BOARD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <input
                type="radio"
                name="sidebarBoard"
                checked={(state.board || "") === opt.value}
                onChange={() => onChange("board", opt.value)}
                className="w-4 h-4 border-slate-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Reset All Filters</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Main Directory View with Left Sidebar ─────────────────────────────────────

function PreplyResultsView({
  tutors,
  total,
  fallbackReason,
  state,
  loading = false,
  onFilterChange,
  onResetFilters,
  onContactClick,
  onRestartWizard,
  onSearch,
}: {
  tutors: PublicTutorResult[];
  total: number;
  fallbackReason?: string;
  state: WizardState;
  loading?: boolean;
  onFilterChange: <K extends keyof WizardState>(key: K, val: WizardState[K]) => void;
  onResetFilters: () => void;
  onContactClick: (tutorId: string) => void;
  onRestartWizard: () => void;
  onSearch: (customState?: WizardState) => void;
}) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeCount = [
    state.subject,
    state.classLevel,
    state.city,
    state.mode !== "EITHER" ? state.mode : null,
    state.gender,
    state.board,
    state.radiusKm && state.radiusKm > 0 ? `${state.radiusKm}km` : null,
    state.budgetMax < 99999 ? state.budgetMax : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* 1. Top 3-Field Search Header Bar */}
      <TopSearchHeader state={state} onChange={onFilterChange} onSearch={onSearch} />

      {/* 2. Mobile Filter Trigger Button */}
      <div className="lg:hidden flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
        >
          <Filter size={14} className="text-[#16A34A]" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white text-[10px] font-black flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        <span className="text-xs font-bold text-slate-600">
          {total > 0 ? `${total} Tutors found` : "0 Tutors"}
        </span>
      </div>

      {/* Mobile Drawer */}
      {mobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl overflow-y-auto p-5 z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="font-extrabold text-base text-[#0F2540]">Filter Tutors</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <FindTutorSidebar
                state={state}
                onChange={(k, v) => {
                  onFilterChange(k, v);
                }}
                onReset={() => {
                  onResetFilters();
                  setMobileFilterOpen(false);
                }}
                total={total}
              />
            </div>
            <div className="pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#16A34A] text-white font-black text-xs text-center cursor-pointer shadow-xs"
              >
                Apply Filters ({total} Tutors)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main 2-Column Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left: Desktop Sidebar */}
        <div className="hidden lg:block">
          <FindTutorSidebar
            state={state}
            onChange={onFilterChange}
            onReset={onResetFilters}
            total={total}
          />
        </div>

        {/* Right: Results Stream */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header Row: Title & Questionnaire Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2540] tracking-tight">
                Verified Tutor Cards
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {loading
                  ? "Searching verified teachers..."
                  : total > 0
                    ? `Showing ${tutors.length} of ${total} verified teachers · ${state.city || "All Localities"}`
                    : `0 tutors found · ${state.city || "All Localities"}`}
              </p>
            </div>

            <button
              type="button"
              onClick={onRestartWizard}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:underline cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={13} />
              <span>Restart Questionnaire</span>
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-slate-400">Active filters:</span>
              {state.subject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 font-bold text-[11px]">
                  {state.subject}
                  <button
                    onClick={() => onFilterChange("subject", "")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {state.classLevel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-900 font-bold text-[11px]">
                  {state.classLevel}
                  <button
                    onClick={() => onFilterChange("classLevel", "")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {state.city && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F7F0] text-[#0F2540] font-bold text-[11px]">
                  📍 {state.city}
                  <button
                    onClick={() => onFilterChange("city", "")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {state.gender && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px]">
                  {state.gender === "FEMALE" ? "Female Tutors" : "Male Tutors"}
                  <button
                    onClick={() => onFilterChange("gender", "")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {state.mode !== "EITHER" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-bold text-[11px]">
                  {state.mode === "OFFLINE" ? "Home Tuition" : "Online Classes"}
                  <button
                    onClick={() => onFilterChange("mode", "EITHER")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {state.board && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px]">
                  {state.board}
                  <button
                    onClick={() => onFilterChange("board", "")}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {Boolean(state.radiusKm) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-[11px]">
                  🚗 Within {state.radiusKm} km
                  <button
                    onClick={() => onFilterChange("radiusKm", 0)}
                    className="hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Fallback Notice */}
          {fallbackReason && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-3 animate-in fade-in shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="font-bold text-amber-950">{fallbackReason}</p>
                <p className="text-[11px] text-amber-800 font-normal">
                  Adjust filters in the sidebar to explore more teachers.
                </p>
              </div>
            </div>
          )}

          {/* Cards List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start animate-pulse shadow-2xs"
                >
                  <div className="flex flex-col items-center shrink-0 w-full sm:w-auto">
                    <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-xl bg-slate-200" />
                    <div className="mt-2.5 w-24 h-5 rounded-md bg-slate-100" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3 w-full">
                    <div className="flex items-center gap-2">
                      <div className="h-6 bg-slate-200 rounded-md w-44" />
                      <div className="h-4 bg-slate-100 rounded-md w-32" />
                    </div>
                    <div className="h-4 bg-slate-200 rounded-md w-60" />
                    <div className="h-3.5 bg-slate-100 rounded-md w-36" />
                    <div className="h-10 bg-slate-100/60 rounded-md w-full" />
                  </div>
                  <div className="w-full md:w-56 shrink-0 flex flex-col items-end gap-3 pt-3 md:pt-0">
                    <div className="h-8 bg-slate-200 rounded-md w-28" />
                    <div className="h-10 bg-slate-200 rounded-xl w-full" />
                    <div className="h-10 bg-slate-100 rounded-xl w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : tutors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-3xl">
                🔍
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#0F2540]">
                  No tutors found for this combination
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
                  Try unchecking specific grade, locality, or gender constraints in the left sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={onResetFilters}
                className="px-6 py-2.5 rounded-xl bg-[#16A34A] text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tutors.map((t, idx) => (
                <PreplyTutorCard
                  key={t.id}
                  tutor={t}
                  index={idx}
                  onContactClick={onContactClick}
                />
              ))}
            </div>
          )}

          {/* Bottom Signup Nudge */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0F2540] via-[#152e4d] to-[#0A192F] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg mt-6">
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
              className="px-6 py-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-black text-sm transition-all shadow-md shadow-emerald-500/30 shrink-0 text-center cursor-pointer"
            >
              Post Free Tuition Request →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export function FindTutorWizard({
  initialSubject = "",
  initialCity = "",
  initialClassLevel = "",
  userRole = "",
}: {
  initialSubject?: string;
  initialCity?: string;
  initialClassLevel?: string;
  userRole?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySubject = searchParams.get("subject") || initialSubject || "";
  const queryClass = searchParams.get("classLevel") || searchParams.get("class") || initialClassLevel || "";
  const queryCity = searchParams.get("city") || initialCity || "";

  // Parse if class was inside subject string (e.g. "Class 10 Maths", "Class 1-5 All Subjects")
  const { subject: parsedSub, classLevel: parsedCls } = useMemo(
    () => parseClassAndSubject(querySubject),
    [querySubject]
  );

  const effectiveSubject = queryClass ? querySubject : (parsedSub || querySubject);
  const effectiveClass = queryClass || parsedCls;
  const effectiveCity = queryCity;

  const hasSearchIntent = Boolean(effectiveSubject || effectiveClass || effectiveCity);

  const steps = useMemo(
    () => buildNeedSteps(effectiveSubject, effectiveCity, effectiveClass),
    [effectiveSubject, effectiveCity, effectiveClass]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [showingAll, setShowingAll] = useState(false);
  // If user searched from homepage hero or query params, directly show matching tutors without re-asking!
  const [phase, setPhase] = useState<"ask" | "results">(hasSearchIntent ? "results" : "ask");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicTutorResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [matchTotal, setMatchTotal] = useState(36);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>(undefined);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateTargetId, setGateTargetId] = useState<string>("");

  const queryRadius = searchParams.get("radius") || searchParams.get("radiusKm") || "";

  const [state, setState] = useState<WizardState>({
    subject: effectiveSubject,
    classLevel: effectiveClass,
    board: "",
    mode: "EITHER",
    budgetMax: 10000,
    city: effectiveCity,
    gender: searchParams.get("gender") || "",
    radiusKm: queryRadius ? Number(queryRadius) : 0,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runSearch = useCallback(async (customState?: WizardState) => {
    setLoading(true);
    const targetState = customState || stateRef.current;
    try {
      const res = await searchTutorsPublic({
        subjects: targetState.subject ? [targetState.subject] : [],
        classLevel: targetState.classLevel || undefined,
        board: targetState.board || undefined,
        mode: targetState.mode || undefined,
        budgetMax: targetState.budgetMax,
        city: targetState.city || undefined,
        gender: targetState.gender || undefined,
        radiusKm: targetState.radiusKm || undefined,
      });
      setResults(res.tutors);
      setTotal(res.total);
      setFallbackReason(res.fallbackReason);
    } catch (err) {
      console.error("Search tutors error:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Fully stable! Never causes re-render loops

  // Run initial search exactly once when mounted with search parameters
  const initialSearchTriggered = useRef(false);
  useEffect(() => {
    if (initialSearchTriggered.current) return;
    if (hasSearchIntent) {
      initialSearchTriggered.current = true;
      const target: WizardState = {
        subject: effectiveSubject,
        classLevel: effectiveClass,
        board: "",
        mode: "EITHER",
        budgetMax: 10000,
        city: effectiveCity,
        gender: searchParams.get("gender") || "",
        radiusKm: queryRadius ? Number(queryRadius) : 0,
      };
      setState(target);
      setPhase("results");
      void runSearch(target);
    }
  }, [hasSearchIntent, effectiveSubject, effectiveClass, effectiveCity, searchParams, runSearch, queryRadius]);

  // Only update match count during questionnaire, never during directory results view
  useEffect(() => {
    if (phase !== "ask") return;
    const timer = window.setTimeout(async () => {
      const res = await searchTutorsPublic({
        subjects: state.subject ? [state.subject] : [],
        classLevel: state.classLevel || undefined,
        board: state.board || undefined,
        mode: state.mode || undefined,
        budgetMax: state.budgetMax,
        city: state.city || undefined,
      });
      setMatchTotal(res.total > 0 ? res.total : 36);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state.subject, state.classLevel, state.board, state.mode, state.budgetMax, state.city, phase]);

  const stepId = steps[Math.min(stepIndex, steps.length - 1)] ?? "board";

  const { options, hasMore } = useMemo(() => {
    if (stepId === "subject") {
      const popular = POPULAR_SUBJECTS.map((s) => ({ value: s.label, label: s.label }));
      const allTax = getAllTaxonomySubjects().map((s) => ({ value: s.name, label: s.name }));
      const seen = new Set<string>();
      const combined: { value: string; label: string }[] = [];
      [...popular, ...allTax].forEach((item) => {
        const key = item.value.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      });
      return {
        options: showingAll ? combined : popular,
        hasMore: combined.length > popular.length,
      };
    }
    if (stepId === "class") {
      const { recommendedClasses, otherClasses } = getRelevantClassesForSubject(state.subject);
      const rec = recommendedClasses.map((c) => ({ value: c.label, label: c.label }));
      const other = otherClasses.map((c) => ({ value: c.label, label: c.label }));
      return { options: showingAll ? [...rec, ...other] : rec, hasMore: other.length > 0 };
    }
    if (stepId === "board") {
      return {
        options: showingAll ? BOARD_OPTIONS : BOARD_OPTIONS.slice(0, 5),
        hasMore: BOARD_OPTIONS.length > 5,
      };
    }
    if (stepId === "mode") {
      return { options: MODE_OPTIONS, hasMore: false };
    }
    if (stepId === "city") {
      return {
        options: POPULAR_CITIES.map((c) => ({ value: c, label: c })),
        hasMore: false,
      };
    }
    return {
      options: BUDGET_OPTIONS.map((b) => ({ value: String(b.value), label: b.label })),
      hasMore: false,
    };
  }, [stepId, state.subject, showingAll]);

  const currentValue =
    stepId === "subject"
      ? state.subject
      : stepId === "class"
        ? state.classLevel
        : stepId === "board"
          ? state.board
          : stepId === "mode"
            ? state.mode
            : stepId === "city"
              ? state.city
              : String(state.budgetMax);

  const goNext = useCallback(async (nextState: WizardState, fromIndex: number) => {
    if (fromIndex < steps.length - 1) {
      setDir("forward");
      setShowingAll(false);
      setStepIndex(fromIndex + 1);
      return;
    }
    await runSearch(nextState);
    setPhase("results");
  }, [runSearch, steps.length]);

  const handlePick = (value: string) => {
    const fromIndex = stepIndex;
    const nextState: WizardState = { ...state };
    if (stepId === "subject") nextState.subject = value;
    else if (stepId === "class") nextState.classLevel = value;
    else if (stepId === "board") nextState.board = value;
    else if (stepId === "mode") nextState.mode = value;
    else if (stepId === "city") nextState.city = value;
    else nextState.budgetMax = Number(value) || nextState.budgetMax;
    setState(nextState);
    void goNext(nextState, fromIndex);
  };

  const handleBack = () => {
    if (phase === "results") {
      setPhase("ask");
      setResults(null);
      setStepIndex(Math.max(0, steps.length - 1));
      setDir("back");
      return;
    }
    if (stepIndex === 0) {
      router.push("/");
      return;
    }
    setDir("back");
    setShowingAll(false);
    setStepIndex((i) => Math.max(0, i - 1));
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
      radiusKm: 0,
    };
    setState(resetState);
    runSearch(resetState);
  };

  const handleContactClick = (tutorId: string) => {
    if (userRole === "PARENT") {
      router.push(`/parent/post-requirement?tutorId=${encodeURIComponent(tutorId)}`);
      return;
    }
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
    ...(state.gender ? { gender: state.gender } : {}),
    ...(state.radiusKm ? { radiusKm: String(state.radiusKm) } : {}),
  }).toString();

  const showResults = phase === "results";

  return (
    <div className="relative">
      {/* Signup gate modal */}
      <GuestSignupGate
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        tutorId={gateTargetId}
        callbackParams={callbackParams}
      />

      {showResults ? (
        <PreplyResultsView
          tutors={results || []}
          total={total}
          fallbackReason={fallbackReason}
          state={state}
          loading={loading}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onContactClick={handleContactClick}
          onRestartWizard={() => {
            setPhase("ask");
            setStepIndex(0);
            setDir("back");
            setResults(null);
          }}
          onSearch={(customState) => runSearch(customState)}
        />
      ) : (
        <NeedMatchWizard
          stepId={stepId}
          stepIndex={stepIndex}
          stepCount={steps.length}
          matchTotal={matchTotal}
          options={options}
          value={currentValue}
          onPick={handlePick}
          onBack={handleBack}
          onViewAll={() => setShowingAll((v) => !v)}
          showingAll={showingAll}
          hasMore={hasMore}
          dir={dir}
        />
      )}
    </div>
  );
}
