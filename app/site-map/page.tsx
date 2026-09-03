import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "Sitemap",
  description:
    "HTML sitemap of ApnaTutorHub public pages: home, find tutors, legal policies, city tutor pages, and subject pages.",
};

const CORE = [
  { href: "/", label: "Home" },
  { href: "/find-tutor", label: "Find tutors" },
  { href: "/register", label: "Post a requirement (parents)" },
  { href: "/register?role=tutor", label: "Join as a tutor" },
  { href: "/login", label: "Sign in" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/membership-policy", label: "Tutor Membership Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/disclaimer", label: "Disclaimer Policy" },
  { href: "/copyright", label: "Copyright Policy" },
];

const CITIES = [
  "delhi",
  "noida",
  "gurgaon",
  "mumbai",
  "bengaluru",
  "hyderabad",
  "pune",
  "chennai",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "lucknow",
];

const SUBJECTS = [
  { slug: "mathematics", label: "Mathematics" },
  { slug: "physics", label: "Physics" },
  { slug: "chemistry", label: "Chemistry" },
  { slug: "biology", label: "Biology" },
  { slug: "english", label: "English" },
  { slug: "computer-science", label: "Computer Science" },
  { slug: "cbse-class-10", label: "CBSE Class 10" },
  { slug: "cbse-class-12", label: "CBSE Class 12" },
  { slug: "jee-mains", label: "JEE" },
  { slug: "neet-medical", label: "NEET" },
];

function cityLabel(slug: string) {
  if (slug === "gurgaon") return "Gurugram";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export default function HtmlSitemapPage() {
  return (
    <LegalPageShell
      badge="Index"
      title="Sitemap"
      summary="Public pages on ApnaTutorHub. Parents post a requirement free. Tutors unlock leads after KYC."
      updated="September 3, 2026"
    >
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-800 text-[#0F2540]">Main</h2>
        <ul className="grid gap-2 text-sm font-600 text-[#2D9E6B] sm:grid-cols-2">
          {CORE.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-800 text-[#0F2540]">Policies</h2>
        <ul className="grid gap-2 text-sm font-600 text-[#2D9E6B] sm:grid-cols-2">
          {LEGAL.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-800 text-[#0F2540]">Home tutors by city</h2>
        <ul className="grid gap-2 text-sm font-600 text-[#2D9E6B] sm:grid-cols-2 md:grid-cols-3">
          {CITIES.map((city) => (
            <li key={city}>
              <Link href={`/home-tutors-${city}`} className="hover:underline">
                Home tutors in {cityLabel(city)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-xl font-800 text-[#0F2540]">Tutors by subject</h2>
        <ul className="grid gap-2 text-sm font-600 text-[#2D9E6B] sm:grid-cols-2 md:grid-cols-3">
          {SUBJECTS.map((item) => (
            <li key={item.slug}>
              <Link href={`/tutors/${item.slug}`} className="hover:underline">
                {item.label} tutors
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </LegalPageShell>
  );
}
