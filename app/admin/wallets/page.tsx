import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Coins, TrendingUp, TrendingDown, Search, RotateCcw, Check, X } from "lucide-react";
import { adminCreditCoinsAction, adminDebitCoinsAction, approveRefundAction, rejectRefundAction } from "@/app/actions/admin.actions";
import { can } from "@/lib/rbac";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { exportPaymentsCsv } from "@/app/actions/analytics.actions";
import { AdminBulkUserTopupControl } from "@/components/admin/AdminBulkUserTopupControl";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wallet Management — Admin" };

const TX_TYPE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PURCHASE: { bg: "bg-emerald-100", text: "text-emerald-950", border: "border-emerald-300", label: "Purchase" },
  DEDUCTION: { bg: "bg-red-100", text: "text-red-950", border: "border-red-300", label: "Deduction" },
  REFUND: { bg: "bg-blue-100", text: "text-blue-950", border: "border-blue-300", label: "Refund" },
  BONUS: { bg: "bg-amber-100", text: "text-amber-950", border: "border-amber-300", label: "Bonus" },
  ADMIN_CREDIT: { bg: "bg-purple-100", text: "text-purple-950", border: "border-purple-300", label: "Admin Credit" },
  ADMIN_DEBIT: { bg: "bg-orange-100", text: "text-orange-950", border: "border-orange-300", label: "Admin Debit" },
};

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canManageWallets = can(session.user, "wallets:manage");
  const canRefundWallets = can(session.user, "wallet:refund") || canManageWallets;
  if (!canManageWallets && !can(session.user, "wallets:read") && !canRefundWallets) {
    redirect("/admin/dashboard");
  }

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

  const [wallets, total, walletAgg, pendingRefunds] = await Promise.all([
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
    prisma.walletTransaction.findMany({
      where: { type: "REFUND", description: "REFUND_REQUEST_PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        wallet: {
          include: {
            tutorProfile: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Monetization Governance</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Wallet &amp; Coin Oversight
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Monitor coin purchases, manual admin credits/debits, and refund requests
          </p>
        </div>
        {session.user.role === "SUPER_ADMIN" && (
          <ExportCsvButton label="Export Payments CSV" action={exportPaymentsCsv} />
        )}
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-800 text-slate-800">
            <Coins size={16} className="text-[#2D9E6B]" />
            <span>Circulating Balance</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#2D9E6B]">
            {(walletAgg._sum.balance ?? 0).toLocaleString("en-IN")} Coins
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-800 text-slate-800">
            <TrendingUp size={16} className="text-[#2563EB]" />
            <span>Total Purchased</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#2563EB]">
            {(walletAgg._sum.totalPurchased ?? 0).toLocaleString("en-IN")} Coins
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-800 text-slate-800">
            <TrendingDown size={16} className="text-[#7C3AED]" />
            <span>Total Spent on Leads</span>
          </div>
          <p className="text-xl sm:text-2xl font-800 text-[#7C3AED]">
            {(walletAgg._sum.totalSpent ?? 0).toLocaleString("en-IN")} Coins
          </p>
        </div>
      </div>

      {/* Bulk Governance & Top-Up Access Control Panel */}
      <AdminBulkUserTopupControl canGrantCoins={canManageWallets} />

      {/* Pending Refunds Box */}
      {pendingRefunds.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-300 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-800 text-amber-950 flex items-center gap-2">
              <RotateCcw size={18} className="text-amber-700" />
              Pending Refund Requests ({pendingRefunds.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingRefunds.map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-800 text-[#0F2540] text-sm">{tx.wallet.tutorProfile.user.name}</p>
                  <p className="text-xs font-600 text-slate-600">{tx.wallet.tutorProfile.user.email} · Requested refund for lead unlock</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canRefundWallets ? (
                    <>
                      <form action={async () => { "use server"; await approveRefundAction(tx.id); }}>
                        <button type="submit" className="px-4 py-2 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 flex items-center gap-1 cursor-pointer">
                          <Check size={14} /> Approve Refund (+{tx.amount} coins)
                        </button>
                      </form>
                      <form action={async () => { "use server"; await rejectRefundAction(tx.id, "Lead contact info was valid."); }}>
                        <button type="submit" className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-950 border border-red-300 text-xs font-800 flex items-center gap-1 cursor-pointer">
                          <X size={14} /> Reject
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="text-xs font-700 text-amber-800">View only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallets Directory Table */}
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form method="GET" className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white border border-slate-300">
            <Search size={16} className="text-slate-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search tutor by name or email..."
              className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-500"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-800 text-slate-900 uppercase tracking-wider">
                <th className="px-5 py-4 text-left">Tutor Profile</th>
                <th className="px-5 py-4 text-left">Coin Balance</th>
                <th className="px-5 py-4 text-left">Purchased / Spent</th>
                <th className="px-5 py-4 text-left">Recent Activity</th>
                {canManageWallets && (
                  <th className="px-5 py-4 text-left">Manual Credit/Debit</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {wallets.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-800 text-[#0F2540] text-sm">{w.tutorProfile.user.name}</p>
                    <p className="text-xs font-600 text-slate-600">{w.tutorProfile.user.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-800 text-[#2D9E6B] text-base">{w.balance} Coins</span>
                  </td>
                  <td className="px-5 py-4 text-xs font-700 text-slate-700">
                    <p>Purchased: {w.totalPurchased}</p>
                    <p>Spent: {w.totalSpent}</p>
                  </td>
                  <td className="px-5 py-4 text-xs space-y-1">
                    {w.transactions.map((tx) => {
                      const style = TX_TYPE_STYLE[tx.type] ?? TX_TYPE_STYLE.PURCHASE;
                      return (
                        <div key={tx.id} className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-800 border ${style.bg} ${style.text} ${style.border}`}>
                            {style.label}
                          </span>
                          <span className="font-700 text-slate-900">{tx.amount > 0 ? `+${tx.amount}` : tx.amount}</span>
                        </div>
                      );
                    })}
                  </td>
                  {canManageWallets && (
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2 xs:flex-row xs:items-center">
                      <form action={async (fd) => { "use server"; await adminCreditCoinsAction(fd); }} className="flex items-center gap-1">
                        <input type="hidden" name="tutorProfileId" value={w.tutorProfile.id} />
                        <input type="hidden" name="description" value="Admin Manual Credit" />
                        <input name="amount" type="number" placeholder="50" className="w-16 h-8 px-2 rounded-xl border border-slate-300 text-xs font-700 outline-none" />
                        <button type="submit" className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 text-xs font-800 cursor-pointer">
                          + Add
                        </button>
                      </form>

                      <form action={async (fd) => { "use server"; await adminDebitCoinsAction(fd); }} className="flex items-center gap-1">
                        <input type="hidden" name="tutorProfileId" value={w.tutorProfile.id} />
                        <input type="hidden" name="description" value="Admin Manual Debit" />
                        <input name="amount" type="number" placeholder="20" className="w-16 h-8 px-2 rounded-xl border border-slate-300 text-xs font-700 outline-none" />
                        <button type="submit" className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-950 border border-red-300 text-xs font-800 cursor-pointer">
                          - Deduct
                        </button>
                      </form>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
