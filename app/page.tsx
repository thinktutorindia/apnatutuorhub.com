import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { LogoBrand } from "@/components/brand/Logo";
import { HomeHeroCard } from "@/components/home/HomeHeroCard";
import { PublicSiteHeader } from "@/components/home/PublicSiteHeader";
import { HomeFaqAccordion } from "@/components/home/HomeFaqAccordion";
import { HomeBrowseNeeds } from "@/components/home/HomeBrowseNeeds";
import { HomepageJsonLd } from "@/components/seo/JsonLdSchemas";
import {
  ArrowRight, ShieldCheck, CheckCircle2, Star, MapPin,
} from "lucide-react";
import type { Metadata } from "next";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata: Metadata = {
  title: "ApnaTutorHub — Find Verified Home & Online Tutors Near You",
  description:
    "Post your tuition requirement for free. Connect directly with verified home and online tutors for all subjects and school boards across India.",
};

const FAQ_ITEMS = [
  {
    q: "Is ApnaTutorHub free for parents?",
    a: "Yes, posting a tuition requirement and receiving tutor enquiries is 100% free for parents. There are no registration or subscription fees for parents.",
  },
  {
    q: "How are tutors verified on ApnaTutorHub?",
    a: "Tutors submit government identity documents (Aadhaar/PAN) and educational qualification certificates. Our team reviews these documents before marking a profile as verified.",
  },
  {
    q: "Can I choose between home tuition and online classes?",
    a: "Yes. When posting your requirement, you can specify whether you prefer home tuition at your residence, live online classes, or either option.",
  },
  {
    q: "What subjects and class levels are supported?",
    a: "We cover all subjects from Class 1 to Class 12 (CBSE, ICSE, State Boards), JEE/NEET entrance preparation, Coding/Computer Science, Commerce, and Languages.",
  },
  {
    q: "How do I connect with a tutor after posting?",
    a: "Once you submit your requirement, verified tutors matching your subject, location, and budget review your post and express interest. You can chat directly to discuss schedule and start classes.",
  },
  {
    q: "How do I contact ApnaTutorHub support?",
    a: `Parents and tutors can WhatsApp us on ${SUPPORT_PHONE_DISPLAY}. We help with registration, requirements, KYC, and bookings.`,
  },
];

const QUICK_PILLS = [
  { label: "Class 1–5 All Subjects", subject: "Class 1-5 All Subjects" },
  { label: "Class 9–10 Science & Maths", subject: "Class 9-10 Science & Math" },
  { label: "Class 11–12 Commerce", subject: "Class 11-12 Commerce" },
  { label: "NEET / IIT-JEE", subject: "NEET / IIT-JEE" },
  { label: "Female Home Tutor", subject: "Mathematics", extra: "gender=FEMALE" },
];

const REAL_TUTOR_PROFILES = [
  {
    name: "Dr. Rajesh Verma",
    image: "/images/tutors/tutor_1.png",
    qualification: "Ph.D. Physics · 10+ yrs",
    location: "South Delhi & Online",
    rating: 4.9,
    reviewsCount: 38,
    subjects: ["Physics", "JEE Prep", "Class 11-12"],
    mode: "Home & Live Online",
    rate: "₹750 / hr",
    experience: "10+ years experience",
    isVerified: true,
  },
  {
    name: "Ananya Sharma",
    image: "/images/tutors/tutor_2.png",
    qualification: "M.Sc. Mathematics · 7+ yrs",
    location: "Koramangala, Bengaluru",
    rating: 5.0,
    reviewsCount: 45,
    subjects: ["Mathematics", "Class 9-12", "CBSE/ICSE"],
    mode: "Home Tuition",
    rate: "₹650 / hr",
    experience: "7 years experience",
    isVerified: true,
  },
  {
    name: "Vikramaditya Rao",
    image: "/images/tutors/tutor_3.png",
    qualification: "B.Tech CS (IIT D) · 6+ yrs",
    location: "Sector 56, Gurgaon",
    rating: 4.8,
    reviewsCount: 29,
    subjects: ["Coding", "Python & C++", "Class 9-12"],
    mode: "Live Online",
    rate: "₹800 / hr",
    experience: "6 years experience",
    isVerified: true,
  },
];

export default async function HomePage() {
  const session = await auth();
  const rawUser = session?.user;
  const user = rawUser?.id && rawUser?.role ? rawUser : null;

  if (user && user.role !== "SUPER_ADMIN" && user.role !== "SUB_ADMIN") {
    const { prisma } = await import("@/lib/prisma");
    const { redirect } = await import("next/navigation");
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        parentProfile: { select: { id: true } },
        tutorProfile: { select: { id: true } },
      },
    });

    if (!dbUser) {
      redirect("/login");
    } else if (!dbUser.parentProfile && !dbUser.tutorProfile) {
      redirect("/select-role");
    }
  }

  const isTutor = user?.role === "TUTOR";
  const isParent = user?.role === "PARENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUB_ADMIN";

  const dashboardUrl = isTutor
    ? "/tutor/dashboard"
    : isAdmin
      ? "/admin/dashboard"
      : "/parent/dashboard";

  const parentCtaUrl = user ? (isParent ? "/parent/post-requirement" : dashboardUrl) : "/register";
  const tutorCtaUrl = user ? (isTutor ? "/tutor/dashboard" : dashboardUrl) : "/register?role=tutor";

  const pillHref = (pill: (typeof QUICK_PILLS)[number]) => {
    const params = new URLSearchParams({ subject: pill.subject });
    if (pill.extra) {
      const [k, v] = pill.extra.split("=");
      if (k && v) params.set(k, v);
    }
    if (user && isParent) return `/parent/post-requirement?${params.toString()}`;
    if (user) return dashboardUrl;
    return `/find-tutor?${params.toString()}`;
  };

  return (
    <div className="min-h-screen text-[#0F172A] bg-[#F0F4F8]">
      <HomepageJsonLd />
      <PublicSiteHeader
        user={user}
        dashboardUrl={dashboardUrl}
        parentCtaUrl={parentCtaUrl}
      />

      <main>
        {/* ── Navy hero ──────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0F2540] text-white">
          <div className="absolute inset-y-0 right-0 w-2/5 hidden lg:block bg-[#F7F1E8] rounded-l-[80px]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 lg:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-6">
                <h1
                  className="text-3xl sm:text-4xl lg:text-[2.65rem] font-800 leading-[1.2] text-white"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Find Verified Home &amp; Online Tutors in Your Area
                </h1>
                <p className="text-base sm:text-lg text-slate-200 font-500 max-w-xl leading-relaxed">
                  Experienced teachers for Class 1 to 12 &amp; Competitive Exams with 100% Background Check.
                </p>

                <HomeHeroCard user={user} dashboardUrl={dashboardUrl} isParent={isParent} />

                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_PILLS.map((pill) => (
                    <Link
                      key={pill.label}
                      href={pillHref(pill)}
                      className="inline-flex items-center min-h-11 px-4 py-2 rounded-full text-[13px] font-700 text-white/90 border border-white/25 hover:bg-white/10 hover:border-white/50 transition-colors"
                    >
                      {pill.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:pt-4">
                  {REAL_TUTOR_PROFILES.slice(0, 2).map((tutor) => (
                    <div
                      key={tutor.name}
                      className="bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_12px_32px_rgba(15,37,64,0.12)] overflow-hidden flex gap-3 p-3"
                    >
                      <Image
                        src={tutor.image}
                        alt={tutor.name}
                        width={88}
                        height={88}
                        className="w-[88px] h-[88px] rounded-2xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-1 text-[#F5A623] text-sm font-800">
                          <Star size={14} className="fill-[#F5A623] text-[#F5A623]" />
                          {tutor.rating.toFixed(1)}
                        </div>
                        <p className="text-sm font-800 text-[#0F2540] truncate">{tutor.name}</p>
                        <p className="text-[12px] font-600 text-[#64748B] truncate">
                          {tutor.subjects.slice(0, 2).join(", ")}
                        </p>
                        <p className="text-[12px] font-600 text-[#64748B]">{tutor.experience}</p>
                        {tutor.isVerified && (
                          <span className="ath-verified w-fit">✓ Verified Teacher</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6 bg-[#F0F4F8]">
          <div className="max-w-6xl mx-auto space-y-10">
            <h2
              className="text-center text-2xl sm:text-3xl font-800 text-[#0F2540]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              3 Simple Steps to Get the Best Tutor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  num: "1",
                  title: "Tell us your requirement",
                  desc: "Share class, subject, area and whether you want a home tutor or online classes. Takes 2 minutes.",
                },
                {
                  num: "2",
                  title: "Get 3 verified tutor profiles",
                  desc: "Nearby Aadhaar & degree-checked teachers see your post and apply. You review them in about 15 minutes.",
                },
                {
                  num: "3",
                  title: "Take a free trial class",
                  desc: "Meet the tutor first. Pay only after you are satisfied with the demo.",
                },
              ].map((step) => (
                <div key={step.num} className="ath-panel p-7 space-y-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2540] text-white text-xl font-800"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {step.num}
                  </div>
                  <h3
                    className="text-lg font-800 text-[#0F2540]"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[15px] font-500 text-[#64748B] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust strip ────────────────────────────────────── */}
        <div className="bg-white border-y border-[#E2E8F0] py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "🛡️", title: "KYC verified teachers", desc: "Aadhaar & degree checked before they teach" },
              { icon: "🏠", title: "Home & online tuition", desc: "Tutor at your home, or live 1-on-1 online" },
              { icon: "⭐", title: "Free demo class first", desc: "Meet the tutor before you decide to pay" },
              { icon: "💰", title: "Pay after you are satisfied", desc: "No platform fee for parents. Ever." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#E8F7F0] flex items-center justify-center text-xl shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-800 text-sm text-[#0F2540]">{item.title}</h4>
                  <p className="text-xs text-[#64748B] font-500 leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Browse by subject / class ──────────────────────── */}
        <section id="subjects" className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <HomeBrowseNeeds
              isParent={isParent}
              loggedIn={Boolean(user)}
              dashboardUrl={dashboardUrl}
            />
          </div>
        </section>

        {/* ── Tutor spotlights ───────────────────────────────── */}
        <section id="preview" className="py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-800 text-[#0F2540]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Verified Teachers Parents Trust
                </h2>
                <p className="text-[15px] text-[#64748B] font-500 mt-1">
                  Aadhaar &amp; degree checked. Transparent fees. Book a free demo.
                </p>
              </div>
              <Link href={tutorCtaUrl} className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-[#0F2540] font-800 text-xs hover:bg-[#F8FAFC] min-h-11 inline-flex items-center">
                Join as a Tutor →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {REAL_TUTOR_PROFILES.map((tutor) => (
                <div key={tutor.name} className="ath-panel overflow-hidden">
                  <Image
                    src={tutor.image}
                    alt={tutor.name}
                    width={400}
                    height={220}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-sm font-800 text-[#0F2540]">
                        <Star size={14} className="fill-[#F5A623] text-[#F5A623]" />
                        {tutor.rating.toFixed(1)}
                        <span className="text-[#64748B] font-600 text-xs">({tutor.reviewsCount})</span>
                      </span>
                      <span className="ath-verified">✓ KYC Verified</span>
                    </div>
                    <h3 className="font-800 text-lg text-[#0F2540]">{tutor.name}</h3>
                    <p className="text-xs text-[#64748B] font-600">{tutor.qualification}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.subjects.map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-xl bg-[#E8F7F0] text-[#238357] font-700">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-[#E2E8F0]">
                      <span className="inline-flex items-center gap-1 text-[#64748B] font-600">
                        <MapPin size={12} className="text-[#2D9E6B]" /> {tutor.location}
                      </span>
                      <span className="font-800 text-[#0F2540]">{tutor.rate}</span>
                    </div>
                    <Link
                      href={parentCtaUrl}
                      className="w-full min-h-11 inline-flex items-center justify-center rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-800"
                    >
                      Book Free Demo Class
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tutor CTA ──────────────────────────────────────── */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-[24px] p-8 sm:p-12 text-white bg-[#0A192F] shadow-[0_18px_44px_rgba(10,25,47,0.18)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-3">
                  <h2
                    className="text-2xl sm:text-3xl font-800 text-white"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Are you a teacher looking for students nearby?
                  </h2>
                  <p className="text-[15px] text-slate-300 font-500 max-w-xl">
                    Complete KYC once, then unlock parent enquiries within 5 km. Free to join.
                  </p>
                </div>
                <div className="lg:col-span-4 flex lg:justify-end">
                  <Link
                    href={tutorCtaUrl}
                    className="inline-flex min-h-12 items-center px-7 py-3.5 rounded-xl bg-[#F5A623] hover:bg-[#e8960f] text-[#0F2540] text-sm font-800"
                  >
                    Join as a Tutor →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section id="faq" className="py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-3xl mx-auto space-y-10">
            <h2
              className="text-center text-2xl sm:text-3xl font-800 text-[#0F2540]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Common questions from parents
            </h2>
            <HomeFaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        <section className="py-14 px-4 sm:px-6 text-center bg-[#E8F7F0] border-y border-[#C7EDD9]">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2
              className="text-2xl sm:text-3xl font-800 text-[#0F2540]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Ready to find a tutor for your child?
            </h2>
            <p className="text-[15px] text-[#64748B] font-500">
              Post for free. Verified teachers nearby will reach out.
            </p>
            <Link
              href={parentCtaUrl}
              className="inline-flex min-h-12 items-center gap-2 px-8 py-4 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-800"
            >
              Post Requirement Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#0A192F] text-slate-200 py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <LogoBrand light heightClass="h-11" />
              <p className="text-xs text-slate-400 font-500 leading-relaxed">
                Connecting parents with verified home and online tutors across India.
              </p>
            </div>
            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                For Parents
              </h4>
              <ul className="space-y-2 text-xs font-600 text-slate-300">
                <li><Link href={parentCtaUrl} className="hover:text-[#2D9E6B]">Post Requirement</Link></li>
                <li><Link href="/find-tutor" className="hover:text-[#2D9E6B]">Find Tutors</Link></li>
                <li><a href="#how-it-works" className="hover:text-[#2D9E6B]">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                For Tutors
              </h4>
              <ul className="space-y-2 text-xs font-600 text-slate-300">
                <li><Link href={tutorCtaUrl} className="hover:text-[#2D9E6B]">Join as a Tutor</Link></li>
                <li><Link href="/login" className="hover:text-[#2D9E6B]">Tutor Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                Company
              </h4>
              <ul className="space-y-2 text-xs font-600 text-slate-300">
                <li><Link href="/privacy" className="hover:text-[#2D9E6B]">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#2D9E6B]">Terms of Service</Link></li>
                <li>
                  <a href={getWhatsAppSupportLink()} className="hover:text-[#2D9E6B]" target="_blank" rel="noopener noreferrer">
                    WhatsApp {SUPPORT_PHONE_DISPLAY}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-600 text-slate-400">
            <span>© {new Date().getFullYear()} ApnaTutorHub. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#2D9E6B]" />
              <CheckCircle2 size={13} className="text-[#2D9E6B]" />
              KYC verified · Free for parents
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
