"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Search, X, Filter, RefreshCw } from "lucide-react";

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

  // Keep state in sync with URL changes
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setRole(searchParams.get("role") ?? "");
    setStatus(searchParams.get("status") ?? "");
  }, [searchParams]);

  const updateFilters = (newQ: string, newRole: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newQ.trim()) {
      params.set("q", newQ.trim());
    } else {
      params.delete("q");
    }

    if (newRole) {
      params.set("role", newRole);
    } else {
      params.delete("role");
    }

    if (newStatus) {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }

    // Always reset to page 1 on filter change
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setQ("");
    setRole("");
    setStatus("");
    startTransition(() => {
      router.push(pathname);
    });
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
    <div className="mb-6 space-y-4">
      {/* Search Input & Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-[#22C55E]"
          style={{ background: "#0F172A", border: "1px solid #1E293B", minWidth: "240px" }}
        >
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              const val = e.target.value;
              setQ(val);
              updateFilters(val, role, status);
            }}
            placeholder="Search name, email, or phone number..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                updateFilters("", role, status);
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Select Dropdown */}
        <select
          value={role}
          onChange={(e) => {
            const val = e.target.value;
            setRole(val);
            updateFilters(q, val, status);
          }}
          className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <option value="" className="bg-[#0F172A] text-white">All Roles</option>
          <option value="PARENT" className="bg-[#0F172A] text-white">Parent</option>
          <option value="TUTOR" className="bg-[#0F172A] text-white">Tutor</option>
          <option value="SUB_ADMIN" className="bg-[#0F172A] text-white">Sub Admin</option>
          <option value="SUPER_ADMIN" className="bg-[#0F172A] text-white">Super Admin</option>
        </select>

        {/* Status Select Dropdown */}
        <select
          value={status}
          onChange={(e) => {
            const val = e.target.value;
            setStatus(val);
            updateFilters(q, role, val);
          }}
          className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <option value="" className="bg-[#0F172A] text-white">All Statuses</option>
          <option value="ACTIVE" className="bg-[#0F172A] text-white">Active Only</option>
          <option value="SUSPENDED" className="bg-[#0F172A] text-white">Suspended Only</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 cursor-pointer"
          >
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Quick Role Tab Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Filter size={12} />
          Role:
        </span>
        {ROLE_TABS.map((tab) => {
          const isActive = role === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setRole(tab.value);
                updateFilters(q, tab.value, status);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#22C55E] text-[#0F172A] shadow-sm"
                  : "bg-[#0F172A] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
