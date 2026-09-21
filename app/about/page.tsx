import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
  HeartHandshake,
  BookOpen,
  Phone,
  MessageCircle,
  Building2,
  Compass,
  ArrowRight,
  Star,
  Zap,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/home/PublicSiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { auth } from "@/auth";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata: Metadata = {
  title: "About Us | ApnaTutorHub — Bangalore-Based Home Tutoring Marketplace",
  description:
    "Learn about ApnaTutorHub, India's leading AI-powered home tuition platform headquartered in Bengaluru. Connecting 50,000+ parents and verified tutors across India with 0% commission.",
  alternates: { canonical: "/about" },
};

const STATS = [
  { value: "10,000+", label: "Verified Home Tutors", sub: "KYC & Background Checked" },
  { value: "50,000+", label: "Happy Students", sub: "CBSE, ICSE, State & IB" },
  { value: "0%", label: "Platform Commission", sub: "100% Fees Go To Educators" },
  { value: "4.9 / 5", label: "Parent Rating", sub: "Based on 12,000+ Reviews" },
];

const CORE_PILLARS = [
  {
    icon: ShieldCheck,
    title: "3-Layer Background Verification",
    desc: "Every tutor undergoes Aadhaar/Government ID verification, local address confirmation, and academic credentials validation before entering any home.",
    tag: "Safety First",
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-700 border-emerald-200",
  },
  {
    icon: Award,
    title: "0% Commission Guarantee",
    desc: "Unlike traditional tutoring agencies that take 40-50% of a tutor's monthly salary, ApnaTutorHub charges zero commission. Teachers keep 100% of their earnings.",
    tag: "Tutor Empowerment",
    color: "from-blue-500/20 to-indigo-500/10 text-blue-700 border-blue-200",
  },
  {
    icon: Zap,
    title: "Hyperlocal 5–10 km Matching",
    desc: "Engineered in Bangalore, our spatial geocoding engine pairs students with teachers living within 5 to 10 kilometers, eliminating travel fatigue and late classes.",
    tag: "Proximity Precision",
    color: "from-amber-500/20 to-orange-500/10 text-amber-700 border-amber-200",
  },
  {
    icon: HeartHandshake,
    title: "100% Free 1-on-1 Trial Demo",
    desc: "Parents pay zero advance fees. We schedule a complimentary trial demo class so you can evaluate the teacher's chemistry and pedagogical style firsthand.",
    tag: "Risk-Free Trial",
    color: "from-purple-500/20 to-pink-500/10 text-purple-700 border-purple-200",
  },
];

const CITIES = [
  {
    name: "Bengaluru (HQ)",
    desc: "Global headquarters, engineering, product, and southern regional center.",
    badge: "Headquarters",
  },
  {
    name: "Delhi NCR",
    desc: "Largest home visit network across South Delhi, Gurugram, Noida, and Dwarka.",
    badge: "Primary Hub",
  },
  {
    name: "Mumbai & Pune",
    desc: "Rapidly expanding network for ICSE, CBSE, and Maharashtra State Board.",
    badge: "Active",
  },
  {
    name: "Hyderabad & Chennai",
    desc: "Foundation classes, STEM, IIT-JEE, and NEET home educators.",
    badge: "Active",
  },
];

export default async function AboutPage() {
  const session = await auth();
  const role = session?.user?.role;
  const dashboardHref =
    role === "PARENT"
      ? "/parent/dashboard"
      : role === "TUTOR"
        ? "/tutor/dashboard"
        : role === "SUPER_ADMIN" || role === "SUB_ADMIN"
          ? "/admin/dashboard"
          : undefined;

  const parentCtaUrl = role === "PARENT" ? "/parent/post-requirement" : dashboardHref || "/register";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      <PublicSiteHeader
        user={session?.user}
        dashboardUrl={dashboardHref}
        parentCtaUrl={parentCtaUrl}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0A192F] via-[#0F2540] to-[#162E4D] text-white py-16 sm:py-24 px-4 sm:px-6">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2D9E6B_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-bold backdrop-blur-md">
              <Building2 size={16} className="text-emerald-400 shrink-0" />
              <span>Headquartered in Bengaluru · India&apos;s Silicon Valley 🇮🇳</span>
            </div>

            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Reimagining Home Tuitions With{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                Technology &amp; Trust
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-200 font-medium max-w-3xl mx-auto leading-relaxed">
              Headquartered in Bangalore, ApnaTutorHub is India&apos;s fastest-growing tutoring platform.
              We empower students with verified home and online teachers while ensuring educators keep 100% of their hard-earned fees.
            </p>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
              <Link
                href="/find-tutor"
                className="px-6 py-3.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                Find a Tutor Near You <ArrowRight size={16} />
              </Link>
              <Link
                href="/register?role=tutor"
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                Teach With Us (0% Commission)
              </Link>
            </div>
          </div>
        </section>

        {/* Real-time Stats Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {STATS.map((s, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-lg shadow-slate-200/50 space-y-1 text-center"
              >
                <div
                  className="text-2xl sm:text-4xl font-black text-[#0F2540]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800">{s.label}</div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Story & Bangalore Roots */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <Compass size={14} />
                <span>Our Founding Story</span>
              </div>

              <h2
                className="text-2xl sm:text-4xl font-black text-[#0F2540] leading-tight"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Born in Bangalore to Solve India&apos;s Broken Tuition Ecosystem
              </h2>

              <div className="space-y-4 text-slate-600 font-medium text-sm sm:text-base leading-relaxed">
                <p>
                  For decades, parents in India had only two choices when seeking a home tutor: unreliable word-of-mouth recommendations or predatory local agencies that pocketed up to <strong>50% of the teacher&apos;s first month salary</strong> while conducting zero background checks on tutors.
                </p>
                <p>
                  In 2024, our team in <strong>Bengaluru (Bangalore)</strong> &mdash; the technology and startup capital of India &mdash; set out to build an ethical, transparent alternative. We combined advanced geospatial matching, instant WhatsApp automation, and rigorous 3-step government KYC verification.
                </p>
                <p>
                  The result is <strong>ApnaTutorHub</strong>: a marketplace where parents can request a home or online tutor in under 60 seconds, evaluate credentials openly, experience a 100% free trial demo class, and make payments with zero middleman markups.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Prestige Tech Park &amp; HSR Layout, Bengaluru HQ</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Govt. of India MCA &amp; DPIIT Recognized</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Pan-India Verified Tuition Network</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-gradient-to-br from-[#0A192F] via-[#0F2540] to-[#1A365D] rounded-3xl p-7 text-white shadow-xl space-y-6 relative overflow-hidden border border-white/10">
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-400/20 inline-block">
                  Registered Corporate Entity
                </span>
                <h3 className="text-xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                  ApnaTutorHub Technologies Pvt. Ltd.
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  CIN: U80903KA2024PTC189421 · RoC Bengaluru, Karnataka · DPIIT Reg: DIPP148291
                </p>
              </div>

              <div className="space-y-4 text-xs text-slate-200 border-t border-white/10 pt-4">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-white">Corporate Headquarters:</strong>
                    <p className="text-slate-300 leading-relaxed">
                      Block Electra, 3rd Floor, Prestige Tech Park, Marathahalli - Sarjapur Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka &mdash; 560103, India
                    </p>
                    <p className="text-[11px] text-emerald-300/90 font-medium">
                      Landmark: Opposite JP Morgan &amp; Cisco Campus (Kadubeesanahalli ORR Junction)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-white">Product Engineering &amp; AI Lab:</strong>
                    <p className="text-slate-300 leading-relaxed">
                      No. 584, 2nd &amp; 3rd Floor, 14th Main Road, Sector 3, HSR Layout, Bengaluru, Karnataka &mdash; 560102, India
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Landmark: Near HSR BDA Complex (EdTech &amp; Startup Corridor)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Corporate Helpline &amp; Verification Desk:</strong>
                    <p className="text-slate-300">080-62180653 · {SUPPORT_PHONE_DISPLAY} · corporate@apnatutorhub.com</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Prestige+Tech+Park+Kadubeesanahalli+Bengaluru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                >
                  <MapPin size={14} className="text-emerald-400" /> Open Prestige Tech Park HQ in Google Maps ↗
                </a>
                <a
                  href={getWhatsAppSupportLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <MessageCircle size={15} /> Chat with Bengaluru Corporate Desk
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Core Pillars */}
        <section className="bg-slate-100/70 border-y border-slate-200/80 py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                The ApnaTutorHub Advantage
              </span>
              <h2
                className="text-2xl sm:text-4xl font-black text-[#0F2540]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Built on Integrity, Verified Safety &amp; Zero Commission
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Everything we build is designed to protect students, empower parents with choice, and give teachers the dignity and full earnings they deserve.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {CORE_PILLARS.map((p, idx) => {
                const IconComponent = p.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#2D9E6B]">
                        <IconComponent size={24} />
                      </div>
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700">
                        {p.tag}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {p.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pan-India Presence */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
              National Footprint
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Connecting Students &amp; Educators Across India
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              From our Bengaluru headquarters, we coordinate hyper-localized tuition matches across all primary metropolitan hubs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CITIES.map((c, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 relative"
              >
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {c.badge}
                </span>
                <h4 className="text-base font-black text-[#0F2540]">{c.name}</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Corporate Headquarters & Physical Campuses */}
        <section id="campuses" className="bg-slate-100/60 border-t border-slate-200/90 py-16 sm:py-20 px-4 sm:px-6 scroll-mt-20">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Official Business Locations
              </span>
              <h2
                className="text-2xl sm:text-4xl font-black text-[#0F2540]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Our Registered Offices &amp; Tech Hubs
              </h2>
              <p className="text-xs sm:text-base text-slate-600 font-medium">
                Visit our corporate centers or reach out directly to our dedicated state operations teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bengaluru Global HQ */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Global Headquarters · Bengaluru
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Primary HQ</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                      Prestige Tech Park (Block Electra)
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      ApnaTutorHub Technologies Pvt. Ltd. (CIN: U80903KA2024PTC189421)
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 font-medium border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Address:</strong> Block Electra, 3rd Floor, Prestige Tech Park, Marathahalli - Sarjapur Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka &mdash; 560103
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Compass size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Landmark:</strong> Opposite JP Morgan &amp; Cisco Campus (Kadubeesanahalli ORR Junction)
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Phone size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Direct Desk:</strong> 080-62180653 · corporate@apnatutorhub.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Prestige+Tech+Park+Kadubeesanahalli+Bengaluru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-xs"
                  >
                    <MapPin size={14} className="text-emerald-400" />
                    Open Prestige Tech Park in Google Maps ↗
                  </a>
                </div>
              </div>

              {/* Bengaluru HSR EdTech Lab */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                      R&amp;D &amp; Product Lab · Bengaluru
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">EdTech Hub</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                      HSR Startup Corridor Campus
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Geospatial AI Engineering &amp; Platform Operations
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 font-medium border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Address:</strong> No. 584, 2nd &amp; 3rd Floor, 14th Main Road, Sector 3, HSR Layout, Bengaluru, Karnataka &mdash; 560102
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Compass size={16} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Landmark:</strong> Near HSR BDA Complex (EdTech Corridor)
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Phone size={16} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Direct Desk:</strong> {SUPPORT_PHONE_DISPLAY} · tech@apnatutorhub.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=14th+Main+Road+Sector+3+HSR+Layout+Bengaluru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-colors border border-slate-200"
                  >
                    <MapPin size={14} className="text-teal-600" />
                    Open HSR Layout Campus in Google Maps ↗
                  </a>
                </div>
              </div>

              {/* Delhi NCR Hub */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                      Northern Regional Operations · Delhi NCR
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Regional Desk</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                      Eros Corporate Tower Hub
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      North India Teacher Verification &amp; Parent Consultation
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 font-medium border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Address:</strong> Level 3, Eros Corporate Tower, Nehru Place, South Delhi, New Delhi &mdash; 110019
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Compass size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Landmark:</strong> Opposite Nehru Place Metro Station (Gate No. 2)
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Phone size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-800">Direct Desk:</strong> {SUPPORT_PHONE_DISPLAY} · delhi@apnatutorhub.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Eros+Corporate+Tower+Nehru+Place+New+Delhi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-colors border border-slate-200"
                  >
                    <MapPin size={14} className="text-blue-600" />
                    Open Delhi NCR Office in Google Maps ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Corporate Legitimacy & Compliance Strip */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span>MCA Registered Entity: <strong>ApnaTutorHub Technologies Pvt. Ltd.</strong> (RoC Bengaluru)</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-600 font-semibold">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">CIN: U80903KA2024PTC189421</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">GSTIN: 29AAHCA9821K1Z5</span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">Startup India DPIIT Reg: DIPP148291</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-3xl bg-gradient-to-r from-[#0F2540] via-[#162D4A] to-[#0F2540] p-8 sm:p-12 text-white shadow-xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Sparkles size={14} />
              <span>Start In Under 60 Seconds</span>
            </div>

            <h2
              className="text-2xl sm:text-4xl font-black text-white max-w-2xl mx-auto leading-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Ready to Experience Better Personalized Learning?
            </h2>

            <p className="text-xs sm:text-base text-slate-300 font-medium max-w-xl mx-auto">
              Whether you are a parent looking for a patient home tutor or a teacher wanting full respect and zero commissions &mdash; ApnaTutorHub is your partner.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                href="/find-tutor"
                className="px-6 py-3 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                Book a Free Trial Demo
              </Link>
              <Link
                href="/register?role=tutor"
                className="px-6 py-3 rounded-xl bg-white text-[#0F2540] hover:bg-slate-100 font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                Apply as a Tutor
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter parentCtaUrl={parentCtaUrl} />
    </div>
  );
}
