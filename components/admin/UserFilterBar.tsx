"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter, Loader2, Sparkles, Mail, CheckCircle2, Bot } from "lucide-react";

export function UserFilterBar({
  initialQ,
  initialRole,
  initialStatus,
  initialEmailType = "",
}: {
  initialQ: string;
  initialRole: string;
  initialStatus: string;
  initialEmailType?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [emailType, setEmailType] = useState(initialEmailType);

  const isFocusedRef = useRef(false);
  const latestQRef = useRef(initialQ);
  latestQRef.current = q;
  const isInitialMount = useRef(true);

  // Push URL updates with transition
  const applyFiltersToUrl = useCallback(
    (newQ: string, newRole: string, newStatus: string, newEmailType: string) => {
      const params = new URLSearchParams();

      if (newQ.trim()) {
        params.set("q", newQ.trim());
      }
      if (newRole) {
        params.set("role", newRole);
      }
      if (newStatus) {
        params.set("status", newStatus);
      }
      if (newEmailType) {
        params.set("emailType", newEmailType);
      }

      const queryStr = params.toString();
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;

      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [pathname, router]
  );

  // Handle browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const urlQ = sp.get("q") ?? "";
      const urlRole = sp.get("role") ?? "";
      const urlStatus = sp.get("status") ?? "";
      const urlEmailType = sp.get("emailType") ?? "";

      setQ(urlQ);
      latestQRef.current = urlQ;
      setRole(urlRole);
      setStatus(urlStatus);
      setEmailType(urlEmailType);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync state if searchParams changes externally
  useEffect(() => {
    const urlRole = searchParams.get("role") ?? "";
    const urlStatus = searchParams.get("status") ?? "";
    const urlEmailType = searchParams.get("emailType") ?? "";

    setRole((prev) => (prev !== urlRole ? urlRole : prev));
    setStatus((prev) => (prev !== urlStatus ? urlStatus : prev));
    setEmailType((prev) => (prev !== urlEmailType ? urlEmailType : prev));

    if (!isFocusedRef.current) {
      const urlQ = searchParams.get("q") ?? "";
      if (urlQ !== latestQRef.current) {
        setQ(urlQ);
        latestQRef.current = urlQ;
      }
    }
  }, [searchParams]);

  // Debounced search when user types in the input
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      applyFiltersToUrl(q, role, status, emailType);
    }, 350);

    return () => clearTimeout(timer);
  }, [q, applyFiltersToUrl, role, status, emailType]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    applyFiltersToUrl(q, newRole, status, emailType);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    applyFiltersToUrl(q, role, newStatus, emailType);
  };

  const handleEmailTypeChange = (newEmailType: string) => {
    setEmailType(newEmailType);
    applyFiltersToUrl(q, role, status, newEmailType);
  };

  const handleQuickPreset = (newRole: string, newEmailType: string) => {
    setRole(newRole);
    setEmailType(newEmailType);
    applyFiltersToUrl(q, newRole, status, newEmailType);
  };

  const handleClear = () => {
    setQ("");
    setRole("");
    setStatus("");
    setEmailType("");
    applyFiltersToUrl("", "", "", "");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersToUrl(q, role, status, emailType);
  };

  const hasActiveFilters = Boolean(q || role || status || emailType);

  const ROLE_TABS = [
    { label: "All Users", value: "" },
    { label: "Parents", value: "PARENT" },
    { label: "Tutors", value: "TUTOR" },
    { label: "Sub Admins", value: "SUB_ADMIN" },
    { label: "Super Admins", value: "SUPER_ADMIN" },
  ];

  return (
    <div className="ath-panel space-y-3.5 p-4 sm:p-5">
      <form onSubmit={handleFormSubmit} className="flex flex-wrap items-center gap-3">
        {/* Search Input with instant clear */}
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-white border border-slate-300 shadow-xs focus-within:border-[#2D9E6B] focus-within:ring-4 focus-within:ring-emerald-500/10 min-w-0 w-full sm:min-w-[260px] transition-all">
          {isPending ? (
            <Loader2 size={16} className="text-[#2D9E6B] animate-spin shrink-0" />
          ) : (
            <Search size={16} className="text-slate-400 shrink-0" />
          )}
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              isFocusedRef.current = true;
            }}
            onBlur={() => {
              isFocusedRef.current = false;
            }}
            placeholder="Search by name, email (e.g. gmail.com), or phone number…"
            className="flex-1 bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                applyFiltersToUrl("", role, status, emailType);
              }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-lg hover:bg-slate-100"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Selector */}
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="w-full sm:w-auto rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer focus:border-[#2D9E6B]"
        >
          <option value="">All Roles</option>
          <option value="PARENT">Parents Only</option>
          <option value="TUTOR">Tutors Only</option>
          <option value="SUB_ADMIN">Sub-Admins Only</option>
          <option value="SUPER_ADMIN">Super-Admins Only</option>
        </select>

        {/* Email Authenticity / Genuine Filter Dropdown */}
        <select
          value={emailType}
          onChange={(e) => handleEmailTypeChange(e.target.value)}
          className={`w-full sm:w-auto rounded-2xl px-4 py-2.5 text-xs font-bold bg-white border shadow-xs outline-none cursor-pointer focus:border-[#2D9E6B] ${
            emailType === "GENUINE"
              ? "border-emerald-500 text-emerald-900 bg-emerald-50/50 font-extrabold"
              : "border-slate-300 text-slate-900"
          }`}
        >
          <option value="">All Email Types</option>
          <option value="GENUINE">✨ Genuine Emails Only (Gmail, Yahoo, etc.)</option>
          <option value="AUTO_GENERATED">🤖 Auto-Assigned (@apnatutorhub.com)</option>
          <option value="VERIFIED">🛡️ Verified Email Accounts Only</option>
        </select>

        {/* Status Selector */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full sm:w-auto rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer focus:border-[#2D9E6B]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Users</option>
          <option value="SUSPENDED">Suspended Users</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
          >
            <X size={14} />
            <span>Reset Filters</span>
          </button>
        )}
      </form>

      {/* Quick 1-Click Genuine & Category Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
          <Filter size={13} className="text-[#2D9E6B]" />
          <span>Quick Views:</span>
        </span>

        {/* All Users */}
        <button
          type="button"
          onClick={() => handleQuickPreset("", "")}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
            role === "" && emailType === ""
              ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Users
        </button>

        {/* ✨ Genuine Parents */}
        <button
          type="button"
          onClick={() => handleQuickPreset("PARENT", "GENUINE")}
          className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer ${
            role === "PARENT" && emailType === "GENUINE"
              ? "bg-blue-600 !text-white border-blue-600 shadow-xs"
              : "bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100"
          }`}
        >
          <span>👨‍👩‍👧 Genuine Parents</span>
          <span className="text-[10px] opacity-80">(Real Emails)</span>
        </button>

        {/* ✨ Genuine Tutors */}
        <button
          type="button"
          onClick={() => handleQuickPreset("TUTOR", "GENUINE")}
          className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer ${
            role === "TUTOR" && emailType === "GENUINE"
              ? "bg-[#0F2540] !text-white border-[#0F2540]"
              : "bg-[#EEF3F8] text-[#0F2540] border-[#CBD5E1] hover:bg-[#E2E8F0]"
          }`}
        >
          <span>👨‍🏫 Genuine Tutors</span>
          <span className="text-[10px] opacity-80">(Real Emails)</span>
        </button>

        {/* ✨ All Genuine Emails */}
        <button
          type="button"
          onClick={() => handleQuickPreset("", "GENUINE")}
          className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer ${
            role === "" && emailType === "GENUINE"
              ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
              : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <Sparkles size={12} className={role === "" && emailType === "GENUINE" ? "text-white" : "text-[#2D9E6B]"} />
          <span>All Genuine Emails</span>
        </button>

        {/* 🤖 Auto-Assigned Placeholder Accounts */}
        <button
          type="button"
          onClick={() => handleQuickPreset("", "AUTO_GENERATED")}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
            emailType === "AUTO_GENERATED"
              ? "bg-slate-700 !text-white border-slate-700 shadow-xs"
              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
          }`}
        >
          <Bot size={12} />
          <span>Auto-Assigned (@apnatutorhub.com)</span>
        </button>
      </div>
    </div>
  );
}
