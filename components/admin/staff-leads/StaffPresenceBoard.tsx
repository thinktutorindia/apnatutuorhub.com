"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import {
  Radio, RefreshCw, Loader2, ShieldOff, ShieldCheck, Lock, Eye, MousePointer2,
  MapPin, Coffee, Moon, LogIn, LogOut, Navigation, AlertTriangle, Activity,
  PhoneCall, Award, Clock, Shield,
} from "lucide-react";
import {
  getStaffPresenceBoardAction,
  setStaffDutyAction,
  type PresenceBoardRow,
} from "@/app/actions/staff-presence.actions";
import type { StaffActivityType } from "@prisma/client";

type ActivityRow = {
  id: string; staffId: string; staffName: string | null; type: StaffActivityType;
  path: string | null; detail: string | null; leadId: string | null; createdAt: Date | string;
};

const REFRESH_MS = 15_000;

function prettyPath(path: string | null): string {
  if (!path) return "—";
  const p = path.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  if (!p) return "Dashboard";
  if (p.startsWith("staff-leads/")) return "Lead: " + p.split("/").pop();
  return p.split("/").map((s) => s.replace(/-/g, " ")).join(" › ");
}

function timeAgo(v: Date | string): string {
  const t = typeof v === "string" ? new Date(v) : v;
  const mins = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTIVITY_META: Record<StaffActivityType, { icon: React.ElementType; color: string; label: string }> = {
  NAVIGATE: { icon: Navigation, color: "text-slate-400", label: "opened" },
  IDLE: { icon: Moon, color: "text-amber-500", label: "went idle" },
  ACTIVE: { icon: MousePointer2, color: "text-emerald-500", label: "resumed" },
  DUTY_ON: { icon: ShieldCheck, color: "text-emerald-600", label: "went on duty" },
  DUTY_OFF: { icon: ShieldOff, color: "text-slate-500", label: "went off duty" },
  FORCED_OFF: { icon: Lock, color: "text-red-600", label: "was locked off (admin)" },
  FORCED_ON: { icon: ShieldCheck, color: "text-emerald-600", label: "was unlocked (admin)" },
  REVEAL_CONTACT: { icon: Eye, color: "text-blue-600", label: "revealed a contact" },
  EXPORT: { icon: LogOut, color: "text-purple-600", label: "exported data" },
  RATE_LIMIT_HIT: { icon: AlertTriangle, color: "text-red-600", label: "hit reveal limit" },
};

/* ── Duty Badge ── */
function DutyBadge({ row }: { row: PresenceBoardRow }) {
  if (row.forcedOff) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <Lock size={9} /> Locked
    </span>
  );
  if (row.dutyStatus === "ON_DUTY") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <ShieldCheck size={9} /> On duty
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <ShieldOff size={9} /> Off
    </span>
  );
}

/* ── Staff Card ── */
function StaffCard({ row, isSuperAdmin, onToggle, toggling, pending }: {
  row: PresenceBoardRow; isSuperAdmin: boolean;
  onToggle: (r: PresenceBoardRow) => void; toggling: boolean; pending: boolean;
}) {
  const online = row.online;
  const idle = online && row.isIdle;
  const borderColor = row.forcedOff ? "border-red-200 bg-red-50/30" : idle ? "border-amber-200 bg-amber-50/20" : online ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200";

  return (
    <div className={`rounded-xl border ${borderColor} p-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold ${
            online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            {(row.name || row.email)?.[0]?.toUpperCase() || "?"}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            !online ? "bg-slate-300" : idle ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 truncate">{row.name || row.email.split("@")[0]}</span>
            <DutyBadge row={row} />
            {row.role === "SUPER_ADMIN" && (
              <span className="text-[8px] font-extrabold text-indigo-600 bg-indigo-50 px-1 py-px rounded border border-indigo-200">SUPER</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-0.5 truncate">
              <MapPin size={9} className="shrink-0" />
              {online ? prettyPath(row.currentPath) : row.lastSeenAt ? `seen ${timeAgo(row.lastSeenAt)}` : "—"}
            </span>
            {idle && (
              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                <Coffee size={9} /> idle {row.idleMinutes ?? 0}m
              </span>
            )}
          </div>
        </div>

        {/* Stats + Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {row.revealsToday > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Reveals today">
              <Eye size={9} /> {row.revealsToday}
            </span>
          )}

          {isSuperAdmin && row.role !== "SUPER_ADMIN" && (
            <button
              onClick={() => onToggle(row)}
              disabled={pending && toggling}
              className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-extrabold disabled:opacity-50 transition-all cursor-pointer ${
                row.forcedOff
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
              title={row.forcedOff ? "Unlock — allow back on duty" : "Force off — lock & hide data"}
            >
              {pending && toggling
                ? <Loader2 size={11} className="animate-spin" />
                : row.forcedOff
                  ? <><ShieldCheck size={11} /> Unlock</>
                  : <><Lock size={11} /> Lock</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function StaffPresenceBoard({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [rows, setRows] = useState<PresenceBoardRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<StaffActivityType | "ALL">("ALL");

  const load = useCallback(async () => {
    const res = await getStaffPresenceBoardAction();
    if (res.success && res.data) {
      setRows(res.data.rows);
      setActivity(res.data.recentActivity as ActivityRow[]);
      setError(null);
    } else {
      setError(res.error ?? "Failed to load presence");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const forceToggle = (row: PresenceBoardRow) => {
    setTogglingId(row.staffId);
    startTransition(async () => {
      const next = row.forcedOff || row.dutyStatus === "ON_DUTY" ? "OFF_DUTY" : "ON_DUTY";
      const res = await setStaffDutyAction(row.staffId, next);
      if (res.success) await load();
      setTogglingId(null);
    });
  };

  const onlineCount = rows.filter((r) => r.online).length;
  const idleCount = rows.filter((r) => r.online && r.isIdle).length;
  const onDutyCount = rows.filter((r) => r.dutyStatus === "ON_DUTY" && !r.forcedOff).length;
  const lockedCount = rows.filter((r) => r.forcedOff).length;

  const filteredActivity = activityFilter === "ALL"
    ? activity
    : activity.filter((a) => a.type === activityFilter);

  // Security alerts
  const alerts = rows.filter((r) => r.revealsToday > 50 || (r.online && r.isIdle && (r.idleMinutes ?? 0) > 10));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Radio size={14} className="text-emerald-600" />
          </div>
          <h2 className="font-extrabold text-slate-800 text-sm">Staff Monitoring</h2>
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{onlineCount} online</span>
            {idleCount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{idleCount} idle</span>}
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{onDutyCount} on duty</span>
            {lockedCount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">{lockedCount} locked</span>}
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {error ? (
        <div className="px-5 py-8 text-center text-sm text-red-500 font-semibold">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* Staff Cards */}
          <div className="lg:col-span-3 p-3 max-h-[440px] overflow-y-auto">
            {/* Security alerts */}
            {alerts.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200">
                <p className="text-[10px] font-extrabold text-red-700 flex items-center gap-1 mb-1">
                  <AlertTriangle size={11} /> Security Alerts
                </p>
                {alerts.map((r) => (
                  <p key={r.staffId} className="text-[10px] text-red-600 font-semibold">
                    • {r.name || r.email.split("@")[0]}:
                    {r.revealsToday > 50 && ` ${r.revealsToday} reveals today (high!)`}
                    {r.online && r.isIdle && (r.idleMinutes ?? 0) > 10 && ` idle for ${r.idleMinutes}m`}
                  </p>
                ))}
              </div>
            )}

            {rows.length === 0 && !loading ? (
              <div className="py-10 text-center text-slate-400 text-sm">No staff found.</div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <StaffCard key={r.staffId} row={r} isSuperAdmin={isSuperAdmin}
                    onToggle={forceToggle} toggling={togglingId === r.staffId} pending={isPending} />
                ))}
              </div>
            )}
          </div>

          {/* Activity Trail */}
          <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/40">
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Activity size={11} /> Activity Trail
              </span>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as StaffActivityType | "ALL")}
                className="text-[10px] font-bold text-slate-500 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="ALL">All types</option>
                <option value="NAVIGATE">Navigation</option>
                <option value="REVEAL_CONTACT">Reveals</option>
                <option value="IDLE">Idle</option>
                <option value="DUTY_ON">Duty On</option>
                <option value="DUTY_OFF">Duty Off</option>
                <option value="FORCED_OFF">Force Lock</option>
                <option value="EXPORT">Export</option>
                <option value="RATE_LIMIT_HIT">Rate Limit</option>
              </select>
            </div>
            <div className="divide-y divide-slate-100/70 max-h-[380px] overflow-y-auto">
              {filteredActivity.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">No recent activity.</div>
              ) : filteredActivity.map((a) => {
                const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.NAVIGATE;
                const Icon = meta.icon;
                const isSecurity = a.type === "REVEAL_CONTACT" || a.type === "EXPORT" || a.type === "RATE_LIMIT_HIT";
                return (
                  <div key={a.id} className={`px-3 py-2 flex items-start gap-2 ${isSecurity ? "bg-blue-50/30" : ""}`}>
                    <Icon size={12} className={`${meta.color} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1 text-[10px] leading-tight">
                      <span className="font-bold text-slate-700">{a.staffName || "Staff"}</span>{" "}
                      <span className="text-slate-500">{meta.label}</span>{" "}
                      {a.type === "NAVIGATE" && a.path && <span className="text-slate-600 font-semibold">{prettyPath(a.path)}</span>}
                      {a.detail && <span className="text-slate-400 italic"> {a.detail}</span>}
                      <div className="text-[9px] text-slate-400 mt-0.5">{timeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
