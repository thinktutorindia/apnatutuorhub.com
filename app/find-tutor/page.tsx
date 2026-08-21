import type { Metadata } from "next";
import { LogoBrand } from "@/components/brand/Logo";
import { FindTutorWizard } from "@/components/find-tutor/FindTutorWizard";
import Link from "next/link";
import { ShieldCheck, Star, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Find Verified Tutors — ApnaTutorHub",
  description:
    "Tell us what you need and we'll find the best tutors for your subject, class, and location. 100% free. No sign-up needed to browse.",
  alternates: { canonical: "/find-tutor" },
};

export default async function FindTutorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {} as Record<string, string | string[] | undefined>;
  const rawSubject = params.subject;
  const initialSubject = (Array.isArray(rawSubject) ? rawSubject[0] : rawSubject)?.trim() ?? "";

  const STATS = [
    { icon: Users, label: "Verified Tutors", value: "500+" },
    { icon: ShieldCheck, label: "KYC Approved", value: "100%" },
    { icon: Star, label: "Avg Rating", value: "4.7★" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <LogoBrand size={36} />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-xs font-extrabold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login?register=parent"
              className="text-xs font-black px-4 py-2 rounded-xl bg-[#0F2540] hover:bg-[#1a3560] text-white transition-all shadow-sm"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
          {/* Left: Wizard */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <span className="text-xl">🎓</span>
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
              <FindTutorWizard initialSubject={initialSubject} />
            </div>
          </div>

          {/* Right: Trust panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 grid grid-cols-3 gap-3">
              {STATS.map(({ icon: Icon, label, value }) => (
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
      </div>
    </div>
  );
}
