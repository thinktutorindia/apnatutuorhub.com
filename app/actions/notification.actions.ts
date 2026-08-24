"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";
import { broadcastNotification, sendNotification, type BroadcastTarget } from "@/lib/aws-notification";
import { sendWebPush } from "@/lib/web-push";
import { z } from "zod";

// ── Mark Single Notification as Read ──────────────────────────────────────────

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<{ updated: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });

  return actionSuccess({ updated: true });
}

// ── Mark All Notifications as Read ────────────────────────────────────────────

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ updated: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return actionSuccess({ updated: true });
}

// ── Get Unread Count (used by bell component) ──────────────────────────────────

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user) return 0;

  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

// ── Get Recent Notifications (for bell dropdown) ───────────────────────────────

export async function getRecentNotificationsAction() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      actionUrl: true,
      createdAt: true,
    },
  });
}

// ── Admin Broadcast ────────────────────────────────────────────────────────────

const broadcastSchema = z.object({
  target: z.enum(["ALL", "TUTORS", "PARENTS"]),
  title: z.string().min(3, "Title is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  actionUrl: z.string().optional(),
  emailFilter: z.enum(["GENUINE_ONLY", "ALL", "AUTO_GENERATED_ONLY", "SKIP_EMAIL"]).default("GENUINE_ONLY"),
});

export type BroadcastActionResult = ActionResult<{ sent: number }>;

export async function adminBroadcastAction(
  _prevState: BroadcastActionResult,
  formData: FormData
): Promise<BroadcastActionResult> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    return actionError("Forbidden");
  }

  const parsed = broadcastSchema.safeParse({
    target: formData.get("target"),
    title: formData.get("title"),
    message: formData.get("message"),
    actionUrl: formData.get("actionUrl") || undefined,
    emailFilter: formData.get("emailFilter") || "GENUINE_ONLY",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await broadcastNotification({
    target: parsed.data.target as BroadcastTarget,
    title: parsed.data.title,
    message: parsed.data.message,
    actionUrl: parsed.data.actionUrl,
    emailFilter: parsed.data.emailFilter,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: "BROADCAST_NOTIFICATION",
      entityType: "Notification",
      details: `Sent "${parsed.data.title}" to ${parsed.data.target} [Email Filter: ${parsed.data.emailFilter}] (${result.sent} users)`,
    },
  });

  return actionSuccess({ sent: result.sent });
}

// ── Admin Direct VAPID Web Push to Specific User ───────────────────────────────

export type DirectPushResult = ActionResult<{ sent: true; userEmail: string }>;

const directPushSchema = z.object({
  recipientEmail: z.string().email("Invalid recipient email address"),
  title: z.string().min(2, "Title is required"),
  message: z.string().min(5, "Message is required"),
  actionUrl: z.string().optional(),
});

export async function sendDirectVapidPushAction(
  _prevState: DirectPushResult,
  formData: FormData
): Promise<DirectPushResult> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    return actionError("Forbidden");
  }

  const parsed = directPushSchema.safeParse({
    recipientEmail: formData.get("recipientEmail"),
    title: formData.get("title"),
    message: formData.get("message"),
    actionUrl: formData.get("actionUrl") || undefined,
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.recipientEmail },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) {
    return actionError(`No user account found with email: ${parsed.data.recipientEmail}`);
  }

  // 1. Create DB In-App Notification
  await prisma.notification.create({
    data: {
      userId: targetUser.id,
      title: parsed.data.title,
      message: parsed.data.message,
      actionUrl: parsed.data.actionUrl ?? null,
      channel: "WEB",
      isRead: false,
    },
  });

  // 2. Dispatch VAPID Web Push
  await sendWebPush(targetUser.id, {
    title: parsed.data.title,
    body: parsed.data.message,
    url: parsed.data.actionUrl,
  });

  // 3. Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: "SEND_DIRECT_VAPID_PUSH",
      entityType: "Notification",
      details: `Sent direct VAPID Web Push "${parsed.data.title}" to ${targetUser.email}`,
    },
  });

  revalidatePath("/admin/notifications/broadcast");
  return actionSuccess({ sent: true, userEmail: targetUser.email });
}

// ── AWS SNS Push Subscribe ─────────────────────────────────────────────────────

const subscribeSchema = z.object({
  endpoint: z.string().url("Invalid endpoint"),
  p256dh: z.string(),
  auth: z.string(),
});

export async function subscribePushAction(
  body: unknown
): Promise<ActionResult<{ subscribed: true }>> {
  const session = await auth();
  if (!session?.user?.id) return actionError("Unauthenticated");

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return actionError("Invalid subscription data");

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushSubscription: parsed.data as any },
    });
  } catch (err) {
    console.error("[subscribePushAction] Error saving push subscription:", err);
    return actionError("Failed to save push subscription");
  }

  return actionSuccess({ subscribed: true });
}

// ── Send Test Email ────────────────────────────────────────────────────────────

const testEmailSchema = z.object({
  recipientEmail: z.string().email("Invalid recipient email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export async function sendTestEmailAction(
  formData: FormData
): Promise<ActionResult<{ sent: true; recipient: string }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");

  const parsed = testEmailSchema.safeParse({
    recipientEmail: formData.get("recipientEmail"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const sendRes = await sendNotification({
    userId: session.user.id,
    email: parsed.data.recipientEmail,
    title: `[TEST] ${parsed.data.subject}`,
    message: parsed.data.message,
    actionUrl: "/admin/dashboard",
  });

  if (!sendRes.success) {
    return actionError(sendRes.error ?? "Failed to send email via provider");
  }

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: "SEND_TEST_EMAIL",
      entityType: "Email",
      details: `Sent test email "${parsed.data.subject}" to ${parsed.data.recipientEmail}`,
    },
  });

  return actionSuccess({ sent: true, recipient: parsed.data.recipientEmail });
}

// ── Notification & Communication Usage & Limits Actions ───────────────────────

import { getNotificationUsageMetrics, type NotificationUsageReport } from "@/lib/notification-usage";

export async function getNotificationUsageReportAction(): Promise<ActionResult<NotificationUsageReport>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    return actionError("Forbidden");
  }

  try {
    const report = await getNotificationUsageMetrics();
    return actionSuccess(report);
  } catch (err) {
    console.error("[getNotificationUsageReportAction] Failed to calculate metrics:", err);
    return actionError("Failed to calculate communication usage report");
  }
}

export async function updateNotificationLimitsAction(
  limits: Record<string, number>
): Promise<ActionResult<{ updated: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN") {
    return actionError("Only Super Admins can configure quota limits");
  }

  try {
    for (const [key, value] of Object.entries(limits)) {
      if (typeof value === "number" && value > 0) {
        await prisma.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), label: `Quota Limit: ${key}` },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: "UPDATE_NOTIFICATION_LIMITS",
        entityType: "PlatformSetting",
        details: `Updated communication quota limits: ${JSON.stringify(limits)}`,
      },
    });

    revalidatePath("/admin/notifications");
    return actionSuccess({ updated: true });
  } catch (err) {
    console.error("[updateNotificationLimitsAction] Failed to update limits:", err);
    return actionError("Failed to save updated quota limits");
  }
}

