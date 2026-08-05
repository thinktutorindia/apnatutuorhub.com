"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Check, CheckCheck, Paperclip, Mic, Square, Trash2, FileText, Loader2 } from "lucide-react";
import { postChatMessageAction, markChatReadAction } from "@/app/actions/chat.actions";
import { createClient } from "@/lib/supabase/client";

type MessageItem = {
  id: string;
  content: string;
  senderUserId: string;
  senderName: string;
  createdAt: string;
  isRead: boolean;
  attachmentUrl?: string | null;
};

export function ChatThreadView({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageItem[];
}) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [otherUserStatus, setOtherUserStatus] = useState<"online" | "offline" | "away">("offline");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sync scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Format recording seconds
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Supabase Realtime Subscription setup (INSERT, UPDATE, Presence, Broadcast)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat_messages:${conversationId}`);
    channelRef.current = channel;

    // 1. Listen for new messages (INSERT)
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        const newMsg = payload.new as any;
        
        // Skip if message was sent by current user (optimistic UI already handles it)
        if (newMsg.senderUserId === currentUserId) return;

        // Skip duplicates
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          
          // Mark immediately as read if window/document is active
          if (document.hasFocus()) {
            void markChatReadAction(conversationId);
          }

          return [
            ...prev,
            {
              id: newMsg.id,
              content: newMsg.content,
              senderUserId: newMsg.senderUserId,
              senderName: "Other",
              createdAt: newMsg.createdAt,
              isRead: document.hasFocus() ? true : newMsg.isRead,
              attachmentUrl: newMsg.attachmentUrl,
            },
          ];
        });
      }
    );

    // 2. Listen for read receipts (UPDATE)
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        const updatedMsg = payload.new as any;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMsg.id ? { ...m, isRead: updatedMsg.isRead } : m
          )
        );
      }
    );

    // 3. Listen for typing indicators via Broadcast
    channel.on("broadcast", { event: "typing" }, (payload) => {
      const data = payload.payload;
      if (data.userId !== currentUserId) {
        setIsOtherUserTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 3000);
        }
      }
    });

    // 4. Presence sync (Online, Offline, Away status tracking)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        const otherUser = users.find((u) => u.userId !== currentUserId);
        if (otherUser) {
          setOtherUserStatus(otherUser.status || "online");
        } else {
          setOtherUserStatus("offline");
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUserId,
            status: document.visibilityState === "hidden" ? "away" : "online",
          });
        }
      });

    // Mark existing messages as read on view mount
    void markChatReadAction(conversationId);

    // visibility/focus listener to update presence state and trigger read updates
    const handleVisibilityChange = () => {
      const status = document.visibilityState === "hidden" ? "away" : "online";
      void channel.track({ userId: currentUserId, status });
      if (document.visibilityState === "visible") {
        void markChatReadAction(conversationId);
      }
    };

    const handleFocus = () => {
      void markChatReadAction(conversationId);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Send typing event broadcast when user types
  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 2000) {
      lastTypingTimeRef.current = now;
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping: true },
      });
    }
  };

  // Helper to post message with attachment URL
  const sendAttachmentMessage = async (content: string, url: string) => {
    const tempId = `temp-${Date.now()}`;
    const newMsg: MessageItem = {
      id: tempId,
      content,
      senderUserId: currentUserId,
      senderName: "You",
      createdAt: new Date().toISOString(),
      isRead: false,
      attachmentUrl: url,
    };

    setMessages((prev) => [...prev, newMsg]);

    startTransition(async () => {
      const res = await postChatMessageAction(conversationId, content, url);
      if (!res.success) {
        alert(res.error || "Failed to send attachment");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  };

  // File Upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Files must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: "chat",
          contentType: file.type,
          filename: file.name,
          conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await res.json();

      // 2. PUT file directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to S3");

      // 3. Post chat message with S3 attachment URL
      await sendAttachmentMessage(file.name, fileUrl);
    } catch (err: any) {
      alert(err.message || "File upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Audio Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioChunksRef.current.length > 0) {
          await handleAudioUpload(audioBlob);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (e) {
      alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const filename = "voice_note.webm";
      // 1. Get presigned URL
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: "chat",
          contentType: "audio/webm",
          filename,
          conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await res.json();

      // 2. PUT directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: audioBlob,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload voice note");

      // 3. Post message
      await sendAttachmentMessage("Voice Note", fileUrl);
    } catch (err: any) {
      alert(err.message || "Voice note upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isPending) return;

    const content = text;
    setText("");

    // Broadcast typing = false immediately when sending
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, isTyping: false },
    });

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    const newMsg: MessageItem = {
      id: tempId,
      content,
      senderUserId: currentUserId,
      senderName: "You",
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    startTransition(async () => {
      const res = await postChatMessageAction(conversationId, content);
      if (!res.success) {
        alert(res.error || "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  }

  // Check file type for rendering
  const renderAttachment = (url: string, content: string) => {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url) || url.includes("image/");
    const isAudio = /\.(webm|mp3|wav|aac|ogg|mp4|m4a)$/i.test(url) || url.includes("audio/");

    if (isImage) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border-2 border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <img src={url} alt="chat attachment" className="max-h-60 max-w-full object-contain" />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="mt-2">
          <audio src={url} controls className="max-w-full rounded-lg border border-slate-300" />
        </div>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50"
      >
        <FileText size={14} className="text-slate-500" />
        <span>View File ({content})</span>
      </a>
    );
  };

  return (
    <div className="neu-card flex flex-col h-[520px] bg-white p-4">
      {/* Presence and status bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${
            otherUserStatus === "online" 
              ? "bg-[#22C55E]" 
              : otherUserStatus === "away" 
                ? "bg-[#F59E0B]" 
                : "bg-slate-300"
          }`} />
          <span className="capitalize">{otherUserStatus}</span>
        </div>
        {isOtherUserTyping && (
          <span className="text-[#22C55E] animate-pulse font-extrabold">typing...</span>
        )}
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-12">
            No messages yet. Send a message to start chatting!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUserId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl border-2 border-[#0F172A] px-4 py-2.5 text-xs font-semibold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
                    isMe
                      ? "bg-[#DCFCE7] text-[#0F172A]"
                      : "bg-[#E0F2FE] text-[#0F172A]"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.attachmentUrl && renderAttachment(msg.attachmentUrl, msg.content)}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 px-1 flex items-center gap-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe && !msg.id.startsWith("temp-") && (
                    <span className="flex items-center gap-0.5 ml-1">
                      {msg.isRead ? (
                        <>
                          <CheckCheck size={12} className="text-[#22C55E]" />
                          <span className="text-[9px] text-[#22C55E]">Seen</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} className="text-slate-300" />
                          <span className="text-[9px] text-slate-400">Sent</span>
                        </>
                      )}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload loader */}
      {isUploading && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 animate-pulse bg-slate-50 border border-slate-100 rounded-xl mb-2">
          <Loader2 size={12} className="animate-spin" />
          <span>Uploading attachment...</span>
        </div>
      )}

      {/* Input bar */}
      <div className="mt-3 pt-3 border-t-2 border-slate-100">
        {isRecording ? (
          <div className="flex items-center justify-between bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 animate-pulse">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>Recording Voice Note: {formatTime(recordingSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="rounded-xl border border-red-300 bg-white p-2 hover:bg-red-100 text-red-500 shadow-[1.5px_1.5px_0px_0px_rgba(239,68,68,1)] transition-all"
                title="Cancel Recording"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={stopRecording}
                className="rounded-xl border border-red-500 bg-red-500 p-2 hover:bg-red-600 text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all"
                title="Stop & Send"
              >
                <Square size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Attachment inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="neu-btn neu-btn-white p-2.5 shrink-0"
              title="Attach File"
            >
              <Paperclip size={14} />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="neu-input flex-1 text-xs py-2.5"
              disabled={isPending}
            />

            <button
              type="button"
              onClick={startRecording}
              disabled={isPending}
              className="neu-btn neu-btn-white p-2.5 shrink-0"
              title="Record Voice Note"
            >
              <Mic size={14} />
            </button>

            <button
              type="submit"
              disabled={!text.trim() || isPending}
              className="neu-btn neu-btn-primary px-4 py-2.5 text-xs shrink-0"
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
