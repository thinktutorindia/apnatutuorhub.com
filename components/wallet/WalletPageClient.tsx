"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, ArrowUpRight, ArrowDownLeft, RotateCcw, Gift, ShieldCheck, Plus, Sparkles } from "lucide-react";
import type { WalletTransactionType } from "@prisma/client";
import { TopUpModal } from "@/components/wallet/TopUpModal";

type Transaction = {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
};

const TX_CONFIG: Record<
  WalletTransactionType,
  { label: string; icon: React.ElementType; bg: string; color: string; sign: string }
> = {
  PURCHASE: {
    label: "Coin Top-up",
    icon: ArrowUpRight,
    bg: "#E8F5F0",
    color: "#1A7F5A",
    sign: "+",
  },
  DEDUCTION: {
    label: "Unlocked Parent Contact",
    icon: ArrowDownLeft,
    bg: "#FEF2F2",
    color: "#DC2626",
    sign: "-",
  },
  REFUND: {
    label: "Refund",
    icon: RotateCcw,
    bg: "#EFF6FF",
    color: "#2563EB",
    sign: "+",
  },
  BONUS: {
    label: "Bonus Coins",
    icon: Gift,
    bg: "#FEF3C7",
    color: "#D97706",
    sign: "+",
  },
  ADMIN_CREDIT: {
    label: "Admin Credit",
    icon: ShieldCheck,
    bg: "#F3E8FF",
    color: "#7C3AED",
    sign: "+",
  },
  ADMIN_DEBIT: {
    label: "Admin Debit",
    icon: ShieldCheck,
    bg: "#FEF2F2",
    color: "#DC2626",
    sign: "-",
  },
};

const ALL_TYPES: (WalletTransactionType | "ALL")[] = [
  "ALL",
  "PURCHASE",
  "DEDUCTION",
  "REFUND",
  "BONUS",
];

const FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  PURCHASE: "Top-ups",
  DEDUCTION: "Spent",
  REFUND: "Refunds",
  BONUS: "Bonuses",
};

export function WalletPageClient({
  balance,
  totalPurchased,
  totalSpent,
  transactions,
  userEmail,
  userName,
  canTopup = true,
  isOldUser = false,
}: {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  transactions: Transaction[];
  userEmail: string;
  userName: string;
  canTopup?: boolean;
  isOldUser?: boolean;
}) {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [filter, setFilter] = useState<WalletTransactionType | "ALL">("ALL");
  const [liveBalance, setLiveBalance] = useState(balance);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const filtered =
    filter === "ALL" ? transactions : transactions.filter((t) => t.type === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTopUpSuccess = (coins: number) => {
    setLiveBalance((prev) => prev + coins);
    setTopUpOpen(false);
  };

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Top-up restriction banner if disabled */}
        {!canTopup && (
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-black text-amber-950">Coin Top-Up Restricted for New Accounts</p>
                <p className="text-amber-800 font-bold">
                  Direct coin top-up is available for existing tutors &amp; active annual plan members. Upgrade to a plan for monthly lead quotas!
                </p>
              </div>
            </div>
            <Link
              href="/tutor/plans"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 !text-white font-extrabold shrink-0 shadow-sm transition-all"
            >
              View Membership Plans →
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-xs">
          <div>
            <span className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B] block mb-1">
              Tutor Wallet &amp; Credits
            </span>
            <h1 className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Coin Wallet
            </h1>
            <p className="text-sm text-gray-600 font-600 mt-1">
              Use coins to connect with interested parents and unlock direct tuition enquiries.
            </p>
          </div>

          {canTopup ? (
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="btn-shine px-6 py-3 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 shrink-0 flex items-center gap-2 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-md hover:shadow-xl hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span className="!text-white font-800">Top Up Coins</span>
            </button>
          ) : (
            <Link
              href="/tutor/plans"
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 !text-white text-xs font-800 shrink-0 flex items-center gap-2 shadow-md transition-all"
            >
              <Sparkles size={15} />
              <span>Upgrade Plan to Unlock Top-up</span>
            </Link>
          )}
        </div>

        {/* Balance Card + Stats */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Current Balance */}
          <div className="group col-span-1 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-amber-500/15 border border-amber-300/80 shadow-xs hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 ease-out hover:-translate-y-1.5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center text-2xl shadow-2xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              🪙
            </div>
            <div>
              <p className="text-xs font-800 uppercase tracking-wider text-amber-900">
                Current Balance
              </p>
              <p className="text-4xl font-800 text-[#0F2540] tracking-tight mt-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                {liveBalance} <span className="text-2xl font-700 text-amber-600">Coins</span>
              </p>
            </div>
            {canTopup ? (
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="btn-shine w-full py-2.5 px-4 rounded-xl bg-[#0F2540] hover:bg-black !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-md cursor-pointer mt-1"
              >
                <Plus size={14} />
                <span className="!text-white font-800">Buy Coins Now</span>
              </button>
            ) : (
              <Link
                href="/tutor/plans"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 !text-white text-xs font-800 flex items-center justify-center gap-1.5 transition-all shadow-md mt-1"
              >
                <span>Explore Membership Plans</span>
              </Link>
            )}
          </div>

          {/* Total Purchased */}
          <div className="group rounded-3xl p-6 bg-white border border-gray-200/90 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-300 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-800 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <ArrowUpRight size={20} />
            </div>
            <p className="text-xs font-800 uppercase tracking-wider text-gray-500">Total Purchased</p>
            <p className="text-3xl font-800 text-[#0F2540] tracking-tight group-hover:text-[#2D9E6B] transition-colors" style={{ fontFamily: "Poppins, sans-serif" }}>
              {totalPurchased} <span className="text-lg font-700 text-gray-500">🪙</span>
            </p>
          </div>

          {/* Total Spent */}
          <div className="group rounded-3xl p-6 bg-white border border-gray-200/90 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:border-emerald-200 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-800 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <ArrowDownLeft size={20} />
            </div>
            <p className="text-xs font-800 uppercase tracking-wider text-gray-500">Total Spent</p>
            <p className="text-3xl font-800 text-[#0F2540] tracking-tight group-hover:text-blue-600 transition-colors" style={{ fontFamily: "Poppins, sans-serif" }}>
              {totalSpent} <span className="text-lg font-700 text-gray-500">🪙</span>
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <section className="rounded-3xl p-6 bg-white border border-gray-200/90 shadow-xs space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Transaction History
              </h2>
              <p className="text-xs text-gray-600 font-600">Track all coin top-ups, unlocks, refunds, and bonuses</p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => {
                const isActive = filter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFilter(type);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-800 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-[#2D9E6B] text-white shadow-xs scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                    }`}
                  >
                    {FILTER_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
                🪙
              </div>
              <p className="text-sm font-700 text-gray-800">No transactions recorded yet</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Top up your coin wallet to start unlocking parent contacts and receiving tuition leads.
              </p>
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="btn-shine px-5 py-2.5 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 inline-flex items-center gap-1.5 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow cursor-pointer mt-2"
              >
                <Plus size={14} />
                <span className="!text-white font-800">Buy Your First Coins</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginated.map((tx) => {
                const config = TX_CONFIG[tx.type] ?? TX_CONFIG.PURCHASE;
                const Icon = config.icon;
                const isPending =
                  tx.type === "REFUND" &&
                  tx.description === "REFUND_REQUEST_PENDING";

                return (
                  <div key={tx.id} className="flex items-center gap-4 py-4 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-800 text-[#0F2540]">
                        {isPending
                          ? "Refund Request — Pending Review"
                          : (tx.description ?? config.label)}
                      </p>
                      <p className="text-xs font-600 text-gray-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-800" style={{ color: config.color }}>
                        {config.sign}{tx.amount} 🪙
                      </p>
                      <p className="text-[11px] font-600 text-gray-500">
                        Balance: {tx.balanceAfter} 🪙
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl text-xs font-800 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-xs font-700 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl text-xs font-800 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </section>

        {/* Coin Cost Guide */}
        <section className="rounded-3xl p-6 bg-white border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Coin Cost Guide
              </h2>
              <p className="text-xs text-gray-600 font-600">Standard coin deduction rates per student lead unlock</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Class 1–8", cost: 20, badge: "Primary & Middle", bg: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-950" },
              { label: "Class 9–12", cost: 30, badge: "Board Prep", bg: "bg-blue-50 border-blue-200", textColor: "text-blue-950" },
              { label: "JEE / NEET / Coding", cost: 50, badge: "Entrance & Tech", bg: "bg-amber-50 border-amber-200", textColor: "text-amber-950" },
            ].map((tier) => (
              <div
                key={tier.label}
                className={`group rounded-2xl p-5 text-center space-y-1.5 border ${tier.bg} shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1`}
              >
                <span className="text-[10px] font-800 uppercase tracking-wider text-gray-700 block">
                  {tier.badge}
                </span>
                <p className="text-sm font-800 text-[#0F2540]">{tier.label}</p>
                <p className="text-3xl font-800 text-[#0F2540] tracking-tight group-hover:scale-105 transition-transform" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {tier.cost} <span className="text-lg font-700 text-amber-600">🪙</span>
                </p>
                <p className="text-[11px] font-600 text-gray-500">per unlocked contact</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {topUpOpen && (
        <TopUpModal
          userEmail={userEmail}
          userName={userName}
          onClose={() => setTopUpOpen(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}
    </>
  );
}
