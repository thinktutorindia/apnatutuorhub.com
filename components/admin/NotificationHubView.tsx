"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Layers,
  Send,
  Sparkles,
  Mail,
  Smartphone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Info,
  Calendar,
  Activity,
  User,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  BookOpen,
  HelpCircle,
  Check,
  Copy,
  Cpu,
  Target,
  GraduationCap,
  CreditCard,
  MessageSquare,
  Lock,
  TrendingUp,
} from "lucide-react";
import { NotificationUsageReportView } from "@/components/admin/NotificationUsageReportView";
import { type NotificationUsageReport } from "@/lib/notification-usage";

export type AdminNotificationItem = {
  id: string;
  userId: string;
  type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  channel: "WEB" | "EMAIL" | "PUSH" | "WHATSAPP";
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  scheduledAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  seenAt: string | null;
  clickedAt: string | null;
  retryCount: number;
  expiresAt: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
  deliveries: Array<{
    id: string;
    provider: string;
    channel: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

export type NotificationHubStats = {
  totalCount: number;
  deliveredCount: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
  readCount: number;
  vapidSubscribersCount: number;
  isVapidConfigured: boolean;
  isResendConfigured: boolean;
};

interface NotificationHubViewProps {
  initialNotifications: AdminNotificationItem[];
  stats: NotificationHubStats;
  usageReport: NotificationUsageReport;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  LEAD_MATCHED: { label: "Lead Matched", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: "🎯" },
  LEAD_UNLOCKED: { label: "Lead Unlocked", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "🔓" },
  LEAD_PURCHASED: { label: "Lead Purchased", bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", icon: "💰" },
  LEAD_APPLICATION: { label: "Lead Application", bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", icon: "👨‍🏫" },
  APPLICATION_STATUS: { label: "Application Status", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", icon: "⭐" },
  BOOKING_REQUESTED: { label: "Booking Requested", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: "📅" },
  BOOKING_CONFIRMED: { label: "Booking Confirmed", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "✅" },
  CLASS_LINK_SHARED: { label: "Meet Link Shared", bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", icon: "🔗" },
  BOOKING_RESCHEDULED: { label: "Class Rescheduled", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", icon: "🔄" },
  BOOKING_CANCELLED: { label: "Booking Cancelled", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", icon: "❌" },
  BOOKING_COMPLETED: { label: "Class Completed", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", icon: "🏆" },
  KYC_APPROVED: { label: "KYC Approved", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "🎉" },
  KYC_REJECTED: { label: "KYC Rejected", bg: "bg-red-50", text: "text-red-800", border: "border-red-200", icon: "⚠️" },
  WALLET_CREDITED: { label: "Wallet Credited", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: "🪙" },
  LOW_WALLET_BALANCE: { label: "Low Wallet Balance", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", icon: "⚠️" },
  NEW_CHAT_MESSAGE: { label: "Chat Message", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200", icon: "💬" },
  USER_SUSPENDED: { label: "User Suspended", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", icon: "⛔" },
  USER_REACTIVATED: { label: "User Reactivated", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "🟢" },
  BROADCAST: { label: "Admin Broadcast", bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", icon: "📢" },
  DUMMY_LEAD: { label: "Campaign Lead", bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-200", icon: "✨" },
};

const SYSTEM_TRIGGER_GUIDE = [
  {
    category: "🎯 Lead & Student Matching",
    icon: Target,
    color: "from-blue-600 to-cyan-600",
    triggers: [
      {
        name: "Automatic Tutor Lead Match",
        type: "LEAD_MATCHED",
        triggerType: "🤖 Background Worker (BullMQ / Dispatcher)",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires immediately when parent submits requirement & tutor matches class, subject & 10km GPS radius.",
        actionUrl: "/tutor/leads",
        deduplication: "Suppressed if duplicate within 24h (referenceId: leadId).",
        description: "Notifies high-ranking verified tutors that a new student tuition enquiry matches their profile so they can unlock it.",
      },
      {
        name: "Lead Unlock Alert to Parent",
        type: "LEAD_UNLOCKED",
        triggerType: "⚡ Automatic User Event",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "NORMAL",
        timing: "Fires instantly when tutor pays coins to unlock parent contact.",
        actionUrl: "/parent/my-leads/[id]/applicants",
        deduplication: "Fires once per lead unlock.",
        description: "Alerts parent that a verified tutor has unlocked their requirement and encourages reviewing the applicant proposal.",
      },
      {
        name: "Application Status Change",
        type: "APPLICATION_STATUS",
        triggerType: "👤 Parent Action",
        channels: ["In-App", "Web Push", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires when parent shortlists, hires, or rejects a tutor proposal.",
        actionUrl: "/tutor/leads",
        deduplication: "Fires on each state transition.",
        description: "Informs tutor whether they were shortlisted, hired, or passed on with dedicated status badges.",
      },
    ],
  },
  {
    category: "📚 Class Booking & Trial Flow",
    icon: GraduationCap,
    color: "from-emerald-600 to-teal-600",
    triggers: [
      {
        name: "Trial / Class Booking Request",
        type: "BOOKING_REQUESTED",
        triggerType: "⚡ Parent Booking Trigger",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires immediately when parent requests a trial or regular tuition schedule.",
        actionUrl: "/tutor/bookings",
        deduplication: "Fires once per booking request.",
        description: "Alerts tutor to review and accept the class request, proposed start date, and frequency.",
      },
      {
        name: "Booking Confirmed by Tutor",
        type: "BOOKING_CONFIRMED",
        triggerType: "⚡ Tutor Confirmation Trigger",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires when tutor confirms class schedule & optional meet link.",
        actionUrl: "/parent/bookings",
        deduplication: "Fires once per confirmation.",
        description: "Confirms class time and details with the parent, attaching online Google Meet links if provided.",
      },
      {
        name: "Class Rescheduled",
        type: "BOOKING_RESCHEDULED",
        triggerType: "🔄 Mutated Schedule",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "NORMAL",
        timing: "Fires when either tutor or parent updates class date/time.",
        actionUrl: "/parent/bookings OR /tutor/bookings",
        deduplication: "Fires upon rescheduling.",
        description: "Alerts the opposite party to review and acknowledge the updated class time.",
      },
      {
        name: "Booking Cancelled",
        type: "BOOKING_CANCELLED",
        triggerType: "❌ Cancellation Trigger",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "HIGH",
        timing: "Fires when either party cancels (>2 hours prior to class start).",
        actionUrl: "/parent/bookings OR /tutor/bookings",
        deduplication: "Fires once upon cancellation.",
        description: "Notifies recipient of class cancellation with the reason provided.",
      },
      {
        name: "Class Completed & Review Prompt",
        type: "BOOKING_COMPLETED",
        triggerType: "⭐ Tutor Completion Trigger",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "HIGH",
        timing: "Fires when tutor marks class completed.",
        actionUrl: "/parent/bookings",
        deduplication: "Fires once per completed booking.",
        description: "Prompts parent to leave a rating & review, and evaluates tutor milestone rewards.",
      },
    ],
  },
  {
    category: "🛡️ Verification, KYC & Governance",
    icon: ShieldCheck,
    color: "from-amber-600 to-orange-600",
    triggers: [
      {
        name: "KYC Approval & Referral Bonus",
        type: "KYC_APPROVED",
        triggerType: "👤 Admin Verification Action",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires when admin approves tutor government ID & selfie.",
        actionUrl: "/tutor/profile",
        deduplication: "Fires on KYC status change to APPROVED.",
        description: "Unlocks tutor profile to parents and automatically credits referral bonus coins (50 coins referrer, 25 referee).",
      },
      {
        name: "KYC Rejection Notice",
        type: "KYC_REJECTED",
        triggerType: "👤 Admin Rejection Action",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires when admin rejects KYC documents.",
        actionUrl: "/tutor/profile",
        deduplication: "Fires with admin rejection reason.",
        description: "Instructs tutor on exact corrections needed to re-upload acceptable documents.",
      },
      {
        name: "Account Suspended",
        type: "USER_SUSPENDED",
        triggerType: "🛡️ Admin Security Action",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "CRITICAL",
        timing: "Fires immediately when admin suspends an account.",
        actionUrl: "/login",
        deduplication: "Fires once upon suspension.",
        description: "Informs user of suspension and severs all active sessions immediately.",
      },
    ],
  },
  {
    category: "💰 Wallets, Payments & Milestones",
    icon: CreditCard,
    color: "from-emerald-600 to-green-700",
    triggers: [
      {
        name: "Wallet Coins Credited",
        type: "WALLET_CREDITED",
        triggerType: "💳 Razorpay Webhook / Admin Credit / Milestone",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "HIGH",
        timing: "Fires when Razorpay captures payment, milestone bonus triggers, or admin credits coins.",
        actionUrl: "/tutor/wallet",
        deduplication: "Idempotent via unique referenceId / paymentId.",
        description: "Confirms coin top-up and displays new balance available for unlocking tuition leads.",
      },
      {
        name: "Low Coin Balance Warning",
        type: "LOW_WALLET_BALANCE",
        triggerType: "⚠️ Balance Threshold Monitor",
        channels: ["In-App", "Web Push (VAPID)", "Email (Resend)"],
        priority: "NORMAL",
        timing: "Fires when tutor balance falls below lead unlock cost.",
        actionUrl: "/tutor/wallet",
        deduplication: "Sent periodically on low balance.",
        description: "Reminds tutor to recharge coins so they never miss matched tuition leads in their locality.",
      },
    ],
  },
  {
    category: "💬 Chat, Broadcasts & Campaigns",
    icon: MessageSquare,
    color: "from-purple-600 to-indigo-700",
    triggers: [
      {
        name: "Real-Time Chat Notification",
        type: "NEW_CHAT_MESSAGE",
        triggerType: "💬 Instant Messaging",
        channels: ["In-App", "Web Push (VAPID)"],
        priority: "NORMAL",
        timing: "Fires instantly when user receives a message in chat thread.",
        actionUrl: "/chat/[conversationId]",
        deduplication: "Fires per message (AI redacted if contact info detected).",
        description: "Sends immediate browser notification previewing the incoming chat message.",
      },
      {
        name: "Admin Platform Broadcast",
        type: "BROADCAST",
        triggerType: "📢 Super Admin Manual Broadcast",
        channels: ["In-App", "Web Push (VAPID)", "Batch Email (Resend)"],
        priority: "HIGH",
        timing: "Fires manually when admin broadcasts an announcement to ALL, TUTORS, or PARENTS.",
        actionUrl: "Custom URL",
        deduplication: "Broadcasts to all active accounts.",
        description: "Mass multi-channel communication for platform announcements, discounts, and policy updates.",
      },
      {
        name: "Automated Engagement Campaign",
        type: "DUMMY_LEAD",
        triggerType: "🕒 Automated Daily Cron (/api/cron/dummy-leads)",
        channels: ["Web Push (VAPID)", "Email (Resend)"],
        priority: "NORMAL",
        timing: "Dispatched by daily cron based on target segments and geo-localities.",
        actionUrl: "/tutor/leads",
        deduplication: "Tracks daily user limits and campaign caps.",
        description: "Sends personalized realistic requirement alerts to re-engage dormant tutors.",
      },
    ],
  },
];

export function NotificationHubView({
  initialNotifications,
  stats,
  usageReport,
}: NotificationHubViewProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "queue" | "usage" | "guide" | "diagnostics">("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [timeHorizon, setTimeHorizon] = useState<"ALL" | "PAST" | "TODAY" | "FUTURE">("ALL");
  const [selectedNotification, setSelectedNotification] = useState<AdminNotificationItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return initialNotifications.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q) ||
        (item.user.name && item.user.name.toLowerCase().includes(q));

      const matchesChannel = channelFilter === "ALL" || item.channel === channelFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;

      const itemDate = new Date(item.scheduledAt || item.createdAt);
      let matchesTime = true;
      if (timeHorizon === "PAST") {
        matchesTime = itemDate < startOfToday;
      } else if (timeHorizon === "TODAY") {
        matchesTime = itemDate >= startOfToday && itemDate <= endOfToday;
      } else if (timeHorizon === "FUTURE") {
        matchesTime = itemDate > now || item.status === "PENDING";
      }

      return matchesSearch && matchesChannel && matchesStatus && matchesType && matchesTime;
    });
  }, [initialNotifications, searchQuery, channelFilter, statusFilter, typeFilter, timeHorizon]);

  const scheduledQueue = useMemo(() => {
    return initialNotifications.filter(
      (n) => new Date(n.scheduledAt) > now || n.status === "PENDING"
    );
  }, [initialNotifications]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(initialNotifications.map((n) => n.type));
    return Array.from(set);
  }, [initialNotifications]);

  return (
    <div className="space-y-6 text-slate-900">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Operations</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Push Notification Hub
          </h1>
          <p className="text-xs text-slate-600 font-600">
            In-app, VAPID web push, and Resend email — past, scheduled, and failed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/notifications/broadcast"
            className="flex items-center gap-2 rounded-full bg-[#0F2540] px-4 py-2.5 text-xs font-800 !text-white hover:bg-[#1e3a5f]"
          >
            <Send size={15} />
            <span>Compose Broadcast</span>
          </Link>
        </div>
      </div>

      {/* ── Stats Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Total Dispatched</span>
            <Bell size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-900 text-[#0F2540]">{stats.totalCount}</div>
          <p className="text-[10px] font-600 text-slate-500">Across all channels</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Delivered</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-900 text-emerald-600">{stats.deliveredCount + stats.sentCount}</div>
          <p className="text-[10px] font-600 text-slate-500">Successfully received</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Pending / Future</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-900 text-amber-600">{stats.pendingCount}</div>
          <p className="text-[10px] font-600 text-slate-500">Queued in schedule</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Failed</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-900 text-rose-600">{stats.failedCount}</div>
          <p className="text-[10px] font-600 text-slate-500">Logged delivery errors</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Web Push Sub</span>
            <Smartphone size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-900 text-purple-600">{stats.vapidSubscribersCount}</div>
          <p className="text-[10px] font-600 text-slate-500">Active browser endpoints</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-700 uppercase tracking-wider">Read Rate</span>
            <Activity size={16} className="text-cyan-500" />
          </div>
          <div className="text-2xl font-900 text-cyan-600">
            {stats.totalCount > 0 ? Math.round((stats.readCount / stats.totalCount) * 100) : 0}%
          </div>
          <p className="text-[10px] font-600 text-slate-500">{stats.readCount} alerts opened</p>
        </div>
      </div>

      {/* ── Tabs Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all ${
            activeTab === "feed"
              ? "bg-[#2D9E6B] !text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Layers size={15} />
          <span>All Notifications Stream</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {initialNotifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all ${
            activeTab === "queue"
              ? "bg-[#2D9E6B] !text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock size={15} />
          <span>Scheduled &amp; Future Queue</span>
          {scheduledQueue.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-900">
              {scheduledQueue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("usage")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all cursor-pointer ${
            activeTab === "usage"
              ? "bg-[#2D9E6B] !text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <TrendingUp size={15} />
          <span>📊 Quota &amp; Usage Reports</span>
          {usageReport.hasQuotaWarnings ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-900 animate-pulse">
              Limit Alert!
            </span>
          ) : (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              Live Caps
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guide")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all cursor-pointer ${
            activeTab === "guide"
              ? "bg-[#2D9E6B] !text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BookOpen size={15} />
          <span>System Trigger &amp; Explainer Guide</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
            In-Depth
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-800 transition-all cursor-pointer ${
            activeTab === "diagnostics"
              ? "bg-[#2D9E6B] !text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Cpu size={15} />
          <span>Channel Diagnostics</span>
        </button>
      </div>

      {/* ── TAB: USAGE & QUOTA REPORTS ────────────────────────────────────────── */}
      {activeTab === "usage" && (
        <NotificationUsageReportView initialReport={usageReport} />
      )}

      {/* ── TAB 1: ALL NOTIFICATIONS STREAM ──────────────────────────────────── */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 flex items-center gap-2 rounded-2xl px-3.5 py-2 bg-slate-50 border border-slate-300">
                <Search size={16} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name, email, title, or message…"
                  className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Time Horizon Filter */}
              <div>
                <select
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value as any)}
                  className="w-full rounded-2xl px-3 py-2 text-xs font-700 bg-slate-50 border border-slate-300 outline-none text-slate-800"
                >
                  <option value="ALL">Time: All Time (Past &amp; Future)</option>
                  <option value="TODAY">Time: Today Only</option>
                  <option value="PAST">Time: Past Days</option>
                  <option value="FUTURE">Time: Future / Scheduled</option>
                </select>
              </div>

              {/* Channel Filter */}
              <div>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2 text-xs font-700 bg-slate-50 border border-slate-300 outline-none text-slate-800"
                >
                  <option value="ALL">Channel: All Channels</option>
                  <option value="WEB">In-App Web Only</option>
                  <option value="PUSH">Browser Web Push</option>
                  <option value="EMAIL">Resend Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl px-3 py-2 text-xs font-700 bg-slate-50 border border-slate-300 outline-none text-slate-800"
                >
                  <option value="ALL">Status: All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="SENT">Sent</option>
                  <option value="PENDING">Pending / Scheduled</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            {/* Type Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-800 text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={12} /> Type:
              </span>
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-800 transition-all ${
                  typeFilter === "ALL"
                    ? "bg-[#0F2540] !text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Types
              </button>
              {uniqueTypes.map((t) => {
                const conf = TYPE_CONFIG[t] ?? { label: t, icon: "🔔" };
                const isSelected = typeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(isSelected ? "ALL" : t)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-800 transition-all flex items-center gap-1 ${
                      isSelected
                        ? "bg-[#2D9E6B] !text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-800 text-[#0F2540]">No notifications matched your filters</p>
                  <p className="text-xs font-600 text-slate-500">
                    Try adjusting the search query, channel, or time horizon.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Event Type</th>
                      <th className="py-3.5 px-4">Recipient</th>
                      <th className="py-3.5 px-4">Title &amp; Message</th>
                      <th className="py-3.5 px-4">Channel &amp; Priority</th>
                      <th className="py-3.5 px-4">Schedule / Sent</th>
                      <th className="py-3.5 px-4">Delivery Status</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-600 text-slate-700">
                    {filteredNotifications.map((n) => {
                      const typeConf = TYPE_CONFIG[n.type] ?? {
                        label: n.type,
                        bg: "bg-slate-100",
                        text: "text-slate-800",
                        border: "border-slate-200",
                        icon: "🔔",
                      };

                      const isFuture = new Date(n.scheduledAt) > now;

                      return (
                        <tr
                          key={n.id}
                          onClick={() => setSelectedNotification(n)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-800 border ${typeConf.bg} ${typeConf.text} ${typeConf.border}`}
                            >
                              <span>{typeConf.icon}</span>
                              <span>{typeConf.label}</span>
                            </span>
                          </td>

                          {/* Recipient */}
                          <td className="py-3.5 px-4 space-y-0.5">
                            <div className="font-800 text-slate-900 flex items-center gap-1.5">
                              <span>{n.user.name || "User"}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-700">
                                {n.user.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                              {n.user.email}
                            </div>
                          </td>

                          {/* Title & Message */}
                          <td className="py-3.5 px-4 max-w-xs space-y-1">
                            <div className="font-800 text-slate-900 line-clamp-1">{n.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-2">{n.message}</div>
                          </td>

                          {/* Channel & Priority */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              {n.channel === "PUSH" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-800 border border-purple-200">
                                  <Smartphone size={10} /> Push
                                </span>
                              )}
                              {n.channel === "EMAIL" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-800 border border-blue-200">
                                  <Mail size={10} /> Email
                                </span>
                              )}
                              {n.channel === "WEB" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-800 border border-emerald-200">
                                  <Bell size={10} /> In-App
                                </span>
                              )}
                              {n.channel === "WHATSAPP" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-[10px] font-800 border border-green-200">
                                  WhatsApp
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-700 text-slate-400">
                              Priority: <span className="text-slate-600 font-800">{n.priority}</span>
                            </div>
                          </td>

                          {/* Schedule / Time */}
                          <td className="py-3.5 px-4 space-y-0.5 text-[11px]">
                            {isFuture ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock size={11} />
                                <span>
                                  Scheduled:{" "}
                                  {new Date(n.scheduledAt).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </span>
                            ) : (
                              <div className="text-slate-700 font-700">
                                {new Date(n.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400">
                              {n.isRead ? (
                                <span className="text-emerald-600 font-700">✓ Read</span>
                              ) : (
                                "Unread"
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {n.status === "DELIVERED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-800">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Delivered
                              </span>
                            )}
                            {n.status === "SENT" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-800">
                                <Send size={12} className="text-blue-600" /> Sent
                              </span>
                            )}
                            {n.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-800">
                                <Clock size={12} className="text-amber-600" /> Pending
                              </span>
                            )}
                            {n.status === "FAILED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-800">
                                <XCircle size={12} className="text-rose-600" /> Failed
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SCHEDULED & FUTURE QUEUE ──────────────────────────────────── */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Scheduled &amp; Pending Notification Queue
                </h2>
                <p className="text-xs text-slate-600 font-600">
                  Inspect notifications queued for future dispatch, pending retries, and background cron schedules
                </p>
              </div>
              <span className="text-xs font-800 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                {scheduledQueue.length} Queued
              </span>
            </div>

            {scheduledQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <div className="space-y-1">
                  <p className="text-sm font-800 text-[#0F2540]">No Pending or Delayed Alerts in Queue</p>
                  <p className="text-xs font-600 text-slate-500 max-w-sm">
                    All scheduled notifications have been dispatched. New automated triggers will appear here in real time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scheduledQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNotification(item)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-800 text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                        {item.type}
                      </span>
                      <span className="text-[11px] font-700 text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        Scheduled: {new Date(item.scheduledAt).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-800 text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.message}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                      <span>To: {item.user.name || item.user.email}</span>
                      <span>Channel: {item.channel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: SYSTEM TRIGGER & EXPLAINER GUIDE ───────────────────────────── */}
      {activeTab === "guide" && (
        <div className="space-y-6">
          {/* Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F2540] to-[#1e3a5f] text-white shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-800">
                Technical Knowledge Base
              </span>
              <span className="text-xs text-slate-300 font-600">• Multi-Channel Delivery Specs</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Notification Architecture &amp; System Trigger Manual
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-500 max-w-3xl leading-relaxed">
              Every notification event across ApnaTutorHub is tracked end-to-end. This guide details the exact conditions,
              dispatch channels, retry policies, and automated deduplication rules across every domain.
            </p>
          </div>

          {/* Trigger Domains Accordion / Matrix */}
          <div className="space-y-6">
            {SYSTEM_TRIGGER_GUIDE.map((domain, dIdx) => {
              const Icon = domain.icon;
              return (
                <div
                  key={dIdx}
                  className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6"
                >
                  {/* Domain Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div
                      className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-white shadow-xs`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {domain.category}
                      </h3>
                      <p className="text-xs text-slate-500 font-600">
                        {domain.triggers.length} Active System Event Triggers
                      </p>
                    </div>
                  </div>

                  {/* Triggers Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domain.triggers.map((trig, tIdx) => (
                      <div
                        key={tIdx}
                        className="rounded-2xl p-4 bg-slate-50/70 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-900 text-slate-900">{trig.name}</span>
                            <span className="text-[10px] font-800 px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800">
                              {trig.type}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-600 leading-relaxed">
                            {trig.description}
                          </p>

                          <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-[11px]">
                            <div className="flex items-start gap-1.5 text-slate-700">
                              <Zap size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              <span>
                                <strong className="font-800">Trigger:</strong> {trig.triggerType}
                              </span>
                            </div>

                            <div className="flex items-start gap-1.5 text-slate-700">
                              <Radio size={13} className="text-purple-500 shrink-0 mt-0.5" />
                              <span>
                                <strong className="font-800">Channels:</strong> {trig.channels.join(", ")}
                              </span>
                            </div>

                            <div className="flex items-start gap-1.5 text-slate-700">
                              <Clock size={13} className="text-blue-500 shrink-0 mt-0.5" />
                              <span>
                                <strong className="font-800">Timing:</strong> {trig.timing}
                              </span>
                            </div>

                            <div className="flex items-start gap-1.5 text-slate-700">
                              <Lock size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span>
                                <strong className="font-800">Deduplication:</strong> {trig.deduplication}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-700">
                          <span>
                            Priority: <strong className="text-slate-800">{trig.priority}</strong>
                          </span>
                          <span className="text-blue-600 font-800">{trig.actionUrl}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: CHANNEL DIAGNOSTICS ───────────────────────────────────────── */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VAPID Web Push Diagnostic Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-800 text-[#0F2540]">VAPID Web Push Engine</h3>
                    <p className="text-[11px] text-slate-500 font-600">Standard W3C Browser Push Protocol</p>
                  </div>
                </div>

                {stats.isVapidConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-800">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Active &amp; Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-800">
                    <AlertTriangle size={13} className="text-amber-600" /> Keys Missing
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">Active Device Subscriptions:</span>
                  <span className="font-900 text-purple-700 text-sm">{stats.vapidSubscribersCount} devices</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">Service Worker File:</span>
                  <span className="font-800 text-slate-900 font-mono text-[11px]">public/sw.js (Live)</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">Automatic 410 Gone Token Cleanup:</span>
                  <span className="font-800 text-emerald-700">✓ Enabled (Prisma.DbNull)</span>
                </div>
              </div>
            </div>

            {/* Resend Email Diagnostic Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-800 text-[#0F2540]">Resend Transactional Mailer</h3>
                    <p className="text-[11px] text-slate-500 font-600">Enterprise High-Deliverability API</p>
                  </div>
                </div>

                {stats.isResendConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-800">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-800">
                    <Info size={13} className="text-amber-600" /> Resend API Key Unset
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">HTML React Email Templates:</span>
                  <span className="font-800 text-blue-700">4 Active (Lead, Booking, KYC, Status)</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">Batch Dispatch Engine:</span>
                  <span className="font-800 text-slate-900">sendBatchEmails() enabled</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-700">Test Mailer Tool:</span>
                  <Link
                    href="/admin/notifications/broadcast"
                    className="font-800 text-[#2D9E6B] hover:underline inline-flex items-center gap-1"
                  >
                    Send Test Email →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Detail Drawer Modal ─────────────────────────────────── */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-800 uppercase tracking-widest text-slate-400">
                  Notification Payload Inspector
                </span>
                <h3 className="text-lg font-800 text-[#0F2540]">
                  {selectedNotification.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Recipient Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User size={13} /> Recipient Profile
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-600">Name: </span>
                  <span className="font-800 text-slate-900">{selectedNotification.user.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-600">Role: </span>
                  <span className="font-800 text-emerald-700">{selectedNotification.user.role}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-600">Email: </span>
                  <span className="font-800 text-slate-900">{selectedNotification.user.email}</span>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500">
                Message Body
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-600 text-slate-800 leading-relaxed">
                {selectedNotification.message}
              </div>
              {selectedNotification.actionUrl && (
                <div className="text-xs text-blue-600 font-800 flex items-center gap-1 pt-1">
                  <ExternalLink size={13} /> Target URL: {selectedNotification.actionUrl}
                </div>
              )}
            </div>

            {/* Delivery Timeline */}
            <div className="space-y-2">
              <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500">
                Delivery Timeline &amp; State
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-slate-500 font-700">Channel</span>
                  <p className="font-900 text-slate-900">{selectedNotification.channel}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-slate-500 font-700">Priority</span>
                  <p className="font-900 text-slate-900">{selectedNotification.priority}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-slate-500 font-700">Status</span>
                  <p className="font-900 text-emerald-700">{selectedNotification.status}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-slate-500 font-700">Read State</span>
                  <p className="font-900 text-blue-700">{selectedNotification.isRead ? "Read" : "Unread"}</p>
                </div>
              </div>
            </div>

            {/* Delivery Attempt Logs */}
            {selectedNotification.deliveries && selectedNotification.deliveries.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500">
                  Channel Delivery Logs ({selectedNotification.deliveries.length})
                </div>
                <div className="space-y-1.5">
                  {selectedNotification.deliveries.map((del) => (
                    <div
                      key={del.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-800 text-slate-900">
                          Provider: {del.provider} ({del.channel})
                        </span>
                        {del.errorMessage && (
                          <p className="text-rose-600 text-[11px] font-700">{del.errorMessage}</p>
                        )}
                      </div>
                      <span className="font-800 text-slate-600 text-[11px]">{del.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata JSON */}
            {selectedNotification.metadata && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-800 uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Metadata JSON</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        "meta",
                        JSON.stringify(selectedNotification.metadata, null, 2)
                      )
                    }
                    className="text-[10px] text-slate-500 hover:text-slate-900 font-bold inline-flex items-center gap-1"
                  >
                    {copiedId === "meta" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId === "meta" ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-36">
                  {JSON.stringify(selectedNotification.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="px-5 py-2.5 rounded-2xl bg-[#0F2540] text-white text-xs font-800 hover:bg-[#1e3a5f] transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
