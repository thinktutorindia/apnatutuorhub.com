"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
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
} from "lucide-react";
import { searchTutorsPublic, type PublicTutorResult } from "@/app/actions/public.actions";
import Link from "next/link";

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

const CLASS_LEVELS = [
  { label: "Nursery / KG", group: "Primary" },
  { label: "Class 1", group: "Primary" },
  { label: "Class 2", group: "Primary" },
  { label: "Class 3", group: "Primary" },
  { label: "Class 4", group: "Primary" },
  { label: "Class 5", group: "Primary" },
  { label: "Class 6", group: "Middle School" },
  { label: "Class 7", group: "Middle School" },
  { label: "Class 8", group: "Middle School" },
  { label: "Class 9", group: "High School" },
  { label: "Class 10", group: "High School" },
  { label: "Class 11", group: "Senior Secondary" },
  { label: "Class 12", group: "Senior Secondary" },
  { label: "IIT-JEE", group: "Competitive" },
  { label: "NEET", group: "Competitive" },
  { label: "College / Degree", group: "Higher Education" },
];

const BOARDS = [
  { value: "CBSE", label: "CBSE", desc: "Central Board of Secondary Education" },
  { value: "ICSE", label: "ICSE / ISC", desc: "Indian Certificate of Secondary Education" },
  { value: "State Board", label: "State Board", desc: "Your state's education board" },
  { value: "IB", label: "IB", desc: "International Baccalaureate" },
  { value: "Other", label: "Not sure", desc: "I'll figure it out later" },
];

const MODES = [
  { value: "OFFLINE", label: "Home Tuition", desc: "Tutor comes to your home", icon: Home },
  { value: "ONLINE", label: "Online Only", desc: "Live video classes from anywhere", icon: Monitor },
  { value: "EITHER", label: "Either works", desc: "Flexible — home or online", icon: Users },
  { value: "COACHING", label: "Coaching Centre", desc: "At a coaching institute / centre", icon: GraduationCap },
];

const BUDGET_RANGES = [
  { label: "Up to ₹3,000/mo", max: 3000 },
  { label: "₹3,000–₹6,000/mo", max: 6000 },
  { label: "₹6,000–₹10,000/mo", max: 10000 },
  { label: "₹10,000–₹15,000/mo", max: 15000 },
  { label: "Above ₹15,000/mo", max: 99999 },
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

// ─── Step components ──────────────────────────────────────────────────────────

function StepSubject({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          What subject do you need help with?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">Pick one subject to get started — you can add more later.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {POPULAR_SUBJECTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onChange(s.label)}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 text-sm font-bold transition-all text-left cursor-pointer ${
              value === s.label
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <span className="text-lg shrink-0">{s.emoji}</span>
            <span>{s.label}</span>
            {value === s.label && <CheckCircle2 size={14} className="ml-auto text-[#2D9E6B] shrink-0" />}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Other subject... (type here)"
          className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-slate-200 text-sm font-semibold outline-none focus:border-[#2D9E6B] text-slate-900 bg-white"
        />
        {custom.trim() && (
          <button
            type="button"
            onClick={() => { onChange(custom.trim()); setCustom(""); }}
            className="px-4 py-2.5 rounded-2xl bg-[#2D9E6B] text-white text-sm font-bold cursor-pointer"
          >
            Use
          </button>
        )}
      </div>
    </div>
  );
}

function StepClass({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which class or level?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">Select the student's current class or level.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {CLASS_LEVELS.map((cl) => (
          <button
            key={cl.label}
            type="button"
            onClick={() => onChange(cl.label)}
            className={`px-3.5 py-3 rounded-2xl border-2 text-sm font-bold transition-all text-left cursor-pointer ${
              value === cl.label
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{cl.label}</span>
              {value === cl.label && <CheckCircle2 size={14} className="text-[#2D9E6B]" />}
            </div>
            <div className="text-[10px] font-medium text-slate-400 mt-0.5">{cl.group}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBoard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which board or curriculum?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">This helps us match tutors who specialise in your board.</p>
      </div>
      <div className="space-y-2.5">
        {BOARDS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.value)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all cursor-pointer ${
              value === b.value
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
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

function StepMode({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          How do you prefer to learn?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">Choose the teaching format that suits your schedule and location.</p>
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
                  ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
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

function StepBudget({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          What's your monthly budget?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">We'll only show tutors within your price range.</p>
      </div>
      <div className="space-y-2.5">
        {BUDGET_RANGES.map((b) => (
          <button
            key={b.max}
            type="button"
            onClick={() => onChange(b.max)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
              value === b.max
                ? "border-[#2D9E6B] bg-emerald-50 text-[#0F2540]"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#2D9E6B]/40 hover:bg-slate-50"
            }`}
          >
            <span>{b.label}</span>
            {value === b.max && <CheckCircle2 size={18} className="text-[#2D9E6B]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCity({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const POPULAR_CITIES = ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Lucknow", "Chandigarh", "Noida"];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Which city are you in?
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">We'll prioritise tutors near you. You can skip this.</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your city (e.g. Delhi, Pune, Mumbai)"
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
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                value === c
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
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
          <X size={18} />
        </button>
        <div className="px-6 pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Lock size={24} className="text-[#2D9E6B]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Create your free account
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              Sign up for free to contact this tutor, get phone numbers, and post your full requirement. Takes under 1 minute.
            </p>
          </div>
          <div className="space-y-2.5 pt-1">
            <a
              href={`/login?callbackUrl=${cb}&register=parent`}
              className="block w-full py-3 px-6 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-black text-sm transition-all shadow-md cursor-pointer text-center"
            >
              Sign Up Free — It's Quick!
            </a>
            <a
              href={`/login?callbackUrl=${cb}`}
              className="block w-full py-3 px-6 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all cursor-pointer text-center"
            >
              Already have an account? Sign In
            </a>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">100% free for parents · No credit card needed</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tutor Card ────────────────────────────────────────────────────────────────

function GuestTutorCard({
  tutor,
  onContactClick,
}: {
  tutor: PublicTutorResult;
  onContactClick: (tutorId: string) => void;
}) {
  const modeLabel =
    tutor.teachingMode === "ONLINE" ? "Online Only"
    : tutor.teachingMode === "OFFLINE" ? "Home Tuition"
    : tutor.teachingMode === "COACHING" ? "Coaching Centre"
    : "Home & Online";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div className="p-5 flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#2D9E6B] to-[#0F2540] flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-md">
          {tutor.name[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-[#0F2540] text-base leading-tight">{tutor.name}</h3>
                {tutor.isVerified && (
                  <span title="Verified Tutor"><ShieldCheck size={15} className="text-[#2D9E6B] shrink-0" /></span>
                )}
                {tutor.isFeatured && (
                  <span title="Featured Tutor"><Award size={15} className="text-amber-500 shrink-0" /></span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {tutor.qualification} · {tutor.experience} yr{tutor.experience !== 1 ? "s" : ""} exp
              </p>
            </div>
            {/* Fee */}
            {tutor.feeMin && (
              <div className="text-right shrink-0">
                <div className="text-base font-black text-[#0F2540]">
                  ₹{tutor.feeMin.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] font-semibold text-slate-400">per month</div>
              </div>
            )}
          </div>

          {/* Rating */}
          {tutor.totalReviews > 0 && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="font-black text-[#0F2540]">{tutor.averageRating.toFixed(1)}</span>
              </span>
              <span className="text-slate-400">{tutor.totalReviews} review{tutor.totalReviews !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Subjects */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tutor.subjects.slice(0, 4).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-lg bg-emerald-50 text-[#0F2540] border border-emerald-200 text-[10px] font-bold">
                {s}
              </span>
            ))}
            {tutor.subjects.length > 4 && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                +{tutor.subjects.length - 4} more
              </span>
            )}
          </div>

          {/* Mode & City */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 pt-0.5">
            <span className="flex items-center gap-1">
              <Monitor size={11} />
              {modeLabel}
            </span>
            {tutor.city && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {tutor.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <div className="px-5 pb-3 text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">
          {tutor.bio}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 pt-2 flex items-center gap-2 border-t border-slate-100">
        <Link
          href={`/tutor/${tutor.id}`}
          target="_blank"
          className="flex-1 py-2.5 px-4 rounded-2xl border-2 border-slate-200 hover:border-[#2D9E6B] hover:bg-emerald-50 text-slate-700 hover:text-[#0F2540] font-bold text-xs text-center transition-all cursor-pointer"
        >
          See Profile
        </Link>
        <button
          type="button"
          onClick={() => onContactClick(tutor.id)}
          className="flex-1 py-2.5 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          Contact Tutor
        </button>
      </div>
    </div>
  );
}

// ─── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({
  tutors,
  total,
  state,
  onContactClick,
  onBack,
}: {
  tutors: PublicTutorResult[];
  total: number;
  state: WizardState;
  onContactClick: (tutorId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {total > 0 ? `${total} tutors found` : "No tutors found"} for{" "}
            <span className="text-[#2D9E6B]">{state.subject}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {state.classLevel} · {state.board} · {state.city || "All India"}
          </p>
        </div>
      </div>

      {tutors.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="font-black text-[#0F2540] text-base">No tutors match your filters</p>
          <p className="text-sm text-slate-500 font-medium">Try a different subject, city, or budget range.</p>
          <button onClick={onBack} className="mt-2 px-5 py-2.5 rounded-2xl bg-[#2D9E6B] text-white font-bold text-sm cursor-pointer">
            Change Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {tutors.map((t) => (
              <GuestTutorCard key={t.id} tutor={t} onContactClick={onContactClick} />
            ))}
          </div>
          {/* Gate nudge */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0F2540] to-[#1a3a60] text-white text-center space-y-3">
            <Lock size={22} className="mx-auto text-emerald-400" />
            <p className="font-black text-base">See phone numbers & contact all tutors</p>
            <p className="text-xs text-slate-300 font-medium">
              {total > tutors.length ? `${total - tutors.length} more tutors are waiting. ` : ""}
              Create a free account to unlock contact details, post your requirement, and get tutor enquiries.
            </p>
            <a
              href={`/login?register=parent`}
              className="inline-block mt-1 px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-black text-sm transition-all shadow-md"
            >
              Sign Up Free — Under 1 Minute
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────

export function FindTutorWizard({ initialSubject = "" }: { initialSubject?: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PublicTutorResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateTargetId, setGateTargetId] = useState<string>("");

  const [state, setState] = useState<WizardState>({
    subject: initialSubject,
    classLevel: "",
    board: "CBSE",
    mode: "EITHER",
    budgetMax: 10000,
    city: "",
  });

  const update = useCallback(<K extends keyof WizardState>(key: K, val: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: val }));
  }, []);

  const canProceed = useCallback(() => {
    if (step === 1) return Boolean(state.subject);
    if (step === 2) return Boolean(state.classLevel);
    return true; // all other steps optional
  }, [step, state]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const { tutors, total } = await searchTutorsPublic({
        subjects: state.subject ? [state.subject] : [],
        classLevel: state.classLevel || undefined,
        board: state.board || undefined,
        mode: state.mode || undefined,
        budgetMax: state.budgetMax,
        city: state.city || undefined,
      });
      setResults(tutors);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  }, [state]);

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      await runSearch();
      setStep(TOTAL_STEPS + 1); // results step
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
      {/* Signup gate */}
      <GuestSignupGate
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        tutorId={gateTargetId}
        callbackParams={callbackParams}
      />

      {/* Progress bar */}
      {!showResults && (
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2D9E6B] transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#2D9E6B]" />
            <p className="text-sm font-bold text-[#0F2540]">Finding tutors for you…</p>
          </div>
        </div>
      )}

      {/* Step content — CSS fade transition keyed by step */}
      <div key={step} className="animate-in fade-in duration-200">
          {showResults && results ? (
            <ResultsPanel
              tutors={results}
              total={total}
              state={state}
              onContactClick={handleContactClick}
              onBack={handleBack}
            />
          ) : (
            <div className="space-y-6">
              {step === 1 && <StepSubject value={state.subject} onChange={(v) => update("subject", v)} />}
              {step === 2 && <StepClass value={state.classLevel} onChange={(v) => update("classLevel", v)} />}
              {step === 3 && <StepBoard value={state.board} onChange={(v) => update("board", v)} />}
              {step === 4 && <StepMode value={state.mode} onChange={(v) => update("mode", v)} />}
              {step === 5 && <StepBudget value={state.budgetMax} onChange={(v) => update("budgetMax", v)} />}
              {step === 6 && <StepCity value={state.city} onChange={(v) => update("city", v)} />}

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-black text-sm transition-all cursor-pointer ${
                    canProceed()
                      ? "bg-[#2D9E6B] hover:bg-[#238357] text-white shadow-md shadow-emerald-500/25"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {step === TOTAL_STEPS ? (
                    <>
                      <Search size={16} />
                      Find My Tutors
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                {(step === 3 || step >= 4) && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
