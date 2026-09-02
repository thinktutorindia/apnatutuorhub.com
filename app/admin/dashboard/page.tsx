import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FileText,
  Wallet,
  Eye,
  MapPin,
} from "lucide-react";
import { getAdminDashboardStats } from "@/app/actions/admin.actions";
import { prisma } from "@/lib/prisma";
import { getInquiryHashTag } from "@/lib/lead-utils";
import { getMediaUrl } from "@/lib/s3";
import { CreateLeadModal } from "@/components/admin/CreateLeadModal";
import { KycRowActions } from "@/components/admin/KycRowActions";
import { AdminBannerSearch } from "@/components/admin/AdminCommandPalette";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview — ApnaTutorHub" };

const LEAD_STATUS: Record<string, string> = {
  ACTIVE: "bg-[#2D9E6B] text-white",
  MATCHING: "bg-[#0F2540] text-white",
  APPLICATIONS_RECEIVED: "bg-[#F5A623] text-[#0F2540]",
  BOOKED: "bg-[#E8F7F0] text-[#238357] border border-emerald-200",
  COMPLETED: "bg-[#EEF3F8] text-[#0F2540] border border-[#CBD5E1]",
  EXPIRED: "bg-slate-100 text-slate-600 border border-slate-200",
  CLOSED: "bg-red-50 text-red-700 border border-red-200",
};

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  badge,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="ath-panel p-5 sm:p-6 h-full min-w-0 block">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[13px] font-700 text-[#64748B]">{title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-2xl sm:text-[28px] font-800 text-[#0F2540] tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {value}
            </p>
            {badge && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs font-600 text-[#64748B]">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0 bg-[#E8F1FB] text-[#2563EB]">
          <Icon size={18} />
        </div>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const stats = await getAdminDashboardStats();
  if (!stats) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [recentLeads, pendingKycTutors, leadsToday] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        inquiryNumber: true,
        classLevel: true,
        subjects: true,
        board: true,
        status: true,
        city: true,
        purchaseCount: true,
        createdAt: true,
        parentProfile: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.tutorProfile.findMany({
      where: { kycStatus: "PENDING" },
      orderBy: { updatedAt: "asc" },
      take: 3,
      select: {
        id: true,
        qualification: true,
        educationCourse: true,
        kycIdProofUrl: true,
        city: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);

  const kycPendingCount = stats.pendingKyc ?? 0;
  const coinsSold = stats.totalCoinsSold ?? 0;
  const estimatedRevenue = Math.round(coinsSold * 1.5);
  return (
    <div className="space-y-5 pb-10 text-slate-900">
      <div className="rounded-[20px] p-5 sm:p-7 bg-[#0F2540] text-white">
        <div className="flex flex-col gap-4">
          <h1
            className="text-xl sm:text-[26px] font-800 tracking-tight min-w-0"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Live Admin Command Center — ApnaTutorHub
          </h1>

          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 min-w-0">
            <div className="w-full lg:flex-1 min-w-0">
              <AdminBannerSearch />
            </div>
            <div className="flex flex-col xs:flex-row flex-wrap items-stretch sm:items-center gap-2 shrink-0">
              <Link
                href="/admin/kyc"
                className="min-h-11 px-4 py-2 rounded-full bg-[#2D9E6B] hover:bg-[#238357] !text-white text-[13px] font-800 inline-flex items-center justify-center"
              >
                KYC Queue{kycPendingCount > 0 ? ` (${kycPendingCount} Pending)` : ""}
              </Link>
              <Link
                href="/admin/notifications/broadcast"
                className="min-h-11 px-4 py-2 rounded-full bg-white !text-[#0F2540] text-[13px] font-800 inline-flex items-center justify-center hover:bg-[#F0F4F8]"
              >
                Broadcast Push
              </Link>
              <CreateLeadModal
                triggerLabel="+ Post Parent Lead"
                triggerClassName="min-h-11 px-4 py-2 rounded-full bg-[#F5A623] hover:bg-[#e8960f] !text-[#0F2540] text-[13px] font-800 inline-flex items-center justify-center w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-700 text-[#7DDBB1]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]" />
            DB: Connected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]" />
            S3: Active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B]" />
            Razorpay: Operational
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Users"
          value={(stats.totalUsers ?? 0).toLocaleString("en-IN")}
          subtitle={`Tutors: ${(stats.totalTutors ?? 0).toLocaleString("en-IN")} • Parents: ${(stats.totalParents ?? 0).toLocaleString("en-IN")}`}
          icon={Users}
          href="/admin/users"
        />
        <KpiCard
          title="KYC Approval Queue"
          value={kycPendingCount}
          subtitle="Aadhaar & degree checks waiting"
          icon={ShieldCheck}
          href="/admin/kyc"
          badge={kycPendingCount > 0 ? "Pending" : "Clear"}
        />
        <KpiCard
          title="Student Requirements"
          value={`${(stats.totalLeads ?? 0).toLocaleString("en-IN")} Total`}
          subtitle={`${leadsToday} Active Today`}
          icon={FileText}
          href="/admin/leads"
        />
        <KpiCard
          title="Platform Coin Sales"
          value={`₹${estimatedRevenue.toLocaleString("en-IN")}`}
          subtitle={`${coinsSold.toLocaleString("en-IN")} Coins Sold`}
          icon={Wallet}
          href="/admin/wallets"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-8 ath-panel min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Live Student Tuition Enquiries
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/leads"
                className="min-h-9 px-3.5 py-1.5 rounded-full bg-white text-xs font-800 !text-[#0F2540] border border-[#CBD5E1] inline-flex items-center hover:bg-[#F0F4F8]"
              >
                Edit
              </Link>
              <Link
                href="/admin/notifications/broadcast"
                className="min-h-9 px-3.5 py-1.5 rounded-full bg-white text-xs font-800 !text-[#0F2540] border border-[#CBD5E1] inline-flex items-center hover:bg-[#F0F4F8]"
              >
                Push Notification
              </Link>
              <Link
                href="/admin/leads"
                className="min-h-9 px-3.5 py-1.5 rounded-full bg-[#0F2540] !text-white text-xs font-800 inline-flex items-center hover:bg-[#1E3A5F]"
              >
                View
              </Link>
            </div>
          </div>

          {recentLeads.length === 0 ? (
            <div className="p-10 text-center text-sm font-600 text-[#64748B]">No parent requirements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="text-[11px] font-800 uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
                    <th className="px-5 sm:px-6 py-3">ID</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Parent</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 sm:px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-[#E2E8F0] last:border-0">
                      <td className="px-5 sm:px-6 py-4 text-xs font-800 text-[#0F2540] whitespace-nowrap">
                        {getInquiryHashTag(lead)}
                      </td>
                      <td className="px-3 py-4 min-w-0">
                        <p className="text-sm font-800 text-[#0F2540]">
                          {lead.classLevel}
                          {lead.board ? ` ${lead.board}` : ""} {lead.subjects.slice(0, 2).join(" & ")}
                        </p>
                        <p className="text-[11px] font-600 text-[#64748B] mt-0.5">
                          {lead.purchaseCount} Tutors Unlocked
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-700 text-[#0F2540]">
                          <MapPin size={12} className="text-[#2D9E6B]" />
                          {lead.city || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs font-700 text-[#0F2540] truncate max-w-[140px]">
                        {lead.parentProfile?.user?.name || "Parent"}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-800 uppercase ${
                            LEAD_STATUS[lead.status] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {lead.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right">
                        <Link
                          href={`/admin/leads?q=${getInquiryHashTag(lead).replace("#", "")}`}
                          className="inline-flex items-center gap-1 min-h-8 px-3 rounded-full text-xs font-800 !text-white bg-[#0F2540] hover:bg-[#1E3A5F]"
                        >
                          <Eye size={13} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="xl:col-span-4 ath-panel p-5 sm:p-6 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Pending Tutor KYC Approvals
            </h2>
            <span className="text-[11px] font-800 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
              {kycPendingCount}
            </span>
          </div>

          {pendingKycTutors.length === 0 ? (
            <p className="text-sm font-600 text-[#64748B] py-8 text-center">No tutors waiting for verification.</p>
          ) : (
            <div className="space-y-4">
              {pendingKycTutors.map((tutor) => {
                const name = tutor.user.name || "Tutor";
                const photo = getMediaUrl(tutor.user.image);
                const docs = [tutor.kycIdProofUrl ? "Aadhaar" : null, tutor.qualification || tutor.educationCourse]
                  .filter(Boolean)
                  .join(" + ");

                return (
                  <div key={tutor.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0]" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#0F2540] text-white flex items-center justify-center text-sm font-800">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-800 text-[#0F2540] truncate">{name}</p>
                        <p className="text-[11px] font-600 text-[#64748B] truncate">
                          {docs || "Documents uploaded"}
                          {tutor.city ? ` · ${tutor.city}` : ""}
                        </p>
                      </div>
                    </div>
                    <KycRowActions tutorProfileId={tutor.id} tutorName={name} compact />
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/admin/kyc" className="block text-center text-sm font-800 !text-[#2D9E6B] pt-1 hover:underline">
            Open full KYC queue
          </Link>
        </section>
      </div>
    </div>
  );
}
