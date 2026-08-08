import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  User,
  ArrowRight,
  ShieldCheck,
  Clock,
  MessageCircle,
} from "lucide-react";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support Chat Overview — Admin | ApnaTutorHub" };

export default async function AdminChatSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check RBAC permission for support / super admin
  if (!can(session.user, "users:manage")) {
    redirect("/admin/dashboard");
  }

  const { query } = await searchParams;

  // Fetch all user conversations across the platform
  const conversations = await prisma.conversation.findMany({
    where: query
      ? {
          OR: [
            { parentProfile: { user: { name: { contains: query, mode: "insensitive" } } } },
            { parentProfile: { user: { email: { contains: query, mode: "insensitive" } } } },
            { tutorProfile: { user: { name: { contains: query, mode: "insensitive" } } } },
            { tutorProfile: { user: { email: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      parentProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tutorProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      lead: {
        select: {
          id: true,
          classLevel: true,
          subjects: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderUserId: true,
          isRead: true,
        },
      },
    },
  });

  const totalConversations = await prisma.conversation.count();
  const totalMessages = await prisma.message.count();

  return (
    <div className="space-y-6" style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Support & Chat Inbox
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              <MessageCircle size={12} />
              {totalConversations} Active Threads
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            Platform-wide conversation monitoring & support escalation management
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-mono">
            Total Threads
          </p>
          <p className="mt-1 text-3xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {totalConversations}
          </p>
          <p className="mt-1 text-xs text-slate-400">All active parent-tutor chats</p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 font-mono">
            Messages Sent
          </p>
          <p className="mt-1 text-3xl font-extrabold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {totalMessages.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">Instant messages processed</p>
        </div>

        <div
          className="rounded-2xl p-5 sm:col-span-2 lg:col-span-1"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "1px solid #1E293B",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 font-mono">
            Support Access
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            Full Audit & Transcript Access
          </p>
          <p className="mt-1 text-xs text-slate-400">Support role can review & mediate chat inquiries</p>
        </div>
      </div>

      {/* Search Input */}
      <form method="GET" className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="query"
            defaultValue={query || ""}
            placeholder="Search chat by parent or tutor name / email..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500"
        >
          Search
        </button>
      </form>

      {/* Conversations List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          border: "1px solid #1E293B",
        }}
      >
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <h2 className="font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Active Support & Chat Threads
          </h2>
          <span className="text-xs text-slate-400 font-mono">Showing latest 50</span>
        </div>

        {conversations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MessageSquare size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-300">No chat threads found</p>
            <p className="text-xs text-slate-500 mt-1">
              {query ? `No matching conversations for "${query}"` : "User chat messages will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              const parentUser = conv.parentProfile.user;
              const tutorUser = conv.tutorProfile.user;

              return (
                <div
                  key={conv.id}
                  className="p-4 transition-colors hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <User size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">
                          🏠 {parentUser.name || parentUser.email}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">↔</span>
                        <span className="font-semibold text-emerald-400 text-sm">
                          🧑‍🏫 {tutorUser.name || tutorUser.email}
                        </span>

                        {conv.lead && (
                          <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                            {conv.lead.classLevel} ({conv.lead.subjects.slice(0, 2).join(", ")})
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-300 truncate max-w-xl">
                        {lastMsg ? lastMsg.content : "No messages yet"}
                      </p>

                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(conv.lastMessageAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/chat/${conv.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/20 hover:text-white"
                    >
                      Open Chat <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
