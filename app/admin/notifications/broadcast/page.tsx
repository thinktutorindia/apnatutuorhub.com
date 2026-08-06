import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { ComposeBroadcastForm } from "@/components/admin/ComposeBroadcastForm";
import { SendTestEmailForm } from "@/components/admin/SendTestEmailForm";
import { SendDirectVapidPushForm } from "@/components/admin/SendDirectVapidPushForm";
import { Bell, Radio } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Broadcast Notifications — Admin" };

export default async function AdminBroadcastPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Marketing sub-admins and super admins can broadcast
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    redirect("/admin/dashboard");
  }

  // Recent broadcast history from AuditLog
  const recentBroadcasts = await prisma.auditLog.findMany({
    where: { action: { in: ["BROADCAST_NOTIFICATION", "SEND_DIRECT_VAPID_PUSH"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}
        >
          Broadcast & Push Notifications
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Send platform-wide announcements, direct VAPID web push notifications to specific users, or test email integration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Compose Broadcast & Direct VAPID Push */}
        <div className="space-y-6">
          <ComposeBroadcastForm />

          {/* Direct VAPID Web Push Dispatcher */}
          <SendDirectVapidPushForm />
        </div>

        {/* Right Column: Send Test Email + Recent Broadcasts */}
        <div className="space-y-6">
          <SendTestEmailForm currentUserEmail={session.user.email ?? undefined} />

          <div className="rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <div className="mb-5 flex items-center gap-2">
              <Bell size={16} style={{ color: "#64748B" }} />
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Notification History
              </h2>
            </div>

            {recentBroadcasts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Radio size={28} style={{ color: "#1E293B" }} />
                <p className="text-sm" style={{ color: "#334155" }}>No broadcasts sent yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentBroadcasts.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl p-3"
                    style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
                  >
                    <p className="text-xs font-semibold text-white">{log.details}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "#334155", fontFamily: "'Fira Code', monospace" }}>
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
