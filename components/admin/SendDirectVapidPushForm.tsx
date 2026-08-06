"use client";

import { useActionState, useState } from "react";
import { Bell, CheckCircle2, Send, Zap } from "lucide-react";
import { sendDirectVapidPushAction } from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";

export function SendDirectVapidPushForm() {
  const [state, formAction, isPending] = useActionState(sendDirectVapidPushAction, {
    success: false,
  });

  const [recipientEmail, setRecipientEmail] = useState("youhubteam@gmail.com");

  return (
    <div className="rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: "#EAB308" }} />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Direct VAPID Web Push Dispatcher
          </h2>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-500/20">
          Native Push
        </span>
      </div>

      <p className="mb-4 text-xs font-semibold text-slate-400">
        Send a real-time native browser push notification directly to any specific user by email.
      </p>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && state.data && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={16} />
          <span>VAPID Web Push sent successfully to {state.data.userEmail}!</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            User Email Address
          </label>
          <input
            name="recipientEmail"
            type="email"
            required
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="e.g. youhubteam@gmail.com"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Notification Title
          </label>
          <input
            name="title"
            type="text"
            required
            defaultValue="🎯 New Tuition Lead Alert!"
            placeholder="e.g. 🎯 New Tuition Lead Alert!"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Push Message Body
          </label>
          <textarea
            name="message"
            required
            rows={3}
            defaultValue="Class 10 Mathematics requirement posted in Sangam Vihar (110080). Budget: ₹500–₹800/hr."
            placeholder="Write the message that will pop up on the user's desktop or mobile..."
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Target Link URL <span style={{ color: "#475569" }}>(optional)</span>
          </label>
          <input
            name="actionUrl"
            type="text"
            defaultValue="/tutor/leads"
            placeholder="/tutor/leads or /parent/my-leads"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #EAB308, #CA8A04)",
            boxShadow: "0 4px 15px rgba(234,179,8,0.3)",
          }}
        >
          {isPending ? (
            "Sending Push..."
          ) : (
            <>
              <Bell size={15} />
              <span>Send Instant VAPID Web Push</span>
              <Send size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
