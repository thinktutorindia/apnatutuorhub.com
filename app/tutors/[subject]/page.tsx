import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ShieldCheck, Star, GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { notFound } from "next/navigation";
import { SUBJECTS } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

function slugifySubject(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const EXTRA_SUBJECT_SLUGS = [
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "english",
  "computer-science",
  "cbse-class-10",
  "cbse-class-12",
  "icse",
  "jee-mains",
  "neet-medical",
];

const VALID_SUBJECT_SLUGS = new Set([
  ...SUBJECTS.map(slugifySubject),
  ...EXTRA_SUBJECT_SLUGS,
]);

function formatSubjectName(raw: string): string {
  const fromTaxonomy = SUBJECTS.find((s) => slugifySubject(s) === raw);
  if (fromTaxonomy) return fromTaxonomy;
  const clean = raw.replace(/-/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const { subject } = await params;
  const slug = subject.toLowerCase();
  if (!VALID_SUBJECT_SLUGS.has(slug)) {
    return { title: "Subject not found — ApnaTutorHub" };
  }
  const subjectName = formatSubjectName(slug);

  return {
    title: `Find Top ${subjectName} Tutors — ApnaTutorHub`,
    description: `Connect with expert, verified home and online tutors for ${subjectName}. Post your requirement for free and get matched by location and budget.`,
    alternates: {
      canonical: `/tutors/${subject}`,
    },
    openGraph: {
      title: `Find Top ${subjectName} Tutors — ApnaTutorHub`,
      description: `Expert ${subjectName} tutors available for home and live online classes across India. Verified qualification certificates and background checks.`,
    },
  };
}

export default async function SubjectTutorPage({ params }: SubjectPageProps) {
  const { subject } = await params;
  const slug = subject.toLowerCase();
  if (!VALID_SUBJECT_SLUGS.has(slug)) notFound();
  const subjectName = formatSubjectName(slug);

  return (
    <div className="min-h-screen text-slate-900 bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md overflow-x-clip">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <Link href="/" className="min-w-0">
            <LogoBrand heightClass="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-xs font-extrabold text-slate-700 hover:text-slate-900 px-3 py-2 min-h-11 items-center"
            >
              Sign In
            </Link>
            <Link
              href="/parent/post-requirement"
              className="rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white px-3 sm:px-4 py-2 text-xs font-black transition-all shadow-md min-h-11 inline-flex items-center"
            >
              <span className="sm:hidden">Post Free</span>
              <span className="hidden sm:inline">Post Requirement</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-300 text-blue-950 text-xs font-black">
            <BookOpen size={14} className="text-blue-600" />
            <span>Subject Specialization</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0F2540] tracking-tight leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Find Expert <span className="text-blue-600">{subjectName}</span> Tutors Near You
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-600 max-w-2xl mx-auto">
            Post what you need and verified {subjectName} tutors near you will reach out — for home tuition or 1-on-1 online classes. Free for parents.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/find-tutor?subject=${encodeURIComponent(subjectName)}`}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-black transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Find {subjectName} Tutors — Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/find-tutor"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-sm font-black transition-all shadow-sm flex items-center justify-center"
            >
              Browse All Tutors
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-black">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-extrabold text-[#0F2540]">Verified Educators</h3>
            <p className="text-xs text-slate-600 font-semibold">
              Background checked &amp; credential verified {subjectName} teachers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
              <GraduationCap size={20} />
            </div>
            <h3 className="text-base font-extrabold text-[#0F2540]">Flexible Learning</h3>
            <p className="text-xs text-slate-600 font-semibold">
              Choose home tuition or 1-on-1 online classes with flexible hours.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
              <Star size={20} />
            </div>
            <h3 className="text-base font-extrabold text-[#0F2540]">Top-Rated Results</h3>
            <p className="text-xs text-slate-600 font-semibold">
              Improve grades &amp; exam performance with tailored study plans.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
