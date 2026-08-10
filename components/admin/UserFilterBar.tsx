"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Search, X, Filter } from "lucide-react";

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
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-white border border-slate-300 shadow-xs focus-within:border-[#2D9E6B] min-w-[240px]">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              const val = e.target.value;
              setQ(val);
              updateFilters(val, role, status);
            }}
            placeholder="Search name, email, or phone number..."
            className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                updateFilters("", role, status);
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Selector */}
        <select
          value={role}
          onChange={(e) => {
            const val = e.target.value;
            setRole(val);
            updateFilters(q, val, status);
          }}
          className="rounded-2xl px-4 py-2.5 text-xs font-800 text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer"
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
          onChange={(e) => {
            const val = e.target.value;
            setStatus(val);
            updateFilters(q, role, val);
          }}
          className="rounded-2xl px-4 py-2.5 text-xs font-800 text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Users</option>
          <option value="SUSPENDED">Suspended Users</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-800 bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="flex items-center gap-1 text-xs font-800 text-slate-700">
          <Filter size={13} />
          <span>Role:</span>
        </span>
        {ROLE_TABS.map((t) => {
          const isActive = role === t.value;
          return (
            <button
              key={t.value}
              onClick={() => {
                setRole(t.value);
                updateFilters(q, t.value, status);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-800 transition-all border cursor-pointer ${
                isActive
                  ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
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
