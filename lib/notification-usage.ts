import { prisma } from "@/lib/prisma";

export type NotificationChannelKey = "EMAIL" | "WHATSAPP" | "PUSH" | "SMS";

export type ChannelUsageMetric = {
  channel: NotificationChannelKey;
  label: string;
  providerName: string;
  sentToday: number;
  sentYesterday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  totalSentAllTime: number;
  failedCountToday: number;
  failedCountThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsagePercent: number;
  monthlyUsagePercent: number;
  healthStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  providerUpgradeUrl: string;
  providerPricingNote: string;
};

export type DayUsageBreakdown = {
  date: string;
  displayDate: string;
  emailSent: number;
  emailFailed: number;
  whatsappSent: number;
  whatsappFailed: number;
  pushSent: number;
  pushFailed: number;
  smsSent: number;
  totalSent: number;
  successRate: number;
};

export type CategoryUsageBreakdown = {
  type: string;
  label: string;
  icon: string;
  countToday: number;
  countThisWeek: number;
  countThisMonth: number;
  percent: number;
};

export type NotificationUsageReport = {
  timeframe: "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "ALL";
  channels: Record<NotificationChannelKey, ChannelUsageMetric>;
  dailyHistory: DayUsageBreakdown[];
  categoryBreakdown: CategoryUsageBreakdown[];
  hasQuotaWarnings: boolean;
  warningMessages: string[];
  lastCalculatedAt: string;
};

export const DEFAULT_NOTIFICATION_LIMITS = {
  LIMIT_EMAIL_DAILY: 3000,
  LIMIT_EMAIL_MONTHLY: 50000,
  LIMIT_WHATSAPP_DAILY: 1000,
  LIMIT_WHATSAPP_MONTHLY: 25000,
  LIMIT_PUSH_DAILY: 10000,
  LIMIT_PUSH_MONTHLY: 200000,
  LIMIT_SMS_DAILY: 500,
  LIMIT_SMS_MONTHLY: 10000,
};

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  LEAD_MATCHED: { label: "Lead Matched Alerts", icon: "🎯" },
  LEAD_UNLOCKED: { label: "Lead Unlock Notices", icon: "🔓" },
  LEAD_PURCHASED: { label: "Lead Coin Unlocks", icon: "💰" },
  LEAD_APPLICATION: { label: "Tutor Applications", icon: "👨‍🏫" },
  APPLICATION_STATUS: { label: "Application Updates", icon: "⭐" },
  BOOKING_REQUESTED: { label: "Class Booking Requests", icon: "📅" },
  BOOKING_CONFIRMED: { label: "Booking Confirmations", icon: "✅" },
  CLASS_LINK_SHARED: { label: "Meet / Class Links", icon: "🔗" },
  BOOKING_RESCHEDULED: { label: "Rescheduled Classes", icon: "🔄" },
  BOOKING_CANCELLED: { label: "Cancelled Bookings", icon: "❌" },
  BOOKING_COMPLETED: { label: "Completed & Reviews", icon: "🏆" },
  KYC_APPROVED: { label: "KYC Approved Notices", icon: "🎉" },
  KYC_REJECTED: { label: "KYC Correction Requests", icon: "⚠️" },
  WALLET_CREDITED: { label: "Wallet Coin Credits", icon: "🪙" },
  LOW_WALLET_BALANCE: { label: "Low Coin Balance Warnings", icon: "⚠️" },
  NEW_CHAT_MESSAGE: { label: "Chat Message Notifications", icon: "💬" },
  BROADCAST: { label: "Admin Platform Broadcasts", icon: "📢" },
  DUMMY_LEAD: { label: "Campaign Engagement Leads", icon: "✨" },
};

/**
 * Calculates comprehensive daily, weekly, and monthly communication usage and limits.
 */
export async function getNotificationUsageMetrics(): Promise<NotificationUsageReport> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
  const startOf30DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);

  // 1. Fetch dynamic limit settings from database
  const limitSettings = await prisma.platformSetting.findMany({
    where: {
      key: {
        in: Object.keys(DEFAULT_NOTIFICATION_LIMITS),
      },
    },
  });

  const limitsMap: Record<string, number> = { ...DEFAULT_NOTIFICATION_LIMITS };
  for (const s of limitSettings) {
    const num = parseInt(s.value, 10);
    if (!isNaN(num) && num > 0) {
      limitsMap[s.key] = num;
    }
  }

  // 2. Query deliveries in parallel
  const [
    deliveries30d,
    campaignLogs30d,
    notifications30d,
    allTimeDeliveryCounts,
  ] = await Promise.all([
    // Notification deliveries over last 30 days
    prisma.notificationDelivery.findMany({
      where: {
        createdAt: { gte: startOf30DaysAgo },
      },
      select: {
        id: true,
        channel: true,
        provider: true,
        status: true,
        createdAt: true,
      },
    }),
    // Campaign deliveries over last 30 days
    prisma.campaignDeliveryLog.findMany({
      where: {
        sentAt: { gte: startOf30DaysAgo },
      },
      select: {
        id: true,
        channel: true,
        status: true,
        sentAt: true,
      },
    }),
    // Notifications by type
    prisma.notification.findMany({
      where: {
        createdAt: { gte: startOf30DaysAgo },
      },
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        createdAt: true,
      },
    }),
    // All-time counts by channel
    prisma.notificationDelivery.groupBy({
      by: ["channel"],
      _count: { id: true },
    }),
  ]);

  // All time map
  const allTimeMap: Record<string, number> = {};
  allTimeDeliveryCounts.forEach((g) => {
    allTimeMap[g.channel.toUpperCase()] = g._count.id;
  });

  // Accumulate channel metrics
  const channelMetrics: Record<NotificationChannelKey, {
    sentToday: number;
    sentYesterday: number;
    sentThisWeek: number;
    sentThisMonth: number;
    failedToday: number;
    failedThisMonth: number;
  }> = {
    EMAIL: { sentToday: 0, sentYesterday: 0, sentThisWeek: 0, sentThisMonth: 0, failedToday: 0, failedThisMonth: 0 },
    WHATSAPP: { sentToday: 0, sentYesterday: 0, sentThisWeek: 0, sentThisMonth: 0, failedToday: 0, failedThisMonth: 0 },
    PUSH: { sentToday: 0, sentYesterday: 0, sentThisWeek: 0, sentThisMonth: 0, failedToday: 0, failedThisMonth: 0 },
    SMS: { sentToday: 0, sentYesterday: 0, sentThisWeek: 0, sentThisMonth: 0, failedToday: 0, failedThisMonth: 0 },
  };

  // Daily time series map (for last 14 days)
  const daysMap: Record<string, {
    date: string;
    displayDate: string;
    emailSent: number;
    emailFailed: number;
    whatsappSent: number;
    whatsappFailed: number;
    pushSent: number;
    pushFailed: number;
    smsSent: number;
    totalSent: number;
    totalFailed: number;
  }> = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const ymd = d.toISOString().slice(0, 10);
    const display = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    daysMap[ymd] = {
      date: ymd,
      displayDate: display,
      emailSent: 0,
      emailFailed: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      pushSent: 0,
      pushFailed: 0,
      smsSent: 0,
      totalSent: 0,
      totalFailed: 0,
    };
  }

  // 1. Process notification deliveries
  deliveries30d.forEach((d) => {
    const ch = (d.channel || "").toUpperCase() as NotificationChannelKey;
    const target = channelMetrics[ch] || channelMetrics.EMAIL;
    const isSuccess = d.status === "DELIVERED" || d.status === "SENT";
    const isFailed = d.status === "FAILED";
    const t = d.createdAt;

    if (t >= startOfToday) {
      if (isSuccess) target.sentToday++;
      if (isFailed) target.failedToday++;
    } else if (t >= startOfYesterday && t <= endOfYesterday) {
      if (isSuccess) target.sentYesterday++;
    }

    if (t >= startOf7DaysAgo) {
      if (isSuccess) target.sentThisWeek++;
    }

    if (isSuccess) target.sentThisMonth++;
    if (isFailed) target.failedThisMonth++;

    // Time series entry
    const ymd = t.toISOString().slice(0, 10);
    if (daysMap[ymd]) {
      if (ch === "EMAIL") {
        if (isSuccess) daysMap[ymd].emailSent++;
        if (isFailed) daysMap[ymd].emailFailed++;
      } else if (ch === "WHATSAPP") {
        if (isSuccess) daysMap[ymd].whatsappSent++;
        if (isFailed) daysMap[ymd].whatsappFailed++;
      } else if (ch === "PUSH") {
        if (isSuccess) daysMap[ymd].pushSent++;
        if (isFailed) daysMap[ymd].pushFailed++;
      } else if (ch === "SMS") {
        if (isSuccess) daysMap[ymd].smsSent++;
      }

      if (isSuccess) daysMap[ymd].totalSent++;
      if (isFailed) daysMap[ymd].totalFailed++;
    }
  });

  // 2. Process campaign delivery logs
  campaignLogs30d.forEach((c) => {
    const ch = (c.channel === "PUSH" ? "PUSH" : "EMAIL") as NotificationChannelKey;
    const target = channelMetrics[ch];
    const isSuccess = c.status === "SENT";
    const isFailed = c.status === "FAILED";
    const t = c.sentAt;

    if (t >= startOfToday) {
      if (isSuccess) target.sentToday++;
      if (isFailed) target.failedToday++;
    } else if (t >= startOfYesterday && t <= endOfYesterday) {
      if (isSuccess) target.sentYesterday++;
    }

    if (t >= startOf7DaysAgo) {
      if (isSuccess) target.sentThisWeek++;
    }

    if (isSuccess) target.sentThisMonth++;
    if (isFailed) target.failedThisMonth++;

    const ymd = t.toISOString().slice(0, 10);
    if (daysMap[ymd]) {
      if (ch === "EMAIL") {
        if (isSuccess) daysMap[ymd].emailSent++;
        if (isFailed) daysMap[ymd].emailFailed++;
      } else if (ch === "PUSH") {
        if (isSuccess) daysMap[ymd].pushSent++;
        if (isFailed) daysMap[ymd].pushFailed++;
      }
      if (isSuccess) daysMap[ymd].totalSent++;
      if (isFailed) daysMap[ymd].totalFailed++;
    }
  });

  // 3. Category Breakdown
  const categoryCounts: Record<string, { today: number; week: number; month: number }> = {};
  notifications30d.forEach((n) => {
    const typeKey = n.type || "OTHER";
    if (!categoryCounts[typeKey]) {
      categoryCounts[typeKey] = { today: 0, week: 0, month: 0 };
    }
    if (n.createdAt >= startOfToday) categoryCounts[typeKey].today++;
    if (n.createdAt >= startOf7DaysAgo) categoryCounts[typeKey].week++;
    categoryCounts[typeKey].month++;
  });

  const totalNotifsMonth = notifications30d.length || 1;
  const categoryBreakdown: CategoryUsageBreakdown[] = Object.entries(categoryCounts)
    .map(([type, counts]) => {
      const meta = CATEGORY_META[type] || { label: type.replace(/_/g, " "), icon: "🔔" };
      return {
        type,
        label: meta.label,
        icon: meta.icon,
        countToday: counts.today,
        countThisWeek: counts.week,
        countThisMonth: counts.month,
        percent: Math.round((counts.month / totalNotifsMonth) * 100),
      };
    })
    .sort((a, b) => b.countThisMonth - a.countThisMonth);

  // 4. Build Channel Metrics & Health Status
  const warningMessages: string[] = [];

  const buildChannelMetric = (
    channel: NotificationChannelKey,
    label: string,
    providerName: string,
    dailyLimitKey: string,
    monthlyLimitKey: string,
    upgradeUrl: string,
    pricingNote: string
  ): ChannelUsageMetric => {
    const m = channelMetrics[channel];
    const dailyLimit = limitsMap[dailyLimitKey] || 1000;
    const monthlyLimit = limitsMap[monthlyLimitKey] || 30000;
    const dailyPercent = Math.min(100, Math.round((m.sentToday / dailyLimit) * 100));
    const monthlyPercent = Math.min(100, Math.round((m.sentThisMonth / monthlyLimit) * 100));

    let healthStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    if (dailyPercent >= 90 || monthlyPercent >= 90) {
      healthStatus = "CRITICAL";
      warningMessages.push(
        `🚨 CRITICAL: ${label} usage is at ${Math.max(dailyPercent, monthlyPercent)}% of quota limit (${m.sentToday}/${dailyLimit} today). Action required to prevent message drops.`
      );
    } else if (dailyPercent >= 75 || monthlyPercent >= 75) {
      healthStatus = "WARNING";
      warningMessages.push(
        `⚠️ WARNING: ${label} usage is approaching daily quota (${m.sentToday}/${dailyLimit} sent today, ${dailyPercent}% used). Consider extending limits.`
      );
    }

    return {
      channel,
      label,
      providerName,
      sentToday: m.sentToday,
      sentYesterday: m.sentYesterday,
      sentThisWeek: m.sentThisWeek,
      sentThisMonth: m.sentThisMonth,
      totalSentAllTime: (allTimeMap[channel] || 0) + m.sentThisMonth,
      failedCountToday: m.failedToday,
      failedCountThisMonth: m.failedThisMonth,
      dailyLimit,
      monthlyLimit,
      dailyUsagePercent: dailyPercent,
      monthlyUsagePercent: monthlyPercent,
      healthStatus,
      providerUpgradeUrl: upgradeUrl,
      providerPricingNote: pricingNote,
    };
  };

  const channels: Record<NotificationChannelKey, ChannelUsageMetric> = {
    EMAIL: buildChannelMetric(
      "EMAIL",
      "Transactional Email",
      "Resend API (Primary)",
      "LIMIT_EMAIL_DAILY",
      "LIMIT_EMAIL_MONTHLY",
      "https://resend.com/overview",
      "Resend Pro tier: 50,000 emails/mo. Extend in Resend dashboard."
    ),
    WHATSAPP: buildChannelMetric(
      "WHATSAPP",
      "WhatsApp Business API",
      "Meta Cloud API / Aisensy",
      "LIMIT_WHATSAPP_DAILY",
      "LIMIT_WHATSAPP_MONTHLY",
      "https://business.facebook.com/wa/manage/",
      "Tier 1: 1,000 unique business-initiated conversations per 24 hours."
    ),
    PUSH: buildChannelMetric(
      "PUSH",
      "Web Push Notifications",
      "Browser VAPID Service",
      "LIMIT_PUSH_DAILY",
      "LIMIT_PUSH_MONTHLY",
      "/admin/notifications/broadcast",
      "VAPID push is unlimited on your infrastructure. Daily cap prevents browser spam."
    ),
    SMS: buildChannelMetric(
      "SMS",
      "SMS & OTP Gateway",
      "Fast2SMS / Twilio",
      "LIMIT_SMS_DAILY",
      "LIMIT_SMS_MONTHLY",
      "https://www.fast2sms.com/dashboard",
      "Direct carrier routes for OTP delivery. Recharge wallet to maintain balance."
    ),
  };

  // Daily history array
  const dailyHistory: DayUsageBreakdown[] = Object.values(daysMap).map((day) => {
    const totalAttempted = day.totalSent + day.totalFailed;
    const successRate = totalAttempted > 0 ? Math.round((day.totalSent / totalAttempted) * 100) : 100;
    return {
      date: day.date,
      displayDate: day.displayDate,
      emailSent: day.emailSent,
      emailFailed: day.emailFailed,
      whatsappSent: day.whatsappSent,
      whatsappFailed: day.whatsappFailed,
      pushSent: day.pushSent,
      pushFailed: day.pushFailed,
      smsSent: day.smsSent,
      totalSent: day.totalSent,
      successRate,
    };
  });

  return {
    timeframe: "TODAY",
    channels,
    dailyHistory,
    categoryBreakdown,
    hasQuotaWarnings: warningMessages.length > 0,
    warningMessages,
    lastCalculatedAt: now.toISOString(),
  };
}
