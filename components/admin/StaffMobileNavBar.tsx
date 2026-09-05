"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  TrendingUp,
  FileText,
  Clock,
  Download,
  Menu,
  Play,
  Coffee,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import { usePWAInstall } from "@/components/shared/PWAInstallPrompt";

export function StaffMobileNavBar() {
  const pathname = usePathname();
  const { canInstall, isInstalled, install } = usePWAInstall();

  const shiftStatus = useStaffDutyStore((s) => s.shiftStatus);
  const isShiftActive = shiftStatus === "CLOCKED_IN";
  const isOnBreak = shiftStatus === "ON_BREAK";

  const navItems = [
    {
      href: "/admin/staff-leads/my-leads",
      label: "Calling Desk",
      icon: PhoneCall,
      active: pathname.startsWith("/admin/staff-leads/my-leads"),
      badge: "Calling",
    },
    {
      href: "/admin/staff-leads/my-dashboard",
      label: "Performance",
      icon: TrendingUp,
      active: pathname === "/admin/staff-leads/my-dashboard",
    },
    {
      href: "/admin/leads",
      label: "Leads Feed",
      icon: FileText,
      active: pathname === "/admin/leads",
    },
    {
      href: "/admin/staff-leads",
      label: "Ingestion",
      icon: Clock,
      active: pathname === "/admin/staff-leads",
    },
  ];

  return (
    <nav
      aria-label="Staff Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              item.active
                ? "text-[#16A34A] font-extrabold"
                : "text-slate-500 hover:text-slate-900 font-semibold"
            }`}
          >
            <div className="relative">
              <Icon size={18} strokeWidth={item.active ? 2.5 : 1.75} />
              {item.active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[68px]">
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* PWA Install Button on mobile if not already installed */}
      {canInstall && !isInstalled ? (
        <button
          type="button"
          onClick={install}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-amber-600 font-extrabold cursor-pointer animate-bounce"
          title="Install Web App on Chrome"
        >
          <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-700">
            <Download size={13} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-black">Install</span>
        </button>
      ) : (
        <div className="flex flex-col items-center justify-center py-1 px-2 text-[10px] font-bold text-slate-400">
          <span
            className={`w-2 h-2 rounded-full mb-0.5 ${
              isShiftActive
                ? "bg-emerald-500 animate-pulse"
                : isOnBreak
                ? "bg-amber-500"
                : "bg-slate-300"
            }`}
          />
          <span className="text-[9px] uppercase font-mono">
            {isShiftActive ? "Shift On" : isOnBreak ? "Break" : "Duty"}
          </span>
        </div>
      )}
    </nav>
  );
}
