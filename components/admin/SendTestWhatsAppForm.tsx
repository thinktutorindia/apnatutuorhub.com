"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, MessageCircle, ShieldAlert } from "lucide-react";
import {
  probeAquaWhatsAppLoginAction,
  sendTestWhatsAppAction,
  type TestWhatsAppResult,
} from "@/app/actions/notification.actions";
import { FormAlert } from "@/components/ui/FieldError";
import type { AquaWhatsAppStatus } from "@/lib/aqua-whatsapp";
import { AQUA_TUITION_ENQUIRY_SAMPLE_PLACEHOLDERS } from "@/lib/lead-notify-template";

const initialState: TestWhatsAppResult = { success: false };

export function SendTestWhatsAppForm({ status }: { status: AquaWhatsAppStatus }) {
  const [state, formAction, isPending] = useActionState(sendTestWhatsAppAction, initialState);
  const [mode, setMode] = useState<"template" | "text">("template");
  const [probeMsg, setProbeMsg] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);

  const remaining = state.success && state.data ? state.data.dailyRemaining : status.dailyRemaining;
  const canSubmit = status.enabled && status.hasSystemToken && status.hasFromNumber && remaining > 0;

  async function handleProbe() {
    setProbing(true);
    setProbeMsg(null);
    const res = await probeAquaWhatsAppLoginAction();
    setProbing(false);
    setProbeMsg(res.data?.message ?? res.error ?? "Probe finished.");
  }

  return (
    <div className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-[#2D9E6B]">
            <MessageCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              Aqua SMS WhatsApp Test
            </h2>
            <p className="text-xs font-600 text-slate-600">
              One-at-a-time demo send. Daily cap {status.dailyTestCap}. India Utility ≈ ₹{status.estimatedUtilityInr.toFixed(2)}
            </p>
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
          {remaining} / {status.dailyTestCap} left today
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-700 text-slate-700">
        <StatusChip ok={status.enabled} label="Enabled" />
        <StatusChip ok={status.hasSystemToken} label="System token" />
        <StatusChip ok={status.hasFromNumber} label={status.fromNumberMasked ? `WABA ${status.fromNumberMasked}` : "WABA number"} />
        <StatusChip ok={status.hasTemplateId} label="Template id" />
      </div>

      {status.blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-800 text-amber-950">
            <ShieldAlert size={16} />
            Ready to integrate — Aqua still needs these before a paid send
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] font-600 text-amber-950">
            {status.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && state.data && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 p-4 text-xs font-800 text-emerald-950 border border-emerald-300">
          <CheckCircle2 size={16} />
          <span>
            Sent to {state.data.recipient}
            {state.data.billedEstimateInr != null ? ` · ~₹${state.data.billedEstimateInr.toFixed(2)}` : ""}
            {state.data.providerMessageId ? ` · id ${state.data.providerMessageId}` : ""}
          </span>
        </div>
      )}
      {probeMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-700 text-slate-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{probeMsg}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-800 text-slate-900 mb-1">Recipient WhatsApp (India)</label>
          <input
            name="recipientPhone"
            type="tel"
            required
            placeholder="98765 43210"
            className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 text-slate-900 outline-none focus:border-[#2D9E6B]"
          />
        </div>

        <div>
          <label className="block text-xs font-800 text-slate-900 mb-1">Send mode</label>
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "template" | "text")}
            className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-800 text-slate-900 bg-white outline-none"
          >
            <option value="template">Approved Utility template (~₹{status.estimatedUtilityInr.toFixed(2)})</option>
            <option value="text">Session text (only if the user already messaged you)</option>
          </select>
        </div>

        {mode === "template" ? (
          <>
            <div>
              <label className="block text-xs font-800 text-slate-900 mb-1">Template id</label>
              <input
                name="templateId"
                type="text"
                placeholder="Paste approved template id from Aqua SMS"
                className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 text-slate-900 outline-none focus:border-[#2D9E6B]"
              />
            </div>
            <div>
              <label className="block text-xs font-800 text-slate-900 mb-1">
                Enquiry placeholders (one per line, {"{{1}}"}–{"{{8}}"})
              </label>
              <textarea
                name="placeholders"
                rows={8}
                defaultValue={AQUA_TUITION_ENQUIRY_SAMPLE_PLACEHOLDERS.join("\n")}
                className="w-full rounded-2xl p-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B] font-mono"
              />
              <p className="mt-1 text-[10px] font-600 text-slate-500">
                Matches tuition_enquiry_alert: enquiry #, client, class, mode, location, fees, gender, schedule.
              </p>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-800 text-slate-900 mb-1">Session message</label>
            <textarea
              name="message"
              rows={3}
              placeholder="ApnaTutorHub test — please ignore."
              className="w-full rounded-2xl p-4 text-xs font-700 text-slate-900 border border-slate-300 outline-none focus:border-[#2D9E6B]"
            />
          </div>
        )}

        <label className="flex items-start gap-2 text-[11px] font-700 text-slate-700">
          <input type="checkbox" name="confirmSpend" value="yes" required className="mt-0.5" />
          <span>
            I understand this spends about ₹{status.estimatedUtilityInr.toFixed(2)} from the ₹10 demo wallet and will not send a campaign.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="flex-1 h-11 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-800 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            {isPending ? "Sending one test…" : "Send 1 test WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => void handleProbe()}
            disabled={probing}
            className="h-11 px-4 rounded-2xl border border-slate-300 text-xs font-800 text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            {probing ? "Probing…" : "Probe login (free)"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 border ${
        ok
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {ok ? "●" : "○"} {label}
    </span>
  );
}
