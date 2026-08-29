"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { runCampaignPass, resolveCampaignTargets, generateDummyLead, getNearestLocalities, type DummyLead } from "@/lib/dummy-lead-engine";
import { parseCampaignCfg, serializeCampaignCfg, type DummyCampaignCfg } from "@/lib/dummy-campaign-types";
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
    rateType?: "HOURLY" | "MONTHLY";
    autoAdapt?: boolean;
    emailFilter?: DummyCampaignCfg["emailFilter"];
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
      targetGroup: data.targetGroup,
      customUserIds: data.customUserIds ?? [],
      excludeUserIds: data.excludeUserIds ?? [],
      channels: data.channels,
      leadsPerDay: data.leadsPerDay ?? 1,
      randomizeDaily: data.randomizeDaily ?? true,
      overrideSubjects: data.overrideSubjects ?? [],
      budgetMin: data.budgetMin ?? 200,
      budgetMax: data.budgetMax ?? 600,
      totalLimit: data.totalLimit ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: serializeCampaignCfg(data.description ?? "", {
        rateType: data.rateType ?? "HOURLY",
        autoAdapt: data.autoAdapt !== false,
        emailFilter: data.emailFilter ?? "GENUINE_ONLY",
      }),
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

export async function triggerCampaignNowAction(id: string): Promise<ActionResult<{ sent: number; failed: number; usersProcessed: number; timeTakenMs?: number }>> {
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
    return actionSuccess({
      sent: result.sent,
      failed: result.failed,
      usersProcessed: result.usersProcessed,
      timeTakenMs: result.timeTakenMs ?? 0,
    });
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
        overrideSubjects: true,
        budgetMin: true,
        budgetMax: true,
        customUserIds: true,
        excludeUserIds: true,
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

// ── Get Campaign Logs (paginated & searchable with message payloads) ───────────

export async function getDummyCampaignLogs(opts: {
  campaignId?: string;
  search?: string;
  emailFilter?: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  channel?: string;
  status?: string;
}) {
  const { error } = await requireSuperAdmin();
  if (error) return { logs: [], total: 0, error };

  const { campaignId, search, emailFilter = "ALL", page = 1, pageSize = 50, from, to, channel, status } = opts;

  const where: Record<string, any> = {};
  if (campaignId) where.campaignId = campaignId;
  if (from || to) {
    where.sentAt = {};
    if (from) where.sentAt.gte = new Date(from);
    if (to) where.sentAt.lte = new Date(to + "T23:59:59Z");
  }
  if (channel) where.channel = channel;
  if (status) where.status = status;

  if (emailFilter === "GENUINE_ONLY") {
    where.userEmail = { not: { contains: "apnatutorhub.com" } };
  } else if (emailFilter === "DUMMY_ONLY") {
    where.userEmail = { contains: "apnatutorhub.com" };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { userName: { contains: q, mode: "insensitive" } },
      { userEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.campaignDeliveryLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { campaign: { select: { name: true, targetGroup: true } } },
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
  const leads: DummyLead[] = await Promise.all(
    sample.map(async (u, i) => {
      const userSeed = u.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const cfg = parseCampaignCfg(campaign?.description);
      return generateDummyLead({
        tutorLat: u.tutorProfile?.latitude,
        tutorLng: u.tutorProfile?.longitude,
        tutorCity: u.tutorProfile?.city,
        tutorAddress: u.tutorProfile?.address ?? "",
        tutorSubjects: u.tutorProfile?.subjects ?? [],
        tutorClassLevels: u.tutorProfile?.classLevels ?? [],
        teachingRadius: u.tutorProfile?.teachingRadius ?? 10,
        teachingMode: (u.tutorProfile as { teachingMode?: string | null } | null)?.teachingMode,
        tutorFeeMin: (u.tutorProfile as { feeMin?: number | null } | null)?.feeMin,
        tutorFeeMax: (u.tutorProfile as { feeMax?: number | null } | null)?.feeMax,
        rateType: cfg.rateType,
        autoAdapt: cfg.autoAdapt,
        budgetMin: campaign?.budgetMin ?? budgetMin,
        budgetMax: campaign?.budgetMax ?? budgetMax,
        overrideSubjects: campaign?.overrideSubjects ?? overrideSubjects,
        userSeed: userSeed + i * 137,
      });
    })
  );

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

// ── Search & Filter Tutors for Interactive Selection ───────────────────────────

export async function getTutorsForCampaignTargetAction(opts: {
  search?: string;
  city?: string;
  subject?: string;
  classLevel?: string;
  kycVerifiedOnly?: boolean;
  emailFilter?: "GENUINE_ONLY" | "DUMMY_ONLY" | "ALL";
  limit?: number;
}): Promise<ActionResult<{
  tutors: Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    city: string | null;
    subjects: string[];
    classLevels: string[];
    isVerified: boolean;
    isGenuine: boolean;
  }>;
  totalCount: number;
}>> {
  const { error } = await requireSuperAdmin();
  if (error) return actionError(error);

  const { search, city, subject, classLevel, kycVerifiedOnly, emailFilter = "ALL", limit = 100 } = opts;

  const where: Record<string, any> = {
    role: "TUTOR",
    isActive: true,
  };

  if (emailFilter === "GENUINE_ONLY") {
    where.email = { not: { contains: "apnatutorhub.com" } };
  } else if (emailFilter === "DUMMY_ONLY") {
    where.email = { contains: "apnatutorhub.com" };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { tutorProfile: { city: { contains: q, mode: "insensitive" } } },
      { tutorProfile: { address: { contains: q, mode: "insensitive" } } },
    ];
  }

  const profileWhere: Record<string, any> = {};
  if (kycVerifiedOnly) {
    profileWhere.isVerified = true;
  }
  if (city && city.trim()) {
    profileWhere.city = { contains: city.trim(), mode: "insensitive" };
  }
  if (subject && subject.trim()) {
    profileWhere.subjects = { has: subject.trim() };
  }
  if (classLevel && classLevel.trim()) {
    profileWhere.classLevels = { has: classLevel.trim() };
  }

  if (Object.keys(profileWhere).length > 0) {
    where.tutorProfile = profileWhere;
  }

  const [tutors, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tutorProfile: {
          select: {
            city: true,
            subjects: true,
            classLevels: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return actionSuccess({
    tutors: tutors.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      city: u.tutorProfile?.city ?? null,
      subjects: u.tutorProfile?.subjects ?? [],
      classLevels: u.tutorProfile?.classLevels ?? [],
      isVerified: u.tutorProfile?.isVerified ?? false,
      isGenuine: !u.email.toLowerCase().includes("apnatutorhub.com"),
    })),
    totalCount,
  });
}

/**
 * Quick 1-Click Action: Activates or Creates an Evergreen Daily Campaign for ALL tutors.
 * Automatically targets ALL active tutors dynamically on every 24h cron pass,
 * including any new tutors who sign up or are created in the future.
 */
export async function quickActivateDailyAllTutorsCampaignAction(): Promise<
  ActionResult<{ campaignId: string; created: boolean; status: string }>
> {
  const { error, session } = await requireSuperAdmin();
  if (error) return actionError(error);

  // Check if an ALL_TUTORS evergreen campaign is already active
  let campaign = await prisma.dummyCampaign.findFirst({
    where: {
      targetGroup: "ALL_TUTORS",
      status: "ACTIVE",
    },
  });

  if (campaign) {
    return actionSuccess({ campaignId: campaign.id, created: false, status: "ACTIVE" });
  }

  // Check for any existing ALL_TUTORS campaign (even if paused or draft)
  campaign = await prisma.dummyCampaign.findFirst({
    where: {
      targetGroup: "ALL_TUTORS",
    },
    orderBy: { createdAt: "desc" },
  });

  if (campaign) {
    await prisma.dummyCampaign.update({
      where: { id: campaign.id },
      data: { status: "ACTIVE" },
    });
    revalidatePath("/admin/dummy-campaigns");
    return actionSuccess({ campaignId: campaign.id, created: false, status: "ACTIVE" });
  }

  // Create a new perpetual daily campaign for all tutors
  const newCampaign = await prisma.dummyCampaign.create({
    data: {
      name: "⚡ Evergreen Daily Schedule — All Active Tutors",
      targetGroup: "ALL_TUTORS",
      status: "ACTIVE",
      channels: ["IN_APP", "PUSH", "EMAIL"],
      leadsPerDay: 1,
      randomizeDaily: true,
      budgetMin: 300,
      budgetMax: 800,
      totalLimit: null, // Unlimited / perpetual
      startDate: null,
      endDate: null,    // No end date (perpetual daily)
      description: serializeCampaignCfg(
        "Automated perpetual daily dummy lead campaign. Dynamically targets all current active tutors and automatically includes all future new tutor registrations on every 24h pass.",
        {
          rateType: "HOURLY",
          autoAdapt: true,
          emailFilter: "GENUINE_ONLY",
        }
      ),
      createdById: session!.user.id,
    },
  });

  revalidatePath("/admin/dummy-campaigns");
  return actionSuccess({ campaignId: newCampaign.id, created: true, status: "ACTIVE" });
}


