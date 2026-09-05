"use server";

/**
 * app/actions/staff-presence.actions.ts
 *
 * Staff duty / live-presence / anti-data-theft layer.
 *
 *  - Heartbeats keep a live board of who is online, what page they are on,
 *    and whether they are idle (no mouse/keyboard activity).
 *  - Duty gates access to sensitive lead contact data. Staff can toggle their
 *    own duty; a SUPER_ADMIN can force-lock anyone OFF duty.
 *  - Every reveal of a masked contact is recorded and rate-limited to stop
 *    mass scraping, while still letting staff open a single record to work it.
 *
 * All models here are additive — no existing table is touched.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import type { StaffDutyStatus, StaffActivityType } from "@prisma/client";

// Max masked-contact reveals a single staff member may make per UTC day.
const REVEAL_DAILY_LIMIT = 80;
// Consider a heartbeat "online" if seen within this window.
const PRESENCE_ONLINE_WINDOW_MS = 90_000;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated", session: null };
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    return { error: "Forbidden", session: null };
  }
  return { error: null, session };
}

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthenticated", session: null };
  if (session.user.role !== "SUPER_ADMIN") return { error: "Super Admin only", session: null };
  return { error: null, session };
}

async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null
    );
  } catch {
    return null;
  }
}

function isSameUtcDay(a: Date | null | undefined, b: Date): boolean {
  if (!a) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export type EffectiveDuty = {
  dutyStatus: StaffDutyStatus;
  forcedOff: boolean;
  online: boolean;
  isIdle: boolean;
  /** True when sensitive data must be masked/blurred. */
  protect: boolean;
  revealsToday: number;
  revealLimit: number;
};

function computeProtect(p: {
  dutyStatus: StaffDutyStatus;
  forcedOff: boolean;
  isIdle: boolean;
}): boolean {
  return p.forcedOff || p.dutyStatus === "OFF_DUTY" || p.isIdle;
}

async function logActivity(
  staffId: string,
  type: StaffActivityType,
  extra?: { path?: string | null; detail?: string | null; leadId?: string | null; ipAddress?: string | null }
) {
  try {
    await prisma.staffActivityEvent.create({
      data: {
        staffId,
        type,
        path: extra?.path ?? null,
        detail: extra?.detail ?? null,
        leadId: extra?.leadId ?? null,
        ipAddress: extra?.ipAddress ?? null,
      },
    });
  } catch {
    /* best-effort audit; never block the caller */
  }
}

// ─── 1. Heartbeat ─────────────────────────────────────────────────────────────

export async function staffHeartbeatAction(input: {
  path?: string;
  idle?: boolean;
}): Promise<ActionResult<EffectiveDuty>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");

  const staffId = session.user.id;
  const now = new Date();
  const idle = !!input.idle;
  const path = input.path?.slice(0, 300) ?? null;

  const existing = await prisma.staffPresence.findUnique({ where: { staffId } });

  // Detect transitions for the movement trail (keeps the log meaningful, not spammy).
  const pathChanged = !!path && existing?.currentPath !== path;
  const idleChanged = existing ? existing.isIdle !== idle : idle;

  const updated = await prisma.staffPresence.upsert({
    where: { staffId },
    create: {
      staffId,
      dutyStatus: "OFF_DUTY",
      online: true,
      isIdle: idle,
      currentPath: path,
      lastSeenAt: now,
      lastActiveAt: idle ? null : now,
    },
    update: {
      online: true,
      isIdle: idle,
      currentPath: path ?? existing?.currentPath,
      lastSeenAt: now,
      ...(idle ? {} : { lastActiveAt: now }),
    },
  });

  if (pathChanged) await logActivity(staffId, "NAVIGATE", { path });
  if (idleChanged) await logActivity(staffId, idle ? "IDLE" : "ACTIVE", { path });

  const protect = computeProtect(updated);
  return actionSuccess({
    dutyStatus: updated.dutyStatus,
    forcedOff: updated.forcedOff,
    online: true,
    isIdle: updated.isIdle,
    protect,
    revealsToday: isSameUtcDay(updated.revealDate, now) ? updated.revealCount : 0,
    revealLimit: REVEAL_DAILY_LIMIT,
  });
}

// ─── 2. Self duty toggle ──────────────────────────────────────────────────────

export async function setMyDutyAction(
  status: StaffDutyStatus
): Promise<ActionResult<EffectiveDuty>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");
  const staffId = session.user.id;
  const now = new Date();

  const existing = await prisma.staffPresence.findUnique({ where: { staffId } });
  // A staff member cannot lift an admin's force-off lock themselves.
  if (existing?.forcedOff && status === "ON_DUTY") {
    return actionError("An admin has locked you off duty. Please contact a super admin.");
  }

  const updated = await prisma.staffPresence.upsert({
    where: { staffId },
    create: { staffId, dutyStatus: status, online: true, lastSeenAt: now },
    update: { dutyStatus: status, lastSeenAt: now },
  });

  await logActivity(staffId, status === "ON_DUTY" ? "DUTY_ON" : "DUTY_OFF", { path: existing?.currentPath });

  return actionSuccess({
    dutyStatus: updated.dutyStatus,
    forcedOff: updated.forcedOff,
    online: updated.online,
    isIdle: updated.isIdle,
    protect: computeProtect(updated),
    revealsToday: isSameUtcDay(updated.revealDate, now) ? updated.revealCount : 0,
    revealLimit: REVEAL_DAILY_LIMIT,
  });
}

// ─── 3. Admin force duty on/off ───────────────────────────────────────────────

export async function setStaffDutyAction(
  staffId: string,
  status: StaffDutyStatus
): Promise<ActionResult<{ staffId: string; dutyStatus: StaffDutyStatus; forcedOff: boolean }>> {
  const { error, session } = await requireSuperAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");
  const now = new Date();

  const forcedOff = status === "OFF_DUTY";
  const updated = await prisma.staffPresence.upsert({
    where: { staffId },
    create: {
      staffId,
      dutyStatus: status,
      forcedOff,
      forcedById: session.user.id,
      forcedAt: now,
    },
    update: {
      dutyStatus: status,
      forcedOff,
      forcedById: session.user.id,
      forcedAt: now,
    },
  });

  await logActivity(staffId, forcedOff ? "FORCED_OFF" : "FORCED_ON", {
    detail: `By ${session.user.name || session.user.email}`,
  });

  return actionSuccess({ staffId, dutyStatus: updated.dutyStatus, forcedOff: updated.forcedOff });
}

// ─── 4. Log & rate-limit a masked-contact reveal ──────────────────────────────

export async function logContactRevealAction(
  leadId: string
): Promise<ActionResult<{ allowed: boolean; reason?: string; revealsToday: number; remaining: number }>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");
  const staffId = session.user.id;
  const now = new Date();
  const ip = await clientIp();

  const presence = await prisma.staffPresence.findUnique({ where: { staffId } });

  // Force-locked or explicitly off-duty staff may not reveal contacts at all.
  // (Idle alone only blurs the UI; a reveal is allowed again as soon as they move.)
  if (presence?.forcedOff) {
    await logActivity(staffId, "RATE_LIMIT_HIT", { leadId, ipAddress: ip, detail: "forced_off" });
    return actionSuccess({ allowed: false, reason: "You are locked off duty by an admin.", revealsToday: 0, remaining: 0 });
  }
  if (presence && presence.dutyStatus === "OFF_DUTY") {
    return actionSuccess({ allowed: false, reason: "Go on duty to view contact details.", revealsToday: 0, remaining: 0 });
  }

  const sameDay = isSameUtcDay(presence?.revealDate, now);
  const current = sameDay ? presence?.revealCount ?? 0 : 0;

  if (current >= REVEAL_DAILY_LIMIT) {
    await logActivity(staffId, "RATE_LIMIT_HIT", { leadId, ipAddress: ip, detail: `count=${current}` });
    return actionSuccess({
      allowed: false,
      reason: `Daily reveal limit (${REVEAL_DAILY_LIMIT}) reached. Contact a super admin.`,
      revealsToday: current,
      remaining: 0,
    });
  }

  const next = current + 1;
  await prisma.staffPresence.upsert({
    where: { staffId },
    create: { staffId, dutyStatus: "ON_DUTY", revealCount: next, revealDate: now, lastSeenAt: now },
    update: { revealCount: next, revealDate: now, lastSeenAt: now },
  });
  await logActivity(staffId, "REVEAL_CONTACT", { leadId, ipAddress: ip });

  return actionSuccess({
    allowed: true,
    revealsToday: next,
    remaining: Math.max(0, REVEAL_DAILY_LIMIT - next),
  });
}

// ─── 5. My presence (initial hydrate for the tracker) ─────────────────────────

export async function getMyPresenceAction(): Promise<ActionResult<EffectiveDuty & { staffId: string }>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");
  const staffId = session.user.id;
  const now = new Date();

  const p = await prisma.staffPresence.findUnique({ where: { staffId } });
  if (!p) {
    return actionSuccess({
      staffId,
      dutyStatus: "OFF_DUTY",
      forcedOff: false,
      online: false,
      isIdle: false,
      protect: true,
      revealsToday: 0,
      revealLimit: REVEAL_DAILY_LIMIT,
    });
  }

  return actionSuccess({
    staffId,
    dutyStatus: p.dutyStatus,
    forcedOff: p.forcedOff,
    online: !!p.lastSeenAt && now.getTime() - p.lastSeenAt.getTime() < PRESENCE_ONLINE_WINDOW_MS,
    isIdle: p.isIdle,
    protect: computeProtect(p),
    revealsToday: isSameUtcDay(p.revealDate, now) ? p.revealCount : 0,
    revealLimit: REVEAL_DAILY_LIMIT,
  });
}

// ─── 6. Live presence board (admin oversight) ─────────────────────────────────

export type PresenceBoardRow = {
  staffId: string;
  name: string | null;
  email: string;
  role: string;
  subAdminRole: string | null;
  dutyStatus: StaffDutyStatus;
  forcedOff: boolean;
  online: boolean;
  isIdle: boolean;
  currentPath: string | null;
  lastSeenAt: Date | null;
  lastActiveAt: Date | null;
  revealsToday: number;
  idleMinutes: number | null;
};

export async function getStaffPresenceBoardAction(): Promise<ActionResult<{
  rows: PresenceBoardRow[];
  recentActivity: Array<{
    id: string;
    staffId: string;
    staffName: string | null;
    type: StaffActivityType;
    path: string | null;
    detail: string | null;
    leadId: string | null;
    createdAt: Date;
  }>;
  isSuperAdmin: boolean;
}>> {
  const { error, session } = await requireAdmin();
  if (error || !session?.user) return actionError(error ?? "Unauthorized");
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const now = new Date();

  const staffWhere: any = isSuperAdmin
    ? { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] }, isActive: true }
    : { id: session.user.id };

  const staff = await prisma.user.findMany({
    where: staffWhere,
    select: {
      id: true, name: true, email: true, role: true, subAdminRole: true,
    },
    orderBy: { name: "asc" },
  });

  const staffIds = staff.map((s) => s.id);
  const presences = await prisma.staffPresence.findMany({
    where: { staffId: { in: staffIds } },
  });
  const presenceMap = new Map(presences.map((p) => [p.staffId, p]));

  const rows: PresenceBoardRow[] = staff.map((s) => {
    const p = presenceMap.get(s.id);
    const online = !!p?.lastSeenAt && now.getTime() - p.lastSeenAt.getTime() < PRESENCE_ONLINE_WINDOW_MS;
    const idleMinutes = p?.isIdle && p.lastActiveAt
      ? Math.floor((now.getTime() - p.lastActiveAt.getTime()) / 60000)
      : null;
    return {
      staffId: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      subAdminRole: s.subAdminRole,
      dutyStatus: p?.dutyStatus ?? "OFF_DUTY",
      forcedOff: p?.forcedOff ?? false,
      online,
      isIdle: p?.isIdle ?? false,
      currentPath: p?.currentPath ?? null,
      lastSeenAt: p?.lastSeenAt ?? null,
      lastActiveAt: p?.lastActiveAt ?? null,
      revealsToday: isSameUtcDay(p?.revealDate, now) ? p?.revealCount ?? 0 : 0,
      idleMinutes,
    };
  });

  const activityWhere = isSuperAdmin ? {} : { staffId: session.user.id };
  const events = await prisma.staffActivityEvent.findMany({
    where: activityWhere,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true, staffId: true, type: true, path: true, detail: true, leadId: true, createdAt: true,
      staff: { select: { name: true } },
    },
  });

  return actionSuccess({
    rows,
    recentActivity: events.map((e) => ({
      id: e.id,
      staffId: e.staffId,
      staffName: e.staff?.name ?? null,
      type: e.type,
      path: e.path,
      detail: e.detail,
      leadId: e.leadId,
      createdAt: e.createdAt,
    })),
    isSuperAdmin,
  });
}
