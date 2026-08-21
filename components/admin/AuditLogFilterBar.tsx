"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect, useRef } from "react";
import { Search, X, UserCheck } from "lucide-react";

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

  const isFocusedRef = useRef(false);
  const latestActionRef = useRef(initialAction);
  latestActionRef.current = action;
  const isInitialMount = useRef(true);

  // Handle browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const urlAction = sp.get("action") ?? "";
      const urlEntity = sp.get("entity") ?? "";
      const urlAdminId = sp.get("adminId") ?? "";
      const urlSubAdminOnly = sp.get("subAdminOnly") === "true";

      setAction(urlAction);
      latestActionRef.current = urlAction;
      setEntity(urlEntity);
      setAdminId(urlAdminId);
      setSubAdminOnly(urlSubAdminOnly);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync state if searchParams changes from outside, but never overwrite while typing
  useEffect(() => {
    const urlEntity = searchParams.get("entity") ?? "";
    const urlAdminId = searchParams.get("adminId") ?? "";
    const urlSubAdminOnly = searchParams.get("subAdminOnly") === "true";

    setEntity((prev) => (prev !== urlEntity ? urlEntity : prev));
    setAdminId((prev) => (prev !== urlAdminId ? urlAdminId : prev));
    setSubAdminOnly((prev) => (prev !== urlSubAdminOnly ? urlSubAdminOnly : prev));

    if (!isFocusedRef.current) {
      const urlAction = searchParams.get("action") ?? "";
      if (urlAction !== latestActionRef.current) {
        setAction(urlAction);
        latestActionRef.current = urlAction;
      }
    }
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
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Debounced search when action keyword changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      updateFilters(action, entity, adminId, subAdminOnly);
    }, 350);

    return () => clearTimeout(timer);
  }, [action]);

  const handleReset = () => {
    setAction("");
    latestActionRef.current = "";
    setEntity("");
    setAdminId("");
    setSubAdminOnly(false);
    updateFilters("", "", "", false);
  };

  const hasActiveFilters = Boolean(action || entity || adminId || subAdminOnly);

  const ENTITIES = ["User", "TutorProfile", "Lead", "Wallet", "PlatformSetting"];

  return (
    <div className="mb-6 space-y-4">
      {/* Search Input & Select Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Action */}
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-white border border-slate-300 shadow-xs focus-within:border-[#2D9E6B] min-w-0 w-full sm:min-w-[220px]">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onFocus={() => {
              isFocusedRef.current = true;
            }}
            onBlur={() => {
              isFocusedRef.current = false;
            }}
            placeholder="Search action keyword (e.g. KYC, SUSPEND)..."
            className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-400"
          />
          {action && (
            <button
              type="button"
              onClick={() => {
                setAction("");
                updateFilters("", entity, adminId, subAdminOnly);
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Target Entity Selector */}
        <select
          value={entity}
          onChange={(e) => {
            const val = e.target.value;
            setEntity(val);
            updateFilters(action, val, adminId, subAdminOnly);
          }}
          className="w-full sm:w-auto rounded-2xl px-4 py-2.5 text-xs font-800 text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer"
        >
          <option value="">All Entity Types</option>
          {ENTITIES.map((ent) => (
            <option key={ent} value={ent}>{ent}</option>
          ))}
        </select>

        {/* Staff Member Selector */}
        <select
          value={adminId}
          onChange={(e) => {
            const val = e.target.value;
            setAdminId(val);
            updateFilters(action, entity, val, subAdminOnly);
          }}
          className="w-full sm:w-auto rounded-2xl px-4 py-2.5 text-xs font-800 text-slate-900 bg-white border border-slate-300 shadow-xs outline-none cursor-pointer"
        >
          <option value="">All Admin &amp; Staff Members</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email} ({u.role === "SUB_ADMIN" ? `Sub: ${u.subAdminRole ?? "Staff"}` : "Super Admin"})
            </option>
          ))}
        </select>

        {/* Sub-Admin Only Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const val = !subAdminOnly;
            setSubAdminOnly(val);
            updateFilters(action, entity, adminId, val);
          }}
          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-800 transition-all border cursor-pointer ${
            subAdminOnly
              ? "bg-amber-100 text-amber-950 border-amber-300 shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
          }`}
        >
          <UserCheck size={14} />
          <span>Sub-Admin Actions Only</span>
        </button>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-800 bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
          >
            <X size={14} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
