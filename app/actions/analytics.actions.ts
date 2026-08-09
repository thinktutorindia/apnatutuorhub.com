"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsvString } from "@/lib/csv-exporter";

function requireAdmin(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "SUB_ADMIN";
}

// ── Export Handlers ────────────────────────────────────────────────────────────

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
  return { csv, filename: `users_${new Date().toISOString().slice(0, 10)}.csv` };
}

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
  return { csv, filename: `leads_${new Date().toISOString().slice(0, 10)}.csv` };
}

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
  return { csv, filename: `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv` };
}

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
  return { csv, filename: `tutor_ratings_${new Date().toISOString().slice(0, 10)}.csv` };
}

// ── Advanced Analytics Data Structure ──────────────────────────────────────────

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
  fillRate: number;
};

export type SubjectDemandPoint = {
  subject: string;
  count: number;
};

export type ClassDemandPoint = {
  classLevel: string;
  count: number;
};

export type ModeBreakdownPoint = {
  mode: string;
  count: number;
};

export type CityDistributionPoint = {
  city: string;
  leads: number;
};

export type RatingDistributionPoint = {
  stars: string;
  count: number;
};

export type SubAdminActivityPoint = {
  subAdminName: string;
  subAdminRole: string;
  actionCount: number;
};

export async function getAdminAnalyticsData(range: "30d" | "90d" | "180d" | "1y" | "all" = "180d") {
  const session = await auth();
  if (!session?.user || !requireAdmin(session.user.role)) return null;

  // Calculate start date threshold based on range filter
  let startDate: Date | undefined;
  const now = new Date();
  if (range === "30d") startDate = new Date(now.setDate(now.getDate() - 30));
  else if (range === "90d") startDate = new Date(now.setDate(now.getDate() - 90));
  else if (range === "180d") startDate = new Date(now.setDate(now.getDate() - 180));
  else if (range === "1y") startDate = new Date(now.setFullYear(now.getFullYear() - 1));

  const dateFilter = startDate ? { gte: startDate } : undefined;

  // 1. Monthly labels (Last 6 months)
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // 2. Revenue points
  const purchaseTxns = await prisma.walletTransaction.findMany({
    where: {
      type: "PURCHASE",
      createdAt: dateFilter,
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

  // 3. Lead fill points
  const leadsPeriod = await prisma.lead.findMany({
    where: { createdAt: dateFilter },
    select: { status: true, mode: true, classLevel: true, city: true, subjects: true, createdAt: true },
  });

  const fillMap: Record<string, { filled: number; expired: number; total: number }> = {};
  for (const m of months) fillMap[m] = { filled: 0, expired: 0, total: 0 };

  const modeCountMap: Record<string, number> = { ONLINE: 0, OFFLINE: 0, EITHER: 0 };
  const classCountMap: Record<string, number> = {};
  const cityCountMap: Record<string, number> = {};
  const subjectCountMap: Record<string, number> = {};

  for (const l of leadsPeriod) {
    const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (fillMap[key]) {
      fillMap[key].total++;
      if (l.status === "BOOKED" || l.status === "COMPLETED") fillMap[key].filled++;
      if (l.status === "EXPIRED") fillMap[key].expired++;
    }

    // Modes
    if (l.mode in modeCountMap) modeCountMap[l.mode]++;
    else modeCountMap[l.mode] = 1;

    // Classes
    const cLevel = l.classLevel || "Other";
    classCountMap[cLevel] = (classCountMap[cLevel] ?? 0) + 1;

    // Cities
    if (l.city) {
      cityCountMap[l.city] = (cityCountMap[l.city] ?? 0) + 1;
    }

    // Subjects
    for (const s of l.subjects) {
      subjectCountMap[s] = (subjectCountMap[s] ?? 0) + 1;
    }
  }

  const leadFill: LeadFillPoint[] = months.map((m) => {
    const f = fillMap[m] ?? { filled: 0, expired: 0, total: 0 };
    const fillRate = f.total > 0 ? Math.round((f.filled / f.total) * 100) : 0;
    return { month: m, ...f, fillRate };
  });

  const subjectDemand: SubjectDemandPoint[] = Object.entries(subjectCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([subject, count]) => ({ subject, count }));

  const classDemand: ClassDemandPoint[] = Object.entries(classCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([classLevel, count]) => ({ classLevel, count }));

  const modeBreakdown: ModeBreakdownPoint[] = [
    { mode: "Offline (Home Tuition)", count: modeCountMap.OFFLINE ?? 0 },
    { mode: "Online Classes", count: modeCountMap.ONLINE ?? 0 },
    { mode: "Either (Flexible)", count: modeCountMap.EITHER ?? 0 },
  ];

  const cityDistribution: CityDistributionPoint[] = Object.entries(cityCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, leads]) => ({ city, leads }));

  // 4. Rating distribution
  const tutorProfiles = await prisma.tutorProfile.findMany({
    where: { totalReviews: { gt: 0 } },
    select: { averageRating: true },
  });

  const ratingCounts = { "5 Stars": 0, "4 Stars": 0, "3 Stars": 0, "2 Stars": 0, "1 Star": 0 };
  for (const t of tutorProfiles) {
    const r = Math.round(t.averageRating);
    if (r >= 5) ratingCounts["5 Stars"]++;
    else if (r === 4) ratingCounts["4 Stars"]++;
    else if (r === 3) ratingCounts["3 Stars"]++;
    else if (r === 2) ratingCounts["2 Stars"]++;
    else if (r === 1) ratingCounts["1 Star"]++;
  }

  const ratingDistribution: RatingDistributionPoint[] = Object.entries(ratingCounts).map(([stars, count]) => ({
    stars,
    count,
  }));

  // 5. Sub-Admin Activity breakdown
  const subAdminAuditLogs = await prisma.auditLog.findMany({
    where: { createdAt: dateFilter },
    select: { adminId: true },
  });

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    select: { id: true, name: true, email: true, subAdminRole: true },
  });

  const subAdminMap = new Map(subAdmins.map((u) => [u.id, u]));
  const subAdminCounts: Record<string, number> = {};

  for (const log of subAdminAuditLogs) {
    if (subAdminMap.has(log.adminId)) {
      subAdminCounts[log.adminId] = (subAdminCounts[log.adminId] ?? 0) + 1;
    }
  }

  const subAdminActivity: SubAdminActivityPoint[] = subAdmins.map((u) => ({
    subAdminName: u.name || u.email.split("@")[0],
    subAdminRole: u.subAdminRole ?? "GENERAL",
    actionCount: subAdminCounts[u.id] ?? 0,
  }));

  // 6. Platform Totals & Conversion Metrics
  const [totalUsers, totalTutors, verifiedTutors, totalParents, totalLeads, totalBookings, coinStats, ratingStats] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: dateFilter } }),
      prisma.user.count({ where: { role: "TUTOR", createdAt: dateFilter } }),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { role: "PARENT", createdAt: dateFilter } }),
      prisma.lead.count({ where: { createdAt: dateFilter } }),
      prisma.booking.count({ where: { createdAt: dateFilter } }),
      prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { type: "PURCHASE", createdAt: dateFilter } }),
      prisma.tutorProfile.aggregate({ _avg: { averageRating: true } }),
    ]);

  const totalCoinsSold = coinStats._sum.amount ?? 0;
  const estimatedRevenueInr = Math.round((totalCoinsSold / 100) * 10);
  const conversionRate = totalLeads > 0 ? Math.round((totalBookings / totalLeads) * 100) : 0;
  const tutorVerificationRate = totalTutors > 0 ? Math.round((verifiedTutors / totalTutors) * 100) : 0;

  return {
    monthlyRevenue,
    leadFill,
    subjectDemand,
    classDemand,
    modeBreakdown,
    cityDistribution,
    ratingDistribution,
    subAdminActivity,
    totals: {
      totalUsers,
      totalTutors,
      verifiedTutors,
      totalParents,
      totalLeads,
      totalBookings,
      totalCoins: totalCoinsSold,
      estimatedRevenueInr,
      avgRating: ratingStats._avg.averageRating ?? 0,
      conversionRate,
      tutorVerificationRate,
    },
  };
}
