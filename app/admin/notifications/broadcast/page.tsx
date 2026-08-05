import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { adminBroadcastAction } from "@/app/actions/notification.actions";
import { SendTestEmailForm } from "@/components/admin/SendTestEmailForm";
import { Bell, Users, GraduationCap, Radio, Send } from "lucide-react";

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
    where: { action: "BROADCAST_NOTIFICATION" },
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
          Broadcast & Email Testing
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Send platform-wide announcements or test Resend email integration directly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Compose Broadcast */}
        <div className="rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <div className="mb-5 flex items-center gap-2">
            <Radio size={16} style={{ color: "#22C55E" }} />
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Compose Broadcast
            </h2>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              await adminBroadcastAction(formData);
            }}
            className="space-y-4"
          >
            {/* Target */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white">
                Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "ALL", label: "All Users", icon: Users, color: "#3B82F6" },
                  { value: "PARENTS", label: "Parents", icon: GraduationCap, color: "#8B5CF6" },
                  { value: "TUTORS", label: "Tutors", icon: Bell, color: "#22C55E" },
                ].map(({ value, label, icon: Icon, color }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-3 py-3 transition-all has-[:checked]:ring-2"
                    style={{
                      background: "#1E293B",
                      border: "1px solid #334155",
                    }}
                  >
                    <input type="radio" name="target" value={value} defaultChecked={value === "ALL"} className="sr-only" />
                    <Icon size={16} style={{ color }} />
                    <span className="text-xs font-medium text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Notification Title
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Platform Maintenance on Sunday"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>

            {/* Message */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={4}
                placeholder="Write your announcement here..."
                className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>

            {/* Optional Action URL */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Link URL{" "}
                <span style={{ color: "#475569", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                name="actionUrl"
                type="text"
                placeholder="/tutor/leads or /parent/my-leads"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 15px rgba(34,197,94,0.3)" }}
            >
              <Send size={15} />
              Send Broadcast
            </button>
          </form>
        </div>

        {/* Right Column: Send Test Email + Recent Broadcasts */}
        <div className="space-y-6">
          <SendTestEmailForm currentUserEmail={session.user.email ?? undefined} />

          <div className="rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <div className="mb-5 flex items-center gap-2">
              <Bell size={16} style={{ color: "#64748B" }} />
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Broadcast History
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

