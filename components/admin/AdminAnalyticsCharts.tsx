"use client";

import { useState } from "react";
import {
  AreaChart, Area,
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
  MapPin,
  Star,
  ShieldCheck,
  Zap,
  Layers,
  BarChart3,
} from "lucide-react";

const ACCENT_BLUE = "#2563EB";
const ACCENT_GREEN = "#2D9E6B";
const ACCENT_AMBER = "#D97706";
const ACCENT_PURPLE = "#7C3AED";
const ACCENT_ORANGE = "#EA580C";

const PIE_COLORS = [
  "#2563EB", "#2D9E6B", "#D97706", "#7C3AED", "#EA580C",
  "#DB2777", "#0891B2", "#0D9488", "#65A30D", "#DC2626",
];

const tickStyle = { fill: "#1E293B", fontSize: 12, fontWeight: 700 };
const gridStyle = { stroke: "#CBD5E1", strokeDasharray: "3 3" };

function LightTooltip({
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
    <div className="rounded-2xl p-4 text-xs shadow-xl bg-white border border-slate-300 font-sans">
      <p className="mb-2 font-800 text-[#0F2540] border-b border-slate-200 pb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-5 py-1 text-xs font-700" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span className="font-800 text-slate-900">{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 bg-emerald-50 border border-emerald-200 text-[#2D9E6B]">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-800 text-lg text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-600 font-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AdminAnalyticsCharts({
  data,
  range,
  isSuperAdmin = false,
}: {
  data: {
    monthlyRevenue: MonthlyRevenuePoint[];
    leadFill: LeadFillPoint[];
    subjectDemand: SubjectDemandPoint[];
    classDemand: ClassDemandPoint[];
    modeBreakdown: ModeBreakdownPoint[];
    cityDistribution: CityDistributionPoint[];
    ratingDistribution: RatingDistributionPoint[];
    subAdminActivity: SubAdminActivityPoint[];
  };
  range: string;
  isSuperAdmin?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"revenue" | "leads" | "demographics" | "subadmins">("revenue");

  return (
    <div className="space-y-6">
      {/* Tab Controls & CSV Export Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "revenue", label: "Financials & Revenue", icon: TrendingUp },
            { id: "leads", label: "Lead Matching Engine", icon: Zap },
            { id: "demographics", label: "Tutors & Geographic Insights", icon: MapPin },
            { id: "subadmins", label: "Sub-Admin Audit Metrics", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#2D9E6B] !text-white shadow-xs"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <Icon size={16} className={isActive ? "!text-white" : "text-slate-700"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CSV Exporters (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton action={exportUsersCsv} label="Users CSV" />
            <ExportCsvButton action={exportLeadsCsv} label="Leads CSV" />
            <ExportCsvButton action={exportPaymentsCsv} label="Payments CSV" />
            <ExportCsvButton action={exportTutorRatingsCsv} label="Ratings CSV" />
          </div>
        )}
      </div>

      {/* TAB 1: Financials & Revenue */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            <SectionHeader
              icon={TrendingUp}
              title="Monthly Revenue & Coin Sales (GMV)"
              subtitle="Coin purchases and estimated gross merchandise volume in INR over time"
            />
            <div className="h-80 w-full min-h-[320px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthlyRevenue ?? []}>
                  <defs>
                    <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT_GREEN} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ACCENT_GREEN} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT_BLUE} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ACCENT_BLUE} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="month" {...tickStyle} />
                  <YAxis {...tickStyle} />
                  <Tooltip content={<LightTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10, fontWeight: 700 }} />
                  <Area
                    type="monotone"
                    dataKey="coinSales"
                    name="Coins Purchased"
                    stroke={ACCENT_BLUE}
                    fillOpacity={1}
                    fill="url(#coinGrad)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="gmvInr"
                    name="Est. GMV (₹)"
                    stroke={ACCENT_GREEN}
                    fillOpacity={1}
                    fill="url(#gmvGrad)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Lead Matching Engine */}
      {activeTab === "leads" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            <SectionHeader
              icon={Zap}
              title="Subject Requirement Demand"
              subtitle="Most requested subject categories by parents"
            />
            <div className="h-72 w-full min-h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.subjectDemand ?? []} layout="vertical">
                  <CartesianGrid {...gridStyle} />
                  <XAxis type="number" {...tickStyle} />
                  <YAxis dataKey="subject" type="category" width={72} {...tickStyle} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar dataKey="count" name="Requirements" fill={ACCENT_AMBER} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            <SectionHeader
              icon={Layers}
              title="Class Level Distribution"
              subtitle="Breakdown of student enquiries by school board grade"
            />
            <div className="h-72 w-full min-h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.classDemand ?? []}
                    dataKey="count"
                    nameKey="classLevel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={3}
                    label
                  >
                    {(data?.classDemand ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<LightTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Demographics */}
      {activeTab === "demographics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            <SectionHeader
              icon={MapPin}
              title="Top Tuition Cities"
              subtitle="Geographic concentration of student requirement posts"
            />
            <div className="h-72 w-full min-h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.cityDistribution ?? []}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="city" {...tickStyle} />
                  <YAxis {...tickStyle} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar dataKey="leads" name="Leads" fill={ACCENT_BLUE} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
            <SectionHeader
              icon={Star}
              title="Verified Tutor Rating Spread"
              subtitle="Distribution of reviews left by parents"
            />
            <div className="h-72 w-full min-h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.ratingDistribution ?? []}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="stars" {...tickStyle} />
                  <YAxis {...tickStyle} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar dataKey="count" name="Reviews" fill={ACCENT_ORANGE} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Sub-Admin Audit Metrics */}
      {activeTab === "subadmins" && (
        <div className="rounded-3xl bg-white p-4 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <SectionHeader
            icon={ShieldCheck}
            title="Sub-Admin Team Governance Audit"
            subtitle="Actions taken per team member for operational compliance"
          />
          <div className="h-80 w-full min-h-[320px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subAdminActivity ?? []}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="subAdminName" {...tickStyle} />
                <YAxis {...tickStyle} />
                <Tooltip content={<LightTooltip />} />
                <Bar dataKey="actionCount" name="Governance Actions" fill={ACCENT_GREEN} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
