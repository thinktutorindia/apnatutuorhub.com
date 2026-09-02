import Link from "next/link";
import { Clock, History, ListTodo } from "lucide-react";
import type { StaffRecordType } from "@/lib/staff-lead-type";

export function getStaffNextStep(opts: {
  type: StaffRecordType;
  status: string;
  isPromoted: boolean;
  hasPhone: boolean;
  nextFollowUpAt?: Date | string | null;
}): { title: string; detail: string } {
  if (opts.isPromoted) {
    return { title: "Done — already in the main database", detail: "Open User Directory if you need to edit KYC or the account." };
  }
  if (!opts.hasPhone) {
    return { title: "Collect a phone number first", detail: "You cannot call or convert until a number is saved." };
  }
  if (opts.nextFollowUpAt && new Date(opts.nextFollowUpAt).getTime() <= Date.now()) {
    return { title: "Follow-up is due — call now", detail: "Log the outcome so yesterday’s work does not get lost." };
  }
  if (opts.status === "NEW" || opts.status === "ASSIGNED") {
    return { title: "First call", detail: "Confirm who they are, then switch Parent / Tutor if the dump was wrong." };
  }
  if (opts.status === "NO_ANSWER" || opts.status === "FOLLOW_UP") {
    return { title: "Retry and set the next slot", detail: "Keep a future follow-up so this stays on the queue." };
  }
  if (opts.status === "INTERESTED" || opts.status === "CONTACTED") {
    return opts.type === "PARENT"
      ? { title: "Post this as a student requirement", detail: "Use Student Leads — do not promote as a tutor." }
      : { title: "Promote to tutor profile", detail: "Only after name, phone, city and subjects look correct." };
  }
  if (opts.status === "CONVERTED") {
    return { title: "Mark the finish line", detail: opts.type === "PARENT" ? "Confirm the requirement is live in Student Leads." : "Confirm the tutor account exists." };
  }
  return { title: "Review and close or retry", detail: "Update notes so the next staff member knows what already happened." };
}

export function StaffLeadWorkPlan({
  type,
  status,
  isPromoted,
  hasPhone,
  nextFollowUpAt,
  lastContactedAt,
  callCount,
  assignedTo,
}: {
  type: StaffRecordType;
  status: string;
  isPromoted: boolean;
  hasPhone: boolean;
  nextFollowUpAt?: Date | string | null;
  lastContactedAt?: Date | string | null;
  callCount: number;
  assignedTo?: string | null;
}) {
  const next = getStaffNextStep({ type, status, isPromoted, hasPhone, nextFollowUpAt });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="ath-panel p-4 space-y-1.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-[#64748B]">
          <History size={12} /> Work already done
        </p>
        <p className="text-sm font-800 text-[#0F2540]">{callCount} call{callCount === 1 ? "" : "s"} logged</p>
        <p className="text-xs font-600 text-slate-600">
          {lastContactedAt
            ? `Last contact ${new Date(lastContactedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "No call yet"}
          {assignedTo ? ` · Owner: ${assignedTo}` : " · Unassigned"}
        </p>
      </div>
      <div className="ath-panel p-4 space-y-1.5 border-[#2D9E6B]/30">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-[#2D9E6B]">
          <ListTodo size={12} /> Do next
        </p>
        <p className="text-sm font-800 text-[#0F2540]">{next.title}</p>
        <p className="text-xs font-600 text-slate-600">{next.detail}</p>
      </div>
      <div className="ath-panel p-4 space-y-1.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-[#64748B]">
          <Clock size={12} /> Future work
        </p>
        <p className="text-sm font-800 text-[#0F2540]">
          {nextFollowUpAt
            ? new Date(nextFollowUpAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            : "No follow-up booked"}
        </p>
        <p className="text-xs font-600 text-slate-600">
          {type === "PARENT" ? (
            <>
              End state: live post in{" "}
              <Link href="/admin/leads" className="font-800 !text-[#2563EB]">
                Student Leads
              </Link>
            </>
          ) : (
            "End state: tutor profile in User Directory (KYC still needed)"
          )}
        </p>
      </div>
    </div>
  );
}
