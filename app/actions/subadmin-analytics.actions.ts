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
  waRepliesToday: number;
  waRepliesLast7Days: number;
  waRepliesLast30Days: number;
  waRepliesTotal: number;
  waUniqueContacts: number;
  waFailedReplies: number;
  waLastReplyAt: string | null;
  firstActionAt: string | null;
  lastActionAt: string | null;
  topActions: { action: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export interface WhatsAppStaffStatRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department: string | null;
  isActive: boolean;
  waRepliesToday: number;
  waRepliesLast7Days: number;
  waRepliesLast30Days: number;
  waRepliesTotal: number;
  waUniqueContacts: number;
  waFailedReplies: number;
  waLastReplyAt: string | null;
}

export interface SubAdminAnalyticsData {
  subAdmins: SubAdminStat[];
  waStaffLeaderboard: WhatsAppStaffStatRow[];
  platformTotals: {
    totalAuditActions: number;
    last30DaysActions: number;
    activeSubAdmins: number;
    mostActiveId: string | null;
    totalWaReplies: number;
    waRepliesToday: number;
    waRepliesLast30Days: number;
    topWaResponderId: string | null;
  };
  teamDailyTrend: { date: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
  departmentBreakdown: { dept: string; count: number }[];
}

function getIstMidnightUtc(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS
  );
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
  const todayStart = getIstMidnightUtc();

  // Fetch all sub-admins and all staff accounts for WhatsApp attribution
  const [subAdminUsers, allStaffUsers] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.user.findMany({
      where: { role: { in: ["SUB_ADMIN", "SUPER_ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subAdminRole: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const subAdminIds = subAdminUsers.map((u) => u.id);

  // Per-employee WhatsApp manual reply aggregation from whatsapp_chat_messages
  type WaAggRow = {
    sentByUserId: string;
    total: number;
    last30d: number;
    last7d: number;
    today: number;
    unique_contacts: number;
    failed_count: number;
    last_reply_at: Date | null;
  };
  let waAggRows: WaAggRow[] = [];
  try {
    waAggRows = await prisma.$queryRaw<WaAggRow[]>`
      SELECT
        "sentByUserId",
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since30d})::int AS last30d,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since7d})::int AS last7d,
        COUNT(*) FILTER (WHERE "createdAt" >= ${todayStart})::int AS today,
        COUNT(DISTINCT phone)::int AS unique_contacts,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(status, '')) = 'FAILED')::int AS failed_count,
        MAX("createdAt") AS last_reply_at
      FROM whatsapp_chat_messages
      WHERE "sentByUserId" IS NOT NULL
        AND step = 'STAFF_REPLY'
      GROUP BY "sentByUserId"
    `;
  } catch {
    waAggRows = [];
  }
  const waByStaffId = new Map(waAggRows.map((r) => [r.sentByUserId, r]));

  // Fetch all audit logs for sub-admins (safe fallback if model unavailable)
  let allLogs: any[] = [];
  try {
    allLogs = await prisma.auditLog.findMany({
      where: subAdminIds.length > 0 ? { adminId: { in: subAdminIds } } : {},
      select: { id: true, adminId: true, action: true, entityType: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
  } catch {
    allLogs = [];
  }

  // Fetch all admin notes authored by sub-admins (safe fallback)
  let allNotes: any[] = [];
  try {
    if (subAdminIds.length > 0) {
      allNotes = await prisma.adminNote.findMany({
        where: { authorUserId: { in: subAdminIds } },
        select: { id: true, authorUserId: true, createdAt: true },
      });
    }
  } catch {
    allNotes = [];
  }

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
    const wa = waByStaffId.get(user.id);

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
      waRepliesToday: wa?.today ?? 0,
      waRepliesLast7Days: wa?.last7d ?? 0,
      waRepliesLast30Days: wa?.last30d ?? 0,
      waRepliesTotal: wa?.total ?? 0,
      waUniqueContacts: wa?.unique_contacts ?? 0,
      waFailedReplies: wa?.failed_count ?? 0,
      waLastReplyAt: wa?.last_reply_at ? new Date(wa.last_reply_at).toISOString() : null,
      firstActionAt: sorted.length > 0 ? sorted[0].createdAt.toISOString() : null,
      lastActionAt: sorted.length > 0 ? sorted[sorted.length - 1].createdAt.toISOString() : null,
      topActions,
      dailyActivity,
    };
  });

  const waStaffLeaderboard: WhatsAppStaffStatRow[] = allStaffUsers
    .map((u) => {
      const wa = waByStaffId.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.subAdminRole,
        isActive: u.isActive,
        waRepliesToday: wa?.today ?? 0,
        waRepliesLast7Days: wa?.last7d ?? 0,
        waRepliesLast30Days: wa?.last30d ?? 0,
        waRepliesTotal: wa?.total ?? 0,
        waUniqueContacts: wa?.unique_contacts ?? 0,
        waFailedReplies: wa?.failed_count ?? 0,
        waLastReplyAt: wa?.last_reply_at ? new Date(wa.last_reply_at).toISOString() : null,
      };
    })
    .filter((u) => u.role === "SUB_ADMIN" || u.waRepliesTotal > 0)
    .sort((a, b) => b.waRepliesTotal - a.waRepliesTotal || b.waRepliesLast30Days - a.waRepliesLast30Days);

  const mostActive = [...subAdmins].sort((a, b) => b.totalActions - a.totalActions)[0];
  const topWaResponder = waStaffLeaderboard[0];

  return {
    subAdmins,
    waStaffLeaderboard,
    platformTotals: {
      totalAuditActions: allLogs.length,
      last30DaysActions: allLogs.filter((l: any) => new Date(l.createdAt) >= since30d).length,
      activeSubAdmins: subAdminUsers.filter((u) => u.isActive).length,
      mostActiveId: mostActive?.id ?? null,
      totalWaReplies: waStaffLeaderboard.reduce((s, r) => s + r.waRepliesTotal, 0),
      waRepliesToday: waStaffLeaderboard.reduce((s, r) => s + r.waRepliesToday, 0),
      waRepliesLast30Days: waStaffLeaderboard.reduce((s, r) => s + r.waRepliesLast30Days, 0),
      topWaResponderId: topWaResponder && topWaResponder.waRepliesTotal > 0 ? topWaResponder.id : null,
    },
    teamDailyTrend,
    actionBreakdown,
    departmentBreakdown,
  };
}
