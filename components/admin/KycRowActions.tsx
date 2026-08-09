"use client";

import React, { useState, useTransition } from "react";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { approveKycAction, rejectKycAction } from "@/app/actions/admin.actions";

interface KycRowActionsProps {
  tutorProfileId: string;
  tutorName: string;
}

export function KycRowActions({ tutorProfileId, tutorName }: KycRowActionsProps) {
  const [isApproving, startApproveTransition] = useTransition();
  const [isRejecting, startRejectTransition] = useTransition();
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = () => {
    startApproveTransition(async () => {
      await approveKycAction(tutorProfileId);
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionNote.trim()) return;

    startRejectTransition(async () => {
      const formData = new FormData();
      formData.append("tutorProfileId", tutorProfileId);
      formData.append("rejectionNote", rejectionNote);
      await rejectKycAction(formData);
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all bg-[#22C55E] text-[#0F172A] hover:bg-[#16a34a] disabled:opacity-50 cursor-pointer"
        >
          {isApproving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Approving KYC...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>Approve KYC</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 cursor-pointer"
        >
          <ShieldX size={16} />
          <span>{showRejectForm ? "Cancel Rejection" : "Reject KYC"}</span>
        </button>
      </div>

      {showRejectForm && (
        <form onSubmit={handleRejectSubmit} className="flex flex-col sm:flex-row gap-2 pt-2 animate-in fade-in duration-200">
          <input
            type="text"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            required
            placeholder="Enter reason for rejection (required)..."
            className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-red-500/50"
          />
          <button
            type="submit"
            disabled={isRejecting || !rejectionNote.trim()}
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-red-500 text-slate-950 hover:bg-red-400 disabled:opacity-50 cursor-pointer"
          >
            {isRejecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <span>Confirm Rejection</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
