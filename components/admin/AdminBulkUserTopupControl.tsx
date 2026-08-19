"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Filter, Search, CheckSquare, Square, ShieldCheck, ShieldAlert, Sparkles,
  Coins, CheckCircle2, XCircle, ArrowUpRight, UserCheck, UserX, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp
} from "lucide-react";
import {
  adminFetchFilteredUsersForGovernanceAction,
  adminBulkUserGovernanceAction,
  type UserGovernanceFilterInput,
} from "@/app/actions/admin.actions";

export function AdminBulkUserTopupControl() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [q, setQ] = useState("");
  const [ageGroup, setAgeGroup] = useState<"ALL" | "NEW" | "OLD">("ALL");
  const [kycStatus, setKycStatus] = useState<"ALL" | "VERIFIED" | "UNVERIFIED" | "PENDING">("ALL");
  const [plan, setPlan] = useState<"ALL" | "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM">("ALL");
  const [role, setRole] = useState<"ALL" | "TUTOR" | "PARENT">("TUTOR");
  const [topupStatus, setTopupStatus] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [page, setPage] = useState(1);

  // Data State
  const [users, setUsers] = useState<Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    isVerified: boolean;
    kycStatus: string;
    subscriptionPlan: string;
    canTopup: boolean;
    isOldUser: boolean;
    walletBalance: number;
  }>>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Coin Grant Modal State
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [coinsToGrant, setCoinsToGrant] = useState<number>(50);
  const [grantReason, setGrantReason] = useState<string>("Admin Bulk Loyalty Bonus");

  // Fetch Users on Filter Change
  const fetchUsers = () => {
    startTransition(async () => {
      const res = await adminFetchFilteredUsersForGovernanceAction({
        q,
        ageGroup,
        kycStatus,
        plan,
        role,
        topupStatus,
        page,
        take: 20,
      });

      if (res.success && res.data) {
        setUsers(res.data.users);
        setTotal(res.data.total);
        // Clear selections if not in new dataset
        setSelectedIds([]);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to load users." });
      }
    });
  };

  useEffect(() => {
    if (isExpanded) {
      fetchUsers();
    }
  }, [isExpanded, q, ageGroup, kycStatus, plan, role, topupStatus, page]);

  // Selection Helpers
  const toggleSelectAll = () => {
    if (selectedIds.length === users.length && users.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Execution Handler
  const handleBulkAction = (actionType: "ENABLE_TOPUP" | "DISABLE_TOPUP" | "MARK_OLD_USER" | "MARK_NEW_USER" | "GRANT_COINS") => {
    if (selectedIds.length === 0) {
      setStatusMessage({ type: "error", text: "Please select at least one user." });
      return;
    }

    if (actionType === "GRANT_COINS" && !coinModalOpen) {
      setCoinModalOpen(true);
      return;
    }

    startTransition(async () => {
      const res = await adminBulkUserGovernanceAction({
        userIds: selectedIds,
        actionType,
        coinsAmount: coinsToGrant,
        reason: grantReason,
      });

      if (res.success && res.data) {
        setStatusMessage({
          type: "success",
          text: `Action executed successfully for ${res.data.affectedCount} users!`,
        });
        setCoinModalOpen(false);
        fetchUsers();
      } else {
        setStatusMessage({ type: "error", text: res.error || "Execution failed." });
      }
    });
  };

  const handleSingleToggleTopup = (userId: string, targetCanTopup: boolean) => {
    startTransition(async () => {
      const res = await adminBulkUserGovernanceAction({
        userIds: [userId],
        actionType: targetCanTopup ? "ENABLE_TOPUP" : "DISABLE_TOPUP",
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Top-Up access ${targetCanTopup ? "ENABLED" : "RESTRICTED"} for user!`,
        });
        fetchUsers();
      } else {
        setStatusMessage({ type: "error", text: res.error || "Action failed." });
      }
    });
  };

  const totalPages = Math.ceil(total / 20);

  if (!isExpanded) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Coins size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className="font-bold text-[#0F2540] text-sm"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Bulk Top-Up Governance &amp; User Categorization
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Optional Tools
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Filter users by age, KYC status, or tier to enable/disable coin top-ups and grant bulk bonus coins.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer border border-slate-200 shadow-2xs active:scale-98"
        >
          <span>Open Bulk Controls</span>
          <ChevronDown size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md text-slate-900 animate-in fade-in duration-200">
      {/* Title & Status Message */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#2D9E6B] flex items-center gap-1.5">
            <Coins size={14} /> Bulk User Top-Up Governance &amp; Controls
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F2540]" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Top-Up Access &amp; User Categorization
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Filter users by age, KYC verification, or tier to enable/disable coin top-ups and grant bulk bonus coins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin text-[#2D9E6B]" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer border border-slate-200"
          >
            <span>Hide Controls</span>
            <ChevronUp size={14} />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-300 text-emerald-950"
              : "bg-red-50 border border-red-300 text-red-950"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Detailed Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
          <Filter size={14} className="text-[#2D9E6B]" />
          <span>Detailed Governance Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name/Email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
            />
          </div>

          {/* User Age */}
          <select
            value={ageGroup}
            onChange={(e) => {
              setAgeGroup(e.target.value as any);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
          >
            <option value="ALL">Age: All Tutors</option>
            <option value="NEW">New Tutors (&lt;30 Days)</option>
            <option value="OLD">Old Tutors (≥30 Days / Marked Old)</option>
          </select>

          {/* KYC Status */}
          <select
            value={kycStatus}
            onChange={(e) => {
              setKycStatus(e.target.value as any);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
          >
            <option value="ALL">Verification: All</option>
            <option value="VERIFIED">Verified Tutors</option>
            <option value="UNVERIFIED">Unverified Tutors</option>
            <option value="PENDING">KYC Review Pending</option>
          </select>

          {/* Membership Tier */}
          <select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as any);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
          >
            <option value="ALL">Plan: All Tiers</option>
            <option value="NONE">Free Tier (No Plan)</option>
            <option value="BRONZE">Bronze Plan (₹6k)</option>
            <option value="SILVER">Silver Plan (₹9k)</option>
            <option value="GOLD">Gold Plan (₹12k)</option>
            <option value="PLATINUM">Platinum VIP (₹24k)</option>
          </select>

          {/* Top-up Access */}
          <select
            value={topupStatus}
            onChange={(e) => {
              setTopupStatus(e.target.value as any);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
          >
            <option value="ALL">Top-Up: All Statuses</option>
            <option value="ENABLED">Top-Up Enabled</option>
            <option value="DISABLED">Top-Up Restricted</option>
          </select>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as any);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
          >
            <option value="TUTOR">Role: Tutors</option>
            <option value="PARENT">Role: Parents</option>
            <option value="ALL">Role: All Users</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F2540] text-white shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            {selectedIds.length === users.length && users.length > 0 ? (
              <CheckSquare size={16} className="text-[#2D9E6B]" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            <span>Select All on Page ({users.length})</span>
          </button>

          <span className="px-3 py-1 rounded-full bg-white/10 text-yellow-300 text-xs font-black">
            {selectedIds.length} Selected
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => handleBulkAction("ENABLE_TOPUP")}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            Enable Top-Up Access
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => handleBulkAction("DISABLE_TOPUP")}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            Disable Top-Up Access
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => handleBulkAction("MARK_OLD_USER")}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            Mark as Old Tutors
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => handleBulkAction("GRANT_COINS")}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-black transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Coins size={14} />
            <span>Grant Bulk Coins</span>
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-700 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[#0F2540] font-black uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4 w-10">Select</th>
              <th className="py-3 px-4">User Details</th>
              <th className="py-3 px-4 text-center">Account Age</th>
              <th className="py-3 px-4 text-center">Verification Status</th>
              <th className="py-3 px-4 text-center">Membership Plan</th>
              <th className="py-3 px-4 text-center">Wallet Balance</th>
              <th className="py-3 px-4 text-center">Top-Up Permission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {isPending ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 size={24} className="animate-spin text-[#2D9E6B]" />
                    <span>Loading filtered users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                  No users found matching current filters.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(u.id)}
                        className="w-4 h-4 rounded text-[#2D9E6B] focus:ring-[#2D9E6B] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[#0F2540] text-xs sm:text-sm">
                          {u.name || "Unnamed User"}
                        </span>
                        <span className="text-slate-500 text-[11px] font-bold">{u.email}</span>
                        {u.phone && (
                          <span className="text-slate-400 text-[10px] font-semibold">{u.phone}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        {u.isOldUser ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                            Old Tutor
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">
                            New Tutor
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Reg: {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                          <ShieldCheck size={12} className="text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                          <ShieldAlert size={12} className="text-slate-400" />
                          <span>Unverified ({u.kycStatus})</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] ${
                          u.subscriptionPlan === "PLATINUM"
                            ? "bg-purple-100 text-purple-950 border border-purple-400 font-black"
                            : u.subscriptionPlan === "GOLD"
                            ? "bg-yellow-100 text-yellow-950 border border-yellow-400 font-black"
                            : u.subscriptionPlan === "SILVER"
                            ? "bg-blue-100 text-blue-950 border border-blue-300 font-black"
                            : u.subscriptionPlan === "BRONZE"
                            ? "bg-amber-100 text-amber-950 border border-amber-300 font-black"
                            : "text-slate-400 font-bold"
                        }`}
                      >
                        {u.subscriptionPlan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-[#0F2540]">
                      🪙 {u.walletBalance} Coins
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.canTopup ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSingleToggleTopup(u.id, false)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black bg-emerald-100 hover:bg-red-100 text-emerald-950 hover:text-red-950 border border-emerald-300 hover:border-red-300 transition-all cursor-pointer shadow-xs"
                          title="Click to restrict top-up access"
                        >
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Allowed (Click to Restrict)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSingleToggleTopup(u.id, true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-amber-950 hover:text-white border border-amber-400 transition-all cursor-pointer shadow-md hover:scale-105"
                          title="Click to enable top-up access for this user"
                        >
                          <Sparkles size={13} />
                          <span>Enable Top-Up Access</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
        <div>
          Showing page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages || 1}</strong> (Total <strong className="text-[#2D9E6B]">{total}</strong> users)
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isPending}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isPending}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Grant Coins Modal */}
      {coinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#0F2540] flex items-center gap-2">
                <Coins size={18} className="text-amber-500" />
                <span>Grant Bulk Bonus Coins</span>
              </h3>
              <button
                type="button"
                onClick={() => setCoinModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-600">
              Credit bonus wallet coins directly to all <strong>{selectedIds.length} selected users</strong>.
            </p>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">Coins Amount per User:</label>
                <input
                  type="number"
                  min={1}
                  value={coinsToGrant}
                  onChange={(e) => setCoinsToGrant(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-black text-[#0F2540] focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Grant Reason / Transaction Log:</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D9E6B]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCoinModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBulkAction("GRANT_COINS")}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                <span>Confirm &amp; Grant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
