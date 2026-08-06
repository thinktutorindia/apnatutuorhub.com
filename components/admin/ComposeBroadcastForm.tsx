"use client";

import { useActionState, useState } from "react";
import { Bell, CheckCircle2, GraduationCap, Radio, Send, Users } from "lucide-react";
import { adminBroadcastAction } from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";

export function ComposeBroadcastForm() {
  const [state, formAction, isPending] = useActionState(adminBroadcastAction, {
    success: false,
  });

  const [target, setTarget] = useState<"ALL" | "PARENTS" | "TUTORS">("ALL");

  return (
    <div className="rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={16} style={{ color: "#22C55E" }} />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Compose Platform Broadcast (Push + Email + Bell)
          </h2>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/20">
          Live Broadcast
        </span>
      </div>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && state.data && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={16} />
          <span>Broadcast and VAPID Web Push dispatched successfully to {state.data.sent} user accounts!</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Target Audience Selection */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white">
            Audience
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "ALL", label: "All Users", icon: Users, color: "#3B82F6" },
              { value: "PARENTS", label: "Parents", icon: GraduationCap, color: "#8B5CF6" },
              { value: "TUTORS", label: "Tutors", icon: Bell, color: "#22C55E" },
            ].map(({ value, label, icon: Icon, color }) => (
              <label
                key={value}
                onClick={() => setTarget(value as "ALL" | "PARENTS" | "TUTORS")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-3 py-3 transition-all ${
                  target === value ? "ring-2 ring-emerald-500 border-emerald-500 bg-slate-800" : ""
                }`}
                style={{
                  background: target === value ? "#1E293B" : "#1E293B",
                  border: target === value ? "1px solid #22C55E" : "1px solid #334155",
                }}
              >
                <input
                  type="radio"
                  name="target"
                  value={value}
                  checked={target === value}
                  onChange={() => setTarget(value as "ALL" | "PARENTS" | "TUTORS")}
                  className="sr-only"
                />
                <Icon size={16} style={{ color }} />
                <span className="text-xs font-medium text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Notification Title
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Platform Maintenance on Sunday"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Message Body
          </label>
          <textarea
            name="message"
            required
            rows={4}
            placeholder="Write your announcement here..."
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#1E293B", border: "1px solid #334155" }}
          />
        </div>

        {/* Action URL */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-white">
            Link URL{" "}
            <span style={{ color: "#475569", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            name="actionUrl"
            type="text"
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
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
          }}
        >
          {isPending ? (
            "Dispatching Broadcast & Web Push..."
          ) : (
            <>
              <Send size={15} />
              <span>Send Broadcast & VAPID Web Push</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
