import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileText,
  Search,
  X,
  Clock,
  MapPin,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import {
  forceCloseLeadAction,
  forceExpireLeadAction,
  forceRadiusExpandAction,
} from "@/app/actions/admin.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportLeadsCsv } from "@/app/actions/analytics.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead Management — Admin" };

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,0.12)", text: "#22C55E" },
  MATCHING: { bg: "rgba(59,130,246,0.12)", text: "#3B82F6" },
  APPLICATIONS_RECEIVED: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
  BOOKED: { bg: "rgba(139,92,246,0.12)", text: "#8B5CF6" },
  COMPLETED: { bg: "rgba(6,182,212,0.12)", text: "#06B6D4" },
  EXPIRED: { bg: "rgba(100,116,139,0.12)", text: "#64748B" },
  CLOSED: { bg: "rgba(239,68,68,0.12)", text: "#EF4444" },
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 15;
  const skip = (page - 1) * take;

  const where = {
    AND: [
      statusFilter ? { status: statusFilter as "ACTIVE" | "MATCHING" | "APPLICATIONS_RECEIVED" | "BOOKED" | "COMPLETED" | "EXPIRED" | "CLOSED" } : {},
      q
        ? {
          OR: [
            { city: { contains: q, mode: "insensitive" as const } },
            { area: { contains: q, mode: "insensitive" as const } },
            { classLevel: { contains: q, mode: "insensitive" as const } },
          ],
        }
        : {},
    ],
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        subjects: true,
        classLevel: true,
        mode: true,
        status: true,
        coinCost: true,
        purchaseCount: true,
        maxTutors: true,
        radiusKm: true,
        city: true,
        area: true,
        createdAt: true,
        expiresAt: true,
        parentProfile: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);
  const ALL_STATUSES = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED", "BOOKED", "COMPLETED", "EXPIRED", "CLOSED"];

  return (
    <div style={{ color: "#F8FAFC" }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            Lead Management
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
            {total.toLocaleString()} total leads
          </p>
        </div>
        <ExportCsvButton label="Export CSV" action={exportLeadsCsv} />
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "#0F172A", border: "1px solid #1E293B", minWidth: "180px" }}
        >
          <Search size={14} style={{ color: "#475569" }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="City, area, class…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-white outline-none"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E293B" }}>
                {["Lead", "Parent", "Status", "Purchases", "Radius", "Expires", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm" style={{ color: "#334155" }}>No leads found</td>
                </tr>
              ) : leads.map((lead, i) => {
                const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE.CLOSED;
                const isOpen = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"].includes(lead.status);
                return (
                  <tr key={lead.id} className="transition-colors hover:bg-white/[0.03]" style={{ borderBottom: i < leads.length - 1 ? "1px solid #0F172A" : undefined }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: "#22C55E", flexShrink: 0 }} />
                        <div>
                          <p className="font-medium text-white">{lead.subjects.slice(0, 2).join(", ")}</p>
                          <p className="text-xs" style={{ color: "#475569" }}>
                            {lead.classLevel} · {lead.mode} · {lead.coinCost} coins
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-white">{lead.parentProfile.user.name || "—"}</p>
                      <p className="text-xs" style={{ color: "#475569" }}>{lead.parentProfile.user.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.text }}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-white">{lead.purchaseCount}</span>
                        <span className="text-xs" style={{ color: "#334155" }}>/ {lead.maxTutors}</span>
                      </div>
                      <div className="mt-1 h-1 w-16 overflow-hidden rounded-full" style={{ background: "#1E293B" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(lead.purchaseCount / lead.maxTutors) * 100}%`, background: "#22C55E" }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-sm text-white">
                        <MapPin size={11} style={{ color: "#22C55E" }} />
                        {lead.radiusKm} km
                      </span>
                      <p className="text-xs" style={{ color: "#475569" }}>{[lead.city, lead.area].filter(Boolean).join(", ") || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {lead.expiresAt ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: new Date(lead.expiresAt) < new Date() ? "#EF4444" : "#475569" }}>
                          <Clock size={10} />
                          {new Date(lead.expiresAt).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isOpen && (
                        <div className="flex flex-wrap gap-1.5">
                          <form
                            action={async () => {
                              "use server";
                              await forceCloseLeadAction(lead.id);
                            }}
                          >
                            <button type="submit" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                              <X size={10} /> Close
                            </button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await forceExpireLeadAction(lead.id);
                            }}
                          >
                            <button type="submit" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold" style={{ background: "rgba(100,116,139,0.12)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" }}>
                              <Clock size={10} /> Expire
                            </button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await forceRadiusExpandAction(lead.id);
                            }}
                          >
                            <button type="submit" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
                              <Maximize2 size={10} /> +5 km
                            </button>
                          </form>
                        </div>
                      )}
                      {!isOpen && (
                        <Link
                          href={`/admin/users?q=${lead.parentProfile.user.email}`}
                          className="flex items-center gap-1 text-xs" style={{ color: "#334155" }}
                        >
                          <RefreshCw size={10} /> View Parent
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderTop: "1px solid #1E293B" }}>
            <p className="text-xs" style={{ color: "#475569" }}>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page - 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1E293B", color: "#94A3B8" }}>
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page + 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
