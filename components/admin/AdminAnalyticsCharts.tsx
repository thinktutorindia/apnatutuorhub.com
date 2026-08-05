"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type {
  MonthlyRevenuePoint,
  LeadFillPoint,
  SubjectDemandPoint,
} from "@/app/actions/analytics.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportPaymentsCsv, exportLeadsCsv } from "@/app/actions/analytics.actions";
import { TrendingUp, BarChart3, PieChart as PieIcon } from "lucide-react";

const ACCENT_BLUE = "#3B82F6";
const ACCENT_GREEN = "#22C55E";
const ACCENT_ORANGE = "#F59E0B";
const ACCENT_RED = "#EF4444";

const PIE_COLORS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#FB923C",
  "#EC4899", "#06B6D4", "#14B8A6", "#84CC16", "#EF4444",
];

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
    <div className="mb-4 flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Icon size={18} />
      </div>
      <div>
        <h2
          className="text-base font-bold text-white"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

const tickStyle = { fill: "#64748B", fontSize: 11 };
const gridStyle = { stroke: "#1E293B", strokeDasharray: "3 3" };

// Custom Tooltip wrapper for dark theme
function DarkTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-xl"
      style={{ background: "#0F172A", border: "1px solid #334155", fontFamily: "'Fira Code', monospace" }}
    >
      <p className="mb-2 font-bold text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
        </p>
      ))}
    </div>
  );
}

export function AdminAnalyticsCharts({
  monthlyRevenue,
  leadFill,
  subjectDemand,
}: {
  monthlyRevenue: MonthlyRevenuePoint[];
  leadFill: LeadFillPoint[];
  subjectDemand: SubjectDemandPoint[];
}) {
  return (
    <div className="space-y-8">
      {/* ── Row 1: Revenue Line Chart ──────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#0F172A", border: "1px solid #1E293B" }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <SectionHeader
            icon={TrendingUp}
            title="Monthly Revenue & Coin Sales"
            subtitle="Coin purchases & estimated GMV over the last 6 months"
            accent={ACCENT_BLUE}
          />
          <ExportCsvButton label="Export Payments CSV" action={exportPaymentsCsv} />
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="month" tick={tickStyle} />
            <YAxis yAxisId="left" tick={tickStyle} />
            <YAxis yAxisId="right" orientation="right" tick={tickStyle} />
            <Tooltip content={<DarkTooltip />} />
            <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="coinSales"
              name="Coins Sold"
              stroke={ACCENT_BLUE}
              strokeWidth={2.5}
              dot={{ fill: ACCENT_BLUE, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gmvInr"
              name="Est. GMV (₹)"
              stroke={ACCENT_GREEN}
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={{ fill: ACCENT_GREEN, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row 2: Lead Fill Rate Bar Chart + Subject Pie ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar: Lead Fill Rate */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <SectionHeader
              icon={BarChart3}
              title="Lead Matching Fill Rate"
              subtitle="Filled vs. Expired leads per month"
              accent={ACCENT_GREEN}
            />
            <ExportCsvButton label="Export Leads CSV" action={exportLeadsCsv} />
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={leadFill} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={tickStyle} />
              <YAxis tick={tickStyle} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 11 }} />
              <Bar dataKey="filled" name="Filled" fill={ACCENT_GREEN} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expired" name="Expired" fill={ACCENT_RED} radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" name="Total" fill={ACCENT_ORANGE} radius={[4, 4, 0, 0]} fillOpacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Subject Demand */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <SectionHeader
            icon={PieIcon}
            title="Category-wise Lead Demand"
            subtitle="Top 10 subjects by lead count (last 12 months)"
            accent={ACCENT_ORANGE}
          />

          {subjectDemand.length === 0 ? (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-slate-500">No lead data yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={240}>
                <PieChart>
                  <Pie
                    data={subjectDemand}
                    dataKey="count"
                    nameKey="subject"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {subjectDemand.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
                {subjectDemand.map((s, i) => (
                  <div key={s.subject} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate text-slate-300">{s.subject}</span>
                    </div>
                    <span className="shrink-0 font-bold text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
