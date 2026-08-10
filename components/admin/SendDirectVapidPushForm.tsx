"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Send, Zap } from "lucide-react";
import { sendDirectVapidPushAction } from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";

export function SendDirectVapidPushForm() {
  const [state, formAction, isPending] = useActionState(sendDirectVapidPushAction, {
    success: false,
  });

  const [recipientEmail, setRecipientEmail] = useState("youhubteam@gmail.com");

  return (
    <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-amber-600" />
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Direct VAPID Web Push Dispatcher
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 text-amber-950 px-3 py-1 text-xs font-800 border border-amber-300">
          Native Push
        </span>
      </div>

      <p className="text-xs font-600 text-slate-600">
        Send a real-time native browser push notification directly to any specific user by email.
      </p>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && state.data && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 p-4 text-xs font-800 text-emerald-950 border border-emerald-300">
          <CheckCircle2 size={16} />
          <span>VAPID Web Push sent successfully to {state.data.userEmail}!</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-800 text-slate-900">
            Target User Email Address
          </label>
          <input
            name="recipientEmail"
            type="email"
            required
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="e.g. youhubteam@gmail.com"
            className="w-full h-11 rounded-2xl px-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-800 text-slate-900">
            Notification Title
          </label>
          <input
            name="title"
            type="text"
            required
            defaultValue="ApnaTutorHub Alert ⚡"
            className="w-full h-11 rounded-2xl px-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-800 text-slate-900">
            Push Message Body
          </label>
          <textarea
            name="body"
            required
            rows={3}
            defaultValue="You have a new high-priority notification on ApnaTutorHub!"
            className="w-full rounded-2xl p-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Send size={16} />
          <span>{isPending ? "Sending Web Push..." : "Dispatch Direct VAPID Push"}</span>
        </button>
      </form>
    </div>
  );
}
