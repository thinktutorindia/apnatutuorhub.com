import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const AUTH_INPUT =
  "w-full min-h-13 h-13 px-4 rounded-xl border border-[#E2E8F0] bg-white text-base font-500 text-[#0F2540] placeholder:text-slate-400 outline-none focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20";

export const AUTH_LABEL = "block text-[15px] font-700 text-[#0F2540] mb-1.5";

const PANELS = {
  parent: {
    title: "Find a tutor for your child",
    subtitle: "Posting a requirement is free. You pay the teacher only after a demo you like.",
    steps: [
      "Create your account (2 minutes)",
      "Tell us class, subject and your area",
      "Meet a verified teacher on a free demo",
    ],
  },
  tutor: {
    title: "Find students near your home",
    subtitle: "Join free. Complete a short profile. Unlock parent numbers only when you are ready.",
    steps: [
      "Create your tutor account",
      "Tell us what you teach and where you live",
      "See nearby enquiries and call the parent",
    ],
  },
  login: {
    title: "Welcome back",
    subtitle: "Sign in to post a requirement or see student enquiries.",
    steps: [
      "Parents post requirements free",
      "Teachers are KYC-checked (Aadhaar & degree)",
      "Helpline on WhatsApp if you get stuck",
    ],
  },
  generic: {
    title: "ApnaTutorHub",
    subtitle: "Home and online tutors across India.",
    steps: [
      "Free for parents",
      "KYC-verified teachers",
      "WhatsApp help at " + SUPPORT_PHONE_DISPLAY,
    ],
  },
} as const;

export function AuthShell({
  variant = "generic",
  children,
}: {
  variant?: keyof typeof PANELS;
  children: ReactNode;
}) {
  const panel = PANELS[variant];

  return (
    <div className="min-h-screen bg-[#F0F4F8] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative bg-[#0F2540] px-5 py-5 text-white sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <LogoBrand light heightClass="h-10" />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-700 !text-white hover:bg-white/15"
          >
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>

        <div className="mt-6 max-w-md space-y-4 lg:mt-0 lg:pb-8">
          <h1
            className="text-2xl font-800 leading-tight sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {panel.title}
          </h1>
          <p className="text-[16px] font-500 leading-relaxed text-slate-200">{panel.subtitle}</p>
          <ul className="space-y-3 pt-2">
            {panel.steps.map((step) => (
              <li key={step} className="flex items-start gap-3 text-[16px] font-600 leading-snug">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2D9E6B]" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href={getWhatsAppSupportLink("Hi ApnaTutorHub, I need help creating my account.")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 hidden text-sm font-700 text-emerald-200 hover:text-white lg:inline-flex"
        >
          Stuck? WhatsApp {SUPPORT_PHONE_DISPLAY}
        </a>
      </aside>

      <div className="flex items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
