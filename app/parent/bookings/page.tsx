import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";

export const metadata = {
  title: "Bookings | ThinkTutor",
};

export default async function ParentBookingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-3 bg-[#F3E8FF] p-6 md:p-8">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <Calendar size={14} />
          Bookings
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          Your Class Bookings 📅
        </h1>
        <p className="max-w-2xl text-sm font-semibold text-slate-700">
          Trial classes, schedules, and confirmed hiring will appear here once
          you start booking tutors from your requirements.
        </p>
      </header>

      <div className="neu-card space-y-4 bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#F3E8FF] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          📅
        </div>
        <h2 className="text-xl font-black text-[#0F172A]">
          Coming soon
        </h2>
        <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
          The booking & scheduling system is being built in Phase 7. Post a
          requirement first and review tutor applications!
        </p>
        <Link
          href="/parent/my-leads"
          className="neu-btn neu-btn-secondary inline-flex items-center gap-2 px-6 py-3 text-sm"
        >
          <ArrowLeft size={16} />
          <span>View My Requirements</span>
        </Link>
      </div>
    </div>
  );
}
