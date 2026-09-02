"use client";

import { useTransition } from "react";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { setStaffLeadRecordTypeAction } from "@/app/actions/staff-leads.actions";
import type { StaffRecordType } from "@/lib/staff-lead-type";

export function StaffLeadTypeBadge({ type }: { type: StaffRecordType }) {
  const isParent = type === "PARENT";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-800 ${
        isParent ? "bg-[#E8F1FB] text-[#1D4ED8]" : "bg-[#E8F7F0] text-[#166534]"
      }`}
    >
      {isParent ? <Users size={11} /> : <GraduationCap size={11} />}
      {isParent ? "Parent" : "Tutor"}
    </span>
  );
}

export function StaffLeadTypeControl({
  leadId,
  type,
  onChanged,
}: {
  leadId: string;
  type: StaffRecordType;
  onChanged?: (next: StaffRecordType, notes: string) => void;
}) {
  const [pending, start] = useTransition();

  function setType(next: StaffRecordType) {
    if (next === type) return;
    start(async () => {
      const res = await setStaffLeadRecordTypeAction(leadId, next);
      if (res.success && res.data) onChanged?.(next, res.data.staffNotes);
    });
  }

  return (
    <div className="inline-flex rounded-full border border-[#CBD5E1] bg-white p-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => setType("TUTOR")}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-800 ${
          type === "TUTOR" ? "bg-[#2D9E6B] text-white" : "text-[#0F2540] hover:bg-slate-50"
        }`}
      >
        {pending && type !== "TUTOR" ? <Loader2 size={11} className="animate-spin" /> : <GraduationCap size={12} />}
        Tutor
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setType("PARENT")}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-800 ${
          type === "PARENT" ? "bg-[#2563EB] text-white" : "text-[#0F2540] hover:bg-slate-50"
        }`}
      >
        {pending && type !== "PARENT" ? <Loader2 size={11} className="animate-spin" /> : <Users size={12} />}
        Parent
      </button>
    </div>
  );
}
