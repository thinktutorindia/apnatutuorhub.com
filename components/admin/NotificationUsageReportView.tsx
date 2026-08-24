"use client";

import React, { useState, useTransition } from "react";
import {
  Mail,
  MessageSquare,
  Smartphone,
  Send,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
  Calendar,
  AlertOctagon,
  Download,
  Info,
  Zap,
  Lock,
  X,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { type NotificationUsageReport, type ChannelUsageMetric } from "@/lib/notification-usage";
import { updateNotificationLimitsAction } from "@/app/actions/notification.actions";
import { useRouter } from "next/navigation";

interface Props {
  initialReport: NotificationUsageReport;
}

export function NotificationUsageReportView({ initialReport }: Props) {
  const [report, setReport] = useState<NotificationUsageReport>(initialReport);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"TODAY" | "YESTERDAY" | "WEEK" | "MONTH">("TODAY");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

  // Settings form state
  const [formLimits, setFormLimits] = useState({
    LIMIT_EMAIL_DAILY: initialReport.channels.EMAIL.dailyLimit,
    LIMIT_EMAIL_MONTHLY: initialReport.channels.EMAIL.monthlyLimit,
    LIMIT_WHATSAPP_DAILY: initialReport.channels.WHATSAPP.dailyLimit,
    LIMIT_WHATSAPP_MONTHLY: initialReport.channels.WHATSAPP.monthlyLimit,
    LIMIT_PUSH_DAILY: initialReport.channels.PUSH.dailyLimit,
    LIMIT_PUSH_MONTHLY: initialReport.channels.PUSH.monthlyLimit,
    LIMIT_SMS_DAILY: initialReport.channels.SMS.dailyLimit,
    LIMIT_SMS_MONTHLY: initialReport.channels.SMS.monthlyLimit,
  });

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateNotificationLimitsAction(formLimits);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setIsSettingsOpen(false);
          router.refresh();
        }, 1200);
      }
    });
  };

  const channelsList = Object.values(report.channels);

  // Total sends based on active timeframe
  const totalDispatchedInTimeframe = channelsList.reduce((sum, ch) => {
    if (selectedTimeframe === "TODAY") return sum + ch.sentToday;
    if (selectedTimeframe === "YESTERDAY") return sum + ch.sentYesterday;
    if (selectedTimeframe === "WEEK") return sum + ch.sentThisWeek;
    return sum + ch.sentThisMonth;
  }, 0);

  const totalFailedInTimeframe = channelsList.reduce((sum, ch) => {
    if (selectedTimeframe === "TODAY") return sum + ch.failedCountToday;
    return sum + ch.failedCountThisMonth;
  }, 0);

  const overallSuccessRate =
    totalDispatchedInTimeframe + totalFailedInTimeframe > 0
      ? Math.round((totalDispatchedInTimeframe / (totalDispatchedInTimeframe + totalFailedInTimeframe)) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* ── Top Alert Banner (if approaching or hitting limits) ───────────────── */}
      {report.hasQuotaWarnings && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border-2 border-amber-300/80 shadow-md space-y-2 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-amber-200/80 text-amber-900 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-950">
                  Notification Quota Limit Warning
                </h4>
                <div className="space-y-1">
                  {report.warningMessages.map((msg, idx) => (
                    <p key={idx} className="text-xs font-semibold text-amber-900 leading-relaxed">
                      {msg}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
            >
              Adjust Limit Caps
            </button>
          </div>
        </div>
      )}

      {/* ── Subheader & Controls ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Communication Quota &amp; Daily Usage Monitor
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time track of sent volume, daily tier limits, and provider plan capacities
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            {(
              [
                { key: "TODAY", label: "Today (Live)" },
                { key: "YESTERDAY", label: "Yesterday" },
                { key: "WEEK", label: "Last 7 Days" },
                { key: "MONTH", label: "Last 30 Days" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTimeframe(t.key)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedTimeframe === t.key
                    ? "bg-white text-[#0F2540] shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>Configure Quotas</span>
          </button>
        </div>
      </div>

      {/* ── 4 Channel Quota Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {channelsList.map((ch) => {
          const isEmail = ch.channel === "EMAIL";
          const isWA = ch.channel === "WHATSAPP";
          const isPush = ch.channel === "PUSH";
          const isSms = ch.channel === "SMS";

          const currentSent =
            selectedTimeframe === "TODAY"
              ? ch.sentToday
              : selectedTimeframe === "YESTERDAY"
              ? ch.sentYesterday
              : selectedTimeframe === "WEEK"
              ? ch.sentThisWeek
              : ch.sentThisMonth;

          const limit = selectedTimeframe === "MONTH" ? ch.monthlyLimit : ch.dailyLimit;
          const pct = Math.min(100, Math.round((currentSent / limit) * 100));

          const statusColor =
            ch.healthStatus === "CRITICAL"
              ? "bg-rose-500"
              : ch.healthStatus === "WARNING"
              ? "bg-amber-500"
              : "bg-[#2D9E6B]";

          const badgeBg =
            ch.healthStatus === "CRITICAL"
              ? "bg-rose-100 text-rose-800 border-rose-200"
              : ch.healthStatus === "WARNING"
              ? "bg-amber-100 text-amber-900 border-amber-200"
              : "bg-emerald-100 text-emerald-900 border-emerald-200";

          return (
            <div
              key={ch.channel}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-2xl ${
                        isEmail
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : isWA
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : isPush
                          ? "bg-purple-50 text-purple-600 border border-purple-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}
                    >
                      {isEmail && <Mail size={18} />}
                      {isWA && <MessageSquare size={18} />}
                      {isPush && <Send size={18} />}
                      {isSms && <Smartphone size={18} />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#0F2540]">{ch.label}</h3>
                      <p className="text-[10px] font-semibold text-slate-400">{ch.providerName}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}>
                    {ch.healthStatus}
                  </span>
                </div>

                {/* Sent Counter vs Quota */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-[#0F2540]">
                      {currentSent.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      Cap: {limit.toLocaleString("en-IN")} {selectedTimeframe === "MONTH" ? "/mo" : "/day"}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1.5">
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>{pct}% of quota used</span>
                      <span className="text-slate-400">
                        {Math.max(0, limit - currentSent).toLocaleString("en-IN")} remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary breakdown metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Today Sent</span>
                    <span className="font-bold text-slate-800">{ch.sentToday.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">This Month</span>
                    <span className="font-bold text-slate-800">{ch.sentThisMonth.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Failed (24h)</span>
                    <span className={`font-bold ${ch.failedCountToday > 0 ? "text-rose-600" : "text-slate-600"}`}>
                      {ch.failedCountToday}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Monthly Failed</span>
                    <span className={`font-bold ${ch.failedCountThisMonth > 0 ? "text-rose-600" : "text-slate-600"}`}>
                      {ch.failedCountThisMonth}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Extend / Upgrade Limit */}
              <div className="pt-3 border-t border-slate-100">
                {ch.providerUpgradeUrl.startsWith("http") ? (
                  <a
                    href={ch.providerUpgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-2xs cursor-pointer text-center"
                  >
                    <span>Extend / Buy Limits</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer text-center"
                  >
                    <span>Set Daily Limit</span>
                    <SlidersHorizontal size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Daily Sending Trend (Last 14 Days Visual Breakdown) ────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-[#0F2540] text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
              Daily Sending Volume History (Last 14 Days)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Hover over each day to inspect email, WhatsApp, and Web Push message distribution
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Email
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> WhatsApp
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Push
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-3">
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-44 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
            {report.dailyHistory.map((day) => {
              const maxVol = Math.max(
                10,
                ...report.dailyHistory.map((d) => d.totalSent)
              );
              const heightPct = Math.max(6, Math.round((day.totalSent / maxVol) * 100));

              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col z-30 bg-slate-900 text-white rounded-xl p-2 text-[10px] font-medium shadow-xl whitespace-nowrap">
                    <span className="font-extrabold text-emerald-400">{day.displayDate} ({day.date})</span>
                    <span>Total Sent: {day.totalSent}</span>
                    <span>📧 Email: {day.emailSent}</span>
                    <span>💬 WhatsApp: {day.whatsappSent}</span>
                    <span>🔔 Push: {day.pushSent}</span>
                    <span>Success: {day.successRate}%</span>
                  </div>

                  <div className="text-[10px] font-extrabold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.totalSent}
                  </div>

                  {/* Stacked Bar */}
                  <div
                    className="w-full max-w-[28px] bg-gradient-to-t from-blue-600 via-emerald-500 to-purple-500 rounded-xl transition-all group-hover:scale-105 shadow-2xs"
                    style={{ height: `${heightPct}%` }}
                  />

                  <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                    {day.displayDate.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Category Consumption Breakdown ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#0F2540] text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                What&apos;s Consuming Your Notification Quota?
              </h3>
              <p className="text-xs text-slate-500 font-medium">Breakdown by system event trigger</p>
            </div>
            <span className="text-xs font-bold text-slate-400">Monthly Share</span>
          </div>

          <div className="space-y-2.5">
            {report.categoryBreakdown.slice(0, 8).map((cat) => (
              <div key={cat.type} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{cat.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">{cat.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {cat.countToday} sent today • {cat.countThisMonth} this month
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
                    <div className="bg-[#2D9E6B] h-full rounded-full" style={{ width: `${cat.percent}%` }} />
                  </div>
                  <span className="text-xs font-black text-[#0F2540] w-10 text-right">{cat.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Upgrade & Action Box */}
        <div className="bg-gradient-to-br from-[#0F2540] via-[#163558] to-[#0A192F] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Zap size={14} /> High-Capacity Infrastructure
            </div>
            <h3 className="text-lg font-black" style={{ fontFamily: "Poppins, sans-serif" }}>
              Need to send more than 10,000+ daily notifications?
            </h3>
            <p className="text-xs text-slate-300 font-normal leading-relaxed">
              When your lead volume scales, increase your Resend monthly tier or upgrade your Meta WhatsApp Business API from Tier 1 to Tier 2 (10,000 unique contacts/day).
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="https://resend.com/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full py-2.5 px-4 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>Upgrade Resend Email Plan</span>
              <ExternalLink size={13} />
            </a>
            <a
              href="https://business.facebook.com/wa/manage/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <span>Meta WhatsApp Tier Settings</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Day-by-Day Historical Log Table ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-[#0F2540] text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
              Daily Dispatch &amp; Quota Consumption History
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Audit log of daily sends across all providers
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">📧 Email Sent</th>
                <th className="py-3 px-4">💬 WhatsApp Sent</th>
                <th className="py-3 px-4">🔔 Web Push</th>
                <th className="py-3 px-4">Total Sent</th>
                <th className="py-3 px-4">Delivery Rate</th>
                <th className="py-3 px-4">Daily Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {report.dailyHistory.map((day) => (
                <tr key={day.date} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#0F2540]">
                    {day.displayDate} <span className="text-[10px] text-slate-400 font-normal">({day.date})</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold">{day.emailSent}</span>
                    {day.emailFailed > 0 && (
                      <span className="text-[10px] text-rose-600 font-bold ml-1">({day.emailFailed} fail)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold">{day.whatsappSent}</td>
                  <td className="py-3 px-4 font-bold">{day.pushSent}</td>
                  <td className="py-3 px-4 font-extrabold text-[#0F2540]">{day.totalSent}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      {day.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 size={12} className="text-[#2D9E6B]" /> Within Cap
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Configure Limits Modal ────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#2D9E6B]" />
                <h3 className="font-black text-[#0F2540] text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Configure Quota &amp; Threshold Caps
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLimits} className="p-6 space-y-4 text-xs">
              <p className="text-slate-500 font-medium">
                Set the expected daily and monthly message limits for each provider. The dashboard uses these thresholds to alert you when reaching 75% and 90% capacity.
              </p>

              {saveSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#2D9E6B]" />
                  <span>Quota limits updated successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    📧 Resend Daily Email Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_EMAIL_DAILY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_EMAIL_DAILY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    📧 Resend Monthly Plan Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_EMAIL_MONTHLY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_EMAIL_MONTHLY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    💬 WhatsApp Daily Tier Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_WHATSAPP_DAILY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_WHATSAPP_DAILY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    💬 WhatsApp Monthly Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_WHATSAPP_MONTHLY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_WHATSAPP_MONTHLY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    🔔 Web Push Daily Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_PUSH_DAILY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_PUSH_DAILY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    📱 SMS / OTP Daily Cap
                  </label>
                  <input
                    type="number"
                    value={formLimits.LIMIT_SMS_DAILY}
                    onChange={(e) =>
                      setFormLimits({ ...formLimits, LIMIT_SMS_DAILY: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-[#2D9E6B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Quota Limits</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
