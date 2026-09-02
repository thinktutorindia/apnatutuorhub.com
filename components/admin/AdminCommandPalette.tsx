"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Coins, Users, ShieldCheck, Settings, Bell, Tag, Calendar,
  CreditCard, Sparkles, Command, ArrowRight, X, AlertTriangle, FileText, CheckCircle2
} from "lucide-react";

export interface AdminFeatureItem {
  id: string;
  title: string;
  description: string;
  category: "Monetization & Top-Up" | "User Governance" | "Leads & Bookings" | "Platform Settings" | "Marketing & Alerts";
  keywords: string[];
  href: string;
  icon: React.ElementType;
  color: string;
}

export const ADMIN_FEATURES_REGISTRY: AdminFeatureItem[] = [
  {
    id: "topup-governance",
    title: "Coin Top-Up Access Control (Old vs New Tutors)",
    description: "Manage which tutors can purchase top-ups, restrict new tutors, or grant legacy access",
    category: "Monetization & Top-Up",
    keywords: ["topup", "top up", "coin", "old teacher", "new tutor", "restrict", "enable topup"],
    href: "/admin/wallets",
    icon: Coins,
    color: "text-amber-500 bg-amber-50 border-amber-200",
  },
  {
    id: "grant-bulk-coins",
    title: "Grant Bulk Wallet Bonus Coins",
    description: "Credit custom bonus coins directly to selected tutors in bulk",
    category: "Monetization & Top-Up",
    keywords: ["grant coins", "add coins", "bonus", "free coins", "wallet credit"],
    href: "/admin/wallets",
    icon: Sparkles,
    color: "text-[#2D9E6B] bg-[#E8F7F0] border-emerald-200",
  },
  {
    id: "refund-requests",
    title: "Wallet Refund Requests & Approvals",
    description: "Review pending coin refund requests from tutors",
    category: "Monetization & Top-Up",
    keywords: ["refund", "money back", "approve refund", "reject refund"],
    href: "/admin/wallets",
    icon: CreditCard,
    color: "text-blue-500 bg-blue-50 border-blue-200",
  },
  {
    id: "user-management",
    title: "User Directory & Account Management",
    description: "Search tutors/parents, suspend accounts, reset passwords, or delete users",
    category: "User Governance",
    keywords: ["users", "tutors", "parents", "suspend", "delete user", "reset password", "search user"],
    href: "/admin/users",
    icon: Users,
    color: "text-emerald-500 bg-emerald-50 border-emerald-200",
  },
  {
    id: "kyc-verification",
    title: "KYC Document Verification Queue",
    description: "Review Aadhaar/PAN ID proofs and approve tutor verification badges",
    category: "User Governance",
    keywords: ["kyc", "verify", "identity", "aadhaar", "pan", "documents", "approve kyc"],
    href: "/admin/kyc",
    icon: ShieldCheck,
    color: "text-[#0F2540] bg-[#E8F7F0] border-emerald-200",
  },
  {
    id: "subadmin-permissions",
    title: "Sub-Admin Staff Roles & RBAC Permissions",
    description: "Assign module access (Support, Verification, Finance) to sub-admin staff",
    category: "User Governance",
    keywords: ["subadmin", "staff", "permissions", "roles", "rbac", "support staff"],
    href: "/admin/sub-admins",
    icon: ShieldCheck,
    color: "text-orange-500 bg-orange-50 border-orange-200",
  },
  {
    id: "tuition-leads",
    title: "Tuition Leads & Requirement Enquiries",
    description: "View posted parent requirements, force close/expire leads, or expand radius",
    category: "Leads & Bookings",
    keywords: ["leads", "enquiries", "requirements", "parent post", "close lead", "expire lead"],
    href: "/admin/leads",
    icon: FileText,
    color: "text-cyan-500 bg-cyan-50 border-cyan-200",
  },
  {
    id: "tuition-bookings",
    title: "Tuition Demo & Booking Records",
    description: "Track accepted tuition demos and confirmed bookings between parents & tutors",
    category: "Leads & Bookings",
    keywords: ["bookings", "demos", "classes", "tuitions", "confirmed leads"],
    href: "/admin/bookings",
    icon: Calendar,
    color: "text-rose-500 bg-rose-50 border-rose-200",
  },
  {
    id: "platform-settings",
    title: "Platform Global Settings & Commission Rates",
    description: "Update coin lead pricing, support WhatsApp (+91 87997 07960), and system rules",
    category: "Platform Settings",
    keywords: ["settings", "whatsapp", "lead cost", "pricing", "commission", "phone number", "support number"],
    href: "/admin/settings",
    icon: Settings,
    color: "text-[#2D9E6B] bg-emerald-50 border-emerald-200",
  },
  {
    id: "audit-logs",
    title: "System Security & Audit Trail Logs",
    description: "View chronological logs of all admin actions, role changes, and system events",
    category: "Platform Settings",
    keywords: ["audit", "logs", "security", "history", "admin activity", "track actions"],
    href: "/admin/audit-logs",
    icon: FileText,
    color: "text-slate-600 bg-slate-100 border-slate-300",
  },
  {
    id: "broadcast-notifications",
    title: "Broadcast Push & WhatsApp Notifications",
    description: "Send bulk announcements or promotional WhatsApp alerts to tutors & parents",
    category: "Marketing & Alerts",
    keywords: ["broadcast", "push", "whatsapp", "notifications", "bulk sms", "announce"],
    href: "/admin/notifications/broadcast",
    icon: Bell,
    color: "text-pink-500 bg-pink-50 border-pink-200",
  },
  {
    id: "promo-coupons",
    title: "Promo Coupons & Discount Codes",
    description: "Create and manage promotional discount coupons for membership plans & top-ups",
    category: "Marketing & Alerts",
    keywords: ["coupons", "promo", "discount", "voucher", "code"],
    href: "/admin/coupons",
    icon: Tag,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  {
    id: "search-engine",
    title: "Search Engine Control Panel",
    description: "Monitor tutor/lead search index health, Redis query cache, and trigger reindex jobs",
    category: "Platform Settings",
    keywords: ["search", "index", "reindex", "fts", "postgres search", "search engine"],
    href: "/admin/search",
    icon: Search,
    color: "text-sky-600 bg-sky-50 border-sky-200",
  },
];

export function openAdminSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-admin-search"));
  }
}

export function AdminBannerSearch({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openAdminSearch}
      className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-full bg-white px-4 py-2.5 text-[#0F2540] shadow-sm ${className}`}
      title="Search admin features (Ctrl+K)"
    >
      <span className="flex min-w-0 items-center gap-2 text-[13px] font-700 text-[#64748B]">
        <Search size={16} className="shrink-0 text-[#2D9E6B]" />
        <span className="truncate">Search tutors, leads, phone…</span>
      </span>
      <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-[#F0F4F8] px-2 py-0.5 text-[10px] font-800 text-[#0F2540] sm:inline-flex">
        <Command size={10} /> K
      </kbd>
    </button>
  );
}

export function AdminCommandPalette({
  variant = "topbar",
}: {
  variant?: "topbar" | "navy";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    const handleOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-admin-search", handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-admin-search", handleOpen);
    };
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter features
  const filtered = ADMIN_FEATURES_REGISTRY.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Navigation Key Handlers
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  const handleSelect = (item: AdminFeatureItem) => {
    setIsOpen(false);
    router.push(item.href);
  };

  return (
    <>
      {/* Trigger Button in Admin Header / Navigation Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          variant === "navy"
            ? "flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-white/10 px-3.5 py-2.5 text-white/80 hover:bg-white/15 hover:text-white"
            : "hidden h-10 min-w-10 items-center justify-center rounded-full border border-[#E2E8F0] text-[#0F2540] hover:bg-[#F0F4F8] sm:inline-flex lg:min-w-[220px] lg:justify-between lg:px-3.5"
        }
        title="Search admin features (Ctrl+K)"
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-700">
          <Search size={16} className={variant === "navy" ? "text-[#7DDBB1]" : "text-[#2D9E6B]"} />
          <span className={`truncate ${variant === "topbar" ? "hidden lg:inline text-[#64748B]" : ""}`}>
            Search tutors, leads, phone…
          </span>
        </span>
        <kbd className="hidden items-center gap-1 rounded-md border border-slate-200 bg-[#F0F4F8] px-1.5 py-0.5 text-[10px] font-800 text-[#0F2540] xl:inline-flex">
          <Command size={10} /> K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0F2540] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0A192F]">
              <Search size={18} className="text-[#2D9E6B] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search any admin feature, top-up control, settings, or user tool..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-white placeholder-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-white font-bold p-1"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 rounded-md border border-slate-700">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-400">
                  <AlertTriangle size={24} className="mx-auto text-amber-400" />
                  <p className="text-sm font-bold">No matching admin feature found.</p>
                  <p className="text-xs text-slate-500">Try searching "topup", "users", "kyc", "whatsapp", or "settings".</p>
                </div>
              ) : (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`p-3.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-800 border border-[#2D9E6B]/60 shadow-md translate-x-1"
                          : "hover:bg-slate-800/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl shrink-0 border ${item.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-white truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={16} className={`shrink-0 transition-transform ${isSelected ? "text-[#2D9E6B] translate-x-1" : "text-slate-600"}`} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-3 bg-[#0A192F] border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono">↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono">↵</kbd> Select &amp; Control
                </span>
              </div>
              <div className="text-[#2D9E6B] font-extrabold flex items-center gap-1">
                <Sparkles size={12} />
                <span>ApnaTutorHub Admin Search</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronRight({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
