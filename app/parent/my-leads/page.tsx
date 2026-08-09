import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import {
  BookOpen,
  Clock,
  IndianRupee,
  Lock,
  MapPin,
  Pencil,
  PlusCircle,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CloseLeadButton } from "@/components/parent/CloseLeadButton";
import { FormAlert } from "@/components/ui/FieldError";
import {
  LEAD_STATUS_FILTERS,
  LEAD_STATUS_META,
  type LeadStatusKey,
} from "@/lib/validations";

export const metadata = {
  title: "My Requirements | ApnaTutorHub",
};

const CLOSED_STATUSES = new Set<LeadStatusKey>([
  "CLOSED",
  "COMPLETED",
  "EXPIRED",
]);

function formatExpiry(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const msRemaining = expiresAt.getTime() - Date.now();
  if (msRemaining <= 0) return "Expired";
  const hours = Math.floor(msRemaining / (60 * 60 * 1000));
  if (hours < 1) return "Expires in under an hour";
  if (hours < 24) return `Expires in ${hours}h`;
  return `Expires in ${Math.floor(hours / 24)}d`;
}

export default async function MyLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; posted?: string; updated?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!parentProfile) {
    redirect("/parent/dashboard");
  }

  const activeFilter = LEAD_STATUS_FILTERS.includes(params.status as LeadStatusKey)
    ? (params.status as LeadStatusKey)
    : null;

  const [leads, statusCounts] = await Promise.all([
    prisma.lead.findMany({
      where: {
        parentProfileId: parentProfile.id,
        ...(activeFilter ? { status: activeFilter as LeadStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
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
        status: true,
        coinCost: true,
        maxTutors: true,
        purchaseCount: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { purchases: true } },
      },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { parentProfileId: parentProfile.id },
      _count: { _all: true },
    }),
  ]);

  const countByStatus = new Map(
    statusCounts.map((row) => [row.status as LeadStatusKey, row._count._all])
  );
  const totalCount = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="space-y-6 py-4">
      <header className="neu-card flex flex-col gap-4 bg-[#E0F2FE] p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="space-y-2">
          <div className="neu-badge w-fit bg-white text-[#0F172A]">
            <BookOpen size={14} />
            My Requirements
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
            Track every requirement
          </h1>
          <p className="max-w-xl text-sm font-semibold text-slate-700">
            Follow each posting from matching to booking, edit details and review
            the tutors who applied.
          </p>
        </div>
        <Link
          href="/parent/post-requirement"
          className="neu-btn neu-btn-primary shrink-0 px-6 py-3.5 text-sm"
        >
          <PlusCircle size={18} />
          <span>Post New Requirement</span>
        </Link>
      </header>

      {params.posted && (
        <FormAlert
          tone="success"
          message="Requirement posted! We are notifying matching tutors near you."
        />
      )}
      {params.updated && (
        <FormAlert tone="success" message="Requirement updated successfully." />
      )}

      <nav
        aria-label="Filter requirements by status"
        className="flex flex-wrap gap-2"
      >
        <Link
          href="/parent/my-leads"
          aria-current={activeFilter === null ? "page" : undefined}
          className={`rounded-full border-[2.5px] border-[#0F172A] px-4 py-2 text-xs font-extrabold transition-all ${
            activeFilter === null
              ? "bg-[#22C55E] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
              : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
          }`}
        >
          All ({totalCount})
        </Link>
        {LEAD_STATUS_FILTERS.map((status) => {
          const isActive = activeFilter === status;
          return (
            <Link
              key={status}
              href={`/parent/my-leads?status=${status}`}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full border-[2.5px] border-[#0F172A] px-4 py-2 text-xs font-extrabold transition-all ${
                isActive
                  ? "shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              }`}
              style={
                isActive
                  ? { backgroundColor: LEAD_STATUS_META[status].background }
                  : undefined
              }
            >
              {LEAD_STATUS_META[status].label} ({countByStatus.get(status) ?? 0})
            </Link>
          );
        })}
      </nav>

      {leads.length === 0 ? (
        <div className="neu-card space-y-4 bg-white p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#DCFCE7] text-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            📝
          </div>
          <h2 className="text-xl font-black text-[#0F172A]">
            {activeFilter
              ? `No ${LEAD_STATUS_META[activeFilter].label.toLowerCase()} requirements`
              : "No requirements posted yet"}
          </h2>
          <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
            {activeFilter
              ? "Try a different status filter to see your other postings."
              : "Post your first requirement to get matched with verified tutors in your area."}
          </p>
          <Link
            href="/parent/post-requirement"
            className="neu-btn neu-btn-primary inline-flex px-6 py-3 text-sm"
          >
            <PlusCircle size={18} />
            <span>Post Requirement</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {leads.map((lead) => {
            const statusMeta = LEAD_STATUS_META[lead.status as LeadStatusKey];
            const isClosed = CLOSED_STATUSES.has(lead.status as LeadStatusKey);
            const expiryLabel = formatExpiry(lead.expiresAt);

            return (
              <article key={lead.id} className="neu-card space-y-4 bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="neu-badge bg-[#DCFCE7] text-[11px]">
                        {lead.classLevel}
                      </span>
                      {lead.board && (
                        <span className="neu-badge bg-[#F3E8FF] text-[11px]">
                          {lead.board}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-[#0F172A]">
                      {lead.subjects.join(", ")}
                    </h2>
                  </div>
                  <span
                    className="neu-badge shrink-0 text-[11px]"
                    style={{ backgroundColor: statusMeta.background }}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <dl className="space-y-2 border-y-2 border-slate-100 py-3 text-xs font-bold text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>Mode</dt>
                    <dd className="font-black text-[#0F172A]">{lead.mode}</dd>
                  </div>
                  {(lead.budgetMin || lead.budgetMax) && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1">
                        <IndianRupee size={12} /> Budget
                      </dt>
                      <dd className="font-black text-[#22C55E]">
                        ₹{lead.budgetMin ?? 0} – ₹{lead.budgetMax ?? 0} / hr
                      </dd>
                    </div>
                  )}
                  {(lead.city || lead.area) && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1">
                        <MapPin size={12} /> Location
                      </dt>
                      <dd className="font-black text-[#0F172A]">
                        {[lead.area, lead.city].filter(Boolean).join(", ")}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1">
                      <Users size={12} /> Tutors unlocked
                    </dt>
                    <dd className="font-black text-[#0F172A]">
                      {lead._count.purchases} / {lead.maxTutors}
                    </dd>
                  </div>
                  {expiryLabel && !isClosed && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1">
                        <Clock size={12} /> Lifespan
                      </dt>
                      <dd className="font-black text-[#0F172A]">{expiryLabel}</dd>
                    </div>
                  )}
                </dl>

                {lead.purchaseCount > 0 && (
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Lock size={12} />
                    Core details locked — {lead.purchaseCount} tutor
                    {lead.purchaseCount > 1 ? "s" : ""} already paid to unlock this
                    lead.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    href={`/parent/my-leads/${lead.id}/applicants`}
                    className="neu-btn neu-btn-secondary px-4 py-2 text-[11px]"
                  >
                    <Users size={13} />
                    <span>Applicants ({lead._count.purchases})</span>
                  </Link>
                  {!isClosed && (
                    <>
                      <Link
                        href={`/parent/my-leads/${lead.id}/edit`}
                        className="neu-btn neu-btn-white px-4 py-2 text-[11px]"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </Link>
                      <CloseLeadButton leadId={lead.id} />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
