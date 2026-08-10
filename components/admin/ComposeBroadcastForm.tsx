"use client";

import { useActionState, useState } from "react";
import { Bell, CheckCircle2, GraduationCap, Radio, Send, Users } from "lucide-react";
import { adminBroadcastAction } from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";

export function ComposeBroadcastForm() {
  const [state, formAction, isPending] = useActionState(adminBroadcastAction, {
    success: false,
  });

  const [target, setTarget] = useState<"ALL" | "PARENTS" | "TUTORS">("ALL");

  return (
    <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-5">
      <ActionOverlay
        isOpen={isPending}
        title="Dispatching Broadcast"
        subtitle="Sending push notifications, emails, and in-app alerts..."
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-[#2D9E6B]" />
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Compose Platform Broadcast (Push + Email + Bell)
          </h2>
        </div>
        <span className="rounded-full bg-emerald-100 text-emerald-950 px-3 py-1 text-xs font-800 border border-emerald-300">
          Live Broadcast
        </span>
      </div>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && state.data && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 p-4 text-xs font-800 text-emerald-950 border border-emerald-300">
          <CheckCircle2 size={16} />
          <span>Broadcast dispatched successfully to {state.data.sent} user accounts!</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Target Audience Selection */}
        <div>
          <label className="mb-1.5 block text-xs font-800 text-slate-900">
            Target Audience
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5">
            {[
              { value: "ALL", label: "All Users", icon: Users },
              { value: "PARENTS", label: "Parents", icon: GraduationCap },
              { value: "TUTORS", label: "Tutors", icon: Bell },
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                onClick={() => setTarget(value as "ALL" | "PARENTS" | "TUTORS")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-3.5 transition-all border ${
                  target === value ? "bg-emerald-50 border-[#2D9E6B] text-[#2D9E6B] font-800 shadow-xs" : "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 font-700"
                }`}
              >
                <input
                  type="radio"
                  name="target"
                  value={value}
                  checked={target === value}
                  onChange={() => {}}
                  className="sr-only"
                />
                <Icon size={18} />
                <span className="text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-800 text-slate-900">
            Announcement Title
          </label>
          <input
            type="text"
            name="title"
            required
            maxLength={100}
            placeholder="e.g. New Feature Release / Weekend Special Discount"
            className="w-full h-11 rounded-2xl px-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        {/* Message Content */}
        <div>
          <label className="mb-1.5 block text-xs font-800 text-slate-900">
            Notification Message Body
          </label>
          <textarea
            name="message"
            required
            rows={4}
            maxLength={500}
            placeholder="Type your push notification and email broadcast message here..."
            className="w-full rounded-2xl p-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        {/* Link URL (Optional) */}
        <div>
          <label className="mb-1.5 block text-xs font-800 text-slate-900">
            Call-to-Action Link URL (Optional)
          </label>
          <input
            type="text"
            name="link"
            placeholder="/tutor/leads or /parent/post-requirement"
            className="w-full h-11 rounded-2xl px-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Send size={16} />
          <span>{isPending ? "Dispatching Broadcast..." : "Send Live Broadcast Now"}</span>
        </button>
      </form>
    </div>
  );
}
