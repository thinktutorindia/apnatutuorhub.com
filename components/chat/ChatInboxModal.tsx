"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, X } from "lucide-react";
import {
  listMyConversationsAction,
  getChatThreadAction,
  type ConversationSummary,
  type ChatThreadPayload,
} from "@/app/actions/chat.actions";
import { ChatThreadView } from "@/components/chat/ChatThreadView";

export function ChatInboxModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ChatThreadPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyConversationsAction().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setItems(res.data);
      else setError(res.error || "Could not load conversations.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function openThread(conversationId: string) {
    setError(null);
    const res = await getChatThreadAction(conversationId);
    if (!res.success || !res.data) {
      setError(res.error || "Could not open chat.");
      return;
    }
    setActive(res.data);
    setItems((prev) => prev.map((i) => (i.id === conversationId ? { ...i, unread: 0 } : i)));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[min(780px,92vh)] flex flex-col rounded-3xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {active && (
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Back to inbox"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer shrink-0"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div className="min-w-0">
              <p className="font-black text-[#0F172A] text-sm sm:text-base">
                {active ? `💬 ${active.otherUserName}` : "💬 Messages"}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {active
                  ? active.requirement || "Direct conversation"
                  : "Chat with parents without leaving this page"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border-b border-rose-200">
            {error}
          </div>
        )}

        {active ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatThreadView
              conversationId={active.conversationId}
              currentUserId={active.currentUserId}
              initialMessages={active.messages}
            />
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading conversations…
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <p className="font-black text-[#0F172A]">No conversations yet</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Unlock a parent contact and tap “In-App Chat” to start a conversation here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openThread(item.id)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                  {item.otherUserName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-sm text-[#0F172A] truncate">
                      {item.otherUserName}
                    </p>
                    {item.unread > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shrink-0">
                        {item.unread}
                      </span>
                    )}
                  </div>
                  {item.requirement && (
                    <p className="text-[11px] text-slate-500 truncate">{item.requirement}</p>
                  )}
                  <p className="text-xs text-slate-600 truncate mt-0.5">{item.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
