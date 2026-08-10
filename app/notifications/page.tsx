import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bell, BellOff, ArrowLeft } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notification.actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications | ApnaTutorHub" };

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const filter = params.filter ?? "all"; // "all" | "unread"
  const page = Math.max(1, Number(params.page ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const where = {
    userId: session.user.id,
    ...(filter === "unread" ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  const totalPages = Math.ceil(total / take);

  const backHref =
    session.user.role === "PARENT"
      ? "/parent/dashboard"
      : session.user.role === "TUTOR"
        ? "/tutor/dashboard"
        : "/admin/dashboard";

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-700 mb-0.5" style={{ color: "#111827" }}>
              Notifications
            </h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          <Link href={backHref} className="at-btn at-btn-outline at-btn-sm">
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        {/* Filter tabs + Mark all */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5">
            {["all", "unread"].map((f) => (
              <a
                key={f}
                href={`/notifications?filter=${f}`}
                className="px-3 py-1.5 rounded-full text-xs font-500 capitalize transition-colors"
                style={{
                  backgroundColor: filter === f ? "#1A7F5A" : "#F3F4F6",
                  color: filter === f ? "#FFFFFF" : "#374151",
                }}
              >
                {f}
              </a>
            ))}
          </div>

          {unreadCount > 0 && (
            <form
              action={async () => {
                "use server";
                await markAllNotificationsReadAction();
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 cursor-pointer"
                style={{ backgroundColor: "#E8F5F0", color: "#1A7F5A" }}
              >
                <BellOff size={14} />
                Mark all as read
              </button>
            </form>
          )}
        </div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div
            className="rounded-xl py-16 text-center space-y-2"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <Bell size={32} className="mx-auto" style={{ color: "#9CA3AF" }} />
            <p className="text-sm font-500" style={{ color: "#6B7280" }}>No notifications found</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  backgroundColor: n.isRead ? "#FFFFFF" : "#E8F5F0",
                  border: `1px solid ${n.isRead ? "#E5E7EB" : "#cce9df"}`,
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: n.isRead ? "#F3F4F6" : "#FFFFFF",
                      color: n.isRead ? "#6B7280" : "#1A7F5A",
                    }}
                  >
                    <Bell size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-600" style={{ color: "#111827" }}>
                        {n.title}
                      </p>
                      <span className="text-xs shrink-0" style={{ color: "#9CA3AF" }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#374151" }}>
                      {n.message}
                    </p>

                    <div className="mt-2.5 flex items-center gap-3">
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          className="at-btn at-btn-primary at-btn-sm"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          View →
                        </Link>
                      )}
                      {!n.isRead && (
                        <form
                          action={async () => {
                            "use server";
                            await markNotificationReadAction(n.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs font-500 hover:underline cursor-pointer"
                            style={{ color: "#6B7280" }}
                          >
                            Mark read
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/notifications?filter=${filter}&page=${page - 1}`}
                  className="at-btn at-btn-outline at-btn-sm"
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/notifications?filter=${filter}&page=${page + 1}`}
                  className="at-btn at-btn-primary at-btn-sm"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
