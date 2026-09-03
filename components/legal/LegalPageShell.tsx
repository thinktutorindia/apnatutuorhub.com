import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SiteFooter } from "@/components/home/SiteFooter";

export function LegalPageShell({
  badge,
  title,
  summary,
  updated,
  children,
}: {
  badge: string;
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link href="/" className="min-w-0 shrink">
            <LogoBrand heightClass="h-10 sm:h-11" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-800 text-white hover:bg-slate-800"
          >
            <ArrowLeft size={13} />
            Home
          </Link>
        </div>
      </header>

      <section className="bg-[#0F2540] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto max-w-4xl space-y-3 text-center">
          <p className="text-[11px] font-800 uppercase tracking-widest text-emerald-300">{badge}</p>
          <h1 className="text-3xl font-800 tracking-tight sm:text-4xl" style={{ fontFamily: "Poppins, sans-serif" }}>
            {title}
          </h1>
          <p className="mx-auto max-w-2xl text-sm font-500 text-slate-300">{summary}</p>
          <p className="text-xs font-600 text-slate-400">Last updated: {updated}</p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <h2 className="text-xl font-800 text-[#0F2540]">{title}</h2>
      <div className="space-y-3 text-sm font-500 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
