import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePresignedViewUrl } from "@/lib/s3";
import {
  ShieldCheck,
  ShieldX,
  FileText,
  Camera,
  MapPin,
  Star,
  Clock,
} from "lucide-react";
import { approveKycAction, rejectKycAction } from "@/app/actions/admin.actions";

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

  const tutors = await prisma.tutorProfile.findMany({
    where: { kycStatus: statusFilter },
    orderBy: { updatedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
    },
  });

  // Resolve S3 pre-signed view URLs for each tutor (15-min links)
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

  const STATUS_TABS: { label: string; value: string; color: string }[] = [
    { label: "Pending", value: "PENDING", color: "#F59E0B" },
    { label: "Approved", value: "APPROVED", color: "#22C55E" },
    { label: "Rejected", value: "REJECTED", color: "#EF4444" },
  ];

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
          KYC Approval Queue
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
          Review uploaded identity documents and approve or reject tutor verification
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab.value}
            href={`/admin/kyc?status=${tab.value}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
            style={
              statusFilter === tab.value
                ? { background: `${tab.color}22`, color: tab.color, border: `1px solid ${tab.color}44` }
                : { background: "#0F172A", color: "#475569", border: "1px solid #1E293B" }
            }
          >
            {tab.label}
          </a>
        ))}
      </div>

      {tutorsWithUrls.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl py-20"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <ShieldCheck size={40} style={{ color: "#1E293B" }} />
          <p className="text-sm font-medium" style={{ color: "#334155" }}>
            No {statusFilter.toLowerCase()} KYC submissions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutorsWithUrls.map((tutor) => (
            <div
              key={tutor.id}
              className="overflow-hidden rounded-2xl"
              style={{ background: "#0F172A", border: "1px solid #1E293B" }}
            >
              {/* Tutor info header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid #1E293B" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}
                  >
                    {(tutor.user.name || tutor.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tutor.user.name || "—"}</p>
                    <p className="text-xs" style={{ color: "#475569" }}>{tutor.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold" style={{ color: "#22C55E" }}>
                      {tutor.experience ?? 0} yrs exp
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      <Star size={10} style={{ color: "#F59E0B" }} />
                      <span className="text-xs" style={{ color: "#F59E0B" }}>
                        {tutor.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                    <Clock size={10} />
                    {new Date(tutor.updatedAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Tutor details row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-3" style={{ borderBottom: "1px solid #0F172A" }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                    Subjects
                  </p>
                  <p className="mt-1 text-sm text-white">{tutor.subjects.slice(0, 3).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                    Class Levels
                  </p>
                  <p className="mt-1 text-sm text-white">{tutor.classLevels.slice(0, 3).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                    Location
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-white">
                    <MapPin size={12} style={{ color: "#22C55E" }} />
                    {[tutor.city, tutor.state].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4" style={{ borderBottom: "1px solid #1E293B" }}>
                {[
                  { label: "ID Proof", url: tutor.idUrl, icon: FileText },
                  { label: "Address Proof", url: tutor.addressUrl, icon: MapPin },
                  { label: "Selfie", url: tutor.selfieUrl, icon: Camera },
                ].map(({ label, url, icon: Icon }) => (
                  <div key={label}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                      {label}
                    </p>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}
                      >
                        <Icon size={14} />
                        View Document
                      </a>
                    ) : (
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm"
                        style={{ background: "#1E293B", color: "#334155" }}
                      >
                        <Icon size={14} />
                        Not uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rejection note (if any) */}
              {tutor.kycRejectionNote && (
                <div className="mx-5 mb-3 mt-3 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#EF4444", fontFamily: "'Fira Code', monospace" }}>
                    Rejection Note
                  </p>
                  <p className="mt-1 text-sm text-white">{tutor.kycRejectionNote}</p>
                </div>
              )}

              {/* Actions */}
              {statusFilter === "PENDING" && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <form
                    action={async () => {
                      "use server";
                      await approveKycAction(tutor.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] hover:opacity-90"
                      style={{ background: "#22C55E", color: "#0F172A" }}
                    >
                      <ShieldCheck size={14} />
                      Approve KYC
                    </button>
                  </form>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await rejectKycAction(formData);
                    }}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input type="hidden" name="tutorProfileId" value={tutor.id} />
                    <input
                      name="rejectionNote"
                      required
                      placeholder="Rejection reason (required)…"
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                      style={{ background: "#1E293B", border: "1px solid #334155" }}
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <ShieldX size={14} />
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
