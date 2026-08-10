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
    <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-[#2D9E6B]">
            <Mail size={20} />
          </div>
          <div>
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Send Test Email
            </h2>
            <p className="text-xs font-600 text-slate-600">
              Verify Resend API integration by dispatching a test email directly from the panel
            </p>
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
          Resend API Active
        </span>
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-800 border ${
            result.success ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-red-100 text-red-950 border-red-300"
          }`}
        >
          {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-800 text-slate-900 mb-1">Recipient Email Address</label>
          <input
            type="email"
            name="recipientEmail"
            required
            defaultValue={currentUserEmail || ""}
            placeholder="admin@apnatutorhub.com"
            className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 text-slate-900 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        <div>
          <label className="block text-xs font-800 text-slate-900 mb-1">Email Template Preset</label>
          <select
            name="templateType"
            className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-800 text-slate-900 bg-white outline-none"
          >
            <option value="KYC_APPROVED">KYC Approved Verification Email</option>
            <option value="LEAD_MATCH">New Lead Notification Alert</option>
            <option value="COIN_PURCHASE">Coin Purchase Invoice Receipt</option>
            <option value="GENERAL">General System Announcement</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Sending Mailer...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Dispatch Test Mailer</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
