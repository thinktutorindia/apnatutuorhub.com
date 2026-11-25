"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import {
  startParentChatAction,
  startTutorChatAction,
  getChatThreadAction,
  type ChatThreadPayload,
} from "@/app/actions/chat.actions";
import { ChatThreadView } from "@/components/chat/ChatThreadView";

type StartChatButtonProps = {
  targetProfileId: string; // tutorProfileId (if parent) or parentProfileId (if tutor)
  leadId?: string;
  role: "PARENT" | "TUTOR";
  className?: string;
  buttonText?: string;
};

export function StartChatButton({
  targetProfileId,
  leadId,
  role,
  className = "neu-btn bg-[#8B5CF6] text-white px-4 py-2 text-xs",
  buttonText = "💬 In-App Chat",
}: StartChatButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [thread, setThread] = useState<ChatThreadPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleStartChat() {
    setError(null);
    startTransition(async () => {
      const res =
        role === "PARENT"
          ? await startParentChatAction(targetProfileId, leadId)
          : await startTutorChatAction(targetProfileId, leadId);

      if (!res.success || !res.data?.conversationId) {
        setError(res.error || "Could not start chat");
        return;
      }

      const loaded = await getChatThreadAction(res.data.conversationId);
      if (!loaded.success || !loaded.data) {
        setError(loaded.error || "Could not open chat");
        return;
      }
      setThread(loaded.data);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleStartChat}
        disabled={isPending}
        className={className}
      >
        <MessageSquare size={13} />
        <span>{isPending ? "Connecting..." : buttonText}</span>
      </button>

      {error && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-2.5 text-xs font-bold shadow-lg">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-1 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {thread && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setThread(null)}
        >
          <div
            className="w-full max-w-2xl h-[min(760px,92vh)] flex flex-col rounded-3xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 px-4 py-3 shrink-0">
              <div className="min-w-0">
                <p className="font-black text-[#0F172A] truncate text-sm sm:text-base">
                  💬 {thread.otherUserName}
                </p>
                {thread.requirement && (
                  <p className="text-[11px] text-slate-500 truncate">{thread.requirement}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {thread.otherUserPhone && (
                  <a
                    href={`tel:${thread.otherUserPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs px-3 py-2"
                  >
                    <Phone size={13} />
                    Call
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setThread(null)}
                  aria-label="Close chat"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatThreadView
                conversationId={thread.conversationId}
                currentUserId={thread.currentUserId}
                initialMessages={thread.messages}
              />
            </div>
          </div>
        </div>
      )}

      {isPending && !thread && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-lg">
          <Loader2 size={14} className="animate-spin" />
          Opening chat…
        </div>
      )}
    </>
  );
}
