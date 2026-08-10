"use client";

import { useState } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, RotateCcw, Gift, ShieldCheck, Plus } from "lucide-react";
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
}: {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  transactions: Transaction[];
  userEmail: string;
  userName: string;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-700 mb-0.5" style={{ color: "#111827" }}>
              Coin Wallet
            </h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Use coins to connect with interested parents and unlock student enquiries.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="at-btn at-btn-primary at-btn-sm shrink-0"
          >
            <Plus size={16} />
            Top Up Coins
          </button>
        </div>

        {/* Balance Card + Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            className="col-span-1 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2"
            style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A" }}
          >
            <p className="text-xs font-600" style={{ color: "#92400e" }}>
              CURRENT BALANCE
            </p>
            <p className="text-4xl font-800" style={{ color: "#111827" }}>
              {liveBalance} <span className="text-2xl font-600">🪙</span>
            </p>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="at-btn at-btn-accent at-btn-sm w-full mt-2"
            >
              <Plus size={14} />
              Buy Coins
            </button>
          </div>

          <div
            className="rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-1"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <p className="text-xs font-500" style={{ color: "#6B7280" }}>TOTAL PURCHASED</p>
            <p className="text-2xl font-700" style={{ color: "#111827" }}>{totalPurchased} 🪙</p>
          </div>

          <div
            className="rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-1"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <p className="text-xs font-500" style={{ color: "#6B7280" }}>TOTAL SPENT</p>
            <p className="text-2xl font-700" style={{ color: "#111827" }}>{totalSpent} 🪙</p>
          </div>
        </div>

        {/* Transaction History */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-700" style={{ color: "#111827" }}>
              Transaction History
            </h2>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilter(type);
                    setPage(1);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-500 transition-colors"
                  style={{
                    backgroundColor: filter === type ? "#1A7F5A" : "#F3F4F6",
                    color: filter === type ? "#FFFFFF" : "#374151",
                  }}
                >
                  {FILTER_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-2xl">🪙</p>
              <p className="text-sm font-500" style={{ color: "#6B7280" }}>No transactions yet</p>
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="at-btn at-btn-primary at-btn-sm"
              >
                Buy Your First Coins
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {paginated.map((tx) => {
                const config = TX_CONFIG[tx.type] ?? TX_CONFIG.PURCHASE;
                const Icon = config.icon;
                const isPending =
                  tx.type === "REFUND" &&
                  tx.description === "REFUND_REQUEST_PENDING";

                return (
                  <div key={tx.id} className="flex items-center gap-3.5 py-3.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-600" style={{ color: "#111827" }}>
                        {isPending
                          ? "Refund Request — Pending Review"
                          : (tx.description ?? config.label)}
                      </p>
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
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
                      <p className="text-sm font-700" style={{ color: config.color }}>
                        {config.sign}{tx.amount} 🪙
                      </p>
                      <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                        Bal: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="at-btn at-btn-outline at-btn-sm"
              >
                ← Prev
              </button>
              <span className="text-xs font-500" style={{ color: "#6B7280" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="at-btn at-btn-outline at-btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </section>

        {/* Coin cost guide */}
        <section
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <h2 className="text-sm font-700" style={{ color: "#111827" }}>
            Coin Cost Guide
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Class 1–8", cost: 20, bg: "#E8F5F0" },
              { label: "Class 9–12", cost: 30, bg: "#EFF6FF" },
              { label: "JEE / NEET / Coding", cost: 50, bg: "#FEF3C7" },
            ].map((tier) => (
              <div
                key={tier.label}
                className="rounded-xl p-3.5 text-center space-y-0.5"
                style={{ backgroundColor: tier.bg }}
              >
                <p className="text-xs font-500" style={{ color: "#374151" }}>{tier.label}</p>
                <p className="text-2xl font-700" style={{ color: "#111827" }}>{tier.cost} 🪙</p>
                <p className="text-[11px]" style={{ color: "#6B7280" }}>per student enquiry</p>
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
