"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "@/lib/aqua-whatsapp";
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

/**
 * Fetch all WhatsApp chat threads for staff/admin inbox.
 * Groups by phone number, joins with user profiles, and orders by latest message.
 */
export async function getWhatsAppChatThreadsAction(params?: {
  search?: string;
  roleFilter?: string;
  unreadOnly?: boolean;
}): Promise<ActionResult<{ threads: WhatsAppConversationSummary[]; totalUnread: number }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  try {
    const search = params?.search?.trim().toLowerCase();
    const roleFilter = params?.roleFilter;
    const unreadOnly = Boolean(params?.unreadOnly);

    // 1. Get distinct phones with their latest messages using raw query for maximum speed and accuracy
    const rawLatestMessages = await prisma.$queryRaw<
      Array<{
        id: string;
        phone: string;
        direction: string;
        senderName: string | null;
        body: string;
        step: string | null;
        messageId: string | null;
        isRead: boolean;
        createdAt: Date;
      }>
    >`
      SELECT DISTINCT ON (phone) 
        id, phone, direction, "senderName", body, step, "messageId", "isRead", "createdAt"
      FROM whatsapp_chat_messages
      ORDER BY phone, "createdAt" DESC
    `;

    // 2. Also get any sessions that may not have chat messages yet
    const sessions = await prisma.whatsappSession.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    });

    const phoneSet = new Set<string>();
    rawLatestMessages.forEach((m) => phoneSet.add(m.phone));
    sessions.forEach((s) => phoneSet.add(s.phone));

    const phones = Array.from(phoneSet);
    if (phones.length === 0) {
      return actionSuccess({ threads: [], totalUnread: 0 });
    }

    // 3. Count unreads and total messages per phone in batch
    const unreadCounts = await prisma.whatsappChatMessage.groupBy({
      by: ["phone"],
      where: {
        phone: { in: phones },
        direction: "INBOUND",
        isRead: false,
      },
      _count: { id: true },
    });
    const unreadMap = new Map<string, number>();
    let totalUnreadAll = 0;
    unreadCounts.forEach((u) => {
      unreadMap.set(u.phone, u._count.id);
      totalUnreadAll += u._count.id;
    });

    const totalCounts = await prisma.whatsappChatMessage.groupBy({
      by: ["phone"],
      where: { phone: { in: phones } },
      _count: { id: true },
    });
    const totalMap = new Map<string, number>();
    totalCounts.forEach((t) => totalMap.set(t.phone, t._count.id));

    // 4. Batch query Users by phone (checking both 10-digit and full 12-digit)
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

    const latestMsgMap = new Map<string, (typeof rawLatestMessages)[0]>();
    rawLatestMessages.forEach((m) => latestMsgMap.set(m.phone, m));

    // 5. Construct thread summaries
    const threads: WhatsAppConversationSummary[] = [];

    for (const phone of phones) {
      const d10 = phone.replace(/\D/g, "").slice(-10);
      const matchedUser = userMap.get(phone) || (d10 ? userMap.get(d10) : undefined);
      const matchedSession = sessionMap.get(phone);
      const sessionData = (matchedSession?.data as Record<string, any>) || {};
      const latestMsg = latestMsgMap.get(phone);

      const unread = unreadMap.get(phone) || 0;
      const total = totalMap.get(phone) || (latestMsg ? 1 : 0);

      // Filtering by unread
      if (unreadOnly && unread === 0) continue;

      const name =
        matchedUser?.name ||
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
        totalMessages: total,
      });
    }

    // Sort threads: most recent message or session first
    threads.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return actionSuccess({ threads, totalUnread: totalUnreadAll });
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
  phone: string
): Promise<ActionResult<{ messages: WhatsAppChatMessageItem[]; contact: WhatsAppChatContactDetails }>> {
  const guard = await requireStaffOrAdmin();
  if (guard.error || !guard.session) return actionError(guard.error ?? "Unauthorized");

  const normalized = normalizeIndiaWhatsApp(phone) || phone.replace(/\D/g, "");
  if (!normalized) return actionError("Invalid phone number");

  try {
    // 1. Mark unread inbound messages as read
    await prisma.whatsappChatMessage.updateMany({
      where: {
        phone: normalized,
        direction: "INBOUND",
        isRead: false,
      },
      data: { isRead: true },
    });

    // 2. Fetch all messages in chronological order
    const rawMessages = await prisma.whatsappChatMessage.findMany({
      where: { phone: normalized },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

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

    // 3. Find User & Session info for rich sidebar details
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

    const contact: WhatsAppChatContactDetails = {
      phone: normalized,
      name: user?.name || sessionData.name || `User ${normalized.slice(-4)}`,
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

    // 2. Persist to DB regardless so history is never lost
    const saved = await prisma.whatsappChatMessage.create({
      data: {
        phone: normalized,
        direction: "OUTBOUND",
        senderName: `${staffName} (Staff)`,
        body: cleanText,
        step: "STAFF_REPLY",
        messageId: res.providerMessageId || null,
        isRead: true,
      },
    });

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
