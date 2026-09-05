"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown,
  Loader2, RefreshCw, X, MapPin, Eye,
  Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Columns3,
  Users, AlertTriangle, Download, Phone, PhoneCall,
  ExternalLink, Clock, Filter, MessageCircle, Copy, Check, Zap, HelpCircle, Flame,
} from "lucide-react";
import type { StaffLeadStatus } from "@prisma/client";
import {
  getStaffLeadsAction,
  assignLeadsAction,
  bulkUpdateLeadStatusAction,
  bulkPromoteLeadsToProfilesAction,
  type StaffLeadSortKey,
} from "@/app/actions/staff-leads.actions";
import { logContactRevealAction } from "@/app/actions/staff-presence.actions";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import { StaffLeadTypeBadge } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import {
  STATUS_META, ALL_STATUSES, statusMeta, formatDateShort, maskPhone, formatRelative,
} from "@/lib/staff-lead-ui";
import { StaffLeadDetailDrawer } from "@/components/admin/staff-leads/StaffLeadDetailDrawer";
import { StaffPowerDialer } from "@/components/admin/staff-leads/StaffPowerDialer";
import { StaffLeadsFeatureGuide } from "@/components/admin/staff-leads/StaffLeadsFeatureGuide";
import { StaffShiftGate } from "@/components/admin/staff-leads/StaffShiftGate";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WorkspaceLead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  subjects: string[];
  classes: string[];
  status: StaffLeadStatus;
  assignedToId: string | null;
  assignedTo: { name: string | null } | null;
  priority: number;
  isPromoted: boolean;
  createdAt: Date | string;
  lastContactedAt: Date | string | null;
  nextFollowUpAt: Date | string | null;
  staffNotes: string | null;
  _count: { callLogs: number };
};

export type StaffOption = {
  id: string;
  name: string | null;
  email: string;
  subAdminRole: string | null;
  _count_leads: number;
};

type TypeFilter = "ALL" | "TUTOR" | "PARENT";
type AssignFilter = "ALL" | "UNASSIGNED" | string;

interface Props {
  initialLeads: WorkspaceLead[];
  initialTotal: number;
  pageSize?: number;
  staff: StaffOption[];
  batches: Array<{ id: string; name: string }>;
  isSuperAdmin: boolean;
  protectData?: boolean;
}

const PAGE_SIZES = [25, 50, 100, 200];

const SORT_KEYS: Record<string, StaffLeadSortKey> = {
  name: "name",
  status: "status",
  priority: "priority",
  createdAt: "createdAt",
  lastContactedAt: "lastContactedAt",
  nextFollowUpAt: "nextFollowUpAt",
};

/* ── Priority dots ─────────────────────────────────────────────────── */
function PriorityDots({ level }: { level: number }) {
  if (level <= 0) return null;
  const c = ["bg-amber-400", "bg-orange-500", "bg-red-500"];
  return (
    <div className="flex items-center gap-px" title={`Priority ${level}`}>
      {Array.from({ length: Math.min(level, 3) }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${c[Math.min(i, 2)]}`} />
      ))}
    </div>
  );
}

/* ── Inline status badge with dropdown ─────────────────────────────── */
function InlineStatusBadge({ status, onChange, disabled }: {
  status: StaffLeadStatus; onChange: (s: StaffLeadStatus) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const m = statusMeta(status);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={disabled}
        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full cursor-pointer transition-all hover:ring-2 ${m.bg} ${m.text} ${m.ring}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
        {m.label}
        <ChevronDown size={10} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[140px]">
          {ALL_STATUSES.map((s) => {
            const sm = statusMeta(s);
            return (
              <button key={s} type="button"
                onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 hover:bg-slate-50 ${s === status ? "bg-slate-50" : ""}`}
              >
                <span className={`w-2 h-2 rounded-full ${sm.dot}`} /> {sm.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function LeadsWorkspace({
  initialLeads, initialTotal, pageSize: initialPageSize = 50,
  staff, batches, isSuperAdmin, protectData = false,
}: Props) {
  const [data, setData] = useState<WorkspaceLead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    email: false, classes: false, lastContactedAt: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffLeadStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>("ALL");
  const [batchFilter, setBatchFilter] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [drawerLead, setDrawerLead] = useState<WorkspaceLead | null>(null);
  const [drawerIndex, setDrawerIndex] = useState<number>(0);

  const storeProtect = useStaffDutyStore((s) => s.protect);
  const dutyStatus = useStaffDutyStore((s) => s.dutyStatus);
  const dutyForcedOff = useStaffDutyStore((s) => s.forcedOff);
  const protect = protectData || (!isSuperAdmin && storeProtect);

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  // Power dialer & feature guide states
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
  }, []);

  const handleCopyPhone = useCallback((phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    showToast("success", "Phone number copied!");
    setTimeout(() => setCopiedPhoneId(null), 2000);
  }, [showToast]);

  // ── Server fetch ──
  const fetchLeads = useCallback(() => {
    const sort = sorting[0];
    const sortBy = sort ? SORT_KEYS[sort.id] : undefined;
    startTransition(async () => {
      const res = await getStaffLeadsAction({
        page: pageIndex + 1, pageSize,
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        unassignedOnly: assignFilter === "UNASSIGNED" || undefined,
        assignedToId: assignFilter !== "ALL" && assignFilter !== "UNASSIGNED" ? assignFilter : undefined,
        batchId: batchFilter === "ALL" ? undefined : batchFilter,
        sortBy, sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined,
      });
      if (res.success && res.data) {
        setData(res.data.leads as WorkspaceLead[]);
        setTotal(res.data.total);
      } else {
        showToast("error", res.error ?? "Failed to load leads");
      }
      setFirstLoad(false);
    });
  }, [pageIndex, pageSize, search, statusFilter, typeFilter, assignFilter, batchFilter, sorting, showToast]);

  const skipInitial = useRef(true);
  useEffect(() => {
    if (skipInitial.current) { skipInitial.current = false; setFirstLoad(false); return; }
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setPageIndex(0); setRowSelection({});
  }, [search, statusFilter, typeFilter, assignFilter, batchFilter, pageSize]);

  const reveal = useCallback((id: string) => {
    startTransition(async () => {
      const res = await logContactRevealAction(id);
      if (res.success && res.data?.allowed) {
        setRevealed((prev) => new Set(prev).add(id));
        if (res.data.remaining <= 10) showToast("success", `Revealed. ${res.data.remaining} reveals left today.`);
      } else {
        showToast("error", res.data?.reason ?? res.error ?? "Reveal blocked.");
      }
    });
  }, [showToast]);

  const handleInlineStatusChange = useCallback((leadId: string, newStatus: StaffLeadStatus) => {
    startTransition(async () => {
      const res = await bulkUpdateLeadStatusAction([leadId], newStatus);
      if (res.success && res.data) {
        setData((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
        showToast("success", `Status → ${STATUS_META[newStatus].label}`);
      } else {
        showToast("error", res.error ?? "Failed");
      }
    });
  }, [showToast]);

  // ── Columns ──
  const columns = useMemo<ColumnDef<WorkspaceLead>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-[#16A34A] cursor-pointer"
          checked={table.getIsAllRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected(); }}
          onChange={table.getToggleAllRowsSelectedHandler()} aria-label="Select all" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-[#16A34A] cursor-pointer"
          checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()}
          aria-label="Select row" onClick={(e) => e.stopPropagation()} />
      ),
      enableSorting: false, size: 32,
    },
    {
      accessorKey: "name", header: "Lead",
      cell: ({ row }) => {
        const l = row.original;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-500 shrink-0 border border-slate-200">
              {l.name ? l.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[13px] text-slate-800 truncate">
                  {l.name || <span className="text-slate-300 italic font-normal">Unknown</span>}
                </span>
                <PriorityDots level={l.priority} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StaffLeadTypeBadge type={getStaffRecordType(l.staffNotes)} />
                {l.isPromoted && (
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-px rounded border border-emerald-200">✓ Live</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone", header: "Phone & Quick Dial", enableSorting: false,
      cell: ({ row }) => {
        const l = row.original;
        if (!l.phone) return <span className="text-slate-300 text-xs font-medium">—</span>;
        const hidden = protect && !revealed.has(l.id);
        const cleanNum = l.phone.replace(/\D/g, "").slice(-10);
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className={`font-mono text-xs font-bold tracking-wide ${hidden ? "text-slate-400 select-none blur-[2px]" : "text-slate-700"}`}>
              {hidden ? maskPhone(l.phone) : l.phone}
            </span>
            {hidden ? (
              <button type="button" onClick={() => reveal(l.id)}
                className="text-slate-400 hover:text-[#16A34A] transition-colors cursor-pointer" title="Reveal (logged)">
                <Eye size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-1 ml-1">
                <a href={`tel:+91${cleanNum}`}
                  className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer" title="Direct Call">
                  <Phone size={11} />
                </a>
                <a href={`https://wa.me/91${cleanNum}?text=${encodeURIComponent(
                    `Hello ${l.name || "there"}, greetings from ApnaTutorHub regarding tuition matching in ${l.location || "your area"}. Are you available for a quick chat?`
                  )}`} target="_blank" rel="noopener noreferrer"
                  className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer" title="Send WhatsApp">
                  <MessageCircle size={11} />
                </a>
                <button type="button" onClick={() => handleCopyPhone(cleanNum, l.id)}
                  className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" title="Copy Number">
                  {copiedPhoneId === l.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "email", header: "Email", enableSorting: false,
      cell: ({ row }) => {
        const l = row.original;
        if (!l.email) return <span className="text-slate-300 text-xs">—</span>;
        const hidden = protect && !revealed.has(l.id);
        return <span className={`text-xs font-medium ${hidden ? "text-slate-400 select-none blur-[3px]" : "text-slate-600"}`}>{l.email}</span>;
      },
    },
    {
      accessorKey: "location", header: "Location", enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 font-medium flex items-center gap-1 truncate max-w-[120px]">
          {row.original.location
            ? <><MapPin size={10} className="text-slate-400 shrink-0" /> {row.original.location}</>
            : <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      id: "subjects", header: "Subjects", enableSorting: false,
      cell: ({ row }) => {
        const subs = row.original.subjects ?? [];
        if (!subs.length) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-0.5 max-w-[160px]">
            {subs.slice(0, 2).map((s) => (
              <span key={s} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-px rounded">{s}</span>
            ))}
            {subs.length > 2 && <span className="text-[10px] text-slate-400 font-semibold">+{subs.length - 2}</span>}
          </div>
        );
      },
    },
    {
      id: "classes", header: "Classes", enableSorting: false,
      cell: ({ row }) => {
        const cls = row.original.classes ?? [];
        return cls.length
          ? <span className="text-xs text-slate-600 font-medium">{cls.slice(0, 2).join(", ")}{cls.length > 2 ? "…" : ""}</span>
          : <span className="text-slate-300 text-xs">—</span>;
      },
    },
    {
      id: "assignedTo", header: "Owner", enableSorting: false,
      cell: ({ row }) => (
        row.original.assignedTo?.name
          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-extrabold shrink-0">
                {row.original.assignedTo.name.charAt(0)}
              </span>
              <span className="truncate max-w-[80px]">{row.original.assignedTo.name}</span>
            </span>
          : <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Unassigned</span>
      ),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => (
        <InlineStatusBadge status={row.original.status}
          onChange={(s) => handleInlineStatusChange(row.original.id, s)} disabled={isPending} />
      ),
    },
    {
      id: "calls", header: "Calls", enableSorting: false, size: 55,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PhoneCall size={11} className="text-slate-400" />
          <span className="text-xs text-slate-600 font-bold tabular-nums">{row.original._count.callLogs}</span>
        </div>
      ),
    },
    {
      accessorKey: "nextFollowUpAt", header: "Follow-up",
      cell: ({ row }) => {
        const v = row.original.nextFollowUpAt;
        if (!v) return <span className="text-slate-300 text-xs">—</span>;
        const overdue = new Date(v).getTime() < Date.now();
        return (
          <span className={`text-[11px] font-bold flex items-center gap-1 ${overdue ? "text-red-600" : "text-slate-600"}`}>
            <Clock size={10} className={overdue ? "text-red-400" : "text-slate-400"} />
            {formatRelative(v)}
          </span>
        );
      },
    },
    {
      accessorKey: "lastContactedAt", header: "Last Contact",
      cell: ({ row }) => <span className="text-[11px] text-slate-500 font-medium">{formatRelative(row.original.lastContactedAt)}</span>,
    },
    {
      accessorKey: "createdAt", header: "Added",
      cell: ({ row }) => <span className="text-[11px] text-slate-500 font-medium">{formatDateShort(row.original.createdAt)}</span>,
    },
    {
      id: "actions", header: "", enableSorting: false, size: 65,
      cell: ({ row }) => (
        <Link href={`/admin/staff-leads/${row.original.id}`} onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] hover:text-[#15803D] hover:underline whitespace-nowrap">
          Open <ExternalLink size={10} />
        </Link>
      ),
    },
  ], [protect, revealed, reveal, isPending, handleInlineStatusChange, copiedPhoneId, handleCopyPhone]);

  const table = useReactTable({
    data, columns,
    state: { sorting, rowSelection, columnVisibility, pagination: { pageIndex, pageSize } },
    getRowId: (row) => row.id,
    manualPagination: true, manualSorting: true, manualFiltering: true,
    pageCount,
    onSortingChange: setSorting, onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), enableRowSelection: true,
  });

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((k) => rowSelection[k]), [rowSelection]);
  const selectedCount = selectedIds.length;
  const clearSelection = () => setRowSelection({});

  // ── Bulk actions ──
  const runBulk = (fn: () => Promise<{ ok: boolean; msg: string }>) => {
    startTransition(async () => {
      const { ok, msg } = await fn();
      showToast(ok ? "success" : "error", msg);
      if (ok) { clearSelection(); fetchLeads(); }
    });
  };

  const handleBulkAssign = (staffId: string) => {
    if (!staffId) return;
    const member = staff.find((s) => s.id === staffId);
    runBulk(async () => {
      const res = await assignLeadsAction(staffId, selectedIds);
      return res.success && res.data
        ? { ok: true, msg: `Assigned ${res.data.assigned} lead(s) to ${member?.name || "staff"}.` }
        : { ok: false, msg: res.error ?? "Assignment failed" };
    });
  };

  const handleBulkStatus = (status: StaffLeadStatus) => {
    runBulk(async () => {
      const res = await bulkUpdateLeadStatusAction(selectedIds, status);
      return res.success && res.data
        ? { ok: true, msg: `Updated ${res.data.updated} lead(s) → ${STATUS_META[status].label}.` }
        : { ok: false, msg: res.error ?? "Update failed" };
    });
  };

  const handleBulkPromote = () => {
    if (!confirm(`Promote ${selectedCount} lead(s) to live profiles? This creates user accounts.`)) return;
    runBulk(async () => {
      const res = await bulkPromoteLeadsToProfilesAction(selectedIds);
      return res.success && res.data
        ? { ok: true, msg: `Promoted ${res.data.promotedCount} lead(s).${res.data.errors.length ? ` ${res.data.errors.length} failed.` : ""}` }
        : { ok: false, msg: res.error ?? "Promotion failed" };
    });
  };

  const handleExportCsv = () => {
    const rows = selectedCount > 0 ? data.filter((l) => rowSelection[l.id]) : data;
    const header = ["Name", "Phone", "Email", "Location", "Subjects", "Status", "Assigned To", "Next Follow-up"];
    const csv = [
      header.join(","),
      ...rows.map((l) => [
        l.name ?? "", l.phone ?? "", l.email ?? "", l.location ?? "",
        (l.subjects ?? []).join(" | "), l.status, l.assignedTo?.name ?? "",
        l.nextFollowUpAt ? formatDateShort(l.nextFollowUpAt) : "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `staff-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("success", `Exported ${rows.length} lead(s) to CSV.`);
  };

  const activeFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) + (typeFilter !== "ALL" ? 1 : 0) +
    (assignFilter !== "ALL" ? 1 : 0) + (batchFilter !== "ALL" ? 1 : 0) + (search ? 1 : 0);

  const resetFilters = () => {
    setSearchInput(""); setSearch(""); setStatusFilter("ALL");
    setTypeFilter("ALL"); setAssignFilter("ALL"); setBatchFilter("ALL");
  };

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"><X size={13} /></button>
        </div>
      )}

      {/* ── Shift Gate (Prompts Clock-In when Off-Shift) ── */}
      <StaffShiftGate />

      {/* ── Interactive Stage Ribbon / Quick Filters ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: "ALL", label: `🌟 All Leads (${total})`, filterFn: () => { setStatusFilter("ALL"); setTypeFilter("ALL"); } },
          { key: "FRESH", label: "🔥 Fresh Uncalled", filterFn: () => { setStatusFilter("NEW"); setTypeFilter("ALL"); } },
          { key: "FOLLOW_UP", label: "⏰ Follow-ups Due", filterFn: () => { setStatusFilter("FOLLOW_UP"); setTypeFilter("ALL"); } },
          { key: "CONTACTED", label: "📞 Connected", filterFn: () => { setStatusFilter("CONTACTED"); setTypeFilter("ALL"); } },
          { key: "NO_ANSWER", label: "📵 Retry (No Answer)", filterFn: () => { setStatusFilter("NO_ANSWER"); setTypeFilter("ALL"); } },
          { key: "CONVERTED", label: "🎉 Converted", filterFn: () => { setStatusFilter("CONVERTED"); setTypeFilter("ALL"); } },
          { key: "TUTORS", label: "🎓 Tutors Only", filterFn: () => { setTypeFilter("TUTOR"); } },
          { key: "PARENTS", label: "👨‍👩‍👧 Parents Only", filterFn: () => { setTypeFilter("PARENT"); } },
        ].map((item) => {
          const isSelected =
            item.key === "ALL" ? statusFilter === "ALL" && typeFilter === "ALL"
            : item.key === "FRESH" ? statusFilter === "NEW"
            : item.key === "FOLLOW_UP" ? statusFilter === "FOLLOW_UP"
            : item.key === "CONTACTED" ? statusFilter === "CONTACTED"
            : item.key === "NO_ANSWER" ? statusFilter === "NO_ANSWER"
            : item.key === "CONVERTED" ? statusFilter === "CONVERTED"
            : item.key === "TUTORS" ? typeFilter === "TUTOR"
            : item.key === "PARENTS" ? typeFilter === "PARENT"
            : false;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.filterFn}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all cursor-pointer text-xs ${
                isSelected
                  ? "bg-[#0F2540] text-white shadow-xs font-black"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── Compact Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 p-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, phone, location…"
              className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] focus:bg-white transition-all" />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Type toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["ALL", "TUTOR", "PARENT"] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`rounded-md px-2.5 py-1.5 text-[10px] font-extrabold transition-all cursor-pointer ${
                  typeFilter === t
                    ? t === "PARENT" ? "bg-blue-600 text-white shadow-sm" : t === "TUTOR" ? "bg-[#16A34A] text-white shadow-sm" : "bg-[#0F2540] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}>
                {t === "ALL" ? "All" : t === "TUTOR" ? "Tutors" : "Parents"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffLeadStatus | "ALL")}
            className="px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 cursor-pointer">
            <option value="ALL">All status</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>

          {/* More filters */}
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
              showFilters || activeFilterCount > 2 ? "border-[#16A34A] bg-emerald-50 text-[#16A34A]" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}>
            <Filter size={12} /> More
            {activeFilterCount > 2 && <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white text-[9px] font-extrabold flex items-center justify-center">{activeFilterCount}</span>}
          </button>

          {/* Columns */}
          <div className="relative">
            <button onClick={() => setShowColMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-white cursor-pointer">
              <Columns3 size={12} /> <ChevronDown size={10} />
            </button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[160px]">
                  {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((col) => (
                    <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer capitalize">
                      <input type="checkbox" className="h-3 w-3 rounded accent-[#16A34A]" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                      {col.id === "nextFollowUpAt" ? "Follow-up" : col.id === "createdAt" ? "Added" : col.id === "lastContactedAt" ? "Last contact" : col.id === "assignedTo" ? "Owner" : col.id}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ⚡ Power Dial Queue CTA */}
          <button
            type="button"
            onClick={() => setIsPowerDialing(true)}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Launch Power Dialer on current list"
          >
            <Zap size={13} className="fill-slate-950" />
            <span>⚡ Power Dial ({data.length})</span>
          </button>

          {/* 💡 Feature Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-600 bg-slate-50 hover:bg-white text-xs font-bold cursor-pointer transition-colors"
            title="Open Feature Guide"
          >
            <HelpCircle size={13} className="text-amber-500" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Refresh */}
          <button onClick={fetchLeads} disabled={isPending} title="Refresh"
            className="flex items-center px-2.5 py-2 border border-slate-200 rounded-lg text-slate-600 bg-slate-50 hover:bg-white disabled:opacity-50 cursor-pointer">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>

          {isSuperAdmin && (
            <button onClick={handleExportCsv} title="Export CSV"
              className="flex items-center px-2.5 py-2 border border-slate-200 rounded-lg text-slate-600 bg-slate-50 hover:bg-white cursor-pointer">
              <Download size={12} />
            </button>
          )}
        </div>

        {/* Advanced filters row */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5 border-t border-slate-100 pt-2.5">
            <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white focus:outline-none max-w-[160px] cursor-pointer">
              <option value="ALL">All owners</option>
              <option value="UNASSIGNED">⚠ Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.email} ({s._count_leads})</option>)}
            </select>
            {batches.length > 0 && (
              <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white focus:outline-none max-w-[160px] cursor-pointer">
                <option value="ALL">All batches</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-red-600 cursor-pointer">
                <X size={12} /> Clear all ({activeFilterCount})
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                🔍 &quot;{search}&quot;
                <button onClick={() => { setSearchInput(""); setSearch(""); }} className="hover:text-red-600 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                {STATUS_META[statusFilter].label}
                <button onClick={() => setStatusFilter("ALL")} className="hover:text-red-600 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {assignFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                {assignFilter === "UNASSIGNED" ? "Unassigned" : staff.find((s) => s.id === assignFilter)?.name || "Staff"}
                <button onClick={() => setAssignFilter("ALL")} className="hover:text-red-600 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-[10px] font-bold text-slate-400 hover:text-red-600 cursor-pointer ml-1">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Bulk action bar (sticky) ── */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0F2540] px-4 py-2.5 text-white shadow-lg sticky bottom-4 z-20">
          <span className="text-xs font-extrabold flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#16A34A]" /> {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          {isSuperAdmin && (
            <select onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = ""; }} defaultValue="" disabled={isPending}
              className="rounded-lg bg-white/10 border border-white/20 px-2 py-1.5 text-[10px] font-bold text-white focus:outline-none cursor-pointer [&>option]:text-slate-800">
              <option value="" disabled>Assign to…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.email} ({s._count_leads})</option>)}
            </select>
          )}
          <select onChange={(e) => { if (e.target.value) handleBulkStatus(e.target.value as StaffLeadStatus); e.target.value = ""; }} defaultValue="" disabled={isPending}
            className="rounded-lg bg-white/10 border border-white/20 px-2 py-1.5 text-[10px] font-bold text-white focus:outline-none cursor-pointer [&>option]:text-slate-800">
            <option value="" disabled>Set status…</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <button onClick={handleBulkPromote} disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-[#16A34A] px-2.5 py-1.5 text-[10px] font-extrabold hover:bg-[#15803D] disabled:opacity-60 cursor-pointer">
            <Sparkles size={11} /> Promote
          </button>
          {isSuperAdmin && (
            <button onClick={handleExportCsv} disabled={isPending}
              className="flex items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-[10px] font-bold hover:bg-white/20 disabled:opacity-60 cursor-pointer">
              <Download size={11} /> Export
            </button>
          )}
          <button onClick={clearSelection} className="ml-auto flex items-center gap-1 text-[10px] font-bold text-white/60 hover:text-white cursor-pointer">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto relative">
          {isPending && !firstLoad && (
            <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#16A34A]" />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[1]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-slate-50/80 border-b border-slate-200">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th key={header.id}
                        className="text-left px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap select-none"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" ? <ArrowUp size={11} /> : sorted === "desc" ? <ArrowDown size={11} /> : <ChevronsUpDown size={11} className="opacity-30" />}
                          </button>
                        ) : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 && !isPending ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                    <Users size={28} className="mx-auto mb-2 opacity-25" />
                    <p className="font-bold text-slate-500 text-sm">No leads match your filters</p>
                    {activeFilterCount > 0
                      ? <button onClick={resetFilters} className="text-xs mt-1 text-[#16A34A] hover:underline cursor-pointer">Clear filters</button>
                      : <p className="text-xs mt-1"><Link href="/admin/staff-leads/upload" className="text-[#16A34A] hover:underline">Upload leads</Link> to get started</p>}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr key={row.id}
                    className={`transition-colors cursor-pointer ${
                      row.getIsSelected() ? "bg-emerald-50/60"
                        : idx % 2 === 0 ? "bg-white hover:bg-slate-50/70" : "bg-slate-50/30 hover:bg-slate-50/70"
                    }`}
                    onClick={() => {
                      setDrawerLead(row.original);
                      setDrawerIndex(idx);
                    }}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
            <span>{total === 0 ? "0" : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)}`} of <strong className="text-slate-700">{total.toLocaleString()}</strong></span>
            <div className="flex items-center gap-1">
              <span>Rows:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white focus:outline-none cursor-pointer">
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0 || isPending}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="text-[11px] font-bold text-slate-600 px-2 tabular-nums">{pageIndex + 1} / {pageCount}</span>
            <button onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1 || isPending}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {protect && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
          <AlertTriangle size={12} />
          {dutyForcedOff
            ? "You are locked off duty by an admin — contact details are hidden."
            : dutyStatus === "OFF_DUTY"
              ? "You are off duty. Go on duty from the top bar to reveal contact details."
              : "You appear idle — contacts are blurred. Move to continue. Each reveal is recorded."}
        </p>
      )}

      {/* ── High-Speed Slide-in Lead Detail Drawer ── */}
      <StaffLeadDetailDrawer
        lead={drawerLead}
        leadsList={data}
        currentIndex={drawerIndex}
        isOpen={!!drawerLead}
        onClose={() => setDrawerLead(null)}
        onSelectLead={(lead, idx) => {
          setDrawerLead(lead);
          setDrawerIndex(idx);
        }}
        onLeadUpdated={(updated) => {
          setData((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          setDrawerLead(updated);
        }}
        protectData={protect}
        isRevealed={drawerLead ? revealed.has(drawerLead.id) : false}
        onReveal={reveal}
      />

      {/* ── High-Speed Power Dialer Queue Modal ── */}
      {isPowerDialing && (
        <StaffPowerDialer
          leads={data}
          initialIndex={0}
          onClose={() => {
            setIsPowerDialing(false);
            fetchLeads();
          }}
          onLeadUpdated={(leadId, updated) => {
            setData((prev) => prev.map((l) => (l.id === leadId ? ({ ...l, ...updated } as any) : l)));
          }}
        />
      )}

      {/* ── Feature Guide & Cheatsheet Modal ── */}
      <StaffLeadsFeatureGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onLaunchDialer={() => setIsPowerDialing(true)}
      />
    </div>
  );
}
