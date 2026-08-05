import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Coins, TrendingUp, TrendingDown, Search } from "lucide-react";
import { adminCreditCoinsAction, adminDebitCoinsAction } from "@/app/actions/admin.actions";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportPaymentsCsv } from "@/app/actions/analytics.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wallet Management — Admin" };

const TX_TYPE_STYLE: Record<string, { color: string; label: string }> = {
  PURCHASE: { color: "#22C55E", label: "Purchase" },
  DEDUCTION: { color: "#EF4444", label: "Deduction" },
  REFUND: { color: "#3B82F6", label: "Refund" },
  BONUS: { color: "#F59E0B", label: "Bonus" },
  ADMIN_CREDIT: { color: "#8B5CF6", label: "Admin Credit" },
  ADMIN_DEBIT: { color: "#F97316", label: "Admin Debit" },
};

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 15;
  const skip = (page - 1) * take;

  const walletWhere = q
    ? {
      tutorProfile: {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        },
      },
    }
    : {};

  const [wallets, total, walletAgg] = await Promise.all([
    prisma.wallet.findMany({
      where: walletWhere,
      orderBy: { balance: "desc" },
      skip,
      take,
      include: {
        tutorProfile: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            type: true,
            amount: true,
            balanceAfter: true,
            description: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.wallet.count({ where: walletWhere }),
    prisma.wallet.aggregate({ _sum: { balance: true, totalPurchased: true, totalSpent: true } }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            Wallet & Coin Oversight
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
            Manage tutor coin balances and view transaction history
          </p>
        </div>
        <ExportCsvButton label="Export CSV" action={exportPaymentsCsv} />
      </div>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total Circulating Coins", value: (walletAgg._sum.balance ?? 0).toLocaleString(), color: "#22C55E", icon: Coins },
          { label: "Total Coins Sold", value: (walletAgg._sum.totalPurchased ?? 0).toLocaleString(), color: "#3B82F6", icon: TrendingUp },
          { label: "Total Coins Spent", value: (walletAgg._sum.totalSpent ?? 0).toLocaleString(), color: "#EF4444", icon: TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "#0F172A", border: "1px solid #1E293B" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>{label}</p>
                <p className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>{value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <Search size={14} style={{ color: "#475569" }} />
          <input name="q" defaultValue={q} placeholder="Search tutor name or email…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
        <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>Search</button>
      </form>

      {/* Wallet Cards */}
      <div className="space-y-4">
        {wallets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl py-16" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <Coins size={32} style={{ color: "#1E293B" }} />
            <p className="text-sm" style={{ color: "#334155" }}>No wallets found</p>
          </div>
        ) : wallets.map((wallet) => (
          <div key={wallet.id} className="overflow-hidden rounded-2xl" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1E293B" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                  {(wallet.tutorProfile.user.name || wallet.tutorProfile.user.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{wallet.tutorProfile.user.name || "—"}</p>
                  <p className="text-xs" style={{ color: "#475569" }}>{wallet.tutorProfile.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569", fontFamily: "'Fira Code', monospace" }}>Balance</p>
                  <p className="text-xl font-bold" style={{ color: "#22C55E", fontFamily: "'Poppins', sans-serif" }}>{wallet.balance.toLocaleString()} <span className="text-sm">coins</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-2" style={{ borderBottom: "1px solid #1E293B" }}>
              {/* Credit Form */}
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await adminCreditCoinsAction(formData);
                }}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="tutorProfileId" value={wallet.tutorProfile.id} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#22C55E", fontFamily: "'Fira Code', monospace" }}>Credit Coins</p>
                <div className="flex gap-2">
                  <input name="amount" type="number" min="1" max="10000" placeholder="Amount" required className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: "#1E293B", border: "1px solid #334155" }} />
                  <input name="description" placeholder="Reason (opt.)" className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: "#1E293B", border: "1px solid #334155" }} />
                  <button type="submit" className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>
                    <TrendingUp size={12} /> Credit
                  </button>
                </div>
              </form>

              {/* Debit Form */}
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await adminDebitCoinsAction(formData);
                }}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="tutorProfileId" value={wallet.tutorProfile.id} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#EF4444", fontFamily: "'Fira Code', monospace" }}>Debit Coins</p>
                <div className="flex gap-2">
                  <input name="amount" type="number" min="1" max="10000" placeholder="Amount" required className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: "#1E293B", border: "1px solid #334155" }} />
                  <input name="description" placeholder="Reason (opt.)" className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: "#1E293B", border: "1px solid #334155" }} />
                  <button type="submit" className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <TrendingDown size={12} /> Debit
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Transactions */}
            {wallet.transactions.length > 0 && (
              <div className="px-5 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>Recent Transactions</p>
                <div className="space-y-1">
                  {wallet.transactions.map((tx) => {
                    const ts = TX_TYPE_STYLE[tx.type] ?? { color: "#475569", label: tx.type };
                    return (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#0A0F1E" }}>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: `${ts.color}15`, color: ts.color }}>{ts.label}</span>
                          <span className="text-xs" style={{ color: "#475569" }}>{tx.description || "—"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold" style={{ color: ["DEDUCTION", "ADMIN_DEBIT"].includes(tx.type) ? "#EF4444" : "#22C55E" }}>
                            {["DEDUCTION", "ADMIN_DEBIT"].includes(tx.type) ? "-" : "+"}{tx.amount}
                          </span>
                          <span className="text-xs" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                            {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs" style={{ color: "#475569" }}>Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/admin/wallets?q=${q}&page=${page - 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#1E293B", color: "#94A3B8" }}>← Prev</a>
            )}
            {page < totalPages && (
              <a href={`/admin/wallets?q=${q}&page=${page + 1}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>Next →</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
