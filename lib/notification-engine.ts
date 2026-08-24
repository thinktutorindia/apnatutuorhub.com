/**
 * lib/notification-engine.ts
 * Enterprise Upgrade — Phase 1: Notification Lifecycle Engine
 *
 * Fully tracked, multi-channel notification system.
 * Channel delivery is 100% driven by Resend API & VAPID Web Push.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendNotification as sendResendNotification, dispatchEmail } from "@/lib/aws-notification";
import { sendWebPush, isWebPushConfigured } from "@/lib/web-push";
import { isGenuineEmail } from "@/lib/lead-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationChannel = "WEB" | "EMAIL" | "PUSH" | "WHATSAPP";

export type CreateNotificationInput = {
  userId: string;
  type: string;              // e.g. "LEAD_MATCHED", "KYC_APPROVED"
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  title: string;
  message: string;
  actionUrl?: string;
  expiresInHours?: number;   // defaults to 48
  metadata?: Record<string, unknown>;
  /** If provided, prevents duplicate notifications for same user+type+referenceId */
  referenceId?: string;
  /** If true, bypasses duplicate idempotency check and forces new notification dispatch */
  forceSend?: boolean;
  /** If true, dispatches an email via Resend in addition to in-app / push */
  sendEmail?: boolean;
};

// ── Notification Creation ─────────────────────────────────────────────────────

/**
 * Creates a tracked notification in the DB and dispatches delivery.
 * Safe to call from Server Actions — never throws, returns null on failure.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<string | null> {
  const {
    userId,
    type,
    priority = "NORMAL",
    channel = "WEB",
    title,
    message,
    actionUrl,
    expiresInHours = 48,
    metadata,
    referenceId,
    forceSend = false,
    sendEmail = false,
  } = input;

  try {
    // Idempotency: skip duplicate if same user+type+referenceId exists within 24h (unless forceSend)
    if (referenceId && !forceSend) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type,
          metadata: { path: ["referenceId"], equals: referenceId },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (existing) {
        console.info(
          `[notification-engine] Duplicate suppressed: ${type} for user ${userId}`
        );
        return existing.id;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        priority,
        channel,
        title,
        message,
        actionUrl,
        status: "PENDING",
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        metadata: (referenceId ? { ...(metadata ?? {}), referenceId } : metadata) as Prisma.InputJsonValue,
      },
    });

    // Dispatch channel delivery asynchronously
    void dispatchNotification(
      notification.id,
      channel,
      userId,
      title,
      message,
      actionUrl ?? undefined,
      { sendEmail, priority }
    );

    return notification.id;
  } catch (err) {
    console.error("[notification-engine] Failed to create notification:", err);
    return null;
  }
}

// ── Channel Dispatch ──────────────────────────────────────────────────────────

/**
 * Dispatches the notification to the appropriate channel provider.
 * Records a delivery attempt in `notification_deliveries`.
 */
async function dispatchNotification(
  notificationId: string,
  channel: NotificationChannel,
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  options?: { sendEmail?: boolean; priority?: NotificationPriority }
): Promise<void> {
  // Fetch user contact details
  let userEmail: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    userEmail = user?.email ?? null;
  } catch (err) {
    console.warn("[notification-engine] Failed to fetch user contact:", err);
  }

  const deliveryData = {
    notificationId,
    channel,
    provider: resolveProvider(channel),
    status: "PENDING" as const,
  };

  const delivery = await prisma.notificationDelivery.create({
    data: deliveryData,
  });

  try {
    switch (channel) {
      case "WEB":
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: "SENT" },
        });
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: "SENT", sentAt: new Date() },
        });

        // 1. Web Push Dispatch
        if (isWebPushConfigured()) {
          try {
            await sendWebPush(userId, {
              title,
              body: message,
              url: actionUrl,
              tag: notificationId,
            });
          } catch (err) {
            console.warn("[notification-engine] Background web-push failed:", err);
          }
        }

        // 2. Email Dispatch if requested or High Priority (skips system/test placeholder accounts to preserve credits)
        if (userEmail && isGenuineEmail(userEmail) && (options?.sendEmail || options?.priority === "HIGH" || options?.priority === "CRITICAL")) {
          try {
            await sendResendNotification({
              userId,
              email: userEmail,
              title,
              message,
              actionUrl,
            });
          } catch (err) {
            console.warn("[notification-engine] Background email delivery error:", err);
          }
        }
        break;

      case "EMAIL":
      case "WHATSAPP":
        if (!userEmail) {
          throw new Error("No email address for user");
        }
        if (isGenuineEmail(userEmail)) {
          await sendResendNotification({
            userId,
            email: userEmail,
            title,
            message,
            actionUrl,
          });
        }
        await markDelivered(notificationId, delivery.id);
        break;

      case "PUSH":
        if (isWebPushConfigured()) {
          await sendWebPush(userId, {
            title,
            body: message,
            url: actionUrl,
            tag: notificationId,
          });
          await markDelivered(notificationId, delivery.id);
        } else {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "FAILED",
              errorMessage: "VAPID keys not configured — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env",
            },
          });
        }
        break;
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown dispatch error";
    console.error(
      `[notification-engine] ${channel} delivery failed for ${notificationId}:`,
      err
    );
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage },
    });
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
  }
}

// ── Status Updates ────────────────────────────────────────────────────────────

async function markDelivered(
  notificationId: string,
  deliveryId: string
): Promise<void> {
  await prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: { status: "DELIVERED" },
  });
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
}

function resolveProvider(channel: NotificationChannel): string {
  switch (channel) {
    case "EMAIL":
      return "RESEND";
    case "PUSH":
      return "VAPID";
    case "WHATSAPP":
      return "RESEND_FALLBACK";
    case "WEB":
    default:
      return "INTERNAL";
  }
}
