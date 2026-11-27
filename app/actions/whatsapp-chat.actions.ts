"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";
import { getAllowedSubAdminModules } from "@/lib/rbac";
import {
  decryptPhoneToken,
  ENCRYPTED_PHONE_PREFIX,
  encryptPhoneToken,
  maskPhoneNumber,
} from "@/lib/mask-utils";

function resolveTargetPhone(phoneOrToken: string): string | null {
  const trimmed = phoneOrToken.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(ENCRYPTED_PHONE_PREFIX)) {
    const decrypted = decryptPhoneToken(trimmed);
    if (!decrypted) return null;
    return normalizeIndiaWhatsApp(decrypted) || decrypted.replace(/\D/g, "") || null;
  }
  return normalizeIndiaWhatsApp(trimmed) || trimmed.replace(/\D/g, "") || null;
}

function formatMaskedDisplayPhone(phone: string): string {
  const masked = maskPhoneNumber(phone) || "••••••••••";
  return masked.startsWith("+") ? masked : `+${masked}`;
}

export interface WhatsAppConversationSummary {
  phone: string;
  displayPhone?: string;
  encryptedToken?: string;
  isPhoneMasked?: boolean;
  name: string;
  email?: string | null;
  role: string;
  location?: string | null;
  subjects?: string[];
  sessionStep?: string | null;
  lastMessage: {
    body: string;
    direction: "INBOUND" | "OUTBOUND";
    senderName?: string | null;
    sentByUserId?: string | null;
    sentByName?: string | null;
    createdAt: string;
  } | null;
  unreadCount: number;
  totalMessages: number;
  isInterestedLead: boolean;
  /** Last message from user and/or unread — staff should reply */
  needsStaffReply: boolean;
}

export type WhatsAppReplyFilter = "ALL" | "NEEDS_REPLY" | "AWAITING_USER";

export interface WhatsAppChatThreadsPage {
  threads: WhatsAppConversationSummary[];
  page: number;
  pageSize: number;
  totalThreads: number;
  totalPages: number;
  totalUnread: number;
  interestedCount: number;
  needsReplyCount: number;
  awaitingUserCount: number;
}

const DEFAULT_THREAD_PAGE_SIZE = 50;
const MAX_THREAD_PAGE_SIZE = 100;

export interface WhatsAppChatMessageItem {
  id: string;
  phone: string;
  direction: "INBOUND" | "OUTBOUND";
  senderName?: string | null;
  sentByUserId?: string | null;
  sentByName?: string | null;
  status?: string | null;
  body: string;
  step?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface WhatsAppEmployeeReplyStat {
  staffId: string;
  name: string;
  email: string;
  role: string;
  subAdminRole: string | null;
  isActive: boolean;
  repliesToday: number;
  replies7d: number;
  replies30d: number;
  repliesTotal: number;
  customMessagesTotal: number;
  uniqueContacts: number;
  failedCount: number;
  lastReplyAt: string | null;
}

export interface WhatsAppRecentStaffReply {
  id: string;
  phone: string;
  staffId: string | null;
  staffName: string;
  body: string;
  step: string | null;
  status: string | null;
  createdAt: string;
}

export interface WhatsAppEmployeeRepliesReport {
  isSuperAdmin: boolean;
  range: "today" | "7d" | "30d" | "all";
  totals: {
    repliesToday: number;
    replies7d: number;
    replies30d: number;
    repliesTotal: number;
    uniqueContacts: number;
    activeResponders: number;
    unattributedStaffReplies: number;
  };
  employees: WhatsAppEmployeeReplyStat[];
  recentReplies: WhatsAppRecentStaffReply[];
}

export interface WhatsAppChatContactDetails {
  phone: string;
  displayPhone?: string;
  encryptedToken?: string;
  isPhoneMasked?: boolean;
  name: string;
  email?: string | null;
  role: string;
  location?: string | null;
  subjects?: string[];
  isRegistered: boolean;
  userId?: string | null;
  tutorProfileId?: string | null;
  walletBalance?: number | null;
  coinsBalance?: number | null;
  sessionStep?: string | null;
  sessionData?: Record<string, unknown> | null;
}

async function requireStaffOrAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthenticated: Please log in as staff or admin", session: null };
  }
  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "SUB_ADMIN") {
    return { error: "Forbidden: Staff or Admin role required", session: null };
  }

  // A staff account must also hold the WhatsApp Live Chats module. Role alone
  // is not enough — finance/marketing staff must not be able to call these
  // actions from another page even if middleware allowed that page.
  if (role === "SUB_ADMIN") {
    const allowed = getAllowedSubAdminModules(session.user);
    if (!allowed.includes("/admin/whatsapp-chats")) {
      return {
        error: "Forbidden: WhatsApp Live Chats access is not granted to this staff account",
        session: null,
      };
    }
  }

  return { error: null, session };
}

function phoneLast10(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

async function loadInterestedPhoneKeys(): Promise<Set<string>> {
  const leads = await prisma.staffLead.findMany({
    where: {
      status: "INTERESTED",
      OR: [{ phone: { not: null } }, { whatsapp: { not: null } }],
    },
    select: { phone: true, whatsapp: true },
  });
  const keys = new Set<string>();
  for (const lead of leads) {
    for (const raw of [lead.phone, lead.whatsapp]) {
      if (!raw) continue;
      const k = phoneLast10(raw);
      if (k.length >= 10) keys.add(k);
    }
  }
  return keys;
}

/**
 * Fetch all WhatsApp chat threads for staff/admin inbox.
 * Groups by phone number, joins with user profiles, and orders by latest message.
 */
export async function getWhatsAppChatThreadsAction(params?: {
  search?: string;
  roleFilter?: string;
  unreadOnly?: boolean;
  interestedOnly?: boolean;
  replyFilter?: WhatsAppReplyFilter;
  staffIdFilter?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<WhatsAppChatThreadsPage>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  try {
    const searchRawInput = params?.search?.trim() ?? "";
    const decryptedSearchPhone = searchRawInput.startsWith(ENCRYPTED_PHONE_PREFIX)
      ? decryptPhoneToken(searchRawInput)
      : null;
    const searchRaw = decryptedSearchPhone ?? searchRawInput;
    const search = searchRaw.toLowerCase();
    const roleFilter = params?.roleFilter?.toUpperCase();
    const unreadOnly = Boolean(params?.unreadOnly);
    const interestedOnly = Boolean(params?.interestedOnly);
    const replyFilter: WhatsAppReplyFilter = params?.replyFilter ?? "ALL";
    const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";
    const requestedStaffId = params?.staffIdFilter?.trim() || null;
    // Sub-admins may only filter by their own ID; Super Admins can inspect any staff member
    const effectiveStaffFilter = requestedStaffId
      ? isSuperAdmin
        ? requestedStaffId
        : guard.session.user.id
      : null;
    const page = Math.max(1, Math.floor(params?.page ?? 1));
    const pageSize = Math.min(
      MAX_THREAD_PAGE_SIZE,
      Math.max(10, Math.floor(params?.pageSize ?? DEFAULT_THREAD_PAGE_SIZE))
    );
    const offset = (page - 1) * pageSize;

    type LatestRow = {
      id: string;
      phone: string;
      direction: string;
      senderName: string | null;
      sentByUserId: string | null;
      contactName: string | null;
      body: string;
      step: string | null;
      messageId: string | null;
      isRead: boolean;
      createdAt: Date;
      unread_count: number;
    };

    type StatsRow = {
      total_threads: number;
      needs_reply_count: number;
      awaiting_user_count: number;
      total_unread: number;
    };

    const interestedKeys = await loadInterestedPhoneKeys();

    if (interestedOnly && interestedKeys.size === 0) {
      return actionSuccess({
        threads: [],
        page,
        pageSize,
        totalThreads: 0,
        totalPages: 0,
        totalUnread: 0,
        interestedCount: 0,
        needsReplyCount: 0,
        awaitingUserCount: 0,
      });
    }

    const interestedList = interestedOnly ? Array.from(interestedKeys) : [];

    const searchPattern = search ? `%${search}%` : null;

    const statsRows = await prisma.$queryRaw<StatsRow[]>`
      WITH latest AS (
        SELECT id, phone, direction, "senderName", "sentByUserId", "contactName", body, step, "messageId", "isRead", "createdAt"
        FROM (
          SELECT
            id, phone, direction, "senderName", "sentByUserId", "contactName", body, step, "messageId", "isRead", "createdAt",
            ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" DESC) AS rn
          FROM whatsapp_chat_messages
        ) x
        WHERE rn = 1
      ),
      unread AS (
        SELECT phone, COUNT(*)::bigint AS unread_count
        FROM whatsapp_chat_messages
        WHERE direction = 'INBOUND' AND "isRead" = false
        GROUP BY phone
      ),
      base AS (
        SELECT
          l.*,
          COALESCE(u.unread_count, 0)::int AS unread_count
        FROM latest l
        LEFT JOIN unread u ON u.phone = l.phone
      )
      SELECT
        COUNT(*)::int AS total_threads,
        COUNT(*) FILTER (
          WHERE direction = 'INBOUND' OR unread_count > 0
        )::int AS needs_reply_count,
        COUNT(*) FILTER (
          WHERE direction = 'OUTBOUND' AND unread_count = 0
        )::int AS awaiting_user_count,
        COALESCE(SUM(unread_count), 0)::int AS total_unread
      FROM base
      WHERE
        (${unreadOnly}::boolean = false OR unread_count > 0)
        AND (
          ${replyFilter}::text = 'ALL'
          OR (${replyFilter}::text = 'NEEDS_REPLY' AND (direction = 'INBOUND' OR unread_count > 0))
          OR (${replyFilter}::text = 'AWAITING_USER' AND direction = 'OUTBOUND' AND unread_count = 0)
        )
        AND (
          ${searchPattern}::text IS NULL
          OR phone ILIKE ${searchPattern}
          OR body ILIKE ${searchPattern}
          OR COALESCE("contactName", '') ILIKE ${searchPattern}
        )
        AND (
          ${interestedOnly}::boolean = false
          OR RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ANY(${interestedList}::text[])
        )
        AND (
          ${effectiveStaffFilter}::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM whatsapp_chat_messages wm
            WHERE wm.phone = base.phone
              AND wm."sentByUserId" = ${effectiveStaffFilter}
              AND wm.step = 'STAFF_REPLY'
          )
        )
    `;

    const stats = statsRows[0] ?? {
      total_threads: 0,
      needs_reply_count: 0,
      awaiting_user_count: 0,
      total_unread: 0,
    };

    const totalThreads = stats.total_threads;
    const totalPages = totalThreads === 0 ? 0 : Math.ceil(totalThreads / pageSize);

    if (totalThreads === 0) {
      return actionSuccess({
        threads: [],
        page,
        pageSize,
        totalThreads: 0,
        totalPages: 0,
        totalUnread: stats.total_unread,
        interestedCount: interestedKeys.size,
        needsReplyCount: stats.needs_reply_count,
        awaitingUserCount: stats.awaiting_user_count,
      });
    }

    const pageRows = await prisma.$queryRaw<LatestRow[]>`
      WITH latest AS (
        SELECT id, phone, direction, "senderName", "sentByUserId", "contactName", body, step, "messageId", "isRead", "createdAt"
        FROM (
          SELECT
            id, phone, direction, "senderName", "sentByUserId", "contactName", body, step, "messageId", "isRead", "createdAt",
            ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" DESC) AS rn
          FROM whatsapp_chat_messages
        ) x
        WHERE rn = 1
      ),
      unread AS (
        SELECT phone, COUNT(*)::bigint AS unread_count
        FROM whatsapp_chat_messages
        WHERE direction = 'INBOUND' AND "isRead" = false
        GROUP BY phone
      ),
      base AS (
        SELECT
          l.*,
          COALESCE(u.unread_count, 0)::int AS unread_count
        FROM latest l
        LEFT JOIN unread u ON u.phone = l.phone
      )
      SELECT *
      FROM base
      WHERE
        (${unreadOnly}::boolean = false OR unread_count > 0)
        AND (
          ${replyFilter}::text = 'ALL'
          OR (${replyFilter}::text = 'NEEDS_REPLY' AND (direction = 'INBOUND' OR unread_count > 0))
          OR (${replyFilter}::text = 'AWAITING_USER' AND direction = 'OUTBOUND' AND unread_count = 0)
        )
        AND (
          ${searchPattern}::text IS NULL
          OR phone ILIKE ${searchPattern}
          OR body ILIKE ${searchPattern}
          OR COALESCE("contactName", '') ILIKE ${searchPattern}
        )
        AND (
          ${interestedOnly}::boolean = false
          OR RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ANY(${interestedList}::text[])
        )
        AND (
          ${effectiveStaffFilter}::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM whatsapp_chat_messages wm
            WHERE wm.phone = base.phone
              AND wm."sentByUserId" = ${effectiveStaffFilter}
              AND wm.step = 'STAFF_REPLY'
          )
        )
      ORDER BY "createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const staffUserIds = Array.from(
      new Set(pageRows.map((r) => r.sentByUserId).filter((id): id is string => Boolean(id)))
    );

    const phones = pageRows.map((r) => r.phone);
    const phoneVariants: string[] = [];
    phones.forEach((p) => {
      phoneVariants.push(p);
      const digits10 = phoneLast10(p);
      if (digits10 && digits10 !== p) phoneVariants.push(digits10);
    });

    const [users, sessions, staffSenders] = await Promise.all([
      phoneVariants.length === 0
        ? Promise.resolve([])
        : prisma.user.findMany({
            where: { phone: { in: phoneVariants } },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              tutorProfile: {
                select: {
                  id: true,
                  subjects: true,
                  address: true,
                  city: true,
                },
              },
              parentProfile: {
                select: {
                  id: true,
                  address: true,
                  city: true,
                },
              },
            },
          }),
      phones.length === 0
        ? Promise.resolve([])
        : prisma.whatsappSession.findMany({
            where: { phone: { in: phones } },
            select: {
              phone: true,
              step: true,
              lastMessageAt: true,
              data: true,
              userType: true,
            },
          }),
      staffUserIds.length === 0
        ? Promise.resolve([])
        : prisma.user.findMany({
            where: { id: { in: staffUserIds } },
            select: { id: true, name: true, email: true },
          }),
    ]);

    const staffNameMap = new Map(staffSenders.map((u) => [u.id, u.name || u.email]));

    const userMap = new Map<string, (typeof users)[0]>();
    users.forEach((u) => {
      if (u.phone) {
        userMap.set(u.phone, u);
        const d10 = phoneLast10(u.phone);
        if (d10) userMap.set(d10, u);
      }
    });

    const sessionMap = new Map<string, (typeof sessions)[0]>();
    sessions.forEach((s) => sessionMap.set(s.phone, s));

    const threads: WhatsAppConversationSummary[] = [];

    for (const latestMsg of pageRows) {
      const phone = latestMsg.phone;
      const d10 = phoneLast10(phone);
      const isInterestedLead = d10.length >= 10 && interestedKeys.has(d10);
      const matchedUser = userMap.get(phone) || (d10 ? userMap.get(d10) : undefined);
      const matchedSession = sessionMap.get(phone);
      const sessionData = (matchedSession?.data as Record<string, unknown>) || {};
      const unread = latestMsg.unread_count;
      const needsStaffReply = latestMsg.direction === "INBOUND" || unread > 0;

      const name =
        matchedUser?.name ||
        latestMsg.contactName ||
        (typeof sessionData.name === "string" ? sessionData.name : null) ||
        (matchedSession?.userType
          ? `${matchedSession.userType} (${phone.slice(-4)})`
          : `User ${phone.slice(-4)}`);

      const email =
        matchedUser?.email ||
        (typeof sessionData.email === "string" ? sessionData.email : null) ||
        null;
      const role = matchedUser?.role || matchedSession?.userType || "LEAD";

      if (roleFilter && roleFilter !== "ALL" && role.toUpperCase() !== roleFilter) {
        continue;
      }

      const location =
        matchedUser?.tutorProfile?.city ||
        matchedUser?.tutorProfile?.address ||
        matchedUser?.parentProfile?.city ||
        matchedUser?.parentProfile?.address ||
        (typeof sessionData.area === "string" ? sessionData.area : null) ||
        (typeof sessionData.city === "string" ? sessionData.city : null) ||
        null;

      const subjects =
        matchedUser?.tutorProfile?.subjects ||
        (Array.isArray(sessionData.subjects) ? (sessionData.subjects as string[]) : undefined);

      if (search) {
        const hay = `${phone} ${name} ${email || ""} ${location || ""} ${latestMsg.body || ""}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }

      const sentByName = latestMsg.sentByUserId ? staffNameMap.get(latestMsg.sentByUserId) ?? null : null;
      const encryptedToken = encryptPhoneToken(phone);
      const displayPhone = isSuperAdmin ? `+${phone}` : formatMaskedDisplayPhone(phone);

      threads.push({
        phone: isSuperAdmin ? phone : encryptedToken,
        displayPhone,
        encryptedToken,
        isPhoneMasked: !isSuperAdmin,
        name,
        email,
        role,
        location,
        subjects,
        sessionStep: matchedSession?.step || latestMsg.step || null,
        lastMessage: {
          body: latestMsg.body,
          direction: latestMsg.direction as "INBOUND" | "OUTBOUND",
          senderName: latestMsg.senderName,
          sentByUserId: latestMsg.sentByUserId,
          sentByName,
          createdAt: latestMsg.createdAt.toISOString(),
        },
        unreadCount: unread,
        totalMessages: 0,
        isInterestedLead,
        needsStaffReply,
      });
    }

    return actionSuccess({
      threads,
      page,
      pageSize,
      totalThreads,
      totalPages,
      totalUnread: stats.total_unread,
      interestedCount: interestedKeys.size,
      needsReplyCount: stats.needs_reply_count,
      awaitingUserCount: stats.awaiting_user_count,
    });
  } catch (err) {
    console.error("[getWhatsAppChatThreadsAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to load WhatsApp chat threads.");
  }
}

/**
 * Fetch full chat history for a specific phone number.
 * Automatically marks all unread inbound messages for this phone as read.
 */
export async function getWhatsAppChatMessagesAction(
  phone: string,
  options?: {
    /** Max messages when loading history (default 350). Ignored when `since` is set. */
    limit?: number;
    /** ISO timestamp — return only messages after this (for lightweight polling). */
    since?: string;
    /** Mark inbound messages read (default true on full load, false on incremental poll). */
    markRead?: boolean;
  }
): Promise<ActionResult<{ messages: WhatsAppChatMessageItem[]; contact: WhatsAppChatContactDetails | null }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");
  const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";

  const normalized = resolveTargetPhone(phone);
  if (!normalized) return actionError("Invalid phone number");

  const sinceIso = options?.since?.trim();
  const incremental = Boolean(sinceIso);
  const markRead = options?.markRead ?? !incremental;
  const limit = Math.min(Math.max(options?.limit ?? 350, 50), 1500);

  try {
    const sinceDate = incremental && sinceIso ? new Date(sinceIso) : null;
    if (sinceDate && Number.isNaN(sinceDate.getTime())) {
      return actionError("Invalid since timestamp");
    }

    const msgInclude = {
      sentByUser: { select: { id: true, name: true, email: true } },
    } as const;

    const rawMessages = sinceDate
      ? await prisma.whatsappChatMessage.findMany({
          where: { phone: normalized, createdAt: { gt: sinceDate } },
          orderBy: { createdAt: "asc" },
          take: 150,
          include: msgInclude,
        })
      : (
          await prisma.whatsappChatMessage.findMany({
            where: { phone: normalized },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: msgInclude,
          })
        ).reverse();

    if (markRead && rawMessages.length > 0) {
      const unreadInboundIds = rawMessages
        .filter((m) => m.direction === "INBOUND" && !m.isRead)
        .map((m) => m.id);
      if (unreadInboundIds.length > 0) {
        await prisma.whatsappChatMessage.updateMany({
          where: { id: { in: unreadInboundIds } },
          data: { isRead: true },
        });
      } else if (!incremental) {
        await prisma.whatsappChatMessage.updateMany({
          where: {
            phone: normalized,
            direction: "INBOUND",
            isRead: false,
          },
          data: { isRead: true },
        });
      }
    }

    const encryptedToken = encryptPhoneToken(normalized);
    const messages: WhatsAppChatMessageItem[] = rawMessages.map((m) => ({
      id: m.id,
      phone: isSuperAdmin ? m.phone : encryptedToken,
      direction: m.direction as "INBOUND" | "OUTBOUND",
      senderName: m.senderName,
      sentByUserId: m.sentByUserId ?? null,
      sentByName: m.sentByUser ? m.sentByUser.name || m.sentByUser.email : null,
      status: m.status ?? null,
      body: m.body,
      step: m.step,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
    }));

    let contact: WhatsAppChatContactDetails | null = null;
    if (!incremental) {
      const d10 = normalized.slice(-10);
      const [user, session] = await Promise.all([
        prisma.user.findFirst({
          where: {
            OR: [{ phone: normalized }, { phone: d10 }],
          },
          include: {
            tutorProfile: {
              include: {
                wallet: true,
              },
            },
            parentProfile: true,
          },
        }),
        prisma.whatsappSession.findUnique({
          where: { phone: normalized },
        }),
      ]);

      const rawSessionData = (session?.data as Record<string, any>) || {};
      const sessionData = isSuperAdmin
        ? rawSessionData
        : Object.fromEntries(
            Object.entries(rawSessionData).filter(([k]) => !/phone|mobile|whatsapp/i.test(k))
          );

      contact = {
        phone: isSuperAdmin ? normalized : encryptedToken,
        displayPhone: isSuperAdmin ? `+${normalized}` : formatMaskedDisplayPhone(normalized),
        encryptedToken,
        isPhoneMasked: !isSuperAdmin,
        name:
          user?.name ||
          rawMessages.find((m) => m.contactName)?.contactName ||
          sessionData.name ||
          `User ${normalized.slice(-4)}`,
        email: user?.email || sessionData.email || null,
        role: user?.role || session?.userType || "LEAD",
        location:
          user?.tutorProfile?.city ||
          user?.tutorProfile?.address ||
          user?.parentProfile?.city ||
          user?.parentProfile?.address ||
          sessionData.area ||
          sessionData.city ||
          null,
        subjects:
          user?.tutorProfile?.subjects ||
          (Array.isArray(sessionData.subjects) ? sessionData.subjects : undefined),
        isRegistered: Boolean(user),
        userId: user?.id || null,
        tutorProfileId: user?.tutorProfile?.id || null,
        walletBalance: user?.tutorProfile?.wallet?.balance ?? null,
        coinsBalance: user?.tutorProfile?.wallet?.balance ?? null,
        sessionStep: session?.step || null,
        sessionData,
      };
    }

    return actionSuccess({ messages, contact });
  } catch (err) {
    console.error("[getWhatsAppChatMessagesAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to load chat history.");
  }
}

/**
 * Send a manual WhatsApp reply directly from staff/admin to user via Aqua SMS.
 * Automatically saves the message in whatsapp_chat_messages with staff's name and user ID.
 */
export async function sendStaffWhatsAppReplyAction(params: {
  phone: string;
  text: string;
}): Promise<ActionResult<{ message: WhatsAppChatMessageItem }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");
  const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";

  const normalized = resolveTargetPhone(params.phone);
  if (!normalized) return actionError("Invalid phone number.");

  const cleanText = params.text.trim();
  if (!cleanText) return actionError("Message text cannot be empty.");

  const staffName = guard.session.user.name || guard.session.user.email || "Staff";

  try {
    // 1. Send via Aqua SMS API (session text message within 24hr or manual bypass)
    const res = await sendAquaWhatsAppMessage({
      to: normalized,
      mode: "text",
      text: cleanText,
      bypassDailyCap: true,
      bypassOutboundGate: true, // staff reply to an existing inbound thread
    });

    if (!res.ok) {
      console.warn(`[sendStaffWhatsAppReplyAction] Aqua API warning: ${res.error}`);
    }

    // 2. Append to our log immediately with immutable sentByUserId attribution.
    const saved = await upsertWhatsAppChatMessage({
      phone: normalized,
      direction: "OUTBOUND",
      senderName: `${staffName} (Staff)`,
      sentByUserId: guard.session.user.id,
      body: cleanText,
      step: "STAFF_REPLY",
      messageId: res.providerMessageId || null,
      messageType: "text",
      status: res.ok ? res.rawStatus || "accepted" : "failed",
      isRead: true,
    });
    if (!saved) return actionError("Failed to store the reply in the local chat log.");

    // Update presence, staff activity trail, and admin audit log per person
    try {
      await Promise.all([
        prisma.staffPresence.upsert({
          where: { staffId: guard.session.user.id },
          create: {
            staffId: guard.session.user.id,
            dutyStatus: "ON_DUTY",
            online: true,
            isIdle: false,
            currentPath: "/admin/whatsapp-chats",
            lastSeenAt: new Date(),
            lastActiveAt: new Date(),
          },
          update: {
            online: true,
            isIdle: false,
            currentPath: "/admin/whatsapp-chats",
            lastSeenAt: new Date(),
            lastActiveAt: new Date(),
          },
        }),
        prisma.staffActivityEvent.create({
          data: {
            staffId: guard.session.user.id,
            type: "ACTIVE",
            path: "/admin/whatsapp-chats",
            detail: `Sent manual WhatsApp reply to ${normalized}`,
          },
        }),
        prisma.auditLog.create({
          data: {
            adminId: guard.session.user.id,
            action: "WHATSAPP_STAFF_REPLY",
            entityType: "WhatsApp",
            entityId: normalized,
            details: `Replied to +${normalized} (${res.ok ? res.rawStatus || "accepted" : "failed"}): ${cleanText.slice(0, 140)}`,
          },
        }),
      ]);
    } catch (auditErr) {
      console.warn("[sendStaffWhatsAppReplyAction] Audit tracking warning:", auditErr);
    }

    revalidatePath("/admin/whatsapp-chats");
    revalidatePath("/admin/sub-admins/analytics");

    return actionSuccess({
      message: {
        id: saved.id,
        phone: isSuperAdmin ? saved.phone : encryptPhoneToken(saved.phone),
        direction: "OUTBOUND",
        senderName: saved.senderName,
        sentByUserId: saved.sentByUserId ?? guard.session.user.id,
        sentByName: staffName,
        status: saved.status ?? null,
        body: saved.body,
        step: saved.step,
        isRead: saved.isRead,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[sendStaffWhatsAppReplyAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to send WhatsApp message.");
  }
}

/**
 * Mark a WhatsApp chat contact as an INTERESTED lead in the Staff CRM.
 *
 * - If a StaffLead already exists for this phone, upserts it to INTERESTED.
 * - Otherwise creates a new StaffLead with status=INTERESTED and source from WhatsApp.
 * - Adds optional staff note with the last inbound message snippet for context.
 */
export async function markWhatsAppContactAsInterestedAction(params: {
  phone: string;
  name?: string | null;
  email?: string | null;
  location?: string | null;
  subjects?: string[];
  note?: string | null;
}): Promise<ActionResult<{ leadId: string; isNew: boolean }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");
  const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";

  const normalized = resolveTargetPhone(params.phone);
  if (!normalized) return actionError("Invalid phone number.");

  try {
    // Check if this phone already exists in staff_leads
    const existing = await prisma.staffLead.findFirst({
      where: {
        OR: [
          { phone: normalized },
          { whatsapp: normalized },
        ],
      },
      select: { id: true, status: true },
    });

    const staffNote = [
      "📱 Marked as INTERESTED from WhatsApp Live Chat inbox.",
      params.note ? `\n💬 Context: ${params.note}` : "",
    ]
      .filter(Boolean)
      .join("")
      .trim();

    if (existing) {
      // Upsert: upgrade to INTERESTED if not already converted/rejected
      const dontOverwrite = ["CONVERTED", "REJECTED", "DUPLICATE", "NOT_INTERESTED"];
      const newStatus = dontOverwrite.includes(existing.status) ? existing.status : "INTERESTED";

      await prisma.staffLead.update({
        where: { id: existing.id },
        data: {
          status: newStatus as any,
          whatsapp: normalized,
          ...(params.name    && { name:     params.name }),
          ...(params.email   && { email:    params.email }),
          ...(params.location && { location: params.location }),
          ...(params.subjects?.length && { subjects: params.subjects }),
          staffNotes: staffNote,
          lastContactedAt: new Date(),
        },
      });

      revalidatePath("/admin/staff-leads/interested-leads");
      return actionSuccess({ leadId: existing.id, isNew: false });
    }

    // Find or create a "WhatsApp Live Chat" batch
    let batch = await prisma.staffLeadBatch.findFirst({
      where: { name: { contains: "WhatsApp Live Chat", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!batch) {
      batch = await prisma.staffLeadBatch.create({
        data: {
          name: "WhatsApp Live Chat Leads",
          rawText: "WhatsApp Live Chat Leads",
          totalParsed: 0,
          totalJunk: 0,
          createdById: guard.session.user.id,
        },
        select: { id: true },
      });
    }

    const lead = await prisma.staffLead.create({
      data: {
        batchId: batch.id,
        name:     params.name     ?? null,
        phone:    normalized,
        whatsapp: normalized,
        email:    params.email    ?? null,
        location: params.location ?? null,
        subjects: params.subjects ?? [],
        status:   "INTERESTED",
        staffNotes: staffNote,
        createdById: guard.session.user.id,
        lastContactedAt: new Date(),
      },
      select: { id: true },
    });

    // Update batch totals
    await prisma.staffLeadBatch.update({
      where: { id: batch.id },
      data: { totalParsed: { increment: 1 } },
    }).catch(() => null);

    revalidatePath("/admin/staff-leads/interested-leads");
    return actionSuccess({ leadId: lead.id, isNew: true });
  } catch (err) {
    console.error("[markWhatsAppContactAsInterestedAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to mark as interested.");
  }
}

function getIstMidnightUtc(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS
  );
}

/**
 * Per-employee WhatsApp reply tracking & leaderboard.
 * - SUPER_ADMIN: returns breakdown across all team members (SUB_ADMIN + SUPER_ADMIN) and recent replies.
 * - SUB_ADMIN: scoped strictly to their own replies so employees see only their own counts.
 */
export async function getEmployeeWhatsAppRepliesReportAction(params?: {
  range?: "today" | "7d" | "30d" | "all";
  staffId?: string;
}): Promise<ActionResult<WhatsAppEmployeeRepliesReport>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";
  const range = params?.range ?? "30d";
  const scopedStaffId = isSuperAdmin
    ? params?.staffId?.trim() || null
    : guard.session.user.id;

  try {
    const now = Date.now();
    const todayStart = getIstMidnightUtc();
    const sevenDaysStart = new Date(now - 7 * 86_400_000);
    const thirtyDaysStart = new Date(now - 30 * 86_400_000);

    type StaffReplyAgg = {
      sentByUserId: string;
      replies_today: number;
      replies_7d: number;
      replies_30d: number;
      replies_total: number;
      custom_total: number;
      unique_contacts: number;
      failed_count: number;
      last_reply_at: Date | null;
    };

    const staffWhere = isSuperAdmin
      ? { role: { in: ["SUPER_ADMIN", "SUB_ADMIN"] as ("SUPER_ADMIN" | "SUB_ADMIN")[] } }
      : { id: guard.session.user.id };

    const recentSince =
      range === "today"
        ? todayStart
        : range === "7d"
          ? sevenDaysStart
          : range === "30d"
            ? thirtyDaysStart
            : null;

    const [staffUsers, aggRows, unattributedRow, recentRows] = await Promise.all([
      prisma.user.findMany({
        where: staffWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subAdminRole: true,
          isActive: true,
        },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.$queryRaw<StaffReplyAgg[]>`
        SELECT
          "sentByUserId",
          COUNT(*) FILTER (WHERE step = 'STAFF_REPLY' AND "createdAt" >= ${todayStart})::int AS replies_today,
          COUNT(*) FILTER (WHERE step = 'STAFF_REPLY' AND "createdAt" >= ${sevenDaysStart})::int AS replies_7d,
          COUNT(*) FILTER (WHERE step = 'STAFF_REPLY' AND "createdAt" >= ${thirtyDaysStart})::int AS replies_30d,
          COUNT(*) FILTER (WHERE step = 'STAFF_REPLY')::int AS replies_total,
          COUNT(*) FILTER (WHERE step = 'ADMIN_CUSTOM')::int AS custom_total,
          COUNT(DISTINCT phone) FILTER (
            WHERE step = 'STAFF_REPLY'
              AND (${recentSince}::timestamptz IS NULL OR "createdAt" >= ${recentSince})
          )::int AS unique_contacts,
          COUNT(*) FILTER (
            WHERE step = 'STAFF_REPLY'
              AND UPPER(COALESCE(status, '')) = 'FAILED'
              AND (${recentSince}::timestamptz IS NULL OR "createdAt" >= ${recentSince})
          )::int AS failed_count,
          MAX("createdAt") FILTER (WHERE step = 'STAFF_REPLY') AS last_reply_at
        FROM whatsapp_chat_messages
        WHERE "sentByUserId" IS NOT NULL
          AND direction = 'OUTBOUND'
          AND step IN ('STAFF_REPLY', 'ADMIN_CUSTOM')
          AND (${scopedStaffId}::text IS NULL OR "sentByUserId" = ${scopedStaffId})
        GROUP BY "sentByUserId"
      `,
      isSuperAdmin
        ? prisma.whatsappChatMessage.count({
            where: { step: "STAFF_REPLY", sentByUserId: null },
          })
        : Promise.resolve(0),
      prisma.whatsappChatMessage.findMany({
        where: {
          direction: "OUTBOUND",
          step: { in: ["STAFF_REPLY", "ADMIN_CUSTOM"] },
          sentByUserId: scopedStaffId ? scopedStaffId : { not: null },
          ...(recentSince ? { createdAt: { gte: recentSince } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          phone: true,
          body: true,
          step: true,
          status: true,
          senderName: true,
          sentByUserId: true,
          createdAt: true,
          sentByUser: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    const aggMap = new Map(aggRows.map((r) => [r.sentByUserId, r]));

    const employees: WhatsAppEmployeeReplyStat[] = staffUsers
      .map((u) => {
        const agg = aggMap.get(u.id);
        return {
          staffId: u.id,
          name: u.name || u.email.split("@")[0],
          email: u.email,
          role: u.role,
          subAdminRole: u.subAdminRole,
          isActive: u.isActive,
          repliesToday: agg?.replies_today ?? 0,
          replies7d: agg?.replies_7d ?? 0,
          replies30d: agg?.replies_30d ?? 0,
          repliesTotal: agg?.replies_total ?? 0,
          customMessagesTotal: agg?.custom_total ?? 0,
          uniqueContacts: agg?.unique_contacts ?? 0,
          failedCount: agg?.failed_count ?? 0,
          lastReplyAt: agg?.last_reply_at ? new Date(agg.last_reply_at).toISOString() : null,
        };
      })
      .sort((a, b) => {
        const aMetric =
          range === "today"
            ? a.repliesToday
            : range === "7d"
              ? a.replies7d
              : range === "30d"
                ? a.replies30d
                : a.repliesTotal;
        const bMetric =
          range === "today"
            ? b.repliesToday
            : range === "7d"
              ? b.replies7d
              : range === "30d"
                ? b.replies30d
                : b.repliesTotal;
        if (bMetric !== aMetric) return bMetric - aMetric;
        if (b.repliesTotal !== a.repliesTotal) return b.repliesTotal - a.repliesTotal;
        return Number(b.isActive) - Number(a.isActive);
      });

    // Global unique contacts across the selected window
    type DistinctRow = { cnt: number };
    const distinctRows = await prisma.$queryRaw<DistinctRow[]>`
      SELECT COUNT(DISTINCT phone)::int AS cnt
      FROM whatsapp_chat_messages
      WHERE direction = 'OUTBOUND'
        AND step = 'STAFF_REPLY'
        AND "sentByUserId" IS NOT NULL
        AND (${scopedStaffId}::text IS NULL OR "sentByUserId" = ${scopedStaffId})
        AND (${recentSince}::timestamptz IS NULL OR "createdAt" >= ${recentSince})
    `;

    const repliesToday = employees.reduce((s, e) => s + e.repliesToday, 0);
    const replies7d = employees.reduce((s, e) => s + e.replies7d, 0);
    const replies30d = employees.reduce((s, e) => s + e.replies30d, 0);
    const repliesTotal = employees.reduce((s, e) => s + e.repliesTotal, 0);
    const activeResponders = employees.filter((e) => {
      if (range === "today") return e.repliesToday > 0;
      if (range === "7d") return e.replies7d > 0;
      if (range === "30d") return e.replies30d > 0;
      return e.repliesTotal > 0;
    }).length;

    const recentReplies: WhatsAppRecentStaffReply[] = recentRows.map((r) => ({
      id: r.id,
      phone: isSuperAdmin ? r.phone : formatMaskedDisplayPhone(r.phone),
      staffId: r.sentByUserId,
      staffName:
        r.sentByUser?.name ||
        r.sentByUser?.email ||
        r.senderName ||
        "Staff",
      body: r.body,
      step: r.step,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return actionSuccess({
      isSuperAdmin,
      range,
      totals: {
        repliesToday,
        replies7d,
        replies30d,
        repliesTotal,
        uniqueContacts: distinctRows[0]?.cnt ?? 0,
        activeResponders,
        unattributedStaffReplies: unattributedRow,
      },
      employees,
      recentReplies,
    });
  } catch (err) {
    console.error("[getEmployeeWhatsAppRepliesReportAction] Error:", err);
    return actionError(err instanceof Error ? err.message : "Failed to load employee WhatsApp report.");
  }
}
