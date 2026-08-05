"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsvString } from "@/lib/csv-exporter";

function requireAdmin(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "SUB_ADMIN";
}

// ── Users Export ──────────────────────────────────────────────────────────────

export async function exportUsersCsv(): Promise<{ csv: string; filename: string } | null> {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      subAdminRole: true,
      isActive: true,
      createdAt: true,
    },
  });

  const rows = users.map((u) => ({
    ID: u.id,
    Name: u.name ?? "",
    Email: u.email,
    Phone: u.phone ?? "",
    Role: u.role,
    "Sub Admin Role": u.subAdminRole ?? "",
    Active: u.isActive,
    "Joined At": u.createdAt.toISOString(),
  }));

  const csv = toCsvString(rows);
  const filename = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

// ── Leads Export ──────────────────────────────────────────────────────────────

export async function exportLeadsCsv(): Promise<{ csv: string; filename: string } | null> {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parentProfile: { select: { user: { select: { name: true, email: true } } } },
      _count: { select: { purchases: true } },
    },
  });

  const rows = leads.map((l) => ({
    ID: l.id,
    "Parent Name": l.parentProfile.user.name ?? "",
    "Parent Email": l.parentProfile.user.email,
    Subjects: l.subjects.join("; "),
    Class: l.classLevel,
    Board: l.board ?? "",
    Mode: l.mode,
    City: l.city ?? "",
    Status: l.status,
    "Coin Cost": l.coinCost,
    "Max Tutors": l.maxTutors,
    "Purchase Count": l._count.purchases,
    "Created At": l.createdAt.toISOString(),
  }));

  const csv = toCsvString(rows);
  const filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

// ── Wallet Transactions Export ────────────────────────────────────────────────

export async function exportPaymentsCsv(): Promise<{ csv: string; filename: string } | null> {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  const txns = await prisma.walletTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      wallet: {
        include: {
          tutorProfile: { select: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  });

  const rows = txns.map((t) => ({
    ID: t.id,
    "Tutor Name": t.wallet.tutorProfile.user.name ?? "",
    "Tutor Email": t.wallet.tutorProfile.user.email,
    Type: t.type,
    Amount: t.amount,
    "Balance After": t.balanceAfter,
    Description: t.description ?? "",
    "Reference ID": t.referenceId ?? "",
    "Created At": t.createdAt.toISOString(),
  }));

  const csv = toCsvString(rows);
  const filename = `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

// ── Tutor Ratings Export ──────────────────────────────────────────────────────

export async function exportTutorRatingsCsv(): Promise<{ csv: string; filename: string } | null> {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  const tutors = await prisma.tutorProfile.findMany({
    where: { totalReviews: { gt: 0 } },
    orderBy: { averageRating: "desc" },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
      averageRating: true,
      totalReviews: true,
      isVerified: true,
      isFeatured: true,
      city: true,
      subjects: true,
    },
  });

  const rows = tutors.map((t) => ({
    ID: t.id,
    Name: t.user.name ?? "",
    Email: t.user.email,
    "Avg Rating": t.averageRating.toFixed(2),
    "Total Reviews": t.totalReviews,
    Verified: t.isVerified,
    Featured: t.isFeatured,
    City: t.city ?? "",
    Subjects: t.subjects.join("; "),
  }));

  const csv = toCsvString(rows);
  const filename = `tutor_ratings_${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

// ── Analytics Data for Charts ─────────────────────────────────────────────────

export type MonthlyRevenuePoint = {
  month: string;
  coinSales: number;
  gmvInr: number;
};

export type LeadFillPoint = {
  month: string;
  filled: number;
  expired: number;
  total: number;
};

export type SubjectDemandPoint = {
  subject: string;
  count: number;
};

export async function getAdminAnalyticsData(): Promise<{
  monthlyRevenue: MonthlyRevenuePoint[];
  leadFill: LeadFillPoint[];
  subjectDemand: SubjectDemandPoint[];
  totals: {
    totalCoins: number;
    totalUsers: number;
    totalLeads: number;
    totalBookings: number;
    avgRating: number;
  };
} | null> {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  // Last 6 months labels
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // Monthly coin PURCHASE revenue
  const purchaseTxns = await prisma.walletTransaction.findMany({
    where: {
      type: "PURCHASE",
      createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
    },
    select: { amount: true, createdAt: true },
  });

  const revenueByMonth: Record<string, number> = {};
  for (const t of purchaseTxns) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + t.amount;
  }

  const monthlyRevenue: MonthlyRevenuePoint[] = months.map((m) => ({
    month: m,
    coinSales: revenueByMonth[m] ?? 0,
    gmvInr: Math.round(((revenueByMonth[m] ?? 0) / 100) * 10), // ~₹10 per 100 coins
  }));

  // Monthly lead fill / expired (last 6 months)
  const leads6mo = await prisma.lead.findMany({
    where: { createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } },
    select: { status: true, createdAt: true },
  });

  const fillMap: Record<string, { filled: number; expired: number; total: number }> = {};
  for (const m of months) fillMap[m] = { filled: 0, expired: 0, total: 0 };
  for (const l of leads6mo) {
    const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!fillMap[key]) continue;
    fillMap[key].total++;
    if (l.status === "BOOKED" || l.status === "COMPLETED") fillMap[key].filled++;
    if (l.status === "EXPIRED") fillMap[key].expired++;
  }
  const leadFill: LeadFillPoint[] = months.map((m) => ({ month: m, ...fillMap[m] }));

  // Subject demand (top 10)
  const allLeads = await prisma.lead.findMany({
    select: { subjects: true },
    where: { createdAt: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } },
  });

  const subjectCount: Record<string, number> = {};
  for (const l of allLeads) {
    for (const s of l.subjects) {
      subjectCount[s] = (subjectCount[s] ?? 0) + 1;
    }
  }
  const subjectDemand: SubjectDemandPoint[] = Object.entries(subjectCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([subject, count]) => ({ subject, count }));

  // Platform totals
  const [totalUsers, totalLeads, totalBookings, coinStats, ratingStats] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.booking.count(),
    prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { type: "PURCHASE" } }),
    prisma.tutorProfile.aggregate({ _avg: { averageRating: true } }),
  ]);

  return {
    monthlyRevenue,
    leadFill,
    subjectDemand,
    totals: {
      totalCoins: coinStats._sum.amount ?? 0,
      totalUsers,
      totalLeads,
      totalBookings,
      avgRating: ratingStats._avg.averageRating ?? 0,
    },
  };
}
