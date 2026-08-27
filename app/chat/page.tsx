import { redirect } from "next/navigation";
import { MessageSquare, ChevronRight } from "lucide-react";
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
    <div className="max-w-4xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Direct Communications</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Messages &amp; Conversations
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Real-time direct messaging between verified tutors and parents
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-xs text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#2D9E6B] flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
            <MessageSquare size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-800 text-[#0F2540]">No active conversations yet</h2>
            <p className="text-xs font-600 text-slate-600 max-w-xs mx-auto leading-relaxed">
              {isParent
                ? "Connect with verified tutors for your child's requirements to start direct messaging."
                : "Conversations start automatically when a parent or tutor unlocks contact details."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={isParent ? "/parent/post-requirement" : "/tutor/leads"}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 transition-colors shadow-md"
            >
              <span>{isParent ? "Post a Requirement →" : "Browse Student Enquiries →"}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-200 overflow-hidden">
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
                className={`flex items-center justify-between p-5 transition-all hover:bg-slate-50 ${
                  hasUnread ? "bg-emerald-50/40" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#0F2540] text-white font-800 text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {(otherUser.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-800 text-sm text-[#0F2540] truncate">{otherUser.name || "User"}</h3>
                    <p className="text-xs font-600 text-slate-600 truncate">
                      {lastMsg ? lastMsg.content : "No messages yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D9E6B]" />
                  )}
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
