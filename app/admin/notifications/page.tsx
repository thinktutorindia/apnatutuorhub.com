import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { can } from "@/lib/rbac";
import { isWebPushConfigured } from "@/lib/web-push";
import { getNotificationUsageMetrics } from "@/lib/notification-usage";
import { NotificationHubView, type AdminNotificationItem, type NotificationHubStats } from "@/components/admin/NotificationHubView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notification Hub & Schedule — Admin" };

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const canManage = can(session.user, "settings:manage") || can(session.user, "audit:read");

  if (!isSuperAdmin && !canManage) {
    redirect("/admin/dashboard");
  }

  // Fetch recent notifications with recipient details, delivery logs, and usage metrics in parallel
  const [notifications, statsRaw, allUserPushSubs, usageReport] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            provider: true,
            channel: true,
            status: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.notification.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.user.findMany({
      select: { pushSubscription: true },
    }),
    getNotificationUsageMetrics(),
  ]);

  const subscribersCount = allUserPushSubs.filter((u) => Boolean(u.pushSubscription)).length;

  const readCount = await prisma.notification.count({
    where: { isRead: true },
  });

  const totalCount = await prisma.notification.count();

  const statusMap = Object.fromEntries(
    statsRaw.map((s) => [s.status, s._count.id])
  );

  const stats: NotificationHubStats = {
    totalCount,
    deliveredCount: statusMap["DELIVERED"] ?? 0,
    sentCount: statusMap["SENT"] ?? 0,
    pendingCount: statusMap["PENDING"] ?? 0,
    failedCount: statusMap["FAILED"] ?? 0,
    readCount,
    vapidSubscribersCount: subscribersCount,
    isVapidConfigured: isWebPushConfigured(),
    isResendConfigured: Boolean(process.env.RESEND_API_KEY),
  };

  const serializedNotifications: AdminNotificationItem[] = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    priority: n.priority as any,
    channel: n.channel as any,
    status: n.status as any,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl,
    isRead: n.isRead,
    scheduledAt: n.scheduledAt.toISOString(),
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    deliveredAt: n.deliveredAt ? n.deliveredAt.toISOString() : null,
    seenAt: n.seenAt ? n.seenAt.toISOString() : null,
    clickedAt: n.clickedAt ? n.clickedAt.toISOString() : null,
    retryCount: n.retryCount,
    expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
    metadata: n.metadata,
    createdAt: n.createdAt.toISOString(),
    user: {
      id: n.user.id,
      name: n.user.name,
      email: n.user.email,
      phone: n.user.phone,
      role: n.user.role,
    },
    deliveries: n.deliveries.map((d) => ({
      id: d.id,
      provider: d.provider,
      channel: d.channel,
      status: d.status,
      errorMessage: d.errorMessage,
      createdAt: d.createdAt.toISOString(),
    })),
  }));

  return (
    <NotificationHubView
      initialNotifications={serializedNotifications}
      stats={stats}
      usageReport={usageReport}
    />
  );
}
