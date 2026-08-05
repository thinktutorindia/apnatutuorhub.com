import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getConversationMessages, markMessagesRead } from "@/lib/chat-service";
import { ChatThreadView } from "@/components/chat/ChatThreadView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Chat Thread | ThinkTutor` };
}

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user?.id) redirect("/login");

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      parentProfile: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      tutorProfile: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      lead: { select: { id: true, classLevel: true, subjects: true } },
    },
  });

  if (!conversation) notFound();

  const isParent = conversation.parentProfile.userId === session.user.id;
  const isTutor = conversation.tutorProfile.userId === session.user.id;

  if (!isParent && !isTutor) redirect("/chat");

  // Mark unread messages as read for current user
  await markMessagesRead(id, session.user.id);

  const { messages } = await getConversationMessages({ conversationId: id, limit: 100 });

  const otherUser = isParent
    ? conversation.tutorProfile.user
    : conversation.parentProfile.user;

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-6 px-4">
      <div className="flex items-center justify-between">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#22C55E]"
        >
          <ArrowLeft size={14} />
          Back to Inbox
        </Link>
      </div>

      {/* Header */}
      <header className="neu-card flex items-center justify-between bg-[#FEF3C7] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-white text-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {isParent ? "🧑‍🏫" : "🏠"}
          </div>
          <div>
            <h1 className="font-black text-[#0F172A]">
              {otherUser.name ?? "User"}
            </h1>
            {conversation.lead && (
              <p className="text-xs text-slate-600">
                Requirement: {conversation.lead.classLevel} (
                {conversation.lead.subjects.join(", ")})
              </p>
            )}
          </div>
        </div>

        {otherUser.phone && (
          <a
            href={`tel:${otherUser.phone}`}
            className="neu-btn neu-btn-white px-3 py-1 text-xs"
          >
            📞 Call
          </a>
        )}
      </header>

      {/* Thread messages & input form */}
      <ChatThreadView
        conversationId={id}
        currentUserId={session.user.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          senderUserId: m.senderUserId,
          senderName: m.sender.name ?? "User",
          createdAt: m.createdAt.toISOString(),
          isRead: m.isRead,
          attachmentUrl: m.attachmentUrl,
        }))}
      />
    </div>
  );
}
