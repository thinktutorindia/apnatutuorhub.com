import { LogoBrand } from "@/components/brand/Logo";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  Search,
  Star,
  ArrowRight,
  Sparkles,
  Play,
  Zap,
  User,
  LayoutDashboard,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThinkTutor — Learn Anything, Anytime, Anywhere!",
  description:
    "Find top verified home & online tutors near you. Playful, smart matching for every subject & class.",
};

const CATEGORIES = [
  {
    name: "Mathematics",
    icon: "📐",
    tutors: "2,400+ Tutors",
    bg: "#E0F2FE", // Soft Blue
  },
  {
    name: "Science & Physics",
    icon: "🔬",
    tutors: "1,800+ Tutors",
    bg: "#DCFCE7", // Soft Green
  },
  {
    name: "JEE & NEET Prep",
    icon: "🎯",
    tutors: "950+ Tutors",
    bg: "#FEF3C7", // Soft Yellow
  },
  {
    name: "Coding & AI",
    icon: "💻",
    tutors: "750+ Tutors",
    bg: "#FCE7F3", // Soft Pink
  },
  {
    name: "English & Languages",
    icon: "📝",
    tutors: "2,100+ Tutors",
    bg: "#F3E8FF", // Soft Purple
  },
  {
    name: "Arts & Commerce",
    icon: "🎨",
    tutors: "520+ Tutors",
    bg: "#FFEDD5", // Soft Orange
  },
];

const STATS = [
  { value: "15K+", label: "Verified Tutors" },
  { value: "50K+", label: "Happy Students" },
  { value: "500+", label: "Expert Instructors" },
  { value: "120+", label: "Cities Covered" },
];

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  const dashboardUrl =
    user?.role === "TUTOR"
      ? "/tutor/dashboard"
      : user?.role === "SUPER_ADMIN" || user?.role === "SUB_ADMIN"
      ? "/admin/dashboard"
      : "/parent/dashboard";

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      {/* ── 1. Floating Neubrutalist Navbar ── */}
      <header className="pt-6 px-4 max-w-6xl mx-auto">
        <nav className="neu-card px-6 py-4 flex items-center justify-between bg-white">
          <LogoBrand size={36} />

          <div className="hidden md:flex items-center gap-8 font-bold text-[#0F172A] text-sm">
            <a href="#features" className="hover:text-[#22C55E] transition-colors">
              Features
            </a>
            <a href="#subjects" className="hover:text-[#22C55E] transition-colors">
              Subjects
            </a>
            <a href="#how-it-works" className="hover:text-[#22C55E] transition-colors">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href={dashboardUrl}
                  className="neu-badge bg-[#FEF3C7] text-[#0F172A] hidden sm:inline-flex items-center gap-1.5"
                >
                  <User size={14} />
                  <span>{user.name || user.email?.split("@")[0]}</span>
                  <span className="text-[10px] bg-[#0F172A] text-white px-1.5 py-0.5 rounded-full font-black ml-1 uppercase">
                    {user.role}
                  </span>
                </a>

                <a
                  href={dashboardUrl}
                  className="neu-btn neu-btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </a>

                <SignOutButton />
              </div>
            ) : (
              <>
                <a href="/login" className="neu-btn neu-btn-white text-sm px-5 py-2">
                  Log In
                </a>
                <a href="/register" className="neu-btn neu-btn-primary text-sm px-5 py-2">
                  Start Free
                </a>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── 2. Hero Section ── */}
      <section className="pt-12 md:pt-16 pb-12 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Search */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 neu-badge bg-[#DCFCE7] text-[#0F172A]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span>New: AI-Powered Tutor Matching</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl md:text-6xl font-black text-[#0F172A] leading-[1.1] tracking-tight">
              Learn Anything, <br />
              <span className="text-[#22C55E]">Anytime,</span> <br />
              Anywhere!
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl font-medium text-[#475569] max-w-xl leading-relaxed">
              Join thousands of learners across India. Get matched with top verified tutors for home or online classes in under 2 minutes!
            </p>

            {/* Search Input Box */}
            <div className="p-2 neu-card bg-white max-w-lg flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={20} className="text-[#0F172A]" />
                <input
                  type="text"
                  placeholder="What subject do you need help with?"
                  className="w-full bg-transparent border-none outline-none font-semibold text-[#0F172A] placeholder:text-slate-400 text-sm md:text-base"
                />
              </div>
              <a href={user ? dashboardUrl : "/register"} className="neu-btn neu-btn-primary text-sm py-3 px-6">
                Search Tutors
              </a>
            </div>

            {/* Quick Tag Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                Popular:
              </span>
              {["Maths", "Physics", "JEE Prep", "Class 10", "Coding", "NEET"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="neu-badge bg-white text-xs text-[#0F172A] cursor-pointer hover:bg-[#FEF3C7] transition-colors"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right Column: Playful Claymorphism Preview Card */}
          <div className="lg:col-span-5 relative">
            
            {/* Main Interactive Widget Card */}
            <div className="neu-card p-6 bg-white relative z-10 space-y-6">
              
              {/* Card Header with Class Info */}
              <div className="flex items-center justify-between p-4 bg-[#E0F2FE] border-2 border-[#0F172A] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6] border-2 border-[#0F172A] flex items-center justify-center text-white">
                    <Play size={20} fill="white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-sm md:text-base">
                      Mathematics & Physics
                    </h3>
                    <p className="text-xs font-semibold text-slate-600">
                      Class 10 CBSE • 12 lessons available
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Tracking Bar Demo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#0F172A]">
                  <span>Matching Score Progress</span>
                  <span className="text-[#22C55E]">85% Match</span>
                </div>
                <div className="w-full h-4 bg-slate-100 border-2 border-[#0F172A] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-[#22C55E] rounded-full w-[85%] transition-all duration-1000" />
                </div>
              </div>

              {/* Action Button */}
              <a href={user ? dashboardUrl : "/register"} className="neu-btn neu-btn-primary w-full text-center py-3">
                {user ? "Go to Dashboard" : "Continue Tutor Matching"}
              </a>
            </div>

            {/* Floating Badge 1: Target Icon */}
            <div className="absolute -top-6 -right-4 z-20 neu-card p-3 bg-[#FCE7F3] rotate-6 hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#EC4899] border-2 border-[#0F172A] flex items-center justify-center text-white font-black text-sm">
                🎯
              </div>
              <span className="font-extrabold text-xs text-[#0F172A]">Top Rated</span>
            </div>

            {/* Floating Badge 2: Verified Tutor Star */}
            <div className="absolute -bottom-6 -left-4 z-20 neu-card p-3 bg-[#FEF3C7] -rotate-6 hidden sm:flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400 stroke-[#0F172A] stroke-2" />
              <span className="font-extrabold text-xs text-[#0F172A]">4.9 Star Tutors</span>
            </div>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="mt-16 pt-10 border-t-2 border-[#0F172A] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.label} className="neu-card p-4 bg-white">
              <div className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm font-bold text-slate-600 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Subject Catalog Preview ── */}
      <section id="subjects" className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="neu-badge bg-[#FEF3C7] text-[#0F172A] mx-auto">
            <Sparkles size={14} className="text-amber-600" />
            Explore Disciplines
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Popular Subjects & Courses
          </h2>
          <p className="text-slate-600 font-medium text-base">
            Find specialized tutors for school boards, entrance exams, and skills.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.name}
              href={user ? dashboardUrl : "/register"}
              className="neu-card p-6 block text-left no-underline transition-all hover:scale-[1.02]"
              style={{ backgroundColor: cat.bg }}
            >
              <div className="text-4xl mb-4">{cat.icon}</div>
              <h3 className="text-xl font-black text-[#0F172A] mb-1">
                {cat.name}
              </h3>
              <p className="text-xs font-bold text-slate-700 mb-4">
                {cat.tutors}
              </p>
              <div className="inline-flex items-center gap-2 font-extrabold text-sm text-[#0F172A]">
                <span>Browse Tutors</span>
                <ArrowRight size={16} />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── 4. How It Works ── */}
      <section id="how-it-works" className="py-16 px-4 max-w-6xl mx-auto">
        <div className="neu-card p-8 md:p-12 bg-white">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <div className="neu-badge bg-[#E0F2FE] text-[#0F172A] mx-auto">
              <Zap size={14} className="text-blue-600" />
              Simple Process
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
              How ThinkTutor Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Post Requirement",
                desc: "Tell us subject, class, mode (online/offline), and budget preference.",
                bg: "#E0F2FE",
              },
              {
                step: "02",
                title: "Instant Smart Match",
                desc: "Algorithm pairs you with verified tutors ranked by experience and ratings.",
                bg: "#DCFCE7",
              },
              {
                step: "03",
                title: "Book & Learn",
                desc: "Schedule a free trial class, verify profiles, and start learning!",
                bg: "#FEF3C7",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="neu-card p-6 text-left space-y-4"
                style={{ backgroundColor: item.bg }}
              >
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center font-black text-xl text-[#0F172A] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  {item.step}
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">
                  {item.title}
                </h3>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Enrollment CTA Banner ── */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <div className="neu-card p-10 bg-[#22C55E] text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-black text-[#0F172A]">
            Ready to Find Your Perfect Tutor?
          </h2>
          <p className="text-lg font-bold text-slate-900 max-w-xl mx-auto">
            Join 50,000+ happy parents and students across India today.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a href={user ? dashboardUrl : "/register"} className="neu-btn neu-btn-white text-base px-8 py-3.5">
              {user ? "Open Dashboard" : "Find a Tutor Free"}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="pt-12 border-t-2 border-[#0F172A] px-4 max-w-6xl mx-auto text-center font-bold text-sm text-slate-600">
        <p>© {new Date().getFullYear()} ThinkTutor. Playful & Smart Learning Platform.</p>
      </footer>
    </div>
  );
}
