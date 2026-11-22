"use client";

import React, { useState, useTransition } from "react";
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
  MessageCircle,
  Square,
  Loader2,
} from "lucide-react";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import { useAdminSidebarStore } from "@/lib/stores/sidebar-store";
import { usePWAInstall } from "@/components/shared/PWAInstallPrompt";
import {
  staffClockInAction,
  staffClockOutAction,
  staffStartBreakAction,
  staffEndBreakAction,
} from "@/app/actions/staff-leads.actions";
import { setMyDutyAction } from "@/app/actions/staff-presence.actions";

export function StaffMobileNavBar() {
  const pathname = usePathname();
  const { canInstall, isInstalled, install } = usePWAInstall();
  const openSidebar = useAdminSidebarStore((s) => s.open);
  const [isPending, startTransition] = useTransition();
  const [showShiftActionModal, setShowShiftActionModal] = useState(false);

  const shiftStatus = useStaffDutyStore((s) => s.shiftStatus);
  const setShiftSession = useStaffDutyStore((s) => s.setShiftSession);
  const setDutySnapshot = useStaffDutyStore((s) => s.setSnapshot);

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
      href: "/admin/whatsapp-chats",
      label: "Chats",
      icon: MessageCircle,
      active: pathname.startsWith("/admin/whatsapp-chats"),
    },
    {
      href: "/admin/staff-leads/my-dashboard",
      label: "Stats",
      icon: TrendingUp,
      active: pathname === "/admin/staff-leads/my-dashboard",
    },
  ];

  const handleQuickClockIn = () => {
    startTransition(async () => {
      const res = await staffClockInAction();
      if (res.success && res.data) {
        setShiftSession({ id: res.data.sessionId, status: "CLOCKED_IN" });
        const dutyRes = await setMyDutyAction("ON_DUTY");
        if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
      }
    });
  };

  const handleQuickBreak = () => {
    startTransition(async () => {
      const res = await staffStartBreakAction();
      if (res.success) {
        setShiftSession({ id: null, status: "ON_BREAK" });
        setShowShiftActionModal(false);
      }
    });
  };

  const handleQuickResume = () => {
    startTransition(async () => {
      const res = await staffEndBreakAction();
      if (res.success) {
        setShiftSession({ id: null, status: "CLOCKED_IN" });
        setShowShiftActionModal(false);
      }
    });
  };

  const handleQuickClockOut = () => {
    startTransition(async () => {
      const res = await staffClockOutAction("Clocked out from mobile nav");
      if (res.success) {
        setShiftSession({ id: null, status: "CLOCKED_OUT" });
        const dutyRes = await setMyDutyAction("OFF_DUTY");
        if (dutyRes.success && dutyRes.data) setDutySnapshot(dutyRes.data);
        setShowShiftActionModal(false);
      }
    });
  };

  return (
    <>
      <nav
        aria-label="Staff Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
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
        {canInstall && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-amber-600 font-extrabold cursor-pointer animate-bounce"
            title="Install Web App on Chrome"
          >
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-700">
              <Download size={13} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-black">Install</span>
          </button>
        )}

        {/* Full Admin Navigation Drawer Trigger */}
        <button
          type="button"
          onClick={openSidebar}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-900 font-semibold cursor-pointer active:scale-95 transition-all"
          title="Open admin navigation menu"
        >
          <div className="relative">
            <Menu size={18} strokeWidth={1.75} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>

        {/* 1-Tap Mobile Shift Action Button */}
        {!isShiftActive && !isOnBreak ? (
          <button
            type="button"
            onClick={handleQuickClockIn}
            disabled={isPending}
            className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-extrabold cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tap to Start Shift & begin duty tracking"
          >
            <div className="flex items-center gap-1">
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
              <span className="text-[10px] font-black uppercase tracking-tight">Start</span>
            </div>
          </button>
        ) : isOnBreak ? (
          <button
            type="button"
            onClick={handleQuickResume}
            disabled={isPending}
            className="flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-extrabold cursor-pointer active:scale-95 transition-all shadow-xs"
            title="On break. Tap to resume work."
          >
            <div className="flex items-center gap-1">
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Coffee size={11} />}
              <span className="text-[10px] font-black tracking-tight">Resume</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowShiftActionModal(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold cursor-pointer active:scale-95 transition-all"
            title="Shift active. Tap for shift options."
          >
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tight">On Shift</span>
            </div>
          </button>
        )}
      </nav>

      {/* Mobile Shift Options Modal */}
      {showShiftActionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black text-[#0F2540]">Active Mobile Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftActionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Your calls, activity, and working hours are actively being logged.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickBreak}
                disabled={isPending}
                className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-amber-200 cursor-pointer"
              >
                <Coffee size={13} />
                <span>Take Break</span>
              </button>
              <button
                type="button"
                onClick={handleQuickClockOut}
                disabled={isPending}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <Square size={13} />
                <span>Clock Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
