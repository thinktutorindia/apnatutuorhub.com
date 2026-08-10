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
          className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-800 transition-all bg-[#2D9E6B] hover:bg-[#238357] text-white disabled:opacity-50 cursor-pointer shadow-md"
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
          className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-800 transition-all bg-red-100 text-red-950 border border-red-300 hover:bg-red-200 disabled:opacity-50 cursor-pointer"
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
