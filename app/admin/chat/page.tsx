import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  User,
  ArrowRight,
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

  if (!can(session.user, "users:manage")) {
    redirect("/admin/dashboard");
  }

  const { query } = await searchParams;

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
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="ath-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Operations</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Chat Monitor
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Parent–tutor conversations and support escalation
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-4 py-2 bg-[#E8F1FB] text-[#2563EB] font-800 text-xs shrink-0">
          <MessageCircle size={15} />
          <span>{totalConversations} active threads</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="ath-panel p-6 space-y-1">
          <p className="text-xs font-800 uppercase tracking-wider text-slate-900">
            Total Chat Threads
          </p>
          <p className="text-2xl sm:text-3xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {totalConversations}
          </p>
          <p className="text-xs font-600 text-slate-600">All active parent-tutor conversations</p>
        </div>

        <div className="ath-panel p-6 space-y-1">
          <p className="text-xs font-800 uppercase tracking-wider text-[#2D9E6B]">
            Messages Sent
          </p>
          <p className="text-2xl sm:text-3xl font-800 text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {totalMessages.toLocaleString("en-IN")}
          </p>
          <p className="text-xs font-600 text-slate-600">Instant messages processed</p>
        </div>

        <div className="ath-panel p-6 space-y-1 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-800 uppercase tracking-wider text-[#2563EB]">
            Support Governance
          </p>
          <p className="text-sm font-800 text-[#0F2540]">
            Full Audit &amp; Transcript Access
          </p>
          <p className="text-xs font-600 text-slate-600">Super Admin &amp; Support staff can mediate chat inquiries</p>
        </div>
      </div>

      {/* Search Input */}
      <form method="GET" className="ath-panel flex flex-col gap-3 sm:flex-row sm:items-center p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            name="query"
            defaultValue={query || ""}
            placeholder="Search chat by parent or tutor name / email..."
            className="w-full h-11 rounded-2xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-xs font-700 text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2D9E6B]"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] px-6 py-3 text-xs font-800 text-white transition-all shadow-md cursor-pointer"
        >
          Search Threads
        </button>
      </form>

      {/* Conversations List */}
      <div className="ath-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-800 text-[#0F2540] text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
            Active Support &amp; Chat Threads
          </h2>
          <span className="text-xs text-slate-600 font-700">Showing latest 50</span>
        </div>

        {conversations.length === 0 ? (
          <div className="p-16 text-center text-slate-600">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-400" />
            <p className="text-base font-800 text-[#0F2540]">No chat threads found</p>
            <p className="text-xs font-600 text-slate-600 mt-1">
              {query ? `No matching conversations for "${query}"` : "User chat messages will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              const parentUser = conv.parentProfile.user;
              const tutorUser = conv.tutorProfile.user;

              return (
                <div
                  key={conv.id}
                  className="p-5 transition-colors hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 border border-blue-300 text-[#2563EB] font-800 text-xs">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-800 text-[#0F2540] text-sm">
                          🏠 {parentUser.name || parentUser.email}
                        </span>
                        <span className="text-slate-400 text-xs font-700">↔</span>
                        <span className="font-800 text-[#2D9E6B] text-sm">
                          🧑‍🏫 {tutorUser.name || tutorUser.email}
                        </span>

                        {conv.lead && (
                          <span className="rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-800 text-slate-800">
                            {conv.lead.classLevel} ({conv.lead.subjects.slice(0, 2).join(", ")})
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-600 text-slate-700 truncate max-w-xl">
                        {lastMsg ? lastMsg.content : "No messages yet"}
                      </p>

                      <div className="flex items-center gap-3 text-xs font-600 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
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
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-xs font-800 text-[#2563EB] hover:bg-blue-100 transition-all"
                    >
                      <span>Open Chat Transcript</span>
                      <ArrowRight size={13} />
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
