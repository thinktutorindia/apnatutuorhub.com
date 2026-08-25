import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Crown,
  Lock,
  Users,
  Zap,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  ArrowLeft,
  Award,
  Layers,
  HelpCircle,
} from "lucide-react";
import { LogoBrand } from "@/components/brand/Logo";
import { CLASS_LEAD_DISTRIBUTION, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

export const metadata = {
  title: "Terms of Service & Lead Delivery Policy | ApnaTutorHub",
  description:
    "Official terms and conditions, lead allocation schedule, tutor competition caps, and Platinum 100% Solo Exclusivity Guarantee for ApnaTutorHub.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <LogoBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/tutor/plans"
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
            >
              Tutor Plans
            </Link>
            <Link
              href="/tutor/leads"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition-all"
            >
              Browse Leads
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#0F2540] text-white pt-12 pb-16 px-4 sm:px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-yellow-300 text-xs font-extrabold backdrop-blur-md">
            <ShieldCheck size={14} className="text-yellow-400" />
            <span>Platform Governance &amp; Legal Framework</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Terms of Service &amp; Lead Delivery Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Transparent rules on membership quotas, class-level lead delivery, tutor competition sharing caps, and our verified lead guarantee.
          </p>
          <div className="text-xs font-semibold text-slate-400">
            Last Updated: August 25, 2026 • Effective Immediately
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
              👑
            </div>
            <h3 className="text-sm font-black text-[#0F2540]">100% Solo Lock</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              When a Platinum VIP tutor unlocks a lead, the lead is immediately closed to all other tutors.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              📱
            </div>
            <h3 className="text-sm font-black text-[#0F2540]">OTP Verified Leads</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              100% of parent requirements are phone and location verified before reaching your feed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              🛡️
            </div>
            <h3 className="text-sm font-black text-[#0F2540]">Fair Replacement</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Full credit coin refund if a parent contact is found unreachable or permanently invalid.
            </p>
          </div>
        </div>

        {/* Section 1: Overview */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <FileText size={20} className="text-[#2D9E6B]" />
            <span>1. Overview &amp; Acceptance of Terms</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            By accessing, creating an account, or purchasing any membership plan or wallet coin package on ApnaTutorHub (&quot;the Platform&quot;), you agree to be legally bound by these Terms of Service and Lead Delivery Policies. ApnaTutorHub connects verified students/parents seeking home and online tuition with qualified, background-verified tutors across India.
          </p>
        </section>

        {/* Section 2: Membership Plans & Lead Packages */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <Award size={20} className="text-[#2D9E6B]" />
            <span>2. Tutor Membership Plans &amp; Lead Unlock Allowance</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            All membership tiers provide access to unlock student inquiries across all classes and subjects. Every plan includes 10 Verified Leads* with tier-based validity:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[#0F2540] font-black border-b border-slate-200">
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Package Price</th>
                  <th className="py-3 px-4 text-center">Lead Allowance</th>
                  <th className="py-3 px-4 text-center">Validity Duration</th>
                  <th className="py-3 px-4">Competition Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-bold text-amber-950">Bronze Plan</td>
                  <td className="py-3 px-4 font-bold">₹6,000</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">10 Verified Leads*</td>
                  <td className="py-3 px-4 text-center text-emerald-700 font-bold">1 Month</td>
                  <td className="py-3 px-4 text-amber-900 font-bold">Shared (Max 5 tutors)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-blue-950">Silver Plan</td>
                  <td className="py-3 px-4 font-bold">₹9,000</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">15 Verified Leads*</td>
                  <td className="py-3.5 px-4 text-center text-emerald-700 font-bold">2 Months</td>
                  <td className="py-3 px-4 text-blue-900 font-bold">Low Competition (Max 3 tutors)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-yellow-950">Gold Plan</td>
                  <td className="py-3 px-4 font-bold">₹12,000</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">20 Verified Leads*</td>
                  <td className="py-3 px-4 text-center text-emerald-700 font-bold">2 Months</td>
                  <td className="py-3 px-4 text-yellow-950 font-black">Semi-Exclusive (Max 2 tutors)</td>
                </tr>
                <tr className="bg-purple-50/50">
                  <td className="py-3 px-4 font-extrabold text-purple-950">Platinum VIP Plan</td>
                  <td className="py-3 px-4 font-black text-purple-950">₹24,000</td>
                  <td className="py-3 px-4 text-center font-extrabold text-purple-700">30 High-Value Leads*</td>
                  <td className="py-3 px-4 text-center text-purple-700 font-bold">3 Months</td>
                  <td className="py-3 px-4 text-purple-950 font-black">👑 100% Solo Lock (1 Tutor Only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Class-Level Lead Delivery Schedule */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <Layers size={20} className="text-[#2D9E6B]" />
            <span>3. Dynamic Class-Based Lead Delivery Schedule</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Tutors can unlock inquiries across any education category. Due to differing curriculum intensity and tuition fee potential, unlock counts scale dynamically based on the class grades unlocked:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {CLASS_LEAD_DISTRIBUTION.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F2540]">{item.classLevel}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                    {item.leadsCount} Leads Capacity
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700">{item.gradeRange}</div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {item.description}
                </p>
                <div className="text-[11px] font-bold text-slate-600 pt-1">
                  Popular Subjects: {item.popularSubjects.join(", ")}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-950">
            <strong>💡 Mixed Unlocks Supported:</strong> You are not locked into one class tier. You can unlock any mix of classes (for example, 5 primary leads + 2 senior secondary leads), and your quota balance adjusts dynamically.
          </div>
        </section>

        {/* Section 4: Competition Sharing & Platinum Exclusivity */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <Lock size={20} className="text-purple-600" />
            <span>4. Competition Sharing Limits &amp; Platinum Solo Lock Guarantee</span>
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
              <h3 className="text-sm font-black text-purple-950 flex items-center gap-2">
                <Crown size={16} className="text-yellow-600" />
                <span>Platinum VIP 100% Solo Exclusivity Guarantee</span>
              </h3>
              <p className="text-xs text-purple-900 leading-relaxed font-semibold">
                When an active Platinum VIP tutor unlocks any student lead, our database engine automatically locks the lead to that single tutor (<code className="font-mono text-purple-800 bg-purple-100 px-1 py-0.5 rounded">maxTutors = 1</code>) and transitions the status to <code className="font-mono text-purple-800 bg-purple-100 px-1 py-0.5 rounded">APPLICATIONS_RECEIVED</code>. No other tutor can view parent contact details, call, or apply for that inquiry.
              </p>
            </div>

            <p>
              <strong>Bronze Plan (Max 5 Tutors):</strong> Bronze leads may be unlocked by up to 5 verified tutors. Once 5 tutors unlock the lead, the lead is permanently closed.
            </p>
            <p>
              <strong>Silver Plan (Max 3 Tutors):</strong> When unlocked by a Silver tutor, the lead capacity is capped at 3 tutors max.
            </p>
            <p>
              <strong>Gold Plan (Max 2 Tutors):</strong> Semi-exclusive lead delivery where at most 2 tutors can ever unlock and submit proposals.
            </p>
          </div>
        </section>

        {/* Section 5: Verification & Replacement Policy */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#2D9E6B]" />
            <span>5. Lead Verification &amp; Replacement Policy</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            <p>
              All parent leads posted on ApnaTutorHub undergo automated phone OTP verification and geographic pin location checks. However, in the rare event of an invalid inquiry, we offer full protection:
            </p>
            <ul className="space-y-2 list-disc list-inside text-xs font-semibold text-slate-700 pl-2">
              <li>
                <strong>Unreachable Parent / Wrong Number:</strong> If a parent number is out of service or incorrect, tutors can report the lead within 48 hours for immediate coin refund or replacement lead credit.
              </li>
              <li>
                <strong>Duplicate Posting:</strong> If a parent posted identical duplicate requests, the redundant lead unlock fee is refunded.
              </li>
              <li>
                <strong>Requirement Withdrawn:</strong> If the parent hired a tutor before OTP posting was marked, support will issue a full wallet credit upon verification.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6: Tutor Code of Conduct */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-[#0F2540] flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#2D9E6B]" />
            <span>6. Tutor Code of Conduct &amp; Safety</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Tutors must maintain the highest standards of professional conduct. Sharing student contact details with third parties, inappropriate behavior, or misrepresenting educational qualifications will result in immediate permanent account termination and forfeiture of active memberships.
          </p>
        </section>

        {/* Section 7: Contact & Support */}
        <section className="bg-gradient-to-r from-slate-900 to-[#0F2540] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-black text-white">Have questions about our terms or plans?</h3>
            <p className="text-xs text-slate-300 font-medium">
              Our support team is available 24/7 via WhatsApp and phone helpline.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://wa.me/917703801849?text=Hi%20ApnaTutorHub%20Support,%20I%20have%20a%20question%20about%20tutor%20membership%20plans"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all"
            >
              <MessageSquare size={16} />
              <span>WhatsApp Support</span>
            </a>
            <Link
              href="/tutor/plans"
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 transition-all"
            >
              Explore Plans →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center text-xs font-semibold text-slate-500">
        <p>© 2026 ApnaTutorHub. All rights reserved. Registered under Indian Educational Services Act.</p>
      </footer>
    </div>
  );
}
