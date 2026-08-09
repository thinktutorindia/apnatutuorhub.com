import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserConversations } from "@/lib/chat-service";
import Link from "next/link";

export const metadata = {
  title: "Messages | ApnaTutorHub",
};

export default async function ChatInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Determine user role and profile ID
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      parentProfile: { select: { id: true } },
      tutorProfile: { select: { id: true } },
    },
  });

  if (!user) redirect("/login");

  const isParent = user.role === "PARENT" || Boolean(user.parentProfile);
  const profileId = isParent
    ? user.parentProfile?.id
    : user.tutorProfile?.id;

  if (!profileId) {
    redirect(isParent ? "/parent/dashboard" : "/tutor/dashboard");
  }

  const conversations = await getUserConversations(
    profileId,
    isParent ? "PARENT" : "TUTOR"
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      <header className="neu-card flex flex-col gap-2 bg-[#F3E8FF] p-6">
        <div className="neu-badge w-fit bg-white text-[#0F172A]">
          <MessageSquare size={14} />
          Messages
        </div>
        <h1 className="text-3xl font-black text-[#0F172A]">Chat Inbox</h1>
        <p className="text-sm font-semibold text-slate-700">
          Direct instant messaging between Parents and Verified Tutors.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="neu-card p-12 text-center space-y-3 bg-white">
          <MessageSquare size={36} className="mx-auto text-slate-300" />
          <p className="text-lg font-black text-[#0F172A]">No conversations yet</p>
          <p className="text-sm text-slate-600">
            Start a chat with a tutor or parent from lead applicant profiles!
          </p>
        </div>
      ) : (
        <div className="neu-card bg-white divide-y-2 divide-slate-100 overflow-hidden">
          {conversations.map((conv) => {
            const otherUser = isParent
              ? conv.tutorProfile.user
              : conv.parentProfile.user;

            const lastMsg = conv.messages[0];
            const hasUnread = lastMsg && !lastMsg.isRead && lastMsg.senderUserId !== session.user.id;

            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={`flex items-center justify-between p-4 transition-all hover:bg-slate-50 ${
                  hasUnread ? "bg-[#F0FDF4]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-[#FEF3C7] text-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    {isParent ? "🧑‍🏫" : "🏠"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#0F172A]">
                        {otherUser.name ?? "User"}
                      </span>
                      {conv.lead && (
                        <span className="neu-badge bg-[#E0F2FE] text-[10px]">
                          {conv.lead.classLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate max-w-md">
                      {lastMsg ? lastMsg.content : "No messages yet"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </span>
                  {hasUnread && (
                    <span className="block ml-auto mt-1 h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
