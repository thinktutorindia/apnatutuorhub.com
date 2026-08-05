"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { sendTestEmailAction } from "@/app/actions/notification.actions";

export function SendTestEmailForm({ currentUserEmail }: { currentUserEmail?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const res = await sendTestEmailAction(formData);

    setLoading(false);
    if (res.success && res.data) {
      setResult({
        success: true,
        message: `Test email sent successfully to ${res.data.recipient}! Check your inbox or spam folder.`,
      });
      (e.target as HTMLFormElement).reset();
    } else {
      setResult({
        success: false,
        message: res.error || "Failed to send test email.",
      });
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#0F172A", border: "1px solid #1E293B" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Mail size={16} style={{ color: "#22C55E" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Send Test Email
            </h2>
            <p className="text-xs" style={{ color: "#475569" }}>
              Verify Resend API integration by dispatching a test email directly from the panel.
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}
        >
          Resend API Active
        </span>
      </div>

      {result && (
        <div
          className="mb-5 flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-medium"
          style={{
            background: result.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.success ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            color: result.success ? "#22C55E" : "#EF4444",
          }}
        >
          {result.success ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Recipient Email
          </label>
          <input
            name="recipientEmail"
            type="email"
            required
            defaultValue={currentUserEmail ?? ""}
            placeholder="e.g. admin@example.com"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Email Subject
          </label>
          <input
            name="subject"
            type="text"
            required
            defaultValue="ApnaTutorHub Resend Integration Test"
            placeholder="e.g. Test Email from Admin Panel"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Message Body
          </label>
          <textarea
            name="message"
            required
            rows={3}
            defaultValue="Hello! This is a test email sent from the ApnaTutorHub Admin Dashboard to confirm that Resend email delivery is working properly."
            placeholder="Enter test message body..."
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 15px rgba(34,197,94,0.3)" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {loading ? "Sending Email..." : "Send Test Email"}
        </button>
      </form>
    </div>
  );
}
