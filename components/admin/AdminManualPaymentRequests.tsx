"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2, XCircle, Clock, ExternalLink, ShieldCheck,
  AlertCircle, Copy, Check, Eye, X, Loader2, ArrowUpRight
} from "lucide-react";
import {
  adminApprovePaymentAction,
  adminRejectPaymentAction,
} from "@/app/actions/manual-payment.actions";

interface PaymentRequestItem {
  id: string;
  type: "COIN_TOPUP" | "PLAN_SUBSCRIPTION";
  plan?: string | null;
  coinsAmount?: number | null;
  amountInr: number;
  utrNumber: string;
  screenshotUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string | Date;
  tutorProfile?: {
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    wallet?: {
      balance?: number | null;
    } | null;
  } | null;
}

export function AdminManualPaymentRequests({
  initialRequests,
  canManage,
}: {
  initialRequests: PaymentRequestItem[];
  canManage: boolean;
}) {
  const [requests, setRequests] = useState<PaymentRequestItem[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this payment and grant credits / activate plan?")) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await adminApprovePaymentAction(id);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
        );
        showToast("Payment Approved! Coins credited / plan activated.");
      } else {
        alert(res.error || "Approval failed.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to approve payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    const reason = rejectReason.trim() || "Payment verification could not be confirmed with BharatPe records.";

    setActionLoading(rejectModalId);
    try {
      const res = await adminRejectPaymentAction(rejectModalId, reason);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === rejectModalId ? { ...r, status: "REJECTED", rejectionReason: reason } : r))
        );
        showToast("Payment Request Rejected.");
        setRejectModalId(null);
        setRejectReason("");
      } else {
        alert(res.error || "Rejection failed.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to reject payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5 sm:p-7 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2540] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <h2 className="text-lg font-900 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Offline UPI QR Payment Verification
            </h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Review BharatPe QR receipts, verify UTR with bank records, and 1-click approve coin top-ups &amp; plans.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl shrink-0">
          {(["PENDING", "ALL", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-800 transition-all cursor-pointer ${
                statusFilter === tab
                  ? "bg-white text-[#0F2540] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab === "PENDING" ? `Pending (${pendingCount})` : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <p className="text-sm font-bold text-gray-700">No {statusFilter.toLowerCase()} payment requests found</p>
          <p className="text-xs text-gray-400">All submitted UPI payments are up to date.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10.5px] tracking-wider bg-gray-50/50">
                <th className="py-3 px-3">Tutor Details</th>
                <th className="py-3 px-3">Request Type &amp; Value</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">UTR Reference</th>
                <th className="py-3 px-3">Screenshot</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Tutor Details */}
                  <td className="py-3.5 px-3">
                    <p className="font-extrabold text-gray-900 text-sm">
                      {req.tutorProfile?.user?.name || "Tutor"}
                    </p>
                    <p className="text-gray-500 font-medium">{req.tutorProfile?.user?.email}</p>
                    <p className="text-gray-400 font-mono text-[11px]">{req.tutorProfile?.user?.phone || "No phone"}</p>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-3">
                    {req.type === "COIN_TOPUP" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 text-xs">
                        🪙 +{req.coinsAmount} Coins
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-extrabold border border-amber-200 text-xs">
                        👑 {req.plan} Membership
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 block mt-1">
                      {new Date(req.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-3 font-black text-gray-900 text-sm">
                    ₹{req.amountInr.toLocaleString("en-IN")}
                  </td>

                  {/* UTR */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg w-fit">
                      <span>{req.utrNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyUtr(req.utrNumber)}
                        title="Copy UTR"
                        className="text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {copiedUtr === req.utrNumber ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>

                  {/* Screenshot Thumbnail */}
                  <td className="py-3.5 px-3">
                    {req.screenshotUrl ? (
                      <button
                        type="button"
                        onClick={() => setActiveScreenshot(req.screenshotUrl)}
                        className="relative group w-14 h-14 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#2D9E6B] shadow-2xs cursor-pointer block transition-all"
                      >
                        <Image
                          src={req.screenshotUrl}
                          alt="Proof"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye size={16} />
                        </div>
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">No image</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3">
                    {req.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px]">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                    {req.status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    )}
                    {req.status === "REJECTED" && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-extrabold text-[11px]">
                          <XCircle size={12} /> Rejected
                        </span>
                        {req.rejectionReason && (
                          <p className="text-[10px] text-red-600 mt-1 max-w-[140px] truncate" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    {req.status === "PENDING" && canManage && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {actionLoading === req.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === req.id}
                          onClick={() => {
                            setRejectModalId(req.id);
                            setRejectReason("");
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-extrabold text-xs cursor-pointer transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {req.status !== "PENDING" && (
                      <span className="text-gray-400 font-medium text-xs">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Screenshot Enlarge Modal */}
      {activeScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-3xl p-4 space-y-3 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs font-black text-gray-800">Payment Proof Screenshot</span>
              <div className="flex items-center gap-2">
                <a
                  href={activeScreenshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#2D9E6B] hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Open Full Size
                </a>
                <button
                  type="button"
                  onClick={() => setActiveScreenshot(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={activeScreenshot}
                alt="Enlarged screenshot"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-red-700 flex items-center gap-1.5">
                <AlertCircle size={17} /> Reject Payment Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason for Rejection (Visible to Tutor):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR number not found in BharatPe / Amount mismatch"
                className="w-full p-3 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
