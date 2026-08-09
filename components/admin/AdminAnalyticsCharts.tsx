"use client";

import { useState } from "react";
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type {
  MonthlyRevenuePoint,
  LeadFillPoint,
  SubjectDemandPoint,
  ClassDemandPoint,
  ModeBreakdownPoint,
  CityDistributionPoint,
  RatingDistributionPoint,
  SubAdminActivityPoint,
} from "@/app/actions/analytics.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import {
  exportPaymentsCsv,
  exportLeadsCsv,
  exportUsersCsv,
  exportTutorRatingsCsv,
} from "@/app/actions/analytics.actions";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  MapPin,
  Star,
  Users,
  ShieldCheck,
  Zap,
  Calendar,
  Layers,
} from "lucide-react";

const ACCENT_BLUE = "#3B82F6";
const ACCENT_GREEN = "#22C55E";
const ACCENT_AMBER = "#F59E0B";
const ACCENT_RED = "#EF4444";
const ACCENT_PURPLE = "#A855F7";
const ACCENT_ORANGE = "#FB923C";

const PIE_COLORS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#FB923C",
  "#EC4899", "#06B6D4", "#14B8A6", "#84CC16", "#EF4444",
];

const tickStyle = { fill: "#64748B", fontSize: 11 };
const gridStyle = { stroke: "#1E293B", strokeDasharray: "3 3" };

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-2xl"
      style={{ background: "#0F172A", border: "1px solid #334155", fontFamily: "'Fira Code', monospace" }}
    >
      <p className="mb-2 font-bold text-white border-b border-slate-800 pb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-4 py-0.5" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span className="font-extrabold">{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
        style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
      >
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AdminAnalyticsCharts({
  monthlyRevenue,
  leadFill,
  subjectDemand,
  classDemand,
  modeBreakdown,
  cityDistribution,
  ratingDistribution,
  subAdminActivity,
}: {
  monthlyRevenue: MonthlyRevenuePoint[];
  leadFill: LeadFillPoint[];
  subjectDemand: SubjectDemandPoint[];
  classDemand: ClassDemandPoint[];
  modeBreakdown: ModeBreakdownPoint[];
  cityDistribution: CityDistributionPoint[];
  ratingDistribution: RatingDistributionPoint[];
  subAdminActivity: SubAdminActivityPoint[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "tutors" | "subadmins">("overview");

  return (
    <div className="space-y-8">
      {/* Tab Controls & CSV Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0F172A] p-3 border border-[#1E293B]">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#22C55E] text-[#0F172A] shadow-md"
                : "bg-[#1E293B] text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp size={15} />
            <span>Financials & Revenue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
              activeTab === "leads"
                ? "bg-[#3B82F6] text-white shadow-md"
                : "bg-[#1E293B] text-slate-400 hover:text-white"
            }`}
          >
            <Zap size={15} />
            <span>Lead Matching Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tutors")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
              activeTab === "tutors"
                ? "bg-[#A855F7] text-white shadow-md"
                : "bg-[#1E293B] text-slate-400 hover:text-white"
            }`}
          >
            <Users size={15} />
            <span>Tutors & Geographic Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subadmins")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
              activeTab === "subadmins"
                ? "bg-[#F59E0B] text-[#0F172A] shadow-md"
                : "bg-[#1E293B] text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck size={15} />
            <span>Sub-Admin Audit Metrics</span>
          </button>
        </div>

        {/* Quick CSV Exporters */}
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton label="Users CSV" action={exportUsersCsv} />
          <ExportCsvButton label="Leads CSV" action={exportLeadsCsv} />
          <ExportCsvButton label="Payments CSV" action={exportPaymentsCsv} />
          <ExportCsvButton label="Ratings CSV" action={exportTutorRatingsCsv} />
        </div>
      </div>

      {/* ── TAB 1: FINANCIALS & REVENUE OVERVIEW ───────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Revenue Area Chart */}
          <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <SectionHeader
                icon={TrendingUp}
                title="Monthly Revenue & Coin Sales (GMV)"
                subtitle="Coin purchases and estimated gross merchandise volume in INR over time"
                accent={ACCENT_GREEN}
              />
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT_GREEN} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={ACCENT_GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT_BLUE} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={ACCENT_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={tickStyle} />
                <YAxis yAxisId="left" tick={tickStyle} />
                <YAxis yAxisId="right" orientation="right" tick={tickStyle} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 12, paddingTop: 10 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="coinSales"
                  name="Coins Purchased"
                  stroke={ACCENT_BLUE}
                  fillOpacity={1}
                  fill="url(#colorCoins)"
                  strokeWidth={2.5}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="gmvInr"
                  name="Est. GMV (₹)"
                  stroke={ACCENT_GREEN}
                  fillOpacity={1}
                  fill="url(#colorGmv)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── TAB 2: LEAD MATCHING ENGINE ANALYTICS ─────────────────────────── */}
      {activeTab === "leads" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Lead Fill Rate Stacked Bar */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={BarChart3}
                title="Lead Fulfillment Engine"
                subtitle="Filled vs Expired leads per month"
                accent={ACCENT_BLUE}
              />
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leadFill} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="month" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 11 }} />
                    <Bar dataKey="filled" name="Filled Leads" fill={ACCENT_GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expired" name="Expired Leads" fill={ACCENT_RED} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mode Distribution Donut Chart */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={PieIcon}
                title="Class Delivery Mode Breakdown"
                subtitle="Home Tuition (Offline) vs Online Classes vs Flexible"
                accent={ACCENT_AMBER}
              />
              <div className="mt-6 flex items-center justify-between gap-4">
                <ResponsiveContainer width="55%" height={240}>
                  <PieChart>
                    <Pie
                      data={modeBreakdown}
                      dataKey="count"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {modeBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {modeBreakdown.map((m, i) => (
                    <div key={m.mode} className="rounded-xl bg-[#1E293B] p-3 text-xs flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className="font-bold text-slate-300">{m.mode}</span>
                      </div>
                      <span className="font-extrabold text-white text-sm">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subject & Class Demand Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top 10 Subject Demand */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={PieIcon}
                title="Top 10 Most Demanded Subjects"
                subtitle="Student lead volume per academic subject"
                accent={ACCENT_PURPLE}
              />
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={subjectDemand} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis type="number" tick={tickStyle} />
                    <YAxis dataKey="subject" type="category" tick={tickStyle} width={90} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="Leads Posted" fill={ACCENT_PURPLE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Class Level Breakdown */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={Layers}
                title="Class Level Demand Breakdown"
                subtitle="Requirement distribution across Grade levels"
                accent={ACCENT_ORANGE}
              />
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={classDemand} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="classLevel" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="Tuition Inquiries" fill={ACCENT_ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: TUTORS & GEOGRAPHIC INSIGHTS ────────────────────────────── */}
      {activeTab === "tutors" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Demand Cities */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={MapPin}
                title="Top Demand Cities"
                subtitle="Lead density per metro city"
                accent={ACCENT_BLUE}
              />
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cityDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="city" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="leads" name="Active Leads" fill={ACCENT_BLUE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
              <SectionHeader
                icon={Star}
                title="Tutor Rating Breakdown"
                subtitle="Distribution of reviews across rating stars"
                accent={ACCENT_AMBER}
              />
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ratingDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="stars" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="Tutors" fill={ACCENT_AMBER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SUB-ADMIN AUDIT PERFORMANCE ───────────────────────────── */}
      {activeTab === "subadmins" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0F172A] p-6 border border-[#1E293B]">
            <SectionHeader
              icon={ShieldCheck}
              title="Sub-Admin Department Activity Metrics"
              subtitle="Total governance actions performed per sub-admin account"
              accent={ACCENT_AMBER}
            />

            <div className="mt-6">
              {subAdminActivity.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500 py-10 text-center">
                  No sub-admin accounts registered yet. Create sub-admins in the Sub-Admins module.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subAdminActivity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="subAdminName" tick={tickStyle} />
                    <YAxis tick={tickStyle} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="actionCount" name="Audit Actions Performed" fill={ACCENT_AMBER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
