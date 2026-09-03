import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

const SOCIAL = [
  { label: "Facebook", href: "https://facebook.com/apnatutorhub", path: "M15 8h-3V6c0-.6.3-1 1-1h2V2h-2.2C10.6 2 9 3.8 9 6.2V8H7v3h2v8h3v-8h2.6L15 8z" },
  { label: "X", href: "https://twitter.com/apnatutorhub", path: "M14.3 3H16.6L11.7 8.6 17.5 16h-4.2l-3.3-4.3L6.3 16H4l5.2-6L3.7 3h4.3l3 3.9L14.3 3zm-.7 11.7h1.2L6.5 4.2H5.2l8.4 10.5z" },
  { label: "Instagram", href: "https://instagram.com/apnatutorhub", path: "M7 3h6a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm6.2 1.8H7A2.2 2.2 0 0 0 4.8 7v6A2.2 2.2 0 0 0 7 15.2h6A2.2 2.2 0 0 0 15.2 13V7A2.2 2.2 0 0 0 13.2 4.8zM10 7.2A2.8 2.8 0 1 1 7.2 10 2.8 2.8 0 0 1 10 7.2zm0 1.5A1.3 1.3 0 1 0 11.3 10 1.3 1.3 0 0 0 10 8.7zm3.4-2.6a.7.7 0 1 1-.7.7.7.7 0 0 1 .7-.7z" },
  { label: "YouTube", href: "https://youtube.com/@apnatutorhub", path: "M16.8 6.2a2 2 0 0 0-1.4-1.4C14.2 4.5 10 4.5 10 4.5s-4.2 0-5.4.3A2 2 0 0 0 3.2 6.2 21 21 0 0 0 3 10a21 21 0 0 0 .2 3.8 2 2 0 0 0 1.4 1.4c1.2.3 5.4.3 5.4.3s4.2 0 5.4-.3a2 2 0 0 0 1.4-1.4A21 21 0 0 0 17 10a21 21 0 0 0-.2-3.8zM8.8 12.7V7.3L13.2 10l-4.4 2.7z" },
  { label: "WhatsApp", href: getWhatsAppSupportLink(), path: "M10 2a8 8 0 0 0-6.9 12L2 18l4.1-1.1A8 8 0 1 0 10 2zm4.5 11.3c-.2.5-1 .9-1.4 1-.3.1-.7.1-1.2 0a13 13 0 0 1-3.7-2.3 10 10 0 0 1-2-2.6c-.3-.6 0-1 .2-1.3l.7-.8c.2-.2.4-.2.6 0l1 1.2c.2.2.2.4.1.6l-.3.5c-.1.2 0 .4.1.6.4.6.9 1.1 1.5 1.5.2.1.4.2.6.1l.5-.3c.2-.1.4-.1.6.1l1.2 1c.2.2.2.4 0 .6z" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/membership-policy", label: "Tutor Membership Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/disclaimer", label: "Disclaimer Policy" },
  { href: "/copyright", label: "Copyright Policy" },
  { href: "/site-map", label: "Sitemap" },
];

export function SiteFooter({
  parentCtaUrl = "/register",
  tutorCtaUrl = "/register?role=tutor",
}: {
  parentCtaUrl?: string;
  tutorCtaUrl?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0A192F] text-white">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SOCIAL.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0A192F] hover:bg-[#E8F7F0]"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
                <path d={s.path} />
              </svg>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <LogoBrand light heightClass="h-11" />
            <p className="text-xs font-500 leading-relaxed text-slate-300">
              Parents post a tuition requirement free. Nearby KYC-verified home and online tutors apply. Pay only after a demo.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-800" style={{ fontFamily: "Poppins, sans-serif" }}>
              For Parents
            </h4>
            <ul className="space-y-2 text-xs font-600 text-slate-300">
              <li><Link href={parentCtaUrl} className="hover:text-[#2D9E6B]">Post Requirement</Link></li>
              <li><Link href="/find-tutor" className="hover:text-[#2D9E6B]">Find Tutors</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-[#2D9E6B]">How It Works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-800" style={{ fontFamily: "Poppins, sans-serif" }}>
              For Tutors
            </h4>
            <ul className="space-y-2 text-xs font-600 text-slate-300">
              <li><Link href={tutorCtaUrl} className="hover:text-[#2D9E6B]">Join as a Tutor</Link></li>
              <li><Link href="/login" className="hover:text-[#2D9E6B]">Tutor Login</Link></li>
              <li><Link href="/membership-policy" className="hover:text-[#2D9E6B]">Membership &amp; Leads</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-800" style={{ fontFamily: "Poppins, sans-serif" }}>
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

        <div className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-center text-sm font-800 uppercase tracking-[0.12em] text-white sm:text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
            Find verified home tutors and online classes across India
          </h2>
          <div className="space-y-3 text-[13px] font-500 leading-relaxed text-slate-200">
            <p>
              ApnaTutorHub is a tutoring marketplace for families in India. Parents post a home tuition or live online class requirement at no charge — class, subject, board, locality, and budget. KYC-verified teachers (Aadhaar and degree checked) nearby can unlock that enquiry and reach out. We are not a coaching institute and we do not sell a public tutor phone directory. You meet the teacher on a free demo first, then pay only if you want to continue.
            </p>
            <p>
              We cover Class 1 to 12 for CBSE, ICSE/ISC, and state boards, plus JEE, NEET, spoken English, and coding. Families use ApnaTutorHub for home tutors in Delhi, Noida, Gurugram, Ghaziabad, Faridabad, Mumbai, Bengaluru, Hyderabad, Pune, Chennai, Kolkata, Jaipur, Ahmedabad, Lucknow, and other cities, and for 1-on-1 online classes anywhere in India. Tutors join free, complete KYC, then use coins or a membership plan to unlock parent leads. For rules on leads, refunds, and conduct, read our{" "}
              <Link href="/terms" className="text-[#7EE0B0] hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/membership-policy" className="text-[#7EE0B0] hover:underline">Tutor Membership Policy</Link>.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] font-600 text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {LEGAL_LINKS.map((item, i) => (
              <span key={item.href} className="inline-flex items-center gap-2">
                {i > 0 ? <span className="text-white/25" aria-hidden>|</span> : null}
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
          <p className="lg:text-right">
            Copyright © {year} ApnaTutorHub.com · New Delhi, India · All rights reserved.
          </p>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] font-600 text-slate-500">
          <ShieldCheck size={13} className="text-[#2D9E6B]" />
          <CheckCircle2 size={13} className="text-[#2D9E6B]" />
          KYC verified teachers · Free for parents
        </p>
      </div>
    </footer>
  );
}
