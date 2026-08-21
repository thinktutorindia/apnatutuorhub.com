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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <LogoBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-extrabold text-slate-700 hover:text-[#0F2540] px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login?register=parent"
              className="text-xs font-black px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <FindTutorWizard initialSubject={initialSubject} />
      </main>
    </div>
  );
}
