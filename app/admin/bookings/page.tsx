import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Search } from "lucide-react";
import { adminCancelBookingAction, adminDeleteBookingAction } from "@/app/actions/admin.actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking Management — Admin" };

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  REQUESTED: { bg: "bg-amber-100", text: "text-amber-950", border: "border-amber-300" },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300" },
  RESCHEDULED: { bg: "bg-blue-100", text: "text-blue-950", border: "border-blue-300" },
  COMPLETED: { bg: "bg-purple-100", text: "text-purple-950", border: "border-purple-300" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const statusFilter = params.status ?? "ALL";

  const whereCondition: any = {};
  if (statusFilter !== "ALL") {
    whereCondition.status = statusFilter;
  }
  if (q) {
    whereCondition.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { parentName: { contains: q, mode: "insensitive" } },
      { tutorName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [bookings, totalCount, statusCounts] = await Promise.all([
    prisma.booking.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tutorProfile: { include: { user: { select: { name: true, email: true } } } },
        lead: { include: { parentProfile: { include: { user: { select: { name: true, email: true } } } } } },
      },
    }),
    prisma.booking.count({ where: whereCondition }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Tuition Bookings</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Class Booking Management
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Monitor and manage trial &amp; regular class bookings across the platform ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Status Filter Badges */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "REQUESTED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED"].map((st) => (
          <Link
            key={st}
            href={`/admin/bookings?status=${st}&q=${q}`}
            className={`rounded-2xl px-4 py-2 text-xs font-800 transition-all border ${
              statusFilter === st
                ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {st} {st !== "ALL" ? `(${countMap[st] ?? 0})` : ""}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="flex flex-col gap-3 sm:flex-row p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <input type="hidden" name="status" value={statusFilter} />
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-slate-50 border border-slate-300">
          <Search size={16} className="text-slate-500" />
          <input name="q" defaultValue={q} placeholder="Search by subject, parent name, or tutor name…" className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-500" />
        </div>
        <button type="submit" className="w-full sm:w-auto rounded-2xl px-6 py-2.5 text-xs font-800 bg-[#2D9E6B] text-white hover:bg-[#238357] transition-all cursor-pointer">
          Search
        </button>
      </form>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-800 text-slate-900 uppercase tracking-wider">
                <th className="px-5 py-4 text-left">Subject &amp; Mode</th>
                <th className="px-5 py-4 text-left">Parent</th>
                <th className="px-5 py-4 text-left">Tutor</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-left">Date &amp; Time</th>
                <th className="px-5 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-700 text-slate-700">No bookings match filter criteria</td>
                </tr>
              ) : bookings.map((b) => {
                const style = STATUS_COLOR[b.status] ?? STATUS_COLOR.CANCELLED;
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-800 text-[#0F2540] text-sm">{b.subject || "Tuition Class"}</p>
                      <p className="text-xs font-600 text-slate-600">{b.mode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-800 text-[#0F2540] text-xs">{b.parentName || b.lead?.parentProfile?.user?.name || "—"}</p>
                      <p className="text-xs font-600 text-slate-600">{b.lead?.parentProfile?.user?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-800 text-[#0F2540] text-xs">{b.tutorName || b.tutorProfile?.user?.name || "—"}</p>
                      <p className="text-xs font-600 text-slate-600">{b.tutorProfile?.user?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-800 border ${style.bg} ${style.text} ${style.border}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-700 text-slate-700">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {b.status !== "CANCELLED" && (
                          <form action={async () => { "use server"; await adminCancelBookingAction(b.id); }}>
                            <button type="submit" className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-800 cursor-pointer">
                              Cancel
                            </button>
                          </form>
                        )}
                        <form action={async () => { "use server"; await adminDeleteBookingAction(b.id); }}>
                          <button type="submit" className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-950 border border-red-300 text-xs font-800 cursor-pointer">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
