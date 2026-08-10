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
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  forceCloseLeadAction,
  forceExpireLeadAction,
  forceRadiusExpandAction,
  adminDeleteLeadAction,
} from "@/app/actions/admin.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportLeadsCsv } from "@/app/actions/analytics.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead Management — Admin" };

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300" },
  MATCHING: { bg: "bg-blue-100", text: "text-blue-950", border: "border-blue-300" },
  APPLICATIONS_RECEIVED: { bg: "bg-amber-100", text: "text-amber-950", border: "border-amber-300" },
  BOOKED: { bg: "bg-purple-100", text: "text-purple-950", border: "border-purple-300" },
  COMPLETED: { bg: "bg-teal-100", text: "text-teal-950", border: "border-teal-300" },
  EXPIRED: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  CLOSED: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300" },
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
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Student Lead Management</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Student Tuition Enquiries
          </h1>
          <p className="text-xs text-slate-600 font-600">
            {total.toLocaleString("en-IN")} total parent tuition requirement posts
          </p>
        </div>
        <ExportCsvButton label="Export Leads CSV" action={exportLeadsCsv} />
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-slate-50 border border-slate-300 min-w-[200px]">
          <Search size={16} className="text-slate-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by city, area, class level..."
            className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-500"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-2xl px-4 py-2.5 text-xs font-800 bg-slate-50 border border-slate-300 text-slate-900 outline-none"
        >
          <option value="">All Lead Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="rounded-2xl px-6 py-2.5 text-xs font-800 bg-[#2D9E6B] text-white hover:bg-[#238357] transition-all cursor-pointer">
          Filter Leads
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Lead & Subjects", "Parent", "Status", "Purchases", "Radius / City", "Expires", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-800 uppercase tracking-wider text-slate-900">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-700 text-slate-700">No leads match your filter</td>
                </tr>
              ) : leads.map((lead) => {
                const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE.CLOSED;
                const isOpen = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"].includes(lead.status);
                return (
                  <tr key={lead.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 text-[#2D9E6B] flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="font-800 text-[#0F2540] text-sm">{lead.subjects.slice(0, 2).join(", ")}</p>
                          <p className="text-xs font-600 text-slate-600">
                            {lead.classLevel} · {lead.mode} · <strong className="text-emerald-700 font-800">{lead.coinCost} coins</strong>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-800 text-[#0F2540] text-xs">{lead.parentProfile.user.name || "—"}</p>
                      <p className="text-xs font-600 text-slate-600">{lead.parentProfile.user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-800 border ${style.bg} ${style.text} ${style.border}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs font-800 text-[#0F2540]">
                        <span>{lead.purchaseCount}</span>
                        <span className="text-slate-400 font-600">/ {lead.maxTutors}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-[#2D9E6B] rounded-full"
                          style={{ width: `${(lead.purchaseCount / lead.maxTutors) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1 text-xs font-800 text-[#0F2540]">
                        <MapPin size={12} className="text-[#2D9E6B]" />
                        {lead.radiusKm} km
                      </span>
                      <p className="text-xs font-600 text-slate-600">{[lead.city, lead.area].filter(Boolean).join(", ") || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      {lead.expiresAt ? (
                        <span className={`flex items-center gap-1 text-xs font-700 ${new Date(lead.expiresAt) < new Date() ? "text-red-700 font-800" : "text-slate-700"}`}>
                          <Clock size={12} />
                          {new Date(lead.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      ) : (
                        <span className="text-xs font-600 text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isOpen && (
                          <>
                            <form
                              action={async () => {
                                "use server";
                                await forceCloseLeadAction(lead.id);
                              }}
                            >
                              <button type="submit" className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-800 bg-red-100 text-red-950 border border-red-300 hover:bg-red-200 cursor-pointer">
                                <X size={11} /> Close
                              </button>
                            </form>
                            <form
                              action={async () => {
                                "use server";
                                await forceExpireLeadAction(lead.id);
                              }}
                            >
                              <button type="submit" className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-800 bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 cursor-pointer">
                                <Clock size={11} /> Expire
                              </button>
                            </form>
                            <form
                              action={async () => {
                                "use server";
                                await forceRadiusExpandAction(lead.id);
                              }}
                            >
                              <button type="submit" className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-800 bg-emerald-100 text-emerald-950 border border-emerald-300 hover:bg-emerald-200 cursor-pointer">
                                <Maximize2 size={11} /> +5km
                              </button>
                            </form>
                          </>
                        )}
                        <form
                          action={async () => {
                            "use server";
                            await adminDeleteLeadAction(lead.id);
                          }}
                        >
                          <button type="submit" className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-800 bg-red-100 text-red-950 border border-red-300 hover:bg-red-200 cursor-pointer">
                            <Trash2 size={11} /> Delete
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-700 text-slate-700">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page - 1}`} className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-slate-900 font-800 hover:bg-slate-100">
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page + 1}`} className="rounded-xl px-4 py-2 bg-[#2D9E6B] text-white font-800 hover:bg-[#238357]">
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
