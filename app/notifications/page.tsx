import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bell, BellOff } from "lucide-react";
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

  // Redirect based on role
  const backHref =
    session.user.role === "PARENT"
      ? "/parent/dashboard"
      : session.user.role === "TUTOR"
        ? "/tutor/dashboard"
        : "/admin/dashboard";

  return (
    <div
      className="min-h-screen"
      style={{ background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em" }}
            >
              Notifications
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <Link
            href={backHref}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            style={{ background: "#F1F5F9" }}
          >
            ← Back
          </Link>
        </div>

        {/* Filter tabs + Mark all */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {["all", "unread"].map((f) => (
              <a
                key={f}
                href={`/notifications?filter=${f}`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all"
                style={{
                  background: filter === f ? "#0F172A" : "#F1F5F9",
                  color: filter === f ? "#fff" : "#64748B",
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
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(34,197,94,0.1)", color: "#16A34A" }}
              >
                <BellOff size={12} />
                Mark all read
              </button>
            </form>
          )}
        </div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl py-20 text-center"
            style={{ background: "#fff", border: "1px solid #E2E8F0" }}
          >
            <Bell size={36} className="text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No notifications here</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="overflow-hidden rounded-2xl transition-all"
                style={{
                  background: n.isRead ? "#fff" : "#F0FDF4",
                  border: n.isRead ? "1px solid #E2E8F0" : "1px solid #BBF7D0",
                }}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: n.isRead ? "#F8FAFC" : "rgba(34,197,94,0.12)",
                      border: n.isRead ? "1px solid #E2E8F0" : "1px solid rgba(34,197,94,0.25)",
                    }}
                  >
                    <Bell size={16} style={{ color: n.isRead ? "#94A3B8" : "#22C55E" }} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm font-semibold leading-snug"
                        style={{ color: n.isRead ? "#334155" : "#0F172A" }}
                      >
                        {n.title}
                      </p>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                      {n.message}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: "#22C55E", color: "#fff" }}
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
                            className="text-xs text-slate-400 underline transition-colors hover:text-slate-600"
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
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/notifications?filter=${filter}&page=${page - 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "#F1F5F9", color: "#64748B" }}
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/notifications?filter=${filter}&page=${page + 1}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "#22C55E", color: "#fff" }}
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
