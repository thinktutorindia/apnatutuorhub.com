import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, GraduationCap, ArrowRight } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";

const KNOWN_CITIES = new Set([
  "delhi",
  "mumbai",
  "bengaluru",
  "bangalore",
  "pune",
  "hyderabad",
  "gurgaon",
  "gurugram",
  "noida",
  "kolkata",
  "chennai",
  "ahmedabad",
  "jaipur",
  "lucknow",
  "chandigarh",
  "indore",
  "bhopal",
  "kochi",
  "coimbatore",
  "nagpur",
  "surat",
  "vadodara",
  "visakhapatnam",
  "patna",
  "bhubaneswar",
]);

interface CityPageProps {
  params: Promise<{ city: string }>;
}

function formatCityName(raw: string): string {
  const clean = raw.replace(/^home-tutors-/, "").replace(/-/g, " ");
  return clean
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isValidCitySlug(city: string): boolean {
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(city)) return false;
  return KNOWN_CITIES.has(city) || city.length >= 3;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  if (!isValidCitySlug(city)) {
    return { title: "City not found — ApnaTutorHub" };
  }
  const cityName = formatCityName(city);

  return {
    title: `Verified Home Tutors in ${cityName} — ApnaTutorHub`,
    description: `Find qualified, background-checked home and online tutors in ${cityName} for Class 1-12, CBSE, ICSE, Mathematics, Science, JEE & NEET. Matched by location distance.`,
    alternates: {
      canonical: `/home-tutors-${city}`,
    },
    openGraph: {
      title: `Verified Home Tutors in ${cityName} — ApnaTutorHub`,
      description: `Connect with top-rated tutors in ${cityName}. Post your requirement for free and get matched with nearby verified teachers.`,
    },
  };
}

export default async function CityTutorPage({ params }: CityPageProps) {
  const { city } = await params;
  if (!isValidCitySlug(city)) notFound();
  const cityName = formatCityName(city);

  return (
    <div className="min-h-screen text-slate-900 bg-[#F8FAFC]">
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

      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-black">
            <MapPin size={14} className="text-[#2D9E6B]" />
            <span>Verified Home Tutors in {cityName}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0F2540] tracking-tight leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Find Best Qualified Home Tutors in <span className="text-[#2D9E6B]">{cityName}</span>
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-600 max-w-2xl mx-auto">
            Get personalized 1-on-1 home tuition and live online classes from background-checked teachers in {cityName} matched by physical distance to your address.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/parent/post-requirement"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-black transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Post Requirement in {cityName}</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/find-tutor"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-sm font-black transition-all shadow-sm flex items-center justify-center"
            >
              Browse Tutors
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-black">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-base font-extrabold text-[#0F2540]">Verified Tutors</h2>
            <p className="text-xs text-slate-600 font-semibold">
              Tutors in {cityName} complete identity and qualification checks before they appear as verified.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
              <MapPin size={20} />
            </div>
            <h2 className="text-base font-extrabold text-[#0F2540]">Distance-Based Match</h2>
            <p className="text-xs text-slate-600 font-semibold">
              Connect with tutors living within 1 km – 10 km radius of your location in {cityName}.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
              <GraduationCap size={20} />
            </div>
            <h2 className="text-base font-extrabold text-[#0F2540]">All School Boards</h2>
            <p className="text-xs text-slate-600 font-semibold">
              CBSE, ICSE, IB &amp; State Board tutors for Class 1 to 12 &amp; competitive exams.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
