"use client";

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  RefreshCw,
  Phone,
  ExternalLink,
  User as UserIcon,
  BookOpen,
  MapPin,
  Coins,
  ShieldCheck,
  CheckCheck,
  Clock,
  Sparkles,
  ArrowLeft,
  Filter,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  getWhatsAppChatThreadsAction,
  getWhatsAppChatMessagesAction,
  sendStaffWhatsAppReplyAction,
  markWhatsAppContactAsInterestedAction,
  type WhatsAppConversationSummary,
  type WhatsAppChatMessageItem,
  type WhatsAppChatContactDetails,
  type WhatsAppReplyFilter,
} from "@/app/actions/whatsapp-chat.actions";
import Link from "next/link";

const QUICK_TEMPLATES = [
  {
    label: "👋 Welcome & Help",
    text: "Namaste! ApnaTutorHub support team se baat ho rahi hai. Batayein hum aapki kya madad kar sakte hain?",
  },
  {
    label: "📋 Profile Login Link",
    text: "Aap apne account me login karke verified student leads dekh sakte hain:\nhttps://apnatutorhub.com/login",
  },
  {
    label: "🔑 Reset Password",
    text: "Agar password reset karna chahte hain, toh yahan click karein:\nhttps://apnatutorhub.com/forgot-password",
  },
  {
    label: "📞 Calling You Soon",
    text: "Hamari team aapko thodi der me call karegi detail verify karne ke liye. Dhanyawaad!",
  },
  {
    label: "📍 Share Location",
    text: "Kripya apna area aur city confirm karein taaki hum aapke paas ki verified tuition leads share kar sakein.",
  },
];

const THREADS_PAGE_SIZE = 50;

function mergeMessages(
  prev: WhatsAppChatMessageItem[],
  incoming: WhatsAppChatMessageItem[]
): WhatsAppChatMessageItem[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

const WhatsAppChatComposer = memo(function WhatsAppChatComposer({
  phone,
  disabled,
  onSend,
}: {
  phone: string;
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setInputText("");
    setIsSending(false);
  }, [phone]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const messageText = inputText.trim();
    if (!messageText || isSending || disabled) return;
    setIsSending(true);
    setInputText("");
    try {
      await onSend(messageText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur-md px-4 py-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Sparkles size={11} className="text-amber-500" /> Quick:
        </span>
        {QUICK_TEMPLATES.map((tmpl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputText(tmpl.text)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0"
      >
        <div className="flex-1 relative">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`Reply to +${phone} on WhatsApp... (Press Enter to send)`}
            className="w-full resize-none px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending || disabled}
          className="h-10 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
        >
          {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          <span>Send</span>
        </button>
      </form>
    </>
  );
});

export function WhatsAppChatInbox() {
  const [threads, setThreads] = useState<WhatsAppConversationSummary[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppChatMessageItem[]>([]);
  const [contact, setContact] = useState<WhatsAppChatContactDetails | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [interestedOnly, setInterestedOnly] = useState(false);
  const [replyFilter, setReplyFilter] = useState<WhatsAppReplyFilter>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalThreads, setTotalThreads] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [awaitingUserCount, setAwaitingUserCount] = useState(0);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [mobileViewChat, setMobileViewChat] = useState(false);
  const [markingInterested, setMarkingInterested] = useState(false);
  const [interestedFeedback, setInterestedFeedback] = useState<{
    type: "success" | "error" | "already";
    text: string;
    leadId?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages, selectedPhone, scrollToBottom]);

  const filterSignature = useMemo(
    () =>
      [debouncedSearch, roleFilter, unreadOnly, interestedOnly, replyFilter].join("|"),
    [debouncedSearch, roleFilter, unreadOnly, interestedOnly, replyFilter]
  );

  const loadThreads = useCallback(
    async (silent = false, pageOverride?: number) => {
      if (!silent) setLoadingThreads(true);
      const activePage = pageOverride ?? page;
      const res = await getWhatsAppChatThreadsAction({
        search: debouncedSearch || undefined,
        roleFilter: roleFilter !== "ALL" ? roleFilter : undefined,
        unreadOnly,
        interestedOnly,
        replyFilter,
        page: activePage,
        pageSize: THREADS_PAGE_SIZE,
      });
      if (res.success && res.data) {
        setThreads(res.data.threads);
        setTotalUnread(res.data.totalUnread);
        setInterestedCount(res.data.interestedCount);
        setNeedsReplyCount(res.data.needsReplyCount);
        setAwaitingUserCount(res.data.awaitingUserCount);
        setTotalThreads(res.data.totalThreads);
        setTotalPages(res.data.totalPages);
        setSelectedPhone((current) => {
          if (current && res.data!.threads.some((t) => t.phone === current)) return current;
          if (res.data!.threads.length > 0 && !mobileViewChat && activePage === 1 && !current) {
            return res.data!.threads[0].phone;
          }
          return current;
        });
      }
      setLoadingThreads(false);
    },
    [debouncedSearch, roleFilter, unreadOnly, interestedOnly, replyFilter, page, mobileViewChat]
  );

  useEffect(() => {
    setPage(1);
    void loadThreads(false, 1);
  }, [filterSignature]);

  useEffect(() => {
    if (page === 1) return;
    void loadThreads();
  }, [page]);

  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      setContact(null);
      return;
    }

    let active = true;
    stickToBottomRef.current = true;
    setLoadingMessages(true);

    getWhatsAppChatMessagesAction(selectedPhone, { limit: 350 }).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setMessages(res.data.messages);
        if (res.data.contact) setContact(res.data.contact);
        setThreads((prev) =>
          prev.map((t) => (t.phone === selectedPhone ? { ...t, unreadCount: 0 } : t))
        );
      }
      setLoadingMessages(false);
    });

    return () => {
      active = false;
    };
  }, [selectedPhone]);

  useEffect(() => {
    if (!selectedPhone) return;

    const poll = () => {
      void loadThreads(true);
      const list = messagesRef.current;
      const since = list[list.length - 1]?.createdAt;
      getWhatsAppChatMessagesAction(selectedPhone, {
        since,
        markRead: true,
      }).then((res) => {
        if (!res.success || !res.data || res.data.messages.length === 0) return;
        setMessages((prev) => mergeMessages(prev, res.data!.messages));
        if (stickToBottomRef.current) scrollToBottom("smooth");
      });
    };

    const interval = setInterval(poll, 12000);
    return () => clearInterval(interval);
  }, [selectedPhone, loadThreads, scrollToBottom]);

  const handleMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 140;
  };

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!selectedPhone) return;
      setFeedback(null);
      stickToBottomRef.current = true;

      const tempMsg: WhatsAppChatMessageItem = {
        id: "temp-" + Date.now(),
        phone: selectedPhone,
        direction: "OUTBOUND",
        senderName: "Staff (You)",
        body: messageText,
        step: "STAFF_REPLY",
        isRead: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const res = await sendStaffWhatsAppReplyAction({
          phone: selectedPhone,
          text: messageText,
        });

        if (res.success && res.data) {
          setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? res.data!.message : m)));
          setThreads((prev) =>
            prev.map((t) =>
              t.phone === selectedPhone
                ? {
                    ...t,
                    needsStaffReply: false,
                    unreadCount: 0,
                    lastMessage: {
                      body: messageText,
                      direction: "OUTBOUND",
                      senderName: "Staff (You)",
                      createdAt: res.data!.message.createdAt,
                    },
                  }
                : t
            )
          );
          setFeedback({ type: "success", text: "WhatsApp message delivered!" });
          setTimeout(() => setFeedback(null), 3000);
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
          setFeedback({
            type: "error",
            text: res.error || "Failed to send WhatsApp message.",
          });
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setFeedback({
          type: "error",
          text: err instanceof Error ? err.message : "Error sending message.",
        });
      }
    },
    [selectedPhone]
  );

  // Mark current contact as an INTERESTED lead in Staff CRM
  const handleMarkInterested = async () => {
    if (!selectedPhone || markingInterested) return;
    setMarkingInterested(true);
    setInterestedFeedback(null);

    // Grab last inbound message as context note
    const lastInbound = [...messages].reverse().find((m) => m.direction === "INBOUND");
    const note = lastInbound ? lastInbound.body.slice(0, 200) : undefined;

    const res = await markWhatsAppContactAsInterestedAction({
      phone: selectedPhone,
      name:     contact?.name     ?? activeThread?.name     ?? null,
      email:    contact?.email    ?? null,
      location: contact?.location ?? activeThread?.location ?? null,
      subjects: contact?.subjects ?? activeThread?.subjects ?? [],
      note,
    });

    setMarkingInterested(false);

    if (res.success && res.data) {
      setThreads((prev) =>
        prev.map((t) => (t.phone === selectedPhone ? { ...t, isInterestedLead: true } : t))
      );
      setInterestedCount((c) => (res.data!.isNew ? c + 1 : c));
      setInterestedFeedback({
        type: res.data.isNew ? "success" : "already",
        text: res.data.isNew
          ? `✅ Marked as Interested! Lead saved in CRM.`
          : `⭐ Already in CRM — status upgraded to Interested.`,
        leadId: res.data.leadId,
      });
      setTimeout(() => setInterestedFeedback(null), 5000);
    } else {
      setInterestedFeedback({ type: "error", text: res.error ?? "Failed to mark as interested." });
      setTimeout(() => setInterestedFeedback(null), 5000);
    }
  };

  const activeThread = threads.find((t) => t.phone === selectedPhone);

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatSnippetTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden text-slate-900">
      {/* Top Banner Alert (if any) */}
      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left Sidebar: Thread List ─────────────────────────────────────────── */}
        <aside
          className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-[#F8FAFC] transition-transform duration-200 ${
            mobileViewChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-[#0F2540] tracking-tight">
                    WhatsApp Chats
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    Permanent log & live staff response
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-[11px] font-bold shadow-xs">
                    {totalUnread} new
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => loadThreads()}
                  disabled={loadingThreads}
                  title="Refresh chats"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw
                    size={16}
                    className={loadingThreads ? "animate-spin text-emerald-600" : ""}
                  />
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone, name, area, message..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                { id: "ALL", label: "All" },
                { id: "TUTOR", label: "Tutors" },
                { id: "PARENT", label: "Parents" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRoleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                    roleFilter === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setInterestedOnly(!interestedOnly)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  interestedOnly
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Interested ({interestedCount})
              </button>

              <button
                type="button"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  unreadOnly
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Unread ({totalUnread})
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setReplyFilter(replyFilter === "NEEDS_REPLY" ? "ALL" : "NEEDS_REPLY")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  replyFilter === "NEEDS_REPLY"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title="Last message from user — we have not replied yet"
              >
                Need reply ({needsReplyCount})
              </button>
              <button
                type="button"
                onClick={() =>
                  setReplyFilter(replyFilter === "AWAITING_USER" ? "ALL" : "AWAITING_USER")
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  replyFilter === "AWAITING_USER"
                    ? "bg-sky-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title="We or bot replied last — waiting on them"
              >
                We replied ({awaitingUserCount})
              </button>
            </div>
          </div>

          {/* Thread List */}
          <div ref={threadListRef} className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {loadingThreads && threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin text-emerald-500 mb-2" />
                <p className="text-xs font-medium">Loading conversations...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare size={32} className="text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No WhatsApp chats found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Incoming messages from tutors and parents will appear here in real-time.
                </p>
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = thread.phone === selectedPhone;
                const isTutor = thread.role.toUpperCase() === "TUTOR";
                const isParent = thread.role.toUpperCase() === "PARENT";

                return (
                  <button
                    key={thread.phone}
                    type="button"
                    onClick={() => {
                      setSelectedPhone(thread.phone);
                      setMobileViewChat(true);
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative border-b border-slate-100 ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-l-emerald-600"
                        : thread.needsStaffReply
                          ? "bg-orange-50/40 hover:bg-orange-50/70"
                          : "hover:bg-white bg-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        isTutor
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isParent
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {thread.name ? thread.name.slice(0, 2).toUpperCase() : "WA"}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-xs text-slate-900 truncate flex items-center gap-1">
                          {thread.isInterestedLead && (
                            <Sparkles size={11} className="text-amber-500 shrink-0" aria-hidden />
                          )}
                          {thread.needsStaffReply && (
                            <span
                              className="text-[9px] font-black uppercase text-orange-700 bg-orange-100 px-1 py-0.5 rounded shrink-0"
                              title="Needs staff reply"
                            >
                              Reply
                            </span>
                          )}
                          {thread.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {formatSnippetTime(thread.lastMessage?.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                        <span className="font-mono text-slate-600 font-semibold">
                          +{thread.phone}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider ${
                            isTutor
                              ? "bg-emerald-100 text-emerald-800"
                              : isParent
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {thread.role}
                        </span>
                        {thread.location && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="truncate max-w-[100px]">{thread.location}</span>
                          </>
                        )}
                      </div>

                      {/* Last Message Snippet */}
                      <p className="text-xs text-slate-600 truncate font-normal line-clamp-1">
                        {thread.lastMessage?.direction === "OUTBOUND" ? (
                          <span className="text-slate-400 font-medium">You: </span>
                        ) : null}
                        {thread.lastMessage?.body || "Conversation started"}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {thread.unreadCount > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                        {thread.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page <= 1 || loadingThreads}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 disabled:opacity-40 hover:bg-slate-200"
              >
                ← Prev
              </button>
              <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight">
                Page {page} of {totalPages}
                <br />
                <span className="text-slate-400">{totalThreads.toLocaleString()} chats</span>
              </p>
              <button
                type="button"
                disabled={page >= totalPages || loadingThreads}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 disabled:opacity-40 hover:bg-slate-200"
              >
                Next →
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Chat Window ─────────────────────────────────────────────────── */}
        <section
          className={`flex-1 flex flex-col bg-[#EFEAE2] min-w-0 transition-all ${
            !mobileViewChat ? "hidden md:flex" : "flex"
          }`}
          style={{
            backgroundImage:
              "radial-gradient(#d4cbbe 1px, transparent 1px), radial-gradient(#d4cbbe 1px, #efeae2 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px",
          }}
        >
          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 py-2 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileViewChat(false)}
                    className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      contact?.role === "TUTOR"
                        ? "bg-emerald-100 text-emerald-800"
                        : contact?.role === "PARENT"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {contact?.name ? contact.name.slice(0, 2).toUpperCase() : "WA"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {contact?.name || activeThread?.name || `+${selectedPhone}`}
                      </h3>
                      {contact?.isRegistered && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ShieldCheck size={11} /> Registered
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono font-medium">+{selectedPhone}</span>
                      {contact?.location && (
                        <>
                          <span>•</span>
                          <span className="truncate">{contact.location}</span>
                        </>
                      )}
                      {contact?.sessionStep && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700">
                            Bot: {contact.sessionStep}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* ⭐ Mark as Interested */}
                  <button
                    type="button"
                    onClick={handleMarkInterested}
                    disabled={markingInterested || !selectedPhone}
                    title="Mark this contact as an Interested Lead in Staff CRM"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {markingInterested ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    <span className="hidden sm:inline">
                      {markingInterested
                        ? "Saving…"
                        : activeThread?.isInterestedLead
                          ? "Interested ✓"
                          : "Mark Interested"}
                    </span>
                  </button>

                  {/* 🚀 Go to campaign panel */}
                  <Link
                    href="/admin/staff-leads/interested-leads"
                    target="_blank"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    title="Open Interested Leads Campaign Panel"
                  >
                    <Send size={13} />
                    <span className="hidden sm:inline">Campaign</span>
                  </Link>

                  <a
                    href={`https://wa.me/${selectedPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    title="Open in WhatsApp Web"
                  >
                    <MessageSquare size={13} />
                    <span className="hidden sm:inline">WA Web</span>
                  </a>

                  <a
                    href={`tel:+${selectedPhone}`}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    title="Call Phone"
                  >
                    <Phone size={14} />
                    <span className="hidden sm:inline">Call</span>
                  </a>

                  {contact?.userId && (
                    <a
                      href={`/admin/users?search=${selectedPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                      title="View user profile"
                    >
                      <UserIcon size={14} />
                      <span className="hidden sm:inline">User</span>
                    </a>
                  )}
                </div>
              </div>

              {/* ⭐ Interested Feedback Banner */}
              {interestedFeedback && (
                <div
                  className={`flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold border-b ${
                    interestedFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : interestedFeedback.type === "already"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <span>{interestedFeedback.text}</span>
                  {interestedFeedback.leadId && (
                    <Link
                      href="/admin/staff-leads/interested-leads"
                      target="_blank"
                      className="underline font-bold whitespace-nowrap hover:opacity-80 transition-opacity"
                    >
                      Send Campaign →
                    </Link>
                  )}
                </div>
              )}
              {/* Chat Message Stream */}
              <div
                ref={messagesScrollRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5"
              >
                {/* Contact info pill badge banner */}
                {contact && (
                  <div className="max-w-md mx-auto p-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-xs text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between font-bold text-[11px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100">
                      <span>User Snapshot</span>
                      <span>{contact.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      {contact.location && (
                        <div>
                          <span className="text-slate-400">Area:</span>{" "}
                          <span className="font-semibold text-slate-800">{contact.location}</span>
                        </div>
                      )}
                      {contact.subjects && contact.subjects.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Subjects:</span>{" "}
                          <span className="font-semibold text-slate-800">
                            {contact.subjects.join(", ")}
                          </span>
                        </div>
                      )}
                      {contact.walletBalance !== null && (
                        <div>
                          <span className="text-slate-400">Balance:</span>{" "}
                          <span className="font-bold text-emerald-700">
                            ₹{contact.walletBalance}
                          </span>
                        </div>
                      )}
                      {contact.coinsBalance !== null && (
                        <div>
                          <span className="text-slate-400">Coins:</span>{" "}
                          <span className="font-bold text-blue-700">{contact.coinsBalance}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin text-emerald-600 mr-2" />
                    <span className="text-xs font-semibold">Loading chat messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No message history yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Type below to send the first WhatsApp message to this number.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isInbound = msg.direction === "INBOUND";
                    const isStaff = msg.senderName && msg.senderName.includes("Staff");
                    const isBot = msg.senderName === "Bot";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-xs relative text-xs leading-relaxed ${
                            isInbound
                              ? "bg-white text-slate-800 rounded-tl-none border border-slate-200/80"
                              : isStaff
                                ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-500/10"
                                : "bg-[#D9FDD3] text-slate-900 rounded-tr-none border border-emerald-200/60"
                          }`}
                        >
                          {/* Sender attribution */}
                          <div className="flex items-center justify-between gap-3 text-[10px] mb-1 font-bold">
                            <span
                              className={
                                isInbound
                                  ? "text-blue-700"
                                  : isStaff
                                    ? "text-emerald-100"
                                    : "text-emerald-800"
                              }
                            >
                              {msg.senderName || (isInbound ? "User" : "System")}
                            </span>
                            {msg.step && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  isInbound
                                    ? "bg-slate-100 text-slate-500"
                                    : isStaff
                                      ? "bg-emerald-700/60 text-emerald-100"
                                      : "bg-emerald-200/60 text-emerald-900"
                                }`}
                              >
                                {msg.step}
                              </span>
                            )}
                          </div>

                          {/* Message Body */}
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>

                          {/* Footer: time & checkmark */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 font-medium ${
                              isInbound
                                ? "text-slate-400"
                                : isStaff
                                  ? "text-emerald-200"
                                  : "text-slate-500"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {!isInbound && <CheckCheck size={12} className="inline opacity-80" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <WhatsAppChatComposer
                phone={selectedPhone}
                disabled={loadingMessages}
                onSend={handleSendMessage}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-extrabold text-slate-700 text-base">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choose any tutor or parent from the list on the left to view complete permanent chat history and reply directly via WhatsApp.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
