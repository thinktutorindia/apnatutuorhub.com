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
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    redirect("/admin/dashboard");
  }

  const recentBroadcasts = await prisma.auditLog.findMany({
    where: { action: { in: ["BROADCAST_NOTIFICATION", "SEND_DIRECT_VAPID_PUSH"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Operations</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Broadcast Dispatch
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Platform-wide announcements, VAPID web push, and Resend mailer tests
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Compose Broadcast & Direct VAPID Push */}
        <div className="space-y-6">
          <ComposeBroadcastForm />
          <SendDirectVapidPushForm />
        </div>

        {/* Right Column: Send Test Email + Recent Broadcasts */}
        <div className="space-y-6">
          <SendTestEmailForm currentUserEmail={session.user.email ?? undefined} />

          <div className="ath-panel p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Bell size={20} className="text-[#2563EB]" />
              <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Notification Audit History
              </h2>
            </div>

            {recentBroadcasts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Radio size={36} className="text-slate-400" />
                <p className="text-sm font-700 text-slate-600">No broadcasts dispatched yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentBroadcasts.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-2xl p-4 bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <p className="text-xs font-800 text-[#0F2540]">{log.details}</p>
                    <p className="text-[11px] font-600 text-slate-500">
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
