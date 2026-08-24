"use client";

import { useActionState, useState } from "react";
import { Bell, CheckCircle2, GraduationCap, Radio, Send, Users, Sparkles, Mail, Bot, BellOff, ShieldAlert } from "lucide-react";
import { adminBroadcastAction } from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";

export function ComposeBroadcastForm() {
  const [state, formAction, isPending] = useActionState(adminBroadcastAction, {
    success: false,
  });

  const [target, setTarget] = useState<"ALL" | "PARENTS" | "TUTORS">("ALL");
  const [emailFilter, setEmailFilter] = useState<"GENUINE_ONLY" | "ALL" | "AUTO_GENERATED_ONLY" | "SKIP_EMAIL">("GENUINE_ONLY");

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

      <form action={formAction} className="space-y-5">
        {/* Target Role Selection */}
        <div>
          <label className="mb-1.5 block text-xs font-800 text-slate-900">
            Target Role Audience
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5">
            {[
              { value: "ALL", label: "All Roles (Parents + Tutors)", icon: Users },
              { value: "PARENTS", label: "Parents Only", icon: GraduationCap },
              { value: "TUTORS", label: "Tutors Only", icon: Bell },
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                onClick={() => setTarget(value as "ALL" | "PARENTS" | "TUTORS")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-3.5 transition-all border ${
                  target === value
                    ? "bg-emerald-50 border-[#2D9E6B] text-[#2D9E6B] font-800 shadow-xs"
                    : "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 font-700"
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

        {/* Email Quota Saver & Recipient Filter */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-extrabold text-[#0F2540]">
              Email Dispatch &amp; Quota Protection Strategy
            </label>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              ⚡ Quota Guard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              {
                value: "GENUINE_ONLY",
                title: "✨ Genuine Emails Only",
                subtitle: "Sends only to real Gmail, Yahoo, Outlook, etc. (Saves Resend quota & prevents bounces on test accounts)",
                icon: Sparkles,
                recommended: true,
                badge: "Recommended",
              },
              {
                value: "ALL",
                title: "🌐 All Registered Accounts",
                subtitle: "Sends to all users including auto-assigned @apnatutorhub.com placeholder accounts",
                icon: Mail,
              },
              {
                value: "AUTO_GENERATED_ONLY",
                title: "🤖 Auto-Assigned Test Accounts",
                subtitle: "Sends only to @apnatutorhub.com dummy accounts for testing and simulations",
                icon: Bot,
              },
              {
                value: "SKIP_EMAIL",
                title: "🔕 In-App Bell + Web Push Only",
                subtitle: "Skips email dispatch completely — consumes 0 email credits!",
                icon: BellOff,
              },
            ].map((opt) => (
              <label
                key={opt.value}
                onClick={() => setEmailFilter(opt.value as any)}
                className={`flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 border transition-all ${
                  emailFilter === opt.value
                    ? "bg-white border-[#2D9E6B] shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-white/80 border-slate-200 hover:bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="emailFilter"
                  value={opt.value}
                  checked={emailFilter === opt.value}
                  onChange={() => {}}
                  className="sr-only"
                />
                <opt.icon
                  size={16}
                  className={`shrink-0 mt-0.5 ${
                    emailFilter === opt.value ? "text-[#2D9E6B]" : "text-slate-400"
                  }`}
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900">{opt.title}</span>
                    {opt.badge && (
                      <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-snug">
                    {opt.subtitle}
                  </p>
                </div>
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
            name="actionUrl"
            placeholder="/tutor/leads or /parent/post-requirement"
            className="w-full h-11 rounded-2xl px-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          <Send size={16} />
          <span>{isPending ? "Dispatching Broadcast..." : "Send Live Broadcast Now"}</span>
        </button>
      </form>
    </div>
  );
}
