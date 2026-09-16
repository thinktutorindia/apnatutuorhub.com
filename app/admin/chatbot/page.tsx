import { Metadata } from "next";
import { WhatsAppChatbotSimulator } from "@/components/admin/WhatsAppChatbotSimulator";

export const metadata: Metadata = {
  title: "WhatsApp Chatbot Simulator — ApnaTutorHub Admin",
  description: "Live interactive simulator and Gemini AI training tester for ApnaTutorHub WhatsApp Chatbot.",
};

export default function AdminChatbotPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">WhatsApp Chatbot Simulator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Test live conversation flows, quick-reply buttons, and Gemini AI intent extraction before deploying changes to live WhatsApp.
        </p>
      </div>

      <WhatsAppChatbotSimulator />
    </div>
  );
}
