import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { LogoBrand } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { HomeHeroCard } from "@/components/home/HomeHeroCard";
import { HomeFaqAccordion } from "@/components/home/HomeFaqAccordion";
import { HomepageJsonLd } from "@/components/seo/JsonLdSchemas";
import {
  LayoutDashboard, ArrowRight, ShieldCheck, CheckCircle2,
  User, Check, Star, MapPin, Award
} from "lucide-react";
import type { Metadata } from "next";

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
];

const CURRICULUM_CARDS = [
  {
    title: "Classes 9 & 10",
    subtitle: "Board Exam Preparation",
    badge: "High Demand",
    badgeClass: "bg-blue-100 text-blue-950 border border-blue-300 font-800",
    borderGradient: "linear-gradient(90deg, #4F8EF7, #7AB4FF)",
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Social Science"],
    boards: "CBSE, ICSE, State Boards",
    subjectQuery: "Classes 9 & 10 Mathematics",
  },
  {
    title: "Classes 11 & 12 (Science)",
    subtitle: "Board & Competitive Prep",
    badge: "Science Core",
    badgeClass: "bg-emerald-100 text-emerald-950 border border-emerald-300 font-800",
    borderGradient: "linear-gradient(90deg, #2D9E6B, #5DD4A1)",
    subjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
    boards: "CBSE, ISC, State Boards",
    subjectQuery: "Class 11 & 12 Physics",
  },
  {
    title: "Classes 11 & 12 (Commerce)",
    subtitle: "Accounts & Economics",
    badge: "Commerce",
    badgeClass: "bg-amber-100 text-amber-950 border border-amber-300 font-800",
    borderGradient: "linear-gradient(90deg, #F5A623, #FFC86B)",
    subjects: ["Accountancy", "Economics", "Business Studies", "Applied Maths"],
    boards: "CBSE, ISC, State Boards",
    subjectQuery: "Accountancy",
  },
  {
    title: "Competitive Entrance Prep",
    subtitle: "JEE Main, NEET & CUET",
    badge: "Entrance Specialisation",
    badgeClass: "bg-red-100 text-red-950 border border-red-300 font-800",
    borderGradient: "linear-gradient(90deg, #E74C3C, #FF8070)",
    subjects: ["JEE Mains & Advanced", "NEET UG", "CUET", "Foundations (Class 8-10)"],
    boards: "All India Entrance Exams",
    subjectQuery: "JEE Prep",
  },
  {
    title: "Classes 1 to 8",
    subtitle: "Foundation Subjects",
    badge: "Primary & Middle",
    badgeClass: "bg-purple-100 text-purple-950 border border-purple-300 font-800",
    borderGradient: "linear-gradient(90deg, #9B59B6, #C39BD3)",
    subjects: ["Mathematics", "Science", "English", "Hindi", "Social Studies", "EVS"],
    boards: "All School Boards",
    subjectQuery: "Class 1-8 Maths",
  },
  {
    title: "Coding & Computer Science",
    subtitle: "Programming & Web Dev",
    badge: "Technology",
    badgeClass: "bg-teal-100 text-teal-950 border border-teal-300 font-800",
    borderGradient: "linear-gradient(90deg, #1ABC9C, #76D7C4)",
    subjects: ["Python", "Java", "C++", "Web Development", "Computer Applications"],
    boards: "School & Skill Prep",
    subjectQuery: "Coding & CS",
  },
];

const REAL_TUTOR_PROFILES = [
  {
    name: "Dr. Rajesh Verma",
    image: "/images/tutors/tutor_1.png",
    qualification: "Ph.D. Physics · 10+ yrs Teaching Exp",
    location: "South Delhi & Online",
    rating: 4.9,
    reviewsCount: 38,
    subjects: ["Physics", "JEE Prep", "Class 11-12"],
    mode: "Home & Live Online",
    rate: "₹750 / hr",
    badge: "Top Rated Physics Expert",
    isVerified: true,
  },
  {
    name: "Ananya Sharma",
    image: "/images/tutors/tutor_2.png",
    qualification: "M.Sc. Mathematics (Gold Medalist) · 7+ yrs Exp",
    location: "Koramangala, Bengaluru",
    rating: 5.0,
    reviewsCount: 45,
    subjects: ["Mathematics", "Class 9-12", "CBSE/ICSE"],
    mode: "Home Tuition",
    rate: "₹650 / hr",
    badge: "Featured Math Specialist",
    isVerified: true,
  },
  {
    name: "Vikramaditya Rao",
    image: "/images/tutors/tutor_3.png",
    qualification: "B.Tech Computer Science (IIT D) · 6+ yrs Exp",
    location: "Sector 56, Gurgaon & Online",
    rating: 4.8,
    reviewsCount: 29,
    subjects: ["Coding", "Python & C++", "Class 9-12"],
    mode: "Live Interactive Online",
    rate: "₹800 / hr",
    badge: "CS & Tech Mentor",
    isVerified: true,
  },
];

const REAL_REQUIREMENTS = [
  {
    grade: "Class 10 CBSE",
    subject: "Mathematics & Science",
    parentName: "Sunita Agarwal",
    parentImage: "/images/parents/parent_1.png",
    mode: "Home Tuition",
    location: "Sector 56, Gurgaon",
    budget: "₹600–800 / hr",
    accentColor: "#2D9E6B",
    postedTime: "2 hrs ago",
  },
  {
    grade: "Class 12 CBSE",
    subject: "Physics & Chemistry",
    parentName: "Rohan Kapoor",
    parentImage: "/images/parents/parent_2.png",
    mode: "Live Online",
    location: "Koramangala, Bengaluru",
    budget: "₹700–900 / hr",
    accentColor: "#4F8EF7",
    postedTime: "4 hrs ago",
  },
  {
    grade: "JEE Main Prep",
    subject: "Mathematics & Physics",
    parentName: "Meenakshi Iyer",
    parentImage: "/images/parents/parent_3.png",
    mode: "Home Tuition",
    location: "Preet Vihar, Delhi",
    budget: "₹800–1000 / hr",
    accentColor: "#F5A623",
    postedTime: "1 day ago",
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

  return (
    <div className="min-h-screen text-gray-900 bg-[#F7F8FA]">
      <HomepageJsonLd />

      {/* ── Navbar (Auth-Aware) ───────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all border-b border-gray-200 bg-white/95 backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <LogoBrand />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-700 text-gray-900">
            <a href="#how-it-works" className="hover:text-[#2D9E6B] transition-colors duration-200 hover:scale-105 active:scale-95 inline-block">How It Works</a>
            <a href="#subjects" className="hover:text-[#2D9E6B] transition-colors duration-200 hover:scale-105 active:scale-95 inline-block">Subjects</a>
            <a href="#preview" className="hover:text-[#2D9E6B] transition-colors duration-200 hover:scale-105 active:scale-95 inline-block">Tutor Profiles</a>
            <a href="#faq" className="hover:text-[#2D9E6B] transition-colors duration-200 hover:scale-105 active:scale-95 inline-block">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={dashboardUrl} className="btn-shine px-5 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-sm hover:shadow-md hover:shadow-emerald-500/20">
                  <LayoutDashboard size={15} className="!text-white" />
                  <span className="!text-white font-800">Dashboard</span>
                </Link>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-700 px-3.5 py-2 rounded-full bg-gray-100 text-gray-900 border border-gray-300 flex items-center gap-1.5 transition-transform hover:scale-105">
                    <User size={14} className="text-[#0F2540]" />
                    {user.name?.split(" ")[0] || "Account"}
                  </span>
                  <SignOutButton />
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 hover:bg-gray-100 text-xs font-800 transition-all duration-200 ease-out hover:scale-105 active:scale-95">
                  Log in
                </Link>
                <Link href="/find-tutor" className="btn-shine px-5 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-sm hover:shadow-md hover:shadow-emerald-500/20">
                  Find a Tutor
                </Link>
                <Link href={tutorCtaUrl} className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 hover:bg-gray-100 text-xs font-800 hidden sm:inline-flex transition-all duration-200 ease-out hover:scale-105 active:scale-95">
                  Join as Tutor
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Product-Oriented) ──────────────────── */}
      <section className="bg-white py-12 lg:py-16 px-4 sm:px-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Hero Left: Product-Focused Messaging */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-950 text-xs font-800 px-4 py-1.5 rounded-full transition-transform hover:scale-105">
              <span>Home &amp; Live Online Tuition Across India</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-[3.15rem] font-800 text-[#0F2540] leading-[1.15]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Find the right tutor <span className="text-[#F5A623]">for your child</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-900 font-600 leading-relaxed max-w-xl">
              Tell us what subject, class level, location, and budget you need. We connect parents directly with verified home and online tutors — completely free for parents.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href={user ? parentCtaUrl : "/find-tutor"}
                className="group btn-shine px-7 py-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-sm font-800 flex items-center justify-center gap-2 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.97] shadow-md hover:shadow-xl hover:shadow-emerald-500/25 pulse-glow"
              >
                <span className="!text-white font-800">{user ? "Post Your Requirement — Free" : "Find a Tutor — Free"}</span>
                <ArrowRight size={18} className="!text-white transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
              </Link>
              <Link
                href={tutorCtaUrl}
                className="px-6 py-4 rounded-2xl border border-gray-300 text-gray-900 hover:bg-gray-100 text-sm font-800 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.97] hover:shadow-sm flex items-center justify-center"
              >
                Join as a Tutor
              </Link>
            </div>

            {/* Verified Trust Guarantees */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-700 text-gray-900 pt-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-[#2D9E6B]" /> Identity-Verified Tutors
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={18} className="text-[#2D9E6B]" /> No Platform Fees for Parents
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={18} className="text-[#2D9E6B]" /> Direct Tutor Connection
              </span>
            </div>
          </div>

          {/* Hero Right: Interactive Requirement Form */}
          <div className="lg:col-span-5">
            <HomeHeroCard
              user={user}
              dashboardUrl={dashboardUrl}
              isParent={isParent}
            />
          </div>

        </div>
      </section>

      {/* ── Trust Bar (Product Features) ─────────────────────── */}
      <div className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "🛡️", title: "Identity-Verified Tutors", desc: "Identity documents checked before listing" },
            { icon: "🏠", title: "Home & Online Tuition", desc: "Choose in-person home tuition or live online classes" },
            { icon: "⭐", title: "Verified Parent Reviews", desc: "Authentic feedback from parents after completed classes" },
            { icon: "💰", title: "Custom Hourly Budget", desc: "Set your own tuition budget, no mandatory fees for parents" },
          ].map((item) => (
            <div key={item.title} className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/10">
              <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                {item.icon}
              </div>
              <div>
                <h4 className="font-800 text-sm text-[#0F2540] mb-0.5 transition-colors group-hover:text-[#2D9E6B]">{item.title}</h4>
                <p className="text-xs text-gray-800 font-600 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Classes & Subjects Section ───────────────────────── */}
      <section id="subjects" className="py-16 px-4 sm:px-6 bg-[#F7F8FA]">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B]">
              Subjects &amp; Class Categories
            </span>
            <h2 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Find Tutors by Class &amp; Subject
            </h2>
            <p className="text-sm text-gray-900 font-600">
              Select your child&apos;s grade to get matched with qualified home and online tutors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CURRICULUM_CARDS.map((card) => (
              <div
                key={card.title}
                className="group bg-white rounded-3xl border border-gray-300 p-6 space-y-4 shadow-xs relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 transition-opacity group-hover:opacity-90" style={{ background: card.borderGradient }} />

                <div className="flex items-center justify-between">
                  <span className={`text-[11px] px-3 py-1 rounded-full transition-transform group-hover:scale-105 ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-800 text-lg text-[#0F2540] transition-colors group-hover:text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-900 font-600 mt-0.5">{card.subtitle}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-800 uppercase tracking-wider text-gray-800 block">
                    Key Subjects
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {card.subjects.map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-xl bg-gray-100 border border-gray-300 text-gray-900 font-700 transition-all duration-200 hover:scale-105 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                  <span className="text-gray-900 font-700">Boards: {card.boards}</span>
                  <Link
                    href={user ? (isParent ? `/parent/post-requirement?subject=${encodeURIComponent(card.subjectQuery)}` : dashboardUrl) : `/register?subject=${encodeURIComponent(card.subjectQuery)}`}
                    className="font-800 text-[#F5A623] hover:text-[#d88707] flex items-center gap-1 transition-transform group-hover:translate-x-1"
                  >
                    Post Requirement <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Product Feature Preview (Example Tutor Profiles & Requirements) ── */}
      <section id="preview" className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto space-y-14">
          
          {/* Example Tutor Profiles */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B] block mb-1">
                  Product Preview
                </span>
                <h2 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  How Tutor Profiles Work
                </h2>
                <p className="text-sm text-gray-900 font-600 mt-1">
                  Tutors build verified profiles detailing qualifications, subjects, and teaching modes.
                </p>
              </div>
              <Link href={tutorCtaUrl} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-900 font-800 text-xs hover:bg-gray-100 transition-colors shrink-0">
                Join as a Tutor →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REAL_TUTOR_PROFILES.map((tutor, idx) => (
                <div
                  key={idx}
                  className="group bg-white rounded-3xl border border-gray-200/90 p-6 space-y-4 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 transition-all duration-300 ease-out hover:-translate-y-2 relative overflow-hidden"
                >
                  {/* Top bar: Image, Name, Qualification, Verified badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Image
                          src={tutor.image}
                          alt={tutor.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/80 shadow-xs transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white" title="Verified Tutor">
                          <CheckCircle2 size={11} className="fill-emerald-500 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-800 text-base text-[#0F2540] truncate transition-colors group-hover:text-[#2D9E6B]">
                          {tutor.name}
                        </h3>
                        <p className="text-xs text-gray-600 font-600 truncate mt-0.5">
                          {tutor.qualification}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Location bar */}
                  <div className="flex items-center justify-between text-xs font-700 text-gray-700 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1 text-amber-900 font-800">
                      <Star size={13} className="fill-amber-500 text-amber-500" />
                      <span>{tutor.rating.toFixed(1)}</span>
                      <span className="text-gray-600 text-[11px] font-600">({tutor.reviewsCount})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-[11px] truncate">
                      <MapPin size={12} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{tutor.location}</span>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-800 uppercase tracking-wider text-gray-700 block">
                      Specialisation
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.subjects.map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200/80 font-700 transition-transform hover:scale-105">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer mode & rate */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-700 text-gray-700">{tutor.mode}</span>
                    <span className="font-800 text-[#0F2540] bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                      {tutor.rate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example Requirements Preview */}
          <div className="space-y-8 pt-6 border-t border-gray-200">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B]">
                Marketplace Preview
              </span>
              <h2 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                How Student Requirements Work
              </h2>
              <p className="text-sm text-gray-900 font-600">
                Parents post requirement details. Relevant verified tutors in their city review posts and reach out directly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REAL_REQUIREMENTS.map((req, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-3xl border border-gray-200/90 p-6 space-y-3.5 relative overflow-hidden shadow-xs transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2.5"
                    style={{ backgroundColor: req.accentColor }}
                  />

                  {/* Parent profile header */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={req.parentImage}
                        alt={req.parentName}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover border border-emerald-400/80 shadow-2xs transition-transform duration-300 group-hover:scale-105"
                      />
                      <div>
                        <p className="text-xs font-800 text-[#0F2540] truncate transition-colors group-hover:text-[#2D9E6B]">
                          {req.parentName}
                        </p>
                        <span className="text-[10px] font-600 text-gray-700 block">Verified Parent</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-700 text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shrink-0">
                      {req.postedTime}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-800 uppercase tracking-wider text-gray-700 block">
                      {req.grade}
                    </span>
                    <h4 className="font-800 text-base text-[#0F2540] transition-colors group-hover:text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {req.subject}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-800 font-700 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Mode:</span>
                      <span className="text-[#0F2540] font-800">{req.mode}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-[11px]">
                      <MapPin size={12} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{req.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-800">
                    <span className="text-gray-700">Budget Rate:</span>
                    <span className="text-[#2D9E6B] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      {req.budget}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── How It Works (Verified Wording) ─────────────────── */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 bg-[#F7F8FA]">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B]">
              Simple 3-Step Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              How ApnaTutorHub Works
            </h2>
            <p className="text-sm text-gray-900 font-600">
              Find qualified tutors for your child in 3 straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                num: "01",
                title: "Tell Us What You Need",
                desc: "Share your child's subject, class level, location, timing preference, and hourly budget.",
              },
              {
                num: "02",
                title: "Relevant Tutors Discover Your Requirement",
                desc: "Verified local and online tutors review your requirement post and express interest.",
              },
              {
                num: "03",
                title: "Connect and Choose Your Tutor",
                desc: "Discuss expectations directly, agree on schedule and fee, and start tuition.",
              },
            ].map((step) => (
              <div key={step.num} className="group bg-white rounded-3xl p-7 border border-gray-300 space-y-3 shadow-xs transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200">
                <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-950 font-800 text-xl flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-110 group-hover:bg-amber-200" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {step.num}
                </div>
                <h3 className="font-800 text-lg text-[#0F2540] transition-colors group-hover:text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {step.title}
                </h3>
                <p className="text-xs text-gray-900 font-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Teacher CTA Banner (HIGH-CONTRAST DARK NAVY CARD FIX) ────────── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div
            className="group rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl border border-gray-800 transition-all duration-300 hover:shadow-2xl hover:border-amber-400/50"
            style={{ backgroundColor: "#0F2540" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-block text-xs font-800 uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3.5 py-1 rounded-full border border-amber-300/30 transition-transform group-hover:scale-105">
                  For Teachers &amp; Tutors
                </span>
                <h2 className="text-2xl sm:text-3xl font-800 !text-white leading-snug" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Are you a qualified tutor looking for teaching opportunities?
                </h2>
                <p className="text-sm font-500 !text-gray-100 leading-relaxed max-w-xl">
                  Create your profile, complete verification, and discover active student requirements in your subjects and location. Zero registration fees for tutors to sign up.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center gap-3">
                <Link
                  href={tutorCtaUrl}
                  className="btn-shine px-7 py-4 rounded-2xl bg-[#F5A623] hover:bg-amber-400 !text-[#0F2540] text-sm font-800 transition-all duration-300 ease-out hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl hover:shadow-amber-500/30 whitespace-nowrap"
                >
                  <span className="!text-[#0F2540] font-800">Join as a Tutor Today →</span>
                </Link>
                <span className="text-xs font-700 !text-amber-200">
                  Aadhaar &amp; qualification verification required
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ──────────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 bg-[#F7F8FA]">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B]">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <HomeFaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ── Final Conversion CTA Strip ────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 text-center border-y border-[#C7EDD9] bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-emerald-50">
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Ready to Find the Right Tutor for Your Child?
          </h3>
          <p className="text-sm text-gray-900 font-600">
            Tell us what you need. Verified tutors in your area will connect with you directly.
          </p>
          <div>
            <Link href={parentCtaUrl} className="px-8 py-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-sm font-800 inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
              <span className="!text-white font-800">Post Your Requirement — Free</span>
              <ArrowRight size={16} className="!text-white" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer (HIGH CONTRAST FOOTER TEXT) ────────────────── */}
      <footer className="bg-[#0F2540] text-gray-100 py-14 px-4 sm:px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LogoBrand light={true} />
              </div>
              <p className="text-xs text-gray-300 font-500 leading-relaxed">
                Connecting students and parents with verified home and online tutors across India.
              </p>
            </div>

            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                For Parents
              </h4>
              <ul className="space-y-2 text-xs font-600 text-gray-200">
                <li><Link href={parentCtaUrl} className="hover:text-[#F5A623] transition-colors">Post Requirement</Link></li>
                <li><a href="#subjects" className="hover:text-[#F5A623] transition-colors">Browse Subjects</a></li>
                <li><a href="#preview" className="hover:text-[#F5A623] transition-colors">Tutor Profiles</a></li>
                <li><a href="#how-it-works" className="hover:text-[#F5A623] transition-colors">How It Works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                For Tutors
              </h4>
              <ul className="space-y-2 text-xs font-600 text-gray-200">
                <li><Link href={tutorCtaUrl} className="hover:text-[#F5A623] transition-colors">Join as a Tutor</Link></li>
                <li><Link href="/login" className="hover:text-[#F5A623] transition-colors">Tutor Login</Link></li>
                <li><a href="#faq" className="hover:text-[#F5A623] transition-colors">Verification Process</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-800 text-sm text-white mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                Company
              </h4>
              <ul className="space-y-2 text-xs font-600 text-gray-200">
                <li><Link href="/login" className="hover:text-[#F5A623] transition-colors">Log in</Link></li>
                <li><Link href="/register" className="hover:text-[#F5A623] transition-colors">Register</Link></li>
                <li><a href="#faq" className="hover:text-[#F5A623] transition-colors">FAQ &amp; Support</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-600 text-gray-300">
            <span>© {new Date().getFullYear()} ApnaTutorHub. All rights reserved.</span>
            <span>Connecting Parents &amp; Verified Tutors Across India</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
