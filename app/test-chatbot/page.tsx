import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, MessageCircle } from "lucide-react";
import { WhatsAppChatbotSimulator } from "@/components/admin/WhatsAppChatbotSimulator";

export const metadata: Metadata = {
  title: "WhatsApp Chatbot Live Sandbox — ApnaTutorHub",
  description: "Test the ApnaTutorHub WhatsApp AI Chatbot directly in your browser.",
};

export default function StandaloneChatbotTestPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                <MessageCircle className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-none">
                  ApnaTutorHub WhatsApp AI Chatbot
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">Live Interactive Testing Sandbox</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini 3.6 Flash Active
            </span>
            <Link
              href="/admin/chatbot"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
            >
              Admin Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Simulator Content */}
      <main className="py-6 px-2 sm:px-4">
        <WhatsAppChatbotSimulator />
      </main>
    </div>
  );
}
