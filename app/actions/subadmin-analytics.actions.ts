"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubAdminStat {
  id: string;
  name: string | null;
  email: string;
  department: string | null;
  isActive: boolean;
  joinedAt: string;
  totalActions: number;
  actionsLast7Days: number;
  actionsLast30Days: number;
  notesAuthored: number;
  kycApprovals: number;
  kycRejections: number;
  suspensions: number;
  reactivations: number;
  walletAdjustments: number;
  firstActionAt: string | null;
  lastActionAt: string | null;
  topActions: { action: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export interface SubAdminAnalyticsData {
  subAdmins: SubAdminStat[];
  platformTotals: {
    totalAuditActions: number;
    last30DaysActions: number;
    activeSubAdmins: number;
    mostActiveId: string | null;
  };
  teamDailyTrend: { date: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
  departmentBreakdown: { dept: string; count: number }[];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDailyMap(logs: { createdAt: Date }[], days = 30): { date: string; count: number }[] {
  const now = new Date();
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map[isoDate(d)] = 0;
  }
  for (const log of logs) {
    const key = isoDate(log.createdAt);
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

// ─── Main Action ──────────────────────────────────────────────────────────────

export async function getSubAdminAnalyticsData(): Promise<SubAdminAnalyticsData | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null;

  const now = new Date();
  const since30d = new Date(now);
  since30d.setDate(since30d.getDate() - 30);
  const since7d = new Date(now);
  since7d.setDate(since7d.getDate() - 7);

  // Fetch all sub-admins
  const subAdminUsers = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      subAdminRole: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const subAdminIds = subAdminUsers.map((u) => u.id);

  // Fetch all audit logs for sub-admins
  const allLogs = await (prisma as any).auditLog.findMany({
    where: { adminId: { in: subAdminIds } },
    select: { id: true, adminId: true, action: true, entityType: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  }).catch(() => [] as any[]);

  // Fetch all admin notes authored by sub-admins
  const allNotes = await (prisma as any).adminNote.findMany({
    where: { authorUserId: { in: subAdminIds } },
    select: { id: true, authorUserId: true, createdAt: true },
  }).catch(() => [] as any[]);

  // Team daily trend (last 30 days, all sub-admins combined)
  const teamDailyTrend = buildDailyMap(allLogs, 30);

  // Action breakdown (platform-wide)
  const actionCountMap: Record<string, number> = {};
  for (const log of allLogs) {
    actionCountMap[log.action] = (actionCountMap[log.action] || 0) + 1;
  }
  const actionBreakdown = Object.entries(actionCountMap)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Department breakdown
  const deptMap: Record<string, number> = {};
  for (const user of subAdminUsers) {
    const dept = user.subAdminRole || "UNASSIGNED";
    const userLogs = allLogs.filter((l: any) => l.adminId === user.id);
    deptMap[dept] = (deptMap[dept] || 0) + userLogs.length;
  }
  const departmentBreakdown = Object.entries(deptMap)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count);

  // Per sub-admin stats
  const subAdmins: SubAdminStat[] = subAdminUsers.map((user) => {
    const userLogs: any[] = allLogs.filter((l: any) => l.adminId === user.id);
    const userNotes: any[] = allNotes.filter((n: any) => n.authorUserId === user.id);

    const logs30d = userLogs.filter((l: any) => new Date(l.createdAt) >= since30d);
    const logs7d = userLogs.filter((l: any) => new Date(l.createdAt) >= since7d);

    const topActionMap: Record<string, number> = {};
    for (const log of userLogs) {
      topActionMap[log.action] = (topActionMap[log.action] || 0) + 1;
    }
    const topActions = Object.entries(topActionMap)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const dailyActivity = buildDailyMap(userLogs, 30);

    const sorted = [...userLogs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.subAdminRole,
      isActive: user.isActive,
      joinedAt: user.createdAt.toISOString(),
      totalActions: userLogs.length,
      actionsLast7Days: logs7d.length,
      actionsLast30Days: logs30d.length,
      notesAuthored: userNotes.length,
      kycApprovals: userLogs.filter((l: any) => l.action === "KYC_APPROVE").length,
      kycRejections: userLogs.filter((l: any) => l.action === "KYC_REJECT").length,
      suspensions: userLogs.filter((l: any) => l.action === "SUSPEND_USER").length,
      reactivations: userLogs.filter((l: any) => l.action === "REACTIVATE_USER").length,
      walletAdjustments:
        userLogs.filter(
          (l: any) => l.action === "WALLET_ADMIN_CREDIT" || l.action === "WALLET_ADMIN_DEBIT"
        ).length,
      firstActionAt: sorted.length > 0 ? sorted[0].createdAt.toISOString() : null,
      lastActionAt: sorted.length > 0 ? sorted[sorted.length - 1].createdAt.toISOString() : null,
      topActions,
      dailyActivity,
    };
  });

  const mostActive = [...subAdmins].sort((a, b) => b.totalActions - a.totalActions)[0];

  return {
    subAdmins,
    platformTotals: {
      totalAuditActions: allLogs.length,
      last30DaysActions: allLogs.filter((l: any) => new Date(l.createdAt) >= since30d).length,
      activeSubAdmins: subAdminUsers.filter((u) => u.isActive).length,
      mostActiveId: mostActive?.id ?? null,
    },
    teamDailyTrend,
    actionBreakdown,
    departmentBreakdown,
  };
}
