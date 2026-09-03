import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, EyeOff, FileText } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { SiteFooter } from "@/components/home/SiteFooter";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Privacy Policy | ApnaTutorHub",
  description:
    "How ApnaTutorHub collects, uses, and protects parent and tutor information on the home-tuition marketplace.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 overflow-x-clip">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <Link href="/" className="min-w-0 shrink">
            <LogoBrand heightClass="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/terms"
              className="hidden sm:inline text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all inline-flex items-center gap-1 min-h-11"
            >
              <ArrowLeft size={13} />
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0F2540] text-white pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-extrabold backdrop-blur-md">
            <Lock size={14} />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
            We collect only what we need to match parents with verified tutors, run bookings and chat, and keep accounts secure.
          </p>
          <div className="text-xs font-semibold text-slate-400">
            Last Updated: August 26, 2026
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-sm font-black text-[#0F2540]">Account data</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Name, email, phone, role, city, and profile details you submit at signup or in settings.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <EyeOff size={18} />
            </div>
            <h2 className="text-sm font-black text-[#0F2540]">Contact unlock</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Parent phone is shown to a tutor only after that tutor unlocks the requirement with coins.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <h2 className="text-sm font-black text-[#0F2540]">KYC documents</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Identity and qualification files are stored privately for verification review, not public listing.
            </p>
          </div>
        </div>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
          <h2 className="text-xl font-black text-[#0F2540]">1. What we collect</h2>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm font-semibold text-slate-700">
            <li>Account identity: name, email, phone number, password hash, Google sign-in identifiers.</li>
            <li>Parent requirements: subject, class, board, budget, city, area, and optional map pin.</li>
            <li>Tutor profiles: subjects, fees, experience, bio, availability, and verification documents.</li>
            <li>Marketplace activity: lead unlocks, bookings, chat messages, reviews, wallet transactions.</li>
            <li>Technical logs: IP, device, and security events used to prevent abuse.</li>
          </ul>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
          <h2 className="text-xl font-black text-[#0F2540]">2. How we use it</h2>
          <p>
            Data is used to operate the tutor marketplace: matching, unlocking contacts, booking classes, in-app chat, coin wallets, KYC review, support, and fraud prevention. We do not sell personal information. Payment card details are processed by Razorpay, not stored on our servers.
          </p>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
          <h2 className="text-xl font-black text-[#0F2540]">3. Sharing</h2>
          <p>
            We share contact details only with the other party in a matched lead, booking, or chat. Staff with assigned support or operations roles may access records needed to help you. Processors (hosting, email, analytics, payments) receive the minimum data required to provide those services.
          </p>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
          <h2 className="text-xl font-black text-[#0F2540]">4. Retention &amp; your choices</h2>
          <p>
            We keep account and transaction records while your account is active and as required for legal, tax, and dispute purposes. You can update profile details in-app. To request deletion or a copy of your data, WhatsApp support at {SUPPORT_PHONE_DISPLAY} from your logged-in account.
          </p>
          <a
            href={getWhatsAppSupportLink("Hi ApnaTutorHub Support, I have a privacy request.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-black"
          >
            WhatsApp {SUPPORT_PHONE_DISPLAY}
          </a>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
          <h2 className="text-xl font-black text-[#0F2540]">5. Cookies &amp; analytics</h2>
          <p>
            We use essential cookies for sign-in and security. Optional product analytics (for example PostHog) may run on public pages to improve the product. Browser controls can block non-essential cookies. Full detail:{" "}
            <Link href="/cookies" className="text-[#2D9E6B] hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <p className="text-xs font-semibold text-slate-500 text-center">
          Related:{" "}
          <Link href="/terms" className="text-[#2D9E6B] hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/cookies" className="text-[#2D9E6B] hover:underline">
            Cookie Policy
          </Link>
          {" · "}
          <Link href="/disclaimer" className="text-[#2D9E6B] hover:underline">
            Disclaimer
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
