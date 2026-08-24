"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { runCampaignPass, resolveCampaignTargets, generateDummyLead, getNearestLocalities, type DummyLead } from "@/lib/dummy-lead-engine";
import type { DummyCampaignStatus, DummyTargetGroup } from "@prisma/client";

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated", session: null };
  if (session.user.role !== "SUPER_ADMIN") return { error: "Forbidden: Super Admin only", session: null };
  return { error: null, session };
}

// ── Create Campaign ───────────────────────────────────────────────────────────

export async function createDummyCampaignAction(
  data: {
    name: string;
    description?: string;
    targetGroup: DummyTargetGroup;
    customUserIds?: string[];
    excludeUserIds?: string[];
    channels: string[];
    leadsPerDay?: number;
    randomizeDaily?: boolean;
    overrideSubjects?: string[];
    budgetMin?: number;
    budgetMax?: number;
    totalLimit?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<ActionResult<{ id: string }>> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  const campaign = await prisma.dummyCampaign.create({
    data: {
      name: data.name,
      description: data.description,
      targetGroup: data.targetGroup,
      customUserIds: data.customUserIds ?? [],
      excludeUserIds: data.excludeUserIds ?? [],
      channels: data.channels,
      leadsPerDay: data.leadsPerDay ?? 1,
      randomizeDaily: data.randomizeDaily ?? true,
      overrideSubjects: data.overrideSubjects ?? [],
      budgetMin: data.budgetMin ?? 800,
      budgetMax: data.budgetMax ?? 3000,
      totalLimit: data.totalLimit ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: session!.user.id,
    },
  });

  revalidatePath("/admin/dummy-campaigns");
  return actionSuccess({ id: campaign.id });
}

// ── Update Campaign ───────────────────────────────────────────────────────────

export async function updateDummyCampaignAction(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    targetGroup: DummyTargetGroup;
    customUserIds: string[];
    excludeUserIds: string[];
    channels: string[];
    leadsPerDay: number;
    randomizeDaily: boolean;
    overrideSubjects: string[];
    budgetMin: number;
    budgetMax: number;
    totalLimit: number | null;
    startDate: string | null;
    endDate: string | null;
  }>
): Promise<ActionResult<{ updated: true }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.dummyCampaign.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
      endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
    },
  });

  revalidatePath("/admin/dummy-campaigns");
  return actionSuccess({ updated: true });
}

// ── Toggle Status (activate / pause / stop) ───────────────────────────────────

export async function toggleCampaignStatusAction(
  id: string,
  newStatus: "ACTIVE" | "PAUSED" | "STOPPED"
): Promise<ActionResult<{ updated: true }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.dummyCampaign.update({
    where: { id },
    data: { status: newStatus as DummyCampaignStatus },
  });

  revalidatePath("/admin/dummy-campaigns");
  return actionSuccess({ updated: true });
}

// ── Delete Campaign ───────────────────────────────────────────────────────────

export async function deleteDummyCampaignAction(id: string): Promise<ActionResult<{ deleted: true }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  await prisma.dummyCampaign.delete({ where: { id } });

  revalidatePath("/admin/dummy-campaigns");
  return actionSuccess({ deleted: true });
}

// ── Manual Trigger (fire campaign now) ───────────────────────────────────────

export async function triggerCampaignNowAction(id: string): Promise<ActionResult<{ sent: number; failed: number; usersProcessed: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  // Temporarily set status to ACTIVE to allow running
  const campaign = await prisma.dummyCampaign.findUnique({ where: { id } });
  if (!campaign) return actionError("Campaign not found");

  const prevStatus = campaign.status;

  // Allow running even if PAUSED (manual trigger)
  await prisma.dummyCampaign.update({ where: { id }, data: { status: "ACTIVE" } });

  try {
    const result = await runCampaignPass(id);

    // Restore status if it was PAUSED
    if (prevStatus === "PAUSED" || prevStatus === "DRAFT") {
      await prisma.dummyCampaign.update({ where: { id }, data: { status: prevStatus } });
    }

    revalidatePath("/admin/dummy-campaigns");
    return actionSuccess(result);
  } catch (err) {
    await prisma.dummyCampaign.update({ where: { id }, data: { status: prevStatus } });
    return actionError(err instanceof Error ? err.message : "Failed to run campaign");
  }
}

// ── Get Dashboard Stats ───────────────────────────────────────────────────────

export async function getDummyCampaignStats() {
  const [campaigns, allLogs, todayLogs] = await Promise.all([
    prisma.dummyCampaign.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        targetGroup: true,
        channels: true,
        leadsPerDay: true,
        totalSent: true,
        totalFailed: true,
        totalLimit: true,
        startDate: true,
        endDate: true,
        lastRunAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.campaignDeliveryLog.findMany({
      where: { sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { sentAt: true, status: true, channel: true, campaignId: true },
    }),
    prisma.campaignDeliveryLog.count({
      where: {
        sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: "SENT",
      },
    }),
  ]);

  // Daily volume for last 30 days
  const dailyVolume: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyVolume[key] = 0;
  }
  for (const log of allLogs) {
    if (log.status === "SENT") {
      const key = log.sentAt.toISOString().slice(0, 10);
      if (key in dailyVolume) dailyVolume[key]++;
    }
  }

  // Channel breakdown
  const channelBreakdown: Record<string, number> = { EMAIL: 0, PUSH: 0, IN_APP: 0 };
  for (const log of allLogs) {
    if (log.status === "SENT" && log.channel in channelBreakdown) {
      channelBreakdown[log.channel]++;
    }
  }

  const totalSentMonth = Object.values(dailyVolume).reduce((a, b) => a + b, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;

  return {
    campaigns,
    totalCampaigns: campaigns.length,
    activeCampaigns,
    sentToday: todayLogs,
    sentThisMonth: totalSentMonth,
    dailyVolume: Object.entries(dailyVolume).map(([date, count]) => ({ date, count })),
    channelBreakdown,
  };
}

// ── Get Campaign Logs (paginated) ─────────────────────────────────────────────

export async function getDummyCampaignLogs(opts: {
  campaignId?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  channel?: string;
  status?: string;
}) {
  const { error } = await requireSuperAdmin();
  if (error) return { logs: [], total: 0, error };

  const { campaignId, page = 1, pageSize = 50, from, to, channel, status } = opts;

  const where: Record<string, any> = {};
  if (campaignId) where.campaignId = campaignId;
  if (from || to) {
    where.sentAt = {};
    if (from) where.sentAt.gte = new Date(from);
    if (to) where.sentAt.lte = new Date(to + "T23:59:59Z");
  }
  if (channel) where.channel = channel;
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.campaignDeliveryLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.campaignDeliveryLog.count({ where }),
  ]);

  return { logs, total, error: null };
}

// ── Preview target users for a group ──────────────────────────────────────────

export async function previewCampaignTargetsAction(opts: {
  targetGroup: DummyTargetGroup;
  customUserIds?: string[];
  excludeUserIds?: string[];
  emailFilter?: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
}): Promise<ActionResult<{ count: number; genuineCount: number; dummyCount: number; sample: Array<{ id: string; name: string | null; email: string }> }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const targets = await resolveCampaignTargets({
    targetGroup: opts.targetGroup,
    customUserIds: opts.customUserIds ?? [],
    excludeUserIds: opts.excludeUserIds ?? [],
    emailFilter: opts.emailFilter,
  });

  const genuineCount = targets.filter((u) => !u.email.toLowerCase().includes("apnatutorhub.com")).length;
  const dummyCount = targets.length - genuineCount;

  return actionSuccess({
    count: targets.length,
    genuineCount,
    dummyCount,
    sample: targets.slice(0, 10).map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
}

// ── Generate live lead preview for a campaign / user ──────────────────────────

export async function generateLeadPreviewAction(opts: {
  campaignId?: string;
  targetGroup?: DummyTargetGroup;
  overrideSubjects?: string[];
  budgetMin?: number;
  budgetMax?: number;
  count?: number;
  emailFilter?: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
}): Promise<ActionResult<{ leads: DummyLead[]; tutorCount: number }>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const { campaignId, targetGroup = "ALL_TUTORS", overrideSubjects = [], budgetMin = 800, budgetMax = 3000, count = 5, emailFilter } = opts;

  // If campaignId given, load campaign settings
  let campaign: any = null;
  if (campaignId) {
    campaign = await prisma.dummyCampaign.findUnique({ where: { id: campaignId } });
  }

  // Resolve a handful of real tutors to generate preview leads for
  const targets = await resolveCampaignTargets({
    targetGroup: campaign?.targetGroup ?? targetGroup,
    customUserIds: campaign?.customUserIds ?? [],
    excludeUserIds: campaign?.excludeUserIds ?? [],
    emailFilter: emailFilter,
  });

  const sample = targets.slice(0, count);
  const leads: DummyLead[] = sample.map((u, i) => {
    const userSeed = u.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return generateDummyLead({
      tutorLat: u.tutorProfile?.latitude,
      tutorLng: u.tutorProfile?.longitude,
      tutorCity: u.tutorProfile?.city,
      tutorSubjects: u.tutorProfile?.subjects ?? [],
      tutorClassLevels: u.tutorProfile?.classLevels ?? [],
      teachingRadius: u.tutorProfile?.teachingRadius ?? 25,
      budgetMin: campaign?.budgetMin ?? budgetMin,
      budgetMax: campaign?.budgetMax ?? budgetMax,
      overrideSubjects: campaign?.overrideSubjects ?? overrideSubjects,
      userSeed: userSeed + i * 137,
    });
  });

  return actionSuccess({ leads, tutorCount: targets.length });
}

// ── Get nearby localities preview for a city/coords ──────────────────────────

export async function getLocalitiesPreviewAction(opts: {
  lat?: number;
  lng?: number;
  city?: string;
  radius?: number;
}): Promise<ActionResult<Array<{ name: string; city: string; distKm: number }>>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const { lat, lng, city = "Delhi", radius = 25 } = opts;
  if (!lat || !lng) return actionSuccess([]);

  const { getNearestLocalities: getNL } = await import("@/lib/dummy-lead-engine");
  const localities = getNearestLocalities(lat, lng, city, radius, 20);
  return actionSuccess(
    localities.map((l) => ({ name: l.name, city: l.city, distKm: Math.round((l as any).dist ?? 0) }))
  );
}
