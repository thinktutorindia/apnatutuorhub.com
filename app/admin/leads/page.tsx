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
  Phone,
  Send,
  IndianRupee,
  Calendar,
  Sparkles,
  User,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import {
  forceCloseLeadAction,
  forceExpireLeadAction,
  forceRadiusExpandAction,
  adminDeleteLeadAction,
} from "@/app/actions/admin.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportLeadsCsv } from "@/app/actions/analytics.actions";
import { CreateLeadModal } from "@/components/admin/CreateLeadModal";
import { SendLeadToTutorModal } from "@/components/admin/SendLeadToTutorModal";
import { maskPhoneNumber } from "@/lib/mask-utils";
import { UserSubjectChips } from "@/components/admin/UserSubjectChips";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead Management — Admin" };

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-900 font-extrabold", border: "border-emerald-300" },
  MATCHING: { bg: "bg-blue-50", text: "text-blue-900 font-extrabold", border: "border-blue-300" },
  APPLICATIONS_RECEIVED: { bg: "bg-amber-50", text: "text-amber-900 font-extrabold", border: "border-amber-300" },
  BOOKED: { bg: "bg-purple-50", text: "text-purple-900 font-extrabold", border: "border-purple-300" },
  COMPLETED: { bg: "bg-teal-50", text: "text-teal-900 font-extrabold", border: "border-teal-300" },
  EXPIRED: { bg: "bg-slate-100", text: "text-slate-700 font-bold", border: "border-slate-300" },
  CLOSED: { bg: "bg-red-50", text: "text-red-900 font-extrabold", border: "border-red-300" },
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 15;
  const skip = (page - 1) * take;

  const where = {
    AND: [
      statusFilter
        ? {
            status: statusFilter as
              | "ACTIVE"
              | "MATCHING"
              | "APPLICATIONS_RECEIVED"
              | "BOOKED"
              | "COMPLETED"
              | "EXPIRED"
              | "CLOSED",
          }
        : {},
      q
        ? {
            OR: [
              { city: { contains: q, mode: "insensitive" as const } },
              { area: { contains: q, mode: "insensitive" as const } },
              { classLevel: { contains: q, mode: "insensitive" as const } },
              { subjects: { hasSome: [q] } },
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
        board: true,
        mode: true,
        budgetMin: true,
        budgetMax: true,
        city: true,
        area: true,
        pincode: true,
        timingPreference: true,
        tutorGenderPref: true,
        languagePref: true,
        notes: true,
        status: true,
        coinCost: true,
        purchaseCount: true,
        maxTutors: true,
        radiusKm: true,
        createdAt: true,
        expiresAt: true,
        parentProfile: {
          select: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);
  const ALL_STATUSES = [
    "ACTIVE",
    "MATCHING",
    "APPLICATIONS_RECEIVED",
    "BOOKED",
    "COMPLETED",
    "EXPIRED",
    "CLOSED",
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2D9E6B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Student Lead Management
            </span>
          </div>
          <h1
            className="text-2xl font-black text-[#0F2540]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Student Tuition Enquiries
          </h1>
          <p className="text-xs text-slate-600 font-semibold">
            {total.toLocaleString("en-IN")} total parent tuition requirement posts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CreateLeadModal />
          {isSuperAdmin && (
            <ExportCsvButton label="Export Leads CSV" action={exportLeadsCsv} />
          )}
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="flex flex-wrap gap-3 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs"
      >
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-slate-50 border border-slate-300 min-w-0 w-full sm:min-w-[200px] sm:flex-1">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by city, area, class, subjects..."
            className="flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-2xl px-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-300 text-slate-900 outline-none cursor-pointer"
        >
          <option value="">All Lead Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          Filter Leads
        </button>
        {(q || statusFilter) && (
          <Link
            href="/admin/leads"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
          >
            <X size={13} /> Reset
          </Link>
        )}
      </form>

      {/* Leads Table */}
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200">
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-900 w-72">
                  Enquiry &amp; Subjects
                </th>
                <th className="px-4 py-4 font-black uppercase tracking-wider text-slate-900 w-44">
                  Budget &amp; Fees
                </th>
                <th className="px-4 py-4 font-black uppercase tracking-wider text-slate-900 w-52">
                  Location &amp; Mode
                </th>
                <th className="px-4 py-4 font-black uppercase tracking-wider text-slate-900 w-48">
                  Parent / Client
                </th>
                <th className="px-4 py-4 font-black uppercase tracking-wider text-slate-900 w-36">
                  Status &amp; Slots
                </th>
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-900 text-right">
                  Actions &amp; Dispatch
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm font-bold text-slate-600 space-y-2"
                  >
                    <FileText size={36} className="text-slate-300 mx-auto" />
                    <p>No student requirements match your search filter</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE.CLOSED;
                  const isOpen = [
                    "ACTIVE",
                    "MATCHING",
                    "APPLICATIONS_RECEIVED",
                  ].includes(lead.status);

                  const rawPhone = lead.parentProfile?.user?.phone;
                  const displayPhone = rawPhone
                    ? isSuperAdmin
                      ? rawPhone
                      : maskPhoneNumber(rawPhone)
                    : null;

                  const leadCode = lead.id
                    .replace(/\D/g, "")
                    .slice(-6) || lead.id.slice(-6).toUpperCase();

                  const slotsLeft = Math.max(0, lead.maxTutors - lead.purchaseCount);

                  return (
                    <tr
                      key={lead.id}
                      className="transition-colors hover:bg-slate-50/90 align-top"
                    >
                      {/* 1. Enquiry & Subjects */}
                      <td className="px-5 py-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-[#0F2540] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            #{leadCode}
                          </span>
                          <span className="text-[11px] font-bold text-[#0F2540]">
                            {lead.classLevel}
                            {lead.board ? ` · ${lead.board}` : ""}
                          </span>
                        </div>

                        {/* Subject Chips */}
                        <div className="pt-0.5">
                          <UserSubjectChips subjects={lead.subjects} maxVisible={4} />
                        </div>

                        {lead.notes && (
                          <p className="text-[11px] font-medium text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-200/80 line-clamp-2">
                            &quot;{lead.notes}&quot;
                          </p>
                        )}
                      </td>

                      {/* 2. Budget & Fees */}
                      <td className="px-4 py-4 space-y-1.5">
                        <div className="font-black text-sm text-[#0F2540] flex items-center gap-1">
                          <IndianRupee size={14} className="text-[#2D9E6B] shrink-0" />
                          <span>
                            {lead.budgetMin && lead.budgetMax
                              ? `₹${lead.budgetMin.toLocaleString("en-IN")} – ₹${lead.budgetMax.toLocaleString("en-IN")}`
                              : lead.budgetMin
                              ? `₹${lead.budgetMin.toLocaleString("en-IN")}/mo`
                              : lead.budgetMax
                              ? `Up to ₹${lead.budgetMax.toLocaleString("en-IN")}`
                              : "Negotiable"}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          per month
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                            <Coins size={11} className="text-amber-600" />
                            <span>{lead.coinCost} coins to unlock</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. Location & Mode */}
                      <td className="px-4 py-4 space-y-1.5">
                        {lead.mode === "ONLINE" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-teal-50 text-teal-900 px-2.5 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                            <Sparkles size={12} className="text-teal-600" />
                            <span>Online Classes (Pan-India)</span>
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                              <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
                              <span className="truncate">
                                {[lead.area, lead.city].filter(Boolean).join(", ") || "Delhi NCR"}
                              </span>
                            </div>
                            {lead.pincode && (
                              <p className="text-[11px] font-semibold text-slate-500 pl-4">
                                Pin: {lead.pincode}
                              </p>
                            )}
                            <div className="pl-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                                {lead.mode === "OFFLINE" ? "Home Tuition" : "Home / Online"} · {lead.radiusKm} km radius
                              </span>
                            </div>
                          </div>
                        )}

                        {lead.timingPreference && (
                          <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 pt-0.5">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{lead.timingPreference}</span>
                          </p>
                        )}
                      </td>

                      {/* 4. Parent / Client */}
                      <td className="px-4 py-4 space-y-1">
                        <p className="font-bold text-[#0F2540] text-xs">
                          {lead.parentProfile?.user?.name || "Verified Parent"}
                        </p>
                        {displayPhone && (
                          <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                            <Phone size={11} className="text-slate-400" />
                            <span>{displayPhone}</span>
                            {isSuperAdmin && rawPhone && (
                              <a
                                href={`https://wa.me/91${rawPhone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 transition-colors ml-0.5"
                                title="Open WhatsApp Chat with Parent"
                              >
                                <MessageCircle size={12} />
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 truncate">
                          {lead.parentProfile?.user?.email}
                        </p>
                        {lead.tutorGenderPref && lead.tutorGenderPref !== "ANY" && (
                          <span className="inline-block text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 mt-0.5">
                            {lead.tutorGenderPref === "FEMALE" ? "Female Tutor Pref" : "Male Tutor Pref"}
                          </span>
                        )}
                      </td>

                      {/* 5. Status & Slots */}
                      <td className="px-4 py-4 space-y-2">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-[11px] border shadow-2xs ${style.bg} ${style.text} ${style.border}`}
                        >
                          {lead.status}
                        </span>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#0F2540]">
                            <span>{lead.purchaseCount}/{lead.maxTutors} claimed</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              {slotsLeft > 0 ? `${slotsLeft} left` : "Full"}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-[#2D9E6B] to-emerald-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (lead.purchaseCount / lead.maxTutors) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Actions & Dispatch */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-end gap-1.5">
                          <SendLeadToTutorModal
                            leadId={lead.id}
                            leadTitle={`${lead.classLevel} - ${lead.subjects.join(", ")}`}
                            triggerClassName="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                            triggerText="Send to Tutors"
                          />

                          <div className="flex items-center gap-1">
                            {isOpen && (
                              <>
                                <form
                                  action={async () => {
                                    "use server";
                                    await forceRadiusExpandAction(lead.id);
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                                    title="Expand radius by +5km"
                                  >
                                    <Maximize2 size={11} /> +5km
                                  </button>
                                </form>
                                <form
                                  action={async () => {
                                    "use server";
                                    await forceCloseLeadAction(lead.id);
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold bg-red-50 text-red-950 border border-red-300 hover:bg-red-100 cursor-pointer transition-colors shadow-2xs"
                                    title="Force close this requirement"
                                  >
                                    <X size={11} /> Close
                                  </button>
                                </form>
                                <form
                                  action={async () => {
                                    "use server";
                                    await forceExpireLeadAction(lead.id);
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 cursor-pointer transition-colors shadow-2xs"
                                    title="Force expire this requirement"
                                  >
                                    <Clock size={11} /> Expire
                                  </button>
                                </form>
                              </>
                            )}

                            {isSuperAdmin && (
                              <form
                                action={async () => {
                                  "use server";
                                  await adminDeleteLeadAction(lead.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  className="p-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 cursor-pointer transition-colors shadow-2xs"
                                  title="Delete lead permanently (Super Admin)"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-700">
            <p>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page - 1}`}
                  className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-slate-900 font-bold hover:bg-slate-100 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/leads?status=${statusFilter}&q=${q}&page=${page + 1}`}
                  className="rounded-xl px-4 py-2 bg-[#2D9E6B] text-white font-bold hover:bg-[#238357] transition-colors"
                >
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
