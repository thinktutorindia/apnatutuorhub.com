import type { StaffLeadStatus } from "@prisma/client";

export type StatusMeta = {
  label: string;
  bg: string;
  text: string;
  dot: string;
  ring: string;
};

/** Shared visual metadata for every StaffLead workflow status. */
export const STATUS_META: Record<StaffLeadStatus, StatusMeta> = {
  NEW: { label: "New", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", ring: "ring-slate-200" },
  ASSIGNED: { label: "Assigned", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200" },
  CONTACTED: { label: "Contacted", bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500", ring: "ring-teal-200" },
  FOLLOW_UP: { label: "Follow Up", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200" },
  INTERESTED: { label: "Interested", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  NOT_INTERESTED: { label: "Not Interested", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", ring: "ring-red-200" },
  NO_ANSWER: { label: "No Answer", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", ring: "ring-orange-200" },
  CONVERTED: { label: "Converted", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", ring: "ring-green-200" },
  REJECTED: { label: "Rejected", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400", ring: "ring-red-200" },
  DUPLICATE: { label: "Duplicate", bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-300", ring: "ring-slate-200" },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as StaffLeadStatus[];

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status as StaffLeadStatus] ?? STATUS_META.NEW;
}

/** Statuses a lead can be "closed" into (used for filters/quick actions). */
export const OPEN_STATUSES: StaffLeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "NO_ANSWER",
];

export function formatDateShort(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return diff >= 0 ? `${mins}m ago` : `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return diff >= 0 ? `${hrs}h ago` : `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 30) return diff >= 0 ? `${days}d ago` : `in ${days}d`;
  return formatDateShort(d);
}

/** Mask a phone number for anti-data-theft display (e.g. +91 98••••••10). */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  return `${head}${"•".repeat(Math.max(4, digits.length - 4))}${tail}`;
}
