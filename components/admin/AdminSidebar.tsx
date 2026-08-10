"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  TrendingUp,
  Users,
  BadgeCheck,
  FileSpreadsheet,
  CalendarCheck2,
  Headphones,
  Star,
  Coins,
  Megaphone,
  BadgePercent,
  SlidersHorizontal,
  History,
  UserCog,
  LogOut,
  GraduationCap,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const ALL_NAV_ITEMS = [
  { label: "Dashboard",        href: "/admin/dashboard",                      icon: LayoutGrid,        roles: null, iconColor: "text-blue-400" },
  { label: "Analytics",        href: "/admin/analytics",                      icon: TrendingUp,        roles: null, iconColor: "text-purple-400" },
  { label: "User Directory",   href: "/admin/users",                          icon: Users,             roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "OPERATIONS"], iconColor: "text-emerald-400" },
  { label: "KYC Queue",        href: "/admin/kyc",                             icon: BadgeCheck,        roles: ["SUPER_ADMIN", "VERIFICATION"],  badge: "!", iconColor: "text-amber-400" },
  { label: "Student Leads",     href: "/admin/leads",                          icon: FileSpreadsheet,   roles: ["SUPER_ADMIN", "OPERATIONS", "MARKETING", "SUPPORT"], iconColor: "text-pink-400" },
  { label: "Tuition Bookings", href: "/admin/bookings",                     icon: CalendarCheck2,    roles: ["SUPER_ADMIN", "OPERATIONS", "SUPPORT"], iconColor: "text-cyan-400" },
  { label: "Support Chat",     href: "/admin/chat",                           icon: Headphones,        roles: ["SUPER_ADMIN", "SUPPORT", "OPERATIONS"], iconColor: "text-indigo-400" },
  { label: "Reviews",          href: "/admin/reviews",                        icon: Star,              roles: ["SUPER_ADMIN", "SUPPORT"], iconColor: "text-yellow-400" },
  { label: "Wallets & Revenue", href: "/admin/wallets",                     icon: Coins,             roles: ["SUPER_ADMIN", "FINANCE"], iconColor: "text-emerald-400" },
  { label: "Broadcast Push",    href: "/admin/notifications/broadcast",        icon: Megaphone,         roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-orange-400" },
  { label: "Promo Coupons",     href: "/admin/coupons",                        icon: BadgePercent,      roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-lime-400" },
  { label: "Platform Settings", href: "/admin/settings",                      icon: SlidersHorizontal, roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-slate-400" },
  { label: "Audit Logs",       href: "/admin/audit-logs",                     icon: History,           roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"], iconColor: "text-purple-400" },
  { label: "Sub-Admins",       href: "/admin/sub-admins",                      icon: UserCog,           roles: ["SUPER_ADMIN"], iconColor: "text-sky-400" },
] as const;

const SUB_ADMIN_ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPPORT:      { label: "support",      color: "#38BDF8" },
  VERIFICATION: { label: "verification", color: "#C084FC" },
  FINANCE:      { label: "finance",      color: "#34D399" },
  OPERATIONS:   { label: "operations",   color: "#FB923C" },
  MARKETING:    { label: "marketing",    color: "#F472B6" },
  SUPER_ADMIN:  { label: "super_admin",  color: "#34D399" },
};

interface AdminSidebarProps {
  userName: string;
  userRole?: string;
  subAdminRole?: string | null;
}

export function AdminSidebar({ userName, userRole = "SUPER_ADMIN", subAdminRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveRole = userRole === "SUB_ADMIN" ? (subAdminRole ?? "") : userRole;
  const roleLabel = SUB_ADMIN_ROLE_LABELS[effectiveRole] ?? { label: effectiveRole.toLowerCase(), color: "#34D399" };

  const handleSignOut = () => {
    setMobileOpen(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    signOut({ callbackUrl: `${origin}/login` });
  };

  const visibleNavItems = ALL_NAV_ITEMS.filter(({ roles, href }) => {
    if (href === "/admin/dashboard") return true;
    if (roles === null) return true;
    return (roles as readonly string[]).includes(effectiveRole);
  });

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#1E293B] border-r border-slate-700/80 select-none text-white shadow-xl">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-700/80 bg-[#0F172A]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2D9E6B] text-white font-800 shadow-md">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-800 text-white tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                ApnaTutorHub
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-800 uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#2D9E6B]" />
              <span className="text-[10px] font-800 uppercase tracking-wider text-emerald-300">
                {roleLabel.label}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links with custom scrollbar & distinct colorful icons */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-800 uppercase tracking-widest text-slate-400 mb-2">
            Command Center
          </p>
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = "badge" in item ? (item as { badge?: string }).badge : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-xs transition-all duration-150 ${
                  active
                    ? "bg-[#0F172A] !text-white font-800 shadow-md border border-slate-700/80"
                    : "text-slate-300 hover:text-white font-600 hover:bg-slate-800/80 border border-transparent"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} className={`${item.iconColor} shrink-0`} />
                <span className="truncate">{item.label}</span>
                {badge && !active && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-800 text-white animate-bounce shadow-xs">
                    {badge}
                  </span>
                )}
                {active && (
                  <ChevronRight size={16} className="ml-auto text-emerald-400" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-800 uppercase tracking-widest text-slate-400 mb-2">
            Operations &amp; Growth
          </p>
          {visibleNavItems.slice(4).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            const badge = "badge" in item ? (item as { badge?: string }).badge : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-xs transition-all duration-150 ${
                  active
                    ? "bg-[#0F172A] !text-white font-800 shadow-md border border-slate-700/80"
                    : "text-slate-300 hover:text-white font-600 hover:bg-slate-800/80 border border-transparent"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} className={`${item.iconColor} shrink-0`} />
                <span className="truncate">{item.label}</span>
                {badge && !active && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-800 text-white shadow-xs">
                    {badge}
                  </span>
                )}
                {active && (
                  <ChevronRight size={16} className="ml-auto text-emerald-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-700/80 bg-[#0F172A] space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl font-800 text-xs text-white shrink-0 bg-[#2D9E6B] shadow-2xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-800 text-white">
              {userName}
            </p>
            <span className="inline-block text-[10px] font-800 px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5 text-emerald-300 bg-emerald-500/20 border border-emerald-400/30">
              {roleLabel.label}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-800 text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-[#1E293B] px-4 py-3.5 lg:hidden z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-white hover:bg-slate-700 cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2D9E6B] text-white font-800 shadow-2xs">
              <GraduationCap size={16} />
            </div>
            <span className="font-800 text-white text-sm tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              ApnaTutorHub Admin
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col lg:flex"
        style={{
          width: "260px",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-Over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex w-4/5 max-w-xs flex-1 flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
