"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall, LayoutDashboard, FileText, Upload, UserPlus,
  BarChart3, Zap, Sparkles, HelpCircle, Phone, ArrowRight,
  ShieldCheck, CheckCircle2, ChevronRight, Activity
} from "lucide-react";
import { StaffLeadsFeatureGuide } from "./StaffLeadsFeatureGuide";

export type StaffLeadsNavKey =
  | "desk"
  | "my-leads"
  | "my-dashboard"
  | "manage"
  | "assign"
  | "upload"
  | "reports";

interface Props {
  activeKey?: StaffLeadsNavKey;
  onLaunchDialer?: () => void;
  onlineCount?: number;
  totalLeads?: number;
  title?: string;
  subtitle?: string;
  isSuperAdmin?: boolean;
  compact?: boolean;
}

const NAV_ITEMS: Array<{
  key: StaffLeadsNavKey;
  href: string;
  label: string;
  badge?: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
}> = [
  {
    key: "my-leads",
    href: "/admin/staff-leads/my-leads",
    label: "Calling Desk",
    badge: "Speed Dial",
    icon: PhoneCall,
    description: "High-speed dialer, call queue & instant call logging",
  },
  {
    key: "my-dashboard",
    href: "/admin/staff-leads/my-dashboard",
    label: "Performance Hub",
    icon: LayoutDashboard,
    description: "Daily calling targets, streak, callback reminders & sales playbook",
  },
  {
    key: "desk",
    href: "/admin/staff-leads",
    label: "Admin Lead Ingestion",
    icon: Phone,
    description: "Main workspace, filters, search & bulk operations",
    adminOnly: true,
  },
  {
    key: "manage",
    href: "/admin/staff-leads/manage",
    label: "Batch & Pipeline Ops",
    icon: FileText,
    description: "Funnel stages, progression & lead status flow",
    adminOnly: true,
  },
  {
    key: "assign",
    href: "/admin/staff-leads/assign",
    label: "Auto-Distribute",
    icon: UserPlus,
    description: "Fair-share distribution & team lead balancing",
    adminOnly: true,
  },
  {
    key: "upload",
    href: "/admin/staff-leads/upload",
    label: "Bulk Upload",
    icon: Upload,
    description: "CSV / Excel importer with automatic deduplication",
    adminOnly: true,
  },
  {
    key: "reports",
    href: "/admin/staff-leads/reports",
    label: "Timesheet Reports",
    icon: BarChart3,
    description: "Call volume, team throughput & conversion analytics",
    adminOnly: true,
  },
];

export function StaffLeadsNavHeader({
  activeKey,
  onLaunchDialer,
  onlineCount,
  totalLeads,
  title,
  subtitle,
  isSuperAdmin = false,
  compact = false,
}: Props) {
  const pathname = usePathname();
  const [showGuide, setShowGuide] = useState(false);

  // Determine current key from pathname if not provided
  const currentKey = activeKey || (
    pathname === "/admin/staff-leads/my-leads" ? "my-leads"
    : pathname === "/admin/staff-leads/my-dashboard" ? "my-dashboard"
    : pathname === "/admin/staff-leads/manage" ? "manage"
    : pathname === "/admin/staff-leads/assign" ? "assign"
    : pathname === "/admin/staff-leads/upload" ? "upload"
    : pathname === "/admin/staff-leads/reports" ? "reports"
    : "desk"
  );

  const visibleNavItems = NAV_ITEMS.filter((item) => isSuperAdmin || !item.adminOnly);

  // Compact Mode for High-Efficiency Calling Desks (Zero Wasted Vertical Space)
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-2xl border border-slate-200/90 shadow-2xs mb-2.5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F2540] to-[#1E3A8A] text-amber-400 flex items-center justify-center font-black shadow-xs shrink-0">
            <PhoneCall size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#0F2540] tracking-tight">Staff CRM Suite</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full border border-emerald-300/40">
                Calling Console
              </span>
            </div>
            {totalLeads !== undefined && (
              <span className="text-[10px] text-slate-400 font-semibold">{totalLeads} leads loaded</span>
            )}
          </div>
        </div>

        {/* Cohesive Navigation Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all group ${
                  isActive
                    ? "bg-[#0F2540] text-white shadow-xs font-black"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                title={item.description}
              >
                <Icon
                  size={13}
                  className={`transition-transform group-hover:scale-110 ${
                    isActive ? "text-[#F5A623]" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-[#F5A623] text-slate-950" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200/60"
            title="Learn how staff leads features work"
          >
            <HelpCircle size={13} className="text-amber-500" />
            <span>Guide</span>
          </button>
        </div>

        <StaffLeadsFeatureGuide
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          onLaunchDialer={onLaunchDialer}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* ── Top Header Hero ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F2540] via-[#162D4A] to-[#0F2540] p-5 sm:p-6 text-white relative overflow-hidden shadow-sm">
        {/* Subtle Background Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#F5A623] bg-[#F5A623]/15 border border-[#F5A623]/30 px-2.5 py-0.5 rounded-full">
                Staff CRM Suite
              </span>
              {onlineCount !== undefined && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount} telecaller{onlineCount === 1 ? "" : "s"} active
                </span>
              )}
              {totalLeads !== undefined && (
                <span className="text-[10px] font-semibold text-white/60 bg-white/5 px-2 py-0.5 rounded-full">
                  {totalLeads.toLocaleString()} leads in database
                </span>
              )}
            </div>

            <h1
              className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              <span>{title || "Calling Desk & Telecalling Operations"}</span>
            </h1>
            <p className="text-xs text-white/70 mt-1 font-medium max-w-2xl leading-relaxed">
              {subtitle ||
                "Raw data in → telecaller connects & classifies → teachers go to User Directory, parents go to Student Leads."}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 cursor-pointer backdrop-blur-xs"
              title="Learn how staff leads features work"
            >
              <HelpCircle size={14} className="text-amber-400" />
              <span>How It Works</span>
            </button>

            {onLaunchDialer && (
              <button
                type="button"
                onClick={onLaunchDialer}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                title="Launch high-speed dialer on current leads"
              >
                <Zap size={14} className="fill-slate-950" />
                <span>⚡ Power Dial Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cohesive Navigation Tab Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-1.5 flex items-center gap-1 overflow-x-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all group cursor-pointer ${
                isActive
                  ? "bg-[#0F2540] text-white shadow-xs font-black"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title={item.description}
            >
              <Icon
                size={14}
                className={`transition-transform group-hover:scale-110 ${
                  isActive ? "text-[#F5A623]" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-[#F5A623] text-slate-950"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Feature Guide Modal */}
      <StaffLeadsFeatureGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onLaunchDialer={onLaunchDialer}
      />
    </div>
  );
}
