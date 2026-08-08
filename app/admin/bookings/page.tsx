import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Search, XCircle, Trash2, Calendar, User, CheckCircle2 } from "lucide-react";
import { adminCancelBookingAction, adminDeleteBookingAction } from "@/app/actions/admin.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking Management — Admin" };

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  REQUESTED: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  CONFIRMED: { color: "#22C55E", bg: "rgba(34,197,94,0.15)" },
  RESCHEDULED: { color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
  COMPLETED: { color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
  CANCELLED: { color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
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
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            Class Booking Management
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
            Monitor and manage trial & regular class bookings across the platform ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Status Filter Badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["ALL", "REQUESTED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED"].map((st) => (
          <a
            key={st}
            href={`/admin/bookings?status=${st}&q=${q}`}
            className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all"
            style={
              statusFilter === st
                ? { background: "#22C55E", color: "#0F172A" }
                : { background: "#0F172A", color: "#64748B", border: "1px solid #1E293B" }
            }
          >
            {st} {st !== "ALL" ? `(${countMap[st] ?? 0})` : ""}
          </a>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-3">
        <input type="hidden" name="status" value={statusFilter} />
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <Search size={14} style={{ color: "#475569" }} />
          <input name="q" defaultValue={q} placeholder="Search by subject, parent name, or tutor name…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
        <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>Search</button>
      </form>

      {/* Bookings Table */}
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl py-16" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <BookOpen size={32} style={{ color: "#1E293B" }} />
            <p className="text-sm" style={{ color: "#334155" }}>No bookings found</p>
          </div>
        ) : (
          bookings.map((bk) => {
            const sc = STATUS_COLOR[bk.status] ?? { color: "#64748B", bg: "#1E293B" };
            return (
              <div key={bk.id} className="rounded-2xl p-4 transition-all" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{bk.subject}</span>
                      <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>
                        {bk.status}
                      </span>
                      {bk.isTrial && (
                        <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                          Trial Class
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
                      Class Level: <strong>{bk.classLevel}</strong> · Mode: <strong>{bk.mode}</strong> · Agreed Fee: <strong>{bk.agreedFee ? `₹${bk.agreedFee}` : "N/A"}</strong>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs" style={{ color: "#64748B" }}>
                      <span className="flex items-center gap-1">
                        <User size={12} style={{ color: "#3B82F6" }} /> Parent: <strong className="text-slate-300">{bk.parentName || bk.lead.parentProfile.user.name || "—"}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} style={{ color: "#8B5CF6" }} /> Tutor: <strong className="text-slate-300">{bk.tutorName || bk.tutorProfile.user.name || "—"}</strong>
                      </span>
                      {bk.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} style={{ color: "#22C55E" }} /> {new Date(bk.startDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {bk.status !== "CANCELLED" && bk.status !== "COMPLETED" && (
                      <form
                        action={async () => {
                          "use server";
                          await adminCancelBookingAction(bk.id, "Administrative force cancellation");
                        }}
                      >
                        <button type="submit" className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                          <XCircle size={12} /> Force Cancel
                        </button>
                      </form>
                    )}

                    <form
                      action={async () => {
                        "use server";
                        await adminDeleteBookingAction(bk.id);
                      }}
                    >
                      <button type="submit" className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.08)", color: "#94A3B8", border: "1px solid #1E293B" }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
