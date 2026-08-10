import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import {
  BookOpen,
  Clock,
  IndianRupee,
  MapPin,
  Pencil,
  PlusCircle,
  Users,
  ChevronRight,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CloseLeadButton } from "@/components/parent/CloseLeadButton";
import {
  LEAD_STATUS_FILTERS,
  type LeadStatusKey,
} from "@/lib/validations";

export const metadata = {
  title: "My Requirements | ApnaTutorHub",
};

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

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">My Tuition Listings</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Posted Tuition Requirements
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Manage active requirement posts, review tutor profiles, and close listings when filled
          </p>
        </div>
        <Link
          href="/parent/post-requirement"
          className="px-5 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 shadow-md transition-all flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle size={16} />
          <span>New Requirement</span>
        </Link>
      </div>

      {params.posted && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-800">
          ✓ Requirement posted successfully! We are notifying matching tutors near you.
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/parent/my-leads"
          className={`px-4 py-2.5 rounded-2xl text-xs font-800 transition-all border ${
            activeFilter === null
              ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
          }`}
        >
          All Postings
        </Link>
        {LEAD_STATUS_FILTERS.map((s) => {
          const isActive = activeFilter === s;
          return (
            <Link
              key={s}
              href={`/parent/my-leads?status=${s}`}
              className={`px-4 py-2.5 rounded-2xl text-xs font-800 transition-all border ${
                isActive
                  ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {s.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      {/* Leads List */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 bg-white border border-slate-200 text-center shadow-xs">
          <BookOpen size={40} className="text-slate-400" />
          <h3 className="text-base font-800 text-[#0F2540]">No tuition requirements found</h3>
          <p className="text-xs font-600 text-slate-600 max-w-sm">
            You don&apos;t have any tuition requirements under this filter status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => {
            const applicantCount = lead._count.purchases;
            return (
              <div
                key={lead.id}
                className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-800 text-[#0F2540]">
                        {lead.subjects.join(", ")}
                      </h2>
                      <span className="px-3 py-0.5 rounded-full text-xs font-800 bg-blue-100 text-blue-950 border border-blue-300">
                        {lead.classLevel}
                      </span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs font-700 text-slate-600 flex items-center gap-1">
                      <MapPin size={14} className="text-[#2D9E6B]" />
                      {[lead.area, lead.city].filter(Boolean).join(", ") || "Location Private"} · {lead.mode}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/parent/my-leads/${lead.id}/applicants`}
                      className="px-4 py-2 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 shadow-md flex items-center gap-1"
                    >
                      <Users size={15} />
                      <span>{applicantCount} {applicantCount === 1 ? "Applicant" : "Applicants"}</span>
                      <ChevronRight size={14} />
                    </Link>

                    {lead.status !== "CLOSED" && lead.status !== "COMPLETED" && (
                      <CloseLeadButton leadId={lead.id} />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-700 text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-800 uppercase text-slate-900">Budget</span>
                    <p className="font-800 text-slate-900">₹{lead.budgetMin || 0} - ₹{lead.budgetMax || "Negotiable"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-800 uppercase text-slate-900">Board</span>
                    <p className="font-800 text-slate-900">{lead.board || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-800 uppercase text-slate-900">Max Tutors Limit</span>
                    <p className="font-800 text-slate-900">{lead.maxTutors} Tutors</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-800 uppercase text-slate-900">Posted Date</span>
                    <p className="font-800 text-slate-900">{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
