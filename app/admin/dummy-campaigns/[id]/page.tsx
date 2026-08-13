import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Send, Play, Pause, Square, Zap } from "lucide-react";
import { DummyCampaignLogs } from "@/components/admin/DummyCampaignLogs";
import { DummyCampaignDetailActions } from "@/components/admin/DummyCampaignDetailActions";

export const metadata = { title: "Campaign Detail — Admin | ApnaTutorHub" };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Draft",     color: "#64748B", bg: "#F1F5F9" },
  ACTIVE:    { label: "Active",    color: "#16A34A", bg: "#F0FDF4" },
  PAUSED:    { label: "Paused",    color: "#D97706", bg: "#FFFBEB" },
  STOPPED:   { label: "Stopped",   color: "#DC2626", bg: "#FEF2F2" },
  COMPLETED: { label: "Completed", color: "#7C3AED", bg: "#F5F3FF" },
};

const TARGET_LABELS: Record<string, string> = {
  ALL_TUTORS: "All Tutors",
  NEW_7D:     "New (last 7 days)",
  NEW_14D:    "New (last 14 days)",
  NEW_30D:    "New (last 30 days)",
  VERIFIED:   "Verified Tutors",
  UNVERIFIED: "Unverified Tutors",
  SUBSCRIBED: "Subscribed (Paid)",
  FREE_TIER:  "Free Tier",
  CUSTOM:     "Custom Selection",
};

export default async function DummyCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  const { id } = await params;

  const campaign = await prisma.dummyCampaign.findUnique({
    where: { id },
    include: {
      _count: { select: { logs: true } },
    },
  });

  if (!campaign) notFound();

  // Per-day stats for this campaign
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLogs = await prisma.campaignDeliveryLog.findMany({
    where: { campaignId: id, sentAt: { gte: thirtyDaysAgo } },
    select: { sentAt: true, status: true, channel: true },
  });

  const sc = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;

  // Daily breakdown
  const dailyMap: Record<string, { sent: number; failed: number }> = {};
  for (const log of recentLogs) {
    const key = log.sentAt.toISOString().slice(0, 10);
    if (!dailyMap[key]) dailyMap[key] = { sent: 0, failed: 0 };
    if (log.status === "SENT") dailyMap[key].sent++;
    else dailyMap[key].failed++;
  }

  const channelMap: Record<string, number> = {};
  for (const log of recentLogs) {
    if (log.status === "SENT") channelMap[log.channel] = (channelMap[log.channel] ?? 0) + 1;
  }

  const deliveryRate = campaign.totalSent + campaign.totalFailed > 0
    ? ((campaign.totalSent / (campaign.totalSent + campaign.totalFailed)) * 100).toFixed(1)
    : "—";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/dummy-campaigns"
          className="mt-1 flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors shrink-0"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{campaign.name}</h1>
            <span
              className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider"
              style={{ background: sc.bg, color: sc.color }}
            >
              {sc.label}
            </span>
          </div>
          {campaign.description && (
            <p className="text-sm text-slate-500 mt-1">{campaign.description}</p>
          )}
        </div>
        {/* Action buttons (client component) */}
        <DummyCampaignDetailActions campaignId={id} status={campaign.status as any} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Sent",     value: campaign.totalSent.toLocaleString(),        color: "#16A34A" },
          { label: "Total Failed",   value: campaign.totalFailed.toLocaleString(),       color: "#DC2626" },
          { label: "Delivery Rate",  value: deliveryRate === "—" ? "—" : `${deliveryRate}%`, color: "#0EA5E9" },
          { label: "Total Log Rows", value: campaign._count.logs.toLocaleString(),       color: "#8B5CF6" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{kpi.label}</p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Send size={14} className="text-emerald-500" /> Campaign Settings
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
          {[
            { label: "Target Group",   value: TARGET_LABELS[campaign.targetGroup] ?? campaign.targetGroup },
            { label: "Channels",       value: campaign.channels.join(", ") || "—" },
            { label: "Leads / Day",    value: `${campaign.leadsPerDay} per tutor` },
            { label: "Budget Range",   value: `₹${campaign.budgetMin.toLocaleString("en-IN")} – ₹${campaign.budgetMax.toLocaleString("en-IN")}/mo` },
            { label: "Total Limit",    value: campaign.totalLimit ? campaign.totalLimit.toLocaleString() : "Unlimited" },
            { label: "Randomize",      value: campaign.randomizeDaily ? "Yes (daily rotation)" : "No (fixed)" },
            { label: "Start Date",     value: campaign.startDate ? new Date(campaign.startDate).toLocaleDateString("en-IN") : "Immediate" },
            { label: "End Date",       value: campaign.endDate ? new Date(campaign.endDate).toLocaleDateString("en-IN") : "No end date" },
            { label: "Last Run",       value: campaign.lastRunAt ? new Date(campaign.lastRunAt).toLocaleString("en-IN") : "Never" },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{row.label}</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{row.value}</p>
            </div>
          ))}
        </div>

        {/* Override Subjects */}
        {campaign.overrideSubjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Override Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.overrideSubjects.map((s) => (
                <span key={s} className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar if limited */}
        {campaign.totalLimit && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-bold">Progress</span>
              <span>{campaign.totalSent.toLocaleString()} / {campaign.totalLimit.toLocaleString()} sends ({((campaign.totalSent / campaign.totalLimit) * 100).toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((campaign.totalSent / campaign.totalLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Channel Breakdown */}
      {Object.keys(channelMap).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Channel Breakdown (Last 30 Days)</h2>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(channelMap).map(([ch, count]) => (
              <div key={ch} className="flex-1 min-w-24 text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{ch}</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Delivery Logs</h2>
        <DummyCampaignLogs campaignId={id} />
      </div>
    </div>
  );
}
