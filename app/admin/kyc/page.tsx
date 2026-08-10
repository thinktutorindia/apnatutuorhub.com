import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePresignedViewUrl } from "@/lib/s3";
import {
  ShieldCheck,
  FileText,
  Camera,
  MapPin,
  Star,
  Clock,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { KycRowActions } from "@/components/admin/KycRowActions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "KYC Approval Queue — Admin" };

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const statusFilter = (params.status as "PENDING" | "APPROVED" | "REJECTED") ?? "PENDING";

  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.tutorProfile.count({ where: { kycStatus: "PENDING" } }),
    prisma.tutorProfile.count({ where: { kycStatus: "APPROVED" } }),
    prisma.tutorProfile.count({ where: { kycStatus: "REJECTED" } }),
  ]);

  const tutors = await prisma.tutorProfile.findMany({
    where: { kycStatus: statusFilter },
    orderBy: { updatedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
    },
  });

  const tutorsWithUrls = await Promise.all(
    tutors.map(async (t) => {
      const [idUrl, addressUrl, selfieUrl] = await Promise.all([
        t.kycIdProofUrl ? generatePresignedViewUrl(t.kycIdProofUrl).catch(() => null) : null,
        t.kycAddressUrl ? generatePresignedViewUrl(t.kycAddressUrl).catch(() => null) : null,
        t.kycSelfieUrl ? generatePresignedViewUrl(t.kycSelfieUrl).catch(() => null) : null,
      ]);
      return { ...t, idUrl, addressUrl, selfieUrl };
    })
  );

  const STATUS_TABS: { label: string; value: string; count: number }[] = [
    { label: "Pending Verification", value: "PENDING", count: pendingCount },
    { label: "Verified Tutors ✅", value: "APPROVED", count: approvedCount },
    { label: "Rejected Applications", value: "REJECTED", count: rejectedCount },
  ];

  return (
    <div className="space-y-6 text-slate-900 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">KYC Verification Governance</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Identity &amp; Government ID Review Queue
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Review uploaded government ID proofs and live selfies to grant verified badges and rank tutors higher
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-4 py-2 rounded-2xl text-xs font-800 bg-amber-100 text-amber-950 border border-amber-300">
            {pendingCount} Applications Await Review
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2.5">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/kyc?status=${tab.value}`}
              className={`px-5 py-3 rounded-2xl text-xs font-800 transition-all border flex items-center gap-2 ${
                isActive
                  ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-800 ${
                isActive ? "bg-white text-[#2D9E6B]" : "bg-slate-100 text-slate-800 border border-slate-300"
              }`}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Tutor Submissions List */}
      {tutorsWithUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 bg-white border border-slate-200 shadow-xs text-center">
          <ShieldCheck size={44} className="text-slate-400" />
          <p className="text-base font-800 text-[#0F2540]">
            No {statusFilter.toLowerCase()} KYC submissions in queue
          </p>
          <p className="text-xs font-600 text-slate-600 max-w-sm">
            Tutor verification applications will appear here in real time as tutors upload their identity documents.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {tutorsWithUrls.map((tutor) => (
            <div
              key={tutor.id}
              className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4"
            >
              {/* Tutor info header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#0F2540] text-white font-800 text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {(tutor.user.name || tutor.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-800 text-base text-[#0F2540]">{tutor.user.name || "Tutor Profile"}</h3>
                      {tutor.user.phone && (
                        <a
                          href={`https://wa.me/91${tutor.user.phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(tutor.user.name || "Tutor")},%20this%20is%20ApnaTutorHub%20Support%20regarding%20your%20KYC%20verification.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-full text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 hover:bg-emerald-200 transition-colors"
                        >
                          <MessageCircle size={12} />
                          <span>WhatsApp Outreach</span>
                        </a>
                      )}
                    </div>
                    <p className="text-xs font-600 text-slate-600">
                      {tutor.user.email} {tutor.user.phone ? `· +91 ${tutor.user.phone}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-700 text-slate-700">
                  <div className="text-right">
                    <p className="text-xs font-800 text-[#2D9E6B]">
                      {tutor.experience ?? 0} yrs exp
                    </p>
                    <div className="flex items-center justify-end gap-1 text-amber-500 font-800">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span>{tutor.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 font-600">
                    <Clock size={14} />
                    <span>{new Date(tutor.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              {/* Tutor details row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <p className="text-[10px] font-800 uppercase tracking-wider text-slate-900">
                    Subjects Taught
                  </p>
                  <p className="text-xs font-700 text-slate-900 truncate">
                    {tutor.subjects.slice(0, 4).join(", ") || "None specified"}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <p className="text-[10px] font-800 uppercase tracking-wider text-slate-900">
                    Class Levels
                  </p>
                  <p className="text-xs font-700 text-slate-900 truncate">
                    {tutor.classLevels.slice(0, 4).join(", ") || "None specified"}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <p className="text-[10px] font-800 uppercase tracking-wider text-slate-900">
                    Location
                  </p>
                  <p className="text-xs font-700 text-slate-900 flex items-center gap-1 truncate">
                    <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
                    {[tutor.city, tutor.state].filter(Boolean).join(", ") || "Location Private"}
                  </p>
                </div>
              </div>

              {/* KYC Document Links */}
              <div className="px-6 space-y-2">
                <p className="text-[10px] font-800 uppercase tracking-wider text-slate-900">
                  Uploaded Identity Verification Files
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Government ID Proof", url: tutor.idUrl, icon: FileText },
                    { label: "Address Proof", url: tutor.addressUrl, icon: MapPin },
                    { label: "Live Selfie Card", url: tutor.selfieUrl, icon: Camera },
                  ].map(({ label, url, icon: Icon }) => (
                    <div key={label}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#2D9E6B] text-xs font-800 hover:bg-emerald-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon size={16} className="text-[#2D9E6B] shrink-0" />
                            <span className="truncate">{label}</span>
                          </div>
                          <ExternalLink size={14} className="shrink-0" />
                        </a>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-700 flex items-center gap-2">
                          <Icon size={16} />
                          <span>{label} Not Uploaded</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection note (if any) */}
              {tutor.kycRejectionNote && (
                <div className="mx-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs space-y-1">
                  <p className="font-800 text-red-950 uppercase tracking-wider text-[10px]">
                    Admin Rejection Note:
                  </p>
                  <p className="font-700 text-slate-800">&quot;{tutor.kycRejectionNote}&quot;</p>
                </div>
              )}

              {/* Actions */}
              {statusFilter === "PENDING" && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <KycRowActions tutorProfileId={tutor.id} tutorName={tutor.user.name || tutor.user.email} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
