import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { auth } from "@/auth";

export const metadata = { title: "Bookings | ThinkTutor" };

export default async function TutorBookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
          Trial classes, confirmed schedules, and Google Meet links will appear
          here once parents start booking you.
        </p>
      </header>

      <div className="neu-card space-y-4 bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#F3E8FF] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          📅
        </div>
        <h2 className="text-xl font-black text-[#0F172A]">Coming in Phase 7</h2>
        <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
          Trial booking, scheduling, reschedule requests, and meet-link sharing
          are being built soon.
        </p>
        <Link
          href="/tutor/dashboard"
          className="neu-btn neu-btn-secondary inline-flex px-6 py-3 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
