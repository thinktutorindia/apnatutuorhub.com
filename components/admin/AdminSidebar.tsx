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
  Bell,
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
  Loader2,
  Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { getAllowedSubAdminModules } from "@/lib/rbac";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";

const ALL_NAV_ITEMS = [
  { label: "Dashboard",        href: "/admin/dashboard",                icon: LayoutGrid,        roles: null, iconColor: "text-blue-400" },
  { label: "Analytics",        href: "/admin/analytics",                icon: TrendingUp,        roles: null, iconColor: "text-purple-400" },
  { label: "User Directory",   href: "/admin/users",                    icon: Users,             roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "OPERATIONS"], iconColor: "text-emerald-400" },
  { label: "KYC Queue",        href: "/admin/kyc",                      icon: BadgeCheck,        roles: ["SUPER_ADMIN", "VERIFICATION"], badge: "!", iconColor: "text-amber-400" },
  { label: "Student Leads",    href: "/admin/leads",                    icon: FileSpreadsheet,   roles: ["SUPER_ADMIN", "OPERATIONS", "MARKETING", "SUPPORT"], iconColor: "text-pink-400" },
  { label: "Tuition Bookings", href: "/admin/bookings",                 icon: CalendarCheck2,    roles: ["SUPER_ADMIN", "OPERATIONS", "SUPPORT"], iconColor: "text-cyan-400" },
  { label: "Support Chat",     href: "/admin/chat",                     icon: Headphones,        roles: ["SUPER_ADMIN", "SUPPORT", "OPERATIONS"], iconColor: "text-indigo-400" },
  { label: "Reviews",          href: "/admin/reviews",                  icon: Star,              roles: ["SUPER_ADMIN", "SUPPORT"], iconColor: "text-yellow-400" },
  { label: "Wallets & Revenue",href: "/admin/wallets",                  icon: Coins,             roles: ["SUPER_ADMIN", "FINANCE"], iconColor: "text-emerald-400" },
  { label: "Notification Hub", href: "/admin/notifications",            icon: Bell,              roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-amber-400" },
  { label: "Broadcast Push",   href: "/admin/notifications/broadcast",  icon: Megaphone,         roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-orange-400" },
  { label: "Promo Coupons",    href: "/admin/coupons",                  icon: BadgePercent,      roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-lime-400" },
  { label: "Platform Settings",href: "/admin/settings",                 icon: SlidersHorizontal, roles: ["SUPER_ADMIN", "MARKETING"], iconColor: "text-slate-400" },
  { label: "Audit Logs",       href: "/admin/audit-logs",               icon: History,           roles: ["SUPER_ADMIN", "SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"], iconColor: "text-purple-400" },
  { label: "Sub-Admins",       href: "/admin/sub-admins",               icon: UserCog,           roles: ["SUPER_ADMIN"], iconColor: "text-sky-400" },
  { label: "Staff Analytics",  href: "/admin/sub-admins/analytics",     icon: TrendingUp,        roles: ["SUPER_ADMIN"], iconColor: "text-rose-400" },
  { label: "Dummy Campaigns",  href: "/admin/dummy-campaigns",           icon: Sparkles,          roles: ["SUPER_ADMIN"], iconColor: "text-fuchsia-400" },
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
  userEmail?: string;
  userRole?: string;
  subAdminRole?: string | null;
  customPermissions?: string[] | null;
}

export function AdminSidebar({ userName, userEmail, userRole = "SUPER_ADMIN", subAdminRole, customPermissions }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const effectiveRole = userRole === "SUB_ADMIN" ? (subAdminRole ?? "") : userRole;
  const roleLabel = SUB_ADMIN_ROLE_LABELS[effectiveRole] ?? { label: effectiveRole.toLowerCase(), color: "#34D399" };

  const allowedModules = userRole === "SUB_ADMIN"
    ? getAllowedSubAdminModules({ role: userRole, subAdminRole, customPermissions })
    : [];

  const visibleNavItems = ALL_NAV_ITEMS.filter(({ roles, href }) => {
    if (href === "/admin/dashboard") return true;
    if (userRole === "SUPER_ADMIN") return true;
    return allowedModules.some((mod) => href === mod || href.startsWith(mod + "/"));
  });

  const commandItems = visibleNavItems.slice(0, 4);
  const opsItems = visibleNavItems.slice(4);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await signOut({ callbackUrl: `${origin}/login` });
    } catch {
      setIsSigningOut(false);
    }
  };

  const NavLink = ({ item }: { item: (typeof visibleNavItems)[number] }) => {
    const Icon = item.icon;
    const active =
      item.href === "/admin/dashboard"
        ? pathname === item.href
        : pathname.startsWith(item.href);
    const badge = "badge" in item ? (item as { badge?: string }).badge : undefined;

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-xs transition-all duration-150 ${
          active
            ? "bg-[#0F172A] !text-white font-extrabold shadow-md border border-slate-700/80"
            : "text-slate-300 hover:text-white font-semibold hover:bg-slate-800/80 border border-transparent"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.5 : 2} className={`${item.iconColor} shrink-0`} />
        <span className="truncate">{item.label}</span>
        {badge && !active && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-bounce shadow-xs">
            {badge}
          </span>
        )}
        {active && (
          <ChevronRight size={16} className="ml-auto text-emerald-400 shrink-0" />
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#1E293B] border-r border-slate-700/80 select-none text-white shadow-xl overflow-hidden">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-700/80 bg-[#0F172A] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2D9E6B] text-white font-extrabold shadow-md shrink-0">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white tracking-tight truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                ApnaTutorHub
              </span>
              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D9E6B] shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 truncate">
                {roleLabel.label}
              </span>
            </div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer shrink-0 active:scale-95 transition-all touch-manipulation"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Universal Search & Command Palette Bar */}
      <div className="p-3 bg-[#0F172A] border-b border-slate-700/80">
        <AdminCommandPalette />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Command Center */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
            Command Center
          </p>
          {commandItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Operations & Growth */}
        {opsItems.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
              Operations &amp; Growth
            </p>
            {opsItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* User Footer — pinned at bottom, never hidden on mobile */}
      <div className="shrink-0 p-3 border-t border-slate-700/80 bg-[#0F172A] space-y-2.5">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl font-extrabold text-sm text-white shrink-0 bg-[#2D9E6B]">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-white">
              {userName}
            </p>
            {userEmail && (
              <p className="truncate text-[11px] font-medium text-slate-400">
                {userEmail}
              </p>
            )}
            <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 text-emerald-300 bg-emerald-500/20 border border-emerald-400/30">
              {roleLabel.label}
            </span>
          </div>
        </div>

        {/* Sign Out Button — fully tappable on Android */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold text-rose-300 bg-rose-500/15 hover:bg-rose-500/30 active:bg-rose-500/40 border border-rose-500/30 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:pointer-events-none touch-manipulation active:scale-95"
          style={{ WebkitTapHighlightColor: "transparent", minHeight: 44 }}
        >
          {isSigningOut ? (
            <>
              <Loader2 size={15} className="animate-spin text-rose-300" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut size={15} className="text-rose-300" />
              <span>Sign Out Admin</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Topbar ── */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-700 bg-[#1E293B] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 active:scale-95 cursor-pointer transition-all touch-manipulation"
            aria-label="Open navigation"
            style={{ WebkitTapHighlightColor: "transparent", minWidth: 40, minHeight: 40 }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2D9E6B] text-white font-extrabold shadow-sm shrink-0">
              <GraduationCap size={16} />
            </div>
            <span className="font-extrabold text-white text-sm tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              ApnaTutorHub
            </span>
          </div>
        </div>

        {/* Mobile user avatar + logout in topbar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 active:scale-95 cursor-pointer transition-all touch-manipulation disabled:opacity-60"
            aria-label="Sign out"
            title="Sign out"
            style={{ WebkitTapHighlightColor: "transparent", minWidth: 36, minHeight: 36 }}
          >
            {isSigningOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl font-extrabold text-sm text-white bg-[#2D9E6B] shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Desktop Sidebar (Fixed) ── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col"
        style={{ width: "260px" }}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Drawer (Slide-Over with animation) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <aside
            className="relative flex flex-col bg-[#1E293B] shadow-2xl"
            style={{ width: "min(280px, 85vw)", maxHeight: "100dvh" }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
