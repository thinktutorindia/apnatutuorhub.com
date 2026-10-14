"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
import { upsertWhatsAppChatMessage } from "@/lib/whatsapp-chat-log";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";

export interface WhatsAppConversationSummary {
  phone: string;
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
    createdAt: string;
  } | null;
  unreadCount: number;
  totalMessages: number;
  isInterestedLead: boolean;
}

export interface WhatsAppChatMessageItem {
  id: string;
  phone: string;
  direction: "INBOUND" | "OUTBOUND";
  senderName?: string | null;
  body: string;
  step?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface WhatsAppChatContactDetails {
  phone: string;
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
}): Promise<
  ActionResult<{ threads: WhatsAppConversationSummary[]; totalUnread: number; interestedCount: number }>
> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  try {
    const search = params?.search?.trim().toLowerCase();
    const roleFilter = params?.roleFilter;
    const unreadOnly = Boolean(params?.unreadOnly);
    const interestedOnly = Boolean(params?.interestedOnly);

    type LatestRow = {
      id: string;
      phone: string;
      direction: string;
      senderName: string | null;
      contactName: string | null;
      body: string;
      step: string | null;
      messageId: string | null;
      isRead: boolean;
      createdAt: Date;
    };

    const [rawLatestMessages, unreadCounts, sessions, interestedKeys] = await Promise.all([
      prisma.$queryRaw<LatestRow[]>`
        SELECT id, phone, direction, "senderName", "contactName", body, step, "messageId", "isRead", "createdAt"
        FROM (
          SELECT
            id, phone, direction, "senderName", "contactName", body, step, "messageId", "isRead", "createdAt",
            ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" DESC) AS rn
          FROM whatsapp_chat_messages
        ) latest
        WHERE rn = 1
      `,
      prisma.whatsappChatMessage.groupBy({
        by: ["phone"],
        where: {
          direction: "INBOUND",
          isRead: false,
        },
        _count: { id: true },
      }),
      prisma.whatsappSession.findMany({
        orderBy: { lastMessageAt: "desc" },
        take: 300,
        select: {
          phone: true,
          step: true,
          lastMessageAt: true,
          data: true,
          userType: true,
        },
      }),
      loadInterestedPhoneKeys(),
    ]);

    const latestMsgMap = new Map<string, LatestRow>();
    rawLatestMessages.forEach((m) => latestMsgMap.set(m.phone, m));

    const phoneSet = new Set<string>(latestMsgMap.keys());
    for (const s of sessions) {
      if (!latestMsgMap.has(s.phone)) phoneSet.add(s.phone);
    }

    const phones = Array.from(phoneSet);
    if (phones.length === 0) {
      return actionSuccess({ threads: [], totalUnread: 0, interestedCount: interestedKeys.size });
    }

    const unreadMap = new Map<string, number>();
    let totalUnreadAll = 0;
    unreadCounts.forEach((u) => {
      unreadMap.set(u.phone, u._count.id);
      totalUnreadAll += u._count.id;
    });

    // Batch query Users by phone (checking both 10-digit and full 12-digit)
    const phoneVariants: string[] = [];
    phones.forEach((p) => {
      phoneVariants.push(p);
      const digits10 = p.replace(/\D/g, "").slice(-10);
      if (digits10 && digits10 !== p) phoneVariants.push(digits10);
    });

    const users = await prisma.user.findMany({
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
    });

    const userMap = new Map<string, (typeof users)[0]>();
    users.forEach((u) => {
      if (u.phone) {
        userMap.set(u.phone, u);
        const d10 = u.phone.replace(/\D/g, "").slice(-10);
        if (d10) userMap.set(d10, u);
      }
    });

    const sessionMap = new Map<string, (typeof sessions)[0]>();
    sessions.forEach((s) => sessionMap.set(s.phone, s));

    const threads: WhatsAppConversationSummary[] = [];

    for (const phone of phones) {
      const d10 = phoneLast10(phone);
      const isInterestedLead = d10.length >= 10 && interestedKeys.has(d10);
      const matchedUser = userMap.get(phone) || (d10 ? userMap.get(d10) : undefined);
      const matchedSession = sessionMap.get(phone);
      const sessionData = (matchedSession?.data as Record<string, any>) || {};
      const latestMsg = latestMsgMap.get(phone);

      const unread = unreadMap.get(phone) || 0;

      if (interestedOnly && !isInterestedLead) continue;
      if (unreadOnly && unread === 0) continue;

      const name =
        matchedUser?.name ||
        latestMsg?.contactName ||
        sessionData.name ||
        (matchedSession?.userType ? `${matchedSession.userType} (${phone.slice(-4)})` : `User ${phone.slice(-4)}`);

      const email = matchedUser?.email || sessionData.email || null;
      const role = matchedUser?.role || matchedSession?.userType || "LEAD";

      // Filter by role
      if (roleFilter && roleFilter !== "ALL" && role.toUpperCase() !== roleFilter.toUpperCase()) {
        continue;
      }

      const location =
        matchedUser?.tutorProfile?.city ||
        matchedUser?.tutorProfile?.address ||
        matchedUser?.parentProfile?.city ||
        matchedUser?.parentProfile?.address ||
        sessionData.area ||
        sessionData.city ||
        null;

      const subjects =
        matchedUser?.tutorProfile?.subjects ||
        (Array.isArray(sessionData.subjects) ? sessionData.subjects : undefined);

      // Search filter across name, phone, email, location, last message
      if (search) {
        const hay = `${phone} ${name} ${email || ""} ${location || ""} ${latestMsg?.body || ""}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }

      threads.push({
        phone,
        name,
        email,
        role,
        location,
        subjects,
        sessionStep: matchedSession?.step || latestMsg?.step || null,
        lastMessage: latestMsg
          ? {
              body: latestMsg.body,
              direction: latestMsg.direction as "INBOUND" | "OUTBOUND",
              senderName: latestMsg.senderName,
              createdAt: latestMsg.createdAt.toISOString(),
            }
          : matchedSession
            ? {
                body: `Session step: ${matchedSession.step}`,
                direction: "OUTBOUND",
                senderName: "Bot",
                createdAt: matchedSession.lastMessageAt.toISOString(),
              }
            : null,
        unreadCount: unread,
        totalMessages: 0,
        isInterestedLead,
      });
    }

    threads.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return actionSuccess({
      threads,
      totalUnread: totalUnreadAll,
      interestedCount: interestedKeys.size,
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

  const normalized = normalizeIndiaWhatsApp(phone) || phone.replace(/\D/g, "");
  if (!normalized) return actionError("Invalid phone number");

  const sinceIso = options?.since?.trim();
  const incremental = Boolean(sinceIso);
  const markRead = options?.markRead ?? !incremental;
  const limit = Math.min(Math.max(options?.limit ?? 350, 50), 1500);

  try {
    let rawMessages: Awaited<ReturnType<typeof prisma.whatsappChatMessage.findMany>>;

    if (incremental && sinceIso) {
      const sinceDate = new Date(sinceIso);
      if (Number.isNaN(sinceDate.getTime())) {
        return actionError("Invalid since timestamp");
      }
      rawMessages = await prisma.whatsappChatMessage.findMany({
        where: { phone: normalized, createdAt: { gt: sinceDate } },
        orderBy: { createdAt: "asc" },
        take: 150,
      });
    } else {
      const latestBatch = await prisma.whatsappChatMessage.findMany({
        where: { phone: normalized },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      rawMessages = latestBatch.reverse();
    }

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

    const messages: WhatsAppChatMessageItem[] = rawMessages.map((m) => ({
      id: m.id,
      phone: m.phone,
      direction: m.direction as "INBOUND" | "OUTBOUND",
      senderName: m.senderName,
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

      const sessionData = (session?.data as Record<string, any>) || {};

      contact = {
        phone: normalized,
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
 * Automatically saves the message in whatsapp_chat_messages with staff's name.
 */
export async function sendStaffWhatsAppReplyAction(params: {
  phone: string;
  text: string;
}): Promise<ActionResult<{ message: WhatsAppChatMessageItem }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  const normalized = normalizeIndiaWhatsApp(params.phone) || params.phone.replace(/\D/g, "");
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
    });

    if (!res.ok) {
      console.warn(`[sendStaffWhatsAppReplyAction] Aqua API warning: ${res.error}`);
    }

    // 2. Append to our log immediately. Do not wait for Aqua to echo the message back.
    const saved = await upsertWhatsAppChatMessage({
      phone: normalized,
      direction: "OUTBOUND",
      senderName: `${staffName} (Staff)`,
      body: cleanText,
      step: "STAFF_REPLY",
      messageId: res.providerMessageId || null,
      messageType: "text",
      status: res.ok ? res.rawStatus || "accepted" : "failed",
      isRead: true,
    });
    if (!saved) return actionError("Failed to store the reply in the local chat log.");

    revalidatePath("/admin/whatsapp-chats");

    return actionSuccess({
      message: {
        id: saved.id,
        phone: saved.phone,
        direction: "OUTBOUND",
        senderName: saved.senderName,
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

  const normalized = normalizeIndiaWhatsApp(params.phone) || params.phone.replace(/\D/g, "");
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
