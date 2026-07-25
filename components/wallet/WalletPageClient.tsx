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
  { label: string; icon: React.ElementType; bg: string; colorClass: string; sign: string }
> = {
  PURCHASE: {
    label: "Coin Purchase",
    icon: ArrowUpRight,
    bg: "#DCFCE7",
    colorClass: "text-[#22C55E]",
    sign: "+",
  },
  DEDUCTION: {
    label: "Lead Unlock",
    icon: ArrowDownLeft,
    bg: "#FCE7F3",
    colorClass: "text-[#EC4899]",
    sign: "-",
  },
  REFUND: {
    label: "Refund",
    icon: RotateCcw,
    bg: "#E0F2FE",
    colorClass: "text-blue-500",
    sign: "+",
  },
  BONUS: {
    label: "Bonus Coins",
    icon: Gift,
    bg: "#FEF3C7",
    colorClass: "text-amber-500",
    sign: "+",
  },
  ADMIN_CREDIT: {
    label: "Admin Credit",
    icon: ShieldCheck,
    bg: "#F3E8FF",
    colorClass: "text-purple-500",
    sign: "+",
  },
  ADMIN_DEBIT: {
    label: "Admin Debit",
    icon: ShieldCheck,
    bg: "#FCE7F3",
    colorClass: "text-red-500",
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
      <div className="space-y-6 py-4">
        {/* Header */}
        <header className="neu-card flex flex-col gap-4 bg-[#FEF3C7] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-2">
            <div className="neu-badge w-fit bg-white text-[#0F172A]">
              <Wallet size={14} />
              Coin Wallet
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
              Your Coins 🪙
            </h1>
            <p className="text-sm font-semibold text-slate-700">
              Use coins to unlock parent contact details. Each lead costs
              20–50 coins based on class level.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="neu-btn neu-btn-primary shrink-0 gap-2 px-6 py-3.5 text-sm"
          >
            <Plus size={18} />
            <span>Top Up Coins</span>
          </button>
        </header>

        {/* Balance Card + Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="neu-card col-span-1 flex flex-col items-center justify-center gap-3 bg-[#FEF3C7] p-8 sm:col-span-1 text-center">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Current Balance
            </p>
            <p className="text-6xl font-black text-[#0F172A]">
              {liveBalance}
            </p>
            <p className="text-sm font-extrabold text-slate-500">🪙 Coins</p>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="neu-btn neu-btn-primary mt-2 w-full py-2.5 text-xs"
            >
              <Plus size={14} />
              Buy More Coins
            </button>
          </div>

          <div className="neu-card bg-[#DCFCE7] p-6 text-center sm:col-span-1">
            <p className="text-xs font-extrabold uppercase text-slate-500">
              Total Purchased
            </p>
            <p className="mt-2 text-3xl font-black text-[#0F172A]">
              {totalPurchased} 🪙
            </p>
          </div>

          <div className="neu-card bg-[#FCE7F3] p-6 text-center sm:col-span-1">
            <p className="text-xs font-extrabold uppercase text-slate-500">
              Total Spent
            </p>
            <p className="mt-2 text-3xl font-black text-[#0F172A]">
              {totalSpent} 🪙
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <section className="neu-card space-y-4 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-[#0F172A]">
              Transaction History
            </h2>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilter(type);
                    setPage(1);
                  }}
                  className={`rounded-full border-2 border-[#0F172A] px-3 py-1 text-[11px] font-extrabold transition-all ${
                    filter === type
                      ? "bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)]"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {FILTER_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl">🪙</p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                No transactions yet
              </p>
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="neu-btn neu-btn-primary mt-4 px-6 py-2.5 text-xs"
              >
                Buy Your First Coins
              </button>
            </div>
          ) : (
            <div className="divide-y-2 divide-[#E2E8F0]">
              {paginated.map((tx) => {
                const config = TX_CONFIG[tx.type] ?? TX_CONFIG.PURCHASE;
                const Icon = config.icon;
                const isPending =
                  tx.type === "REFUND" &&
                  tx.description === "REFUND_REQUEST_PENDING";

                return (
                  <div key={tx.id} className="flex items-center gap-4 py-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0F172A]"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#0F172A]">
                        {isPending
                          ? "Refund Request — Pending Admin Review"
                          : (tx.description ?? config.label)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
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
                      <p
                        className={`text-base font-black ${config.colorClass}`}
                      >
                        {config.sign}
                        {tx.amount} 🪙
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Balance: {tx.balanceAfter}
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
                className="neu-btn neu-btn-white px-4 py-2 text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="neu-btn neu-btn-white px-4 py-2 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </section>

        {/* Coin cost guide */}
        <section className="neu-card grid gap-3 bg-white p-6 sm:grid-cols-3">
          <h2 className="col-span-full text-lg font-black text-[#0F172A]">
            Coin Cost Guide
          </h2>
          {[
            { label: "Class 1–8", cost: 20, bg: "#DCFCE7" },
            { label: "Class 9–12", cost: 30, bg: "#E0F2FE" },
            { label: "JEE / NEET / Coding", cost: 50, bg: "#FEF3C7" },
          ].map((tier) => (
            <div
              key={tier.label}
              className="rounded-2xl border-2 border-[#0F172A] p-4 text-center"
              style={{ backgroundColor: tier.bg }}
            >
              <p className="text-xs font-extrabold text-slate-600">
                {tier.label}
              </p>
              <p className="mt-1 text-3xl font-black text-[#0F172A]">
                {tier.cost} 🪙
              </p>
              <p className="text-[11px] font-bold text-slate-500">per lead</p>
            </div>
          ))}
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
