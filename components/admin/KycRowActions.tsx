"use client";

import React, { useState, useTransition } from "react";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { approveKycAction, rejectKycAction } from "@/app/actions/admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";

interface KycRowActionsProps {
  tutorProfileId: string;
  tutorName: string;
  compact?: boolean;
}

export function KycRowActions({ tutorProfileId, tutorName, compact = false }: KycRowActionsProps) {
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
    <div className={compact ? "space-y-2" : "space-y-3 pt-2"}>
      <ActionOverlay
        isOpen={isApproving}
        title="Approving KYC Verification"
        subtitle={`Verifying tutor ID & issuing badge for ${tutorName}...`}
      />
      <ActionOverlay
        isOpen={isRejecting}
        title="Rejecting KYC Verification"
        subtitle={`Updating tutor status & sending notification for ${tutorName}...`}
      />
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "w-full" : "gap-3"}`}>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className={`flex items-center justify-center gap-1.5 text-xs font-800 bg-[#2D9E6B] hover:bg-[#238357] text-white disabled:opacity-50 cursor-pointer ${
            compact ? "flex-1 min-h-8 rounded-full px-2.5 py-1.5" : "rounded-full px-5 py-2.5"
          }`}
        >
          {isApproving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Approving...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={compact ? 14 : 16} />
              <span>{compact ? "Approve" : "Approve KYC"}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={isApproving || isRejecting}
          className={`flex items-center justify-center gap-2 text-xs font-800 disabled:opacity-50 cursor-pointer ${
            compact
              ? "flex-1 min-h-8 rounded-full px-2.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white"
              : "rounded-full px-5 py-2.5 bg-red-100 text-red-950 border border-red-300 hover:bg-red-200"
          }`}
        >
          <ShieldX size={compact ? 14 : 16} />
          <span>{showRejectForm ? "Cancel" : compact ? "Reject" : "Reject KYC"}</span>
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
            className="flex-1 rounded-2xl px-4 py-2.5 text-xs font-700 text-slate-900 outline-none bg-white border border-slate-300 focus:border-red-500"
          />
          <button
            type="submit"
            disabled={isRejecting}
            className="rounded-2xl px-5 py-2.5 text-xs font-800 text-white bg-red-600 hover:bg-red-700 transition-colors shrink-0 shadow-md cursor-pointer"
          >
            {isRejecting ? "Submitting..." : "Confirm Rejection"}
          </button>
        </form>
      )}
    </div>
  );
}
