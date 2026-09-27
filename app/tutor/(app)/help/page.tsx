import { Coins, ShieldOff, PlayCircle } from "lucide-react";
import { SUPPORT_PHONE_DISPLAY } from "@/lib/support";

export const metadata = {
  title: "Tutor Help — How to unlock leads & block a teacher | ApnaTutorHub",
};

export default function TutorHelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          Tutor help
        </h1>
        <p className="text-sm text-[#64748B] font-500">
          How to unlock a parent lead, report a fake lead, and how admin blocks a teacher.
        </p>
      </header>

      <section className="ath-panel p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#0F2540] font-800">
          <PlayCircle size={18} />
          How to unlock a parent lead
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-[#334155] font-500">
          <li>Complete KYC on <strong>My Profile</strong>. Unverified tutors cannot unlock contacts.</li>
          <li>Open <strong>Find Student Leads</strong>. Only nearby matching subjects are shown.</li>
          <li>Check class, area (within 5 km), budget, and home/online mode. Class 1–8 is home tuition only.</li>
          <li>Tap <strong>Unlock</strong>. Coins deduct, or the lead is free if it is in your plan quota.</li>
          <li>Call the parent within 30 minutes. Book a free demo from <strong>My Students</strong>.</li>
          <li>If the number is fake or the parent already hired someone, tap <strong>Lead not genuine — request coin refund</strong>.</li>
        </ol>
      </section>

      <section className="ath-panel p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#0F2540] font-800">
          <Coins size={18} />
          Lead quality feedback
        </div>
        <p className="text-sm text-[#334155] font-500">
          After unlock, use <strong>Lead not genuine — request coin refund</strong>. Quality team reviews it
          and credits coins if the lead is invalid, duplicate, or already closed.
        </p>
      </section>

      <section className="ath-panel p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#0F2540] font-800">
          <ShieldOff size={18} />
          How admin deletes / blocks a teacher
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-[#334155] font-500">
          <li>Staff with Users access opens <strong>/admin/users</strong>.</li>
          <li>Search the teacher by name, phone, or email.</li>
          <li>Use <strong>Suspend</strong> to block login immediately.</li>
          <li>Use user edit to remove the public name or deactivate the profile.</li>
          <li>Suspended teachers cannot unlock leads or appear as verified.</li>
        </ol>
      </section>

      <p className="text-sm font-600 text-[#64748B]">
        Stuck? WhatsApp {SUPPORT_PHONE_DISPLAY}.
      </p>
    </div>
  );
}
