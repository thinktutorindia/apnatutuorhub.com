"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Smile,
  Paperclip,
  Check,
  Info,
  ShieldCheck,
  Zap,
  UserPlus,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  quickReplies?: string[];
}

export function WhatsAppChatbotSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_bot_msg",
      sender: "bot",
      text: `🙏 Welcome to *ApnaTutorHub*!\n\nWe connect parents with verified home tutors across India.\n\nPlease tell us who you are:\n\n1️⃣  *TUTOR* — I want to teach / find tuition work\n2️⃣  *PARENT* — I need a tutor for my child\n\nReply with *1* or *2*`,
      timestamp: "Just now",
      quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "What are your fees?", "Help & Info"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [phone, setPhone] = useState("919311459543");
  const [sessionData, setSessionData] = useState<Record<string, unknown>>({});
  const [currentStep, setCurrentStep] = useState("WELCOME");
  const [userRole, setUserRole] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user message to screen
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text,
        timestamp: timeStr,
      },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message: text,
          useAi,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: "bot",
            text: data.reply,
            timestamp: botTime,
            quickReplies: data.quickReplies || [],
          },
        ]);

        if (data.nextStep) setCurrentStep(data.nextStep);
        if (data.updatedData) setSessionData(data.updatedData);
        if (data.userType) setUserRole(data.userType);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "bot",
            text: `⚠️ *Error:* ${data.error || "Could not process message."}`,
            timestamp: timeStr,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "bot",
          text: `⚠️ *Connection Error:* ${err.message || "Failed to reach simulator."}`,
          timestamp: timeStr,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = async () => {
    setLoading(true);
    try {
      await fetch(`/api/chatbot/simulate?phone=${phone}`, { method: "DELETE" });
      setMessages([
        {
          id: `reset_${Date.now()}`,
          sender: "bot",
          text: `🙏 Welcome to *ApnaTutorHub*!\n\nWe connect parents with verified home tutors across India.\n\nPlease tell us who you are:\n\n1️⃣  *TUTOR* — I want to teach / find tuition work\n2️⃣  *PARENT* — I need a tutor for my child\n\nReply with *1* or *2*`,
          timestamp: "Just now",
          quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "What are your fees?", "Help & Info"],
        },
      ]);
      setSessionData({});
      setCurrentStep("WELCOME");
      setUserRole(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startNewUserSession = async () => {
    setLoading(true);
    try {
      const freshPhone = `91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      setPhone(freshPhone);
      await fetch(`/api/chatbot/simulate?phone=${freshPhone}`, { method: "DELETE" });
      setMessages([
        {
          id: `fresh_${Date.now()}`,
          sender: "bot",
          text: `🙏 Welcome to *ApnaTutorHub*!\n\nWe connect parents with verified home tutors across India.\n\nPlease tell us who you are:\n\n1️⃣  *TUTOR* — I want to teach / find tuition work\n2️⃣  *PARENT* — I need a tutor for my child\n\nReply with *1* or *2*`,
          timestamp: "Just now",
          quickReplies: ["1️⃣ I'm a Tutor", "2️⃣ I'm a Parent", "What are your fees?", "Help & Info"],
        },
      ]);
      setSessionData({});
      setCurrentStep("WELCOME");
      setUserRole(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsAppText = (text: string) => {
    // Basic WhatsApp formatting: *bold* -> <strong>, _italic_ -> <em>
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let formatted = line;
      // Bold
      formatted = formatted.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
      // Italics
      formatted = formatted.replace(/_([^_]+)_/g, "<em>$1</em>");
      return (
        <span key={idx} className="block min-h-[1rem]">
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* ── LEFT: PHONE SCREEN SIMULATOR ────────────────────────────────────── */}
      <div className="w-full xl:w-[460px] mx-auto shrink-0">
        <div className="relative mx-auto rounded-[42px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden h-[740px] flex flex-col">
          {/* Speaker / Camera Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-b-xl z-30 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#075E54] text-white pt-7 pb-3 px-4 flex items-center justify-between shadow-md z-20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-sm shadow-inner border border-emerald-400">
                  ATH
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                </div>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-sm text-white">ApnaTutorHub</h3>
                  <span className="bg-emerald-500/30 text-emerald-200 text-[9px] px-1 py-0.2 rounded font-semibold">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 font-medium">
                  {loading ? "typing..." : "online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Video className="w-4 h-4 cursor-pointer hover:text-white" />
              <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* WhatsApp Chat Area */}
          <div
            className="flex-1 overflow-y-auto p-3 space-y-3 relative"
            style={{
              backgroundColor: "#EFEAE2",
              backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          >
            {/* Encryption notice */}
            <div className="text-center my-1">
              <span className="inline-block bg-[#FFEECD] text-amber-900 text-[10px] font-medium px-3 py-1 rounded-lg shadow-xs max-w-[90%] border border-amber-200/60">
                🔒 Messages are end-to-end simulated via Meta Cloud API
              </span>
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"} space-y-1.5`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm relative leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#D9FDD3] text-slate-900 rounded-tr-xs"
                      : "bg-white text-slate-900 rounded-tl-xs border border-slate-200/50"
                  }`}
                >
                  <div className="text-slate-800 break-words whitespace-pre-wrap">
                    {formatWhatsAppText(m.text)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                    <span>{m.timestamp}</span>
                    {m.sender === "user" && (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                    )}
                  </div>
                </div>

                {/* Interactive Quick Reply Buttons (like Suraasa screenshot!) */}
                {m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[90%] mt-1">
                    {m.quickReplies.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => sendMessage(btn)}
                        disabled={loading}
                        className="bg-white/95 hover:bg-emerald-50 active:scale-95 text-[#075E54] hover:text-[#128C7E] font-semibold text-xs px-3 py-1.5 rounded-full border border-emerald-600/30 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{btn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2 w-fit shadow-xs border border-slate-200/50">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs text-slate-400 font-medium">AI thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp Message Input Bar */}
          <div className="bg-[#F0F2F5] p-2 flex items-center gap-2 border-t border-slate-200 shrink-0">
            <div className="flex-1 bg-white rounded-full flex items-center px-3 py-1.5 shadow-xs border border-slate-200">
              <Smile className="w-4 h-4 text-slate-400 mr-2 cursor-pointer hover:text-slate-600" />
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={loading}
                className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <Paperclip className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
                input.trim() && !loading
                  ? "bg-[#00A884] hover:bg-[#068f70] active:scale-95 cursor-pointer"
                  : "bg-slate-400 opacity-60 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: SIMULATOR CONTROL PANEL & SESSION INSPECTOR ──────────────── */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Bot className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">WhatsApp Chatbot Live Sandbox</h1>
                  <p className="text-xs text-slate-500">
                    Test the AI-trained bot live in your browser before users interact on WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={startNewUserSession}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Test as New User (Fresh Phone)
              </button>
              <button
                onClick={resetSession}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Chat
              </button>
            </div>
          </div>

          {/* AI Mode vs Rule-Based Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {useAi ? "Gemini 3.6 Flash AI Engine (Active)" : "Standard Rule-Based State Machine"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {useAi
                    ? "Understands Hinglish, free-form queries, auto-extracts fields, answers FAQs"
                    : "Strict 1-2 numbering and step-by-step questions only"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setUseAi(!useAi)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                useAi
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {useAi ? "AI Mode: ON" : "AI Mode: OFF"}
            </button>
          </div>

          {/* Preset Prompts to Test Quickly */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              ⚡ Quick Test Prompts (Tap to test)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Hi",
                "1",
                "2",
                "Mujhe class 10 ke liye maths science tutor chahiye Dwarka me",
                "I am a physics tutor with 5 years experience in Janakpuri",
                "What are your tuition fees?",
                "Is demo class free?",
                "How do tutors get verified?",
                "MENU",
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(p)}
                  disabled={loading}
                  className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Session Inspector Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Live Session Inspector (Backend State)
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Phone: {phone}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Step</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{currentStep}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Detected Role</span>
              <span className="text-xs font-bold text-slate-800">
                {userRole ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      userRole === "TUTOR"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {userRole}
                  </span>
                ) : (
                  "Not determined"
                )}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fields Extracted</span>
              <span className="text-xs font-bold text-slate-800">
                {Object.keys(sessionData).length} fields
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Extracted Lead / Profile Data (JSON):
            </span>
            <pre className="bg-slate-900 text-emerald-400 rounded-xl p-3 text-xs font-mono overflow-auto flex-1 max-h-[300px] border border-slate-800">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
