"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Search, X, Filter, UserCheck, Shield, RefreshCw } from "lucide-react";

export function AuditLogFilterBar({
  initialAction,
  initialEntity,
  initialAdminId,
  initialSubAdminOnly,
  adminUsers,
}: {
  initialAction: string;
  initialEntity: string;
  initialAdminId: string;
  initialSubAdminOnly: boolean;
  adminUsers: { id: string; name: string | null; email: string; role: string; subAdminRole: string | null }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [action, setAction] = useState(initialAction);
  const [entity, setEntity] = useState(initialEntity);
  const [adminId, setAdminId] = useState(initialAdminId);
  const [subAdminOnly, setSubAdminOnly] = useState(initialSubAdminOnly);

  useEffect(() => {
    setAction(searchParams.get("action") ?? "");
    setEntity(searchParams.get("entity") ?? "");
    setAdminId(searchParams.get("adminId") ?? "");
    setSubAdminOnly(searchParams.get("subAdminOnly") === "true");
  }, [searchParams]);

  const updateFilters = (newAction: string, newEntity: string, newAdminId: string, newSubAdminOnly: boolean) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newAction.trim()) params.set("action", newAction.trim());
    else params.delete("action");

    if (newEntity) params.set("entity", newEntity);
    else params.delete("entity");

    if (newAdminId) params.set("adminId", newAdminId);
    else params.delete("adminId");

    if (newSubAdminOnly) params.set("subAdminOnly", "true");
    else params.delete("subAdminOnly");

    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setAction("");
    setEntity("");
    setAdminId("");
    setSubAdminOnly(false);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(action || entity || adminId || subAdminOnly);

  const ENTITIES = ["User", "TutorProfile", "Lead", "Wallet", "PlatformSetting"];

  return (
    <div className="mb-6 space-y-4">
      {/* Search Input & Select Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Action */}
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-[#22C55E]"
          style={{ background: "#0F172A", border: "1px solid #1E293B", minWidth: "220px" }}
        >
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={action}
            onChange={(e) => {
              const val = e.target.value;
              setAction(val);
              updateFilters(val, entity, adminId, subAdminOnly);
            }}
            placeholder="Search action keyword (e.g. KYC, SUSPEND)..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {action && (
            <button
              type="button"
              onClick={() => {
                setAction("");
                updateFilters("", entity, adminId, subAdminOnly);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Entity Type Filter */}
        <select
          value={entity}
          onChange={(e) => {
            const val = e.target.value;
            setEntity(val);
            updateFilters(action, val, adminId, subAdminOnly);
          }}
          className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <option value="" className="bg-[#0F172A] text-white">All Entities</option>
          {ENTITIES.map((ent) => (
            <option key={ent} value={ent} className="bg-[#0F172A] text-white">
              {ent}
            </option>
          ))}
        </select>

        {/* Filter by Specific Admin / Sub-Admin */}
        <select
          value={adminId}
          onChange={(e) => {
            const val = e.target.value;
            setAdminId(val);
            updateFilters(action, entity, val, subAdminOnly);
          }}
          className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <option value="" className="bg-[#0F172A] text-white">All Admin Accounts</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id} className="bg-[#0F172A] text-white">
              {u.name || u.email.split("@")[0]} ({u.role === "SUB_ADMIN" ? `Sub-Admin: ${u.subAdminRole}` : "Super Admin"})
            </option>
          ))}
        </select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 cursor-pointer"
          >
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Quick View Mode Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Filter size={12} />
          View:
        </span>

        <button
          type="button"
          onClick={() => {
            setSubAdminOnly(false);
            setAdminId("");
            updateFilters(action, entity, "", false);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
            !subAdminOnly && !adminId
              ? "bg-[#3B82F6] text-white shadow-sm"
              : "bg-[#0F172A] text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          All Activity Logs
        </button>

        <button
          type="button"
          onClick={() => {
            setSubAdminOnly(true);
            setAdminId("");
            updateFilters(action, entity, "", true);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
            subAdminOnly
              ? "bg-[#F59E0B] text-[#0F172A] shadow-sm font-black"
              : "bg-[#0F172A] text-amber-400 hover:text-amber-300 border border-amber-500/30"
          }`}
        >
          <UserCheck size={13} />
          <span>Sub-Admin Activity Logs</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const superAdmin = adminUsers.find((u) => u.role === "SUPER_ADMIN");
            if (superAdmin) {
              setSubAdminOnly(false);
              setAdminId(superAdmin.id);
              updateFilters(action, entity, superAdmin.id, false);
            }
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
            !subAdminOnly && adminId && adminUsers.find((u) => u.id === adminId)?.role === "SUPER_ADMIN"
              ? "bg-[#22C55E] text-[#0F172A] shadow-sm font-black"
              : "bg-[#0F172A] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
          }`}
        >
          <Shield size={13} />
          <span>Super Admin Logs</span>
        </button>
      </div>
    </div>
  );
}
