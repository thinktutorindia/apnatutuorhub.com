"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter, Loader2 } from "lucide-react";

export function UserFilterBar({
  initialQ,
  initialRole,
  initialStatus,
}: {
  initialQ: string;
  initialRole: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);

  const isFocusedRef = useRef(false);
  const latestQRef = useRef(initialQ);
  latestQRef.current = q;
  const isInitialMount = useRef(true);

  // Push URL updates with transition
  const applyFiltersToUrl = useCallback(
    (newQ: string, newRole: string, newStatus: string) => {
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

      const queryStr = params.toString();
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;

      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [pathname, router]
  );

  // Handle true browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const urlQ = sp.get("q") ?? "";
      const urlRole = sp.get("role") ?? "";
      const urlStatus = sp.get("status") ?? "";

      setQ(urlQ);
      latestQRef.current = urlQ;
      setRole(urlRole);
      setStatus(urlStatus);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync role & status if searchParams changes from outside, but NEVER overwrite q while user is focused/typing
  useEffect(() => {
    const urlRole = searchParams.get("role") ?? "";
    const urlStatus = searchParams.get("status") ?? "";

    setRole((prev) => (prev !== urlRole ? urlRole : prev));
    setStatus((prev) => (prev !== urlStatus ? urlStatus : prev));

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
      applyFiltersToUrl(q, role, status);
    }, 350);

    return () => clearTimeout(timer);
  }, [q, applyFiltersToUrl, role, status]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    applyFiltersToUrl(q, newRole, status);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    applyFiltersToUrl(q, role, newStatus);
  };

  const handleClear = () => {
    setQ("");
    setRole("");
    setStatus("");
    applyFiltersToUrl("", "", "");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersToUrl(q, role, status);
  };

  const hasActiveFilters = Boolean(q || role || status);

  const ROLE_TABS = [
    { label: "All Users", value: "" },
    { label: "Parents", value: "PARENT" },
    { label: "Tutors", value: "TUTOR" },
    { label: "Sub Admins", value: "SUB_ADMIN" },
    { label: "Super Admins", value: "SUPER_ADMIN" },
  ];

  return (
    <div className="mb-6 space-y-3.5">
      {/* Search Input & Selectors */}
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
            placeholder="Search by name, email (e.g. zhaniesupport@gmail.com), or phone number…"
            className="flex-1 bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                applyFiltersToUrl("", role, status);
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
            <span>Reset</span>
          </button>
        )}
      </form>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
          <Filter size={13} className="text-[#2D9E6B]" />
          <span>Role:</span>
        </span>
        {ROLE_TABS.map((t) => {
          const isActive = role === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => handleRoleChange(t.value)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                isActive
                  ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
