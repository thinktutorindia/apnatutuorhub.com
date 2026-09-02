import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";

export function StaffCrmPlaybook({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="ath-panel p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs font-600 text-slate-600 flex-1">
          Treat every row as a <strong className="text-[#166534]">Tutor</strong> or a{" "}
          <strong className="text-[#1D4ED8]">Parent</strong>. Switch type if the dump was wrong.
          Tutors → User Directory. Parents → Student Leads. Never promote a parent as a tutor.
        </p>
        <Link href="/admin/leads" className="text-xs font-800 !text-[#2563EB] whitespace-nowrap">
          Student Leads Feed →
        </Link>
      </div>
    );
  }

  return (
    <div className="ath-panel p-5 sm:p-6 space-y-4">
      <div>
        <p className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">How this desk works</p>
        <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Treat every row as either a tutor or a parent
        </h2>
        <p className="text-sm font-600 text-slate-600 mt-1">
          Staff CRM is the calling desk for raw WhatsApp / CSV data. Live parent posts after you confirm them live in Student Leads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-[#E8F7F0] p-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-800 text-[#166534]">
            <GraduationCap size={14} /> Tutor candidate
          </p>
          <ol className="mt-2 space-y-1.5 text-xs font-600 text-[#0F2540]">
            <li>1. Call and fill missing phone, city, subjects, classes</li>
            <li>2. Log every attempt — due follow-ups stay in My Queue</li>
            <li>3. If they want to teach, <strong>Promote to tutor profile</strong></li>
          </ol>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-[#E8F1FB] p-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-800 text-[#1D4ED8]">
            <Users size={14} /> Parent requirement
          </p>
          <ol className="mt-2 space-y-1.5 text-xs font-600 text-[#0F2540]">
            <li>1. Switch type to Parent if the dump was a tuition need</li>
            <li>2. Capture class, subjects, area, budget on the call</li>
            <li>3. <strong>Post to Student Leads</strong> — do not promote as a tutor</li>
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-700">
        <Link href="/admin/staff-leads/my-leads" className="rounded-full bg-[#2D9E6B] px-3.5 py-2 !text-white hover:bg-[#238357]">
          My calling queue
        </Link>
        <Link href="/admin/staff-leads/upload" className="rounded-full border border-[#CBD5E1] bg-white px-3.5 py-2 !text-[#0F2540]">
          Upload raw data
        </Link>
        <Link href="/admin/leads" className="inline-flex items-center gap-1 rounded-full border border-[#CBD5E1] bg-white px-3.5 py-2 !text-[#0F2540]">
          Student Leads Feed <ArrowRight size={12} />
        </Link>
        <Link href="/admin/staff-leads/reports" className="rounded-full border border-[#CBD5E1] bg-white px-3.5 py-2 !text-[#0F2540]">
          Work analytics
        </Link>
      </div>
    </div>
  );
}

export function StudentLeadsPlaybook() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="ath-panel p-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-800 text-[#1D4ED8]">
          <Users size={14} /> This page — live parent posts
        </p>
        <p className="text-xs font-600 text-slate-600 mt-1.5">
          Confirmed tuition requirements. Tutors spend coins to unlock them. Edit, expire, or close here.
        </p>
      </div>
      <div className="ath-panel p-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-800 text-[#166534]">
          <GraduationCap size={14} /> Raw WhatsApp / CSV dumps
        </p>
        <p className="text-xs font-600 text-slate-600 mt-1.5">
          Stay in Staff CRM until you classify Parent vs Tutor. Do not post a tutor candidate here.
        </p>
        <Link href="/admin/staff-leads" className="inline-flex items-center gap-1 text-xs font-800 !text-[#2D9E6B] mt-2">
          Open calling desk <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
