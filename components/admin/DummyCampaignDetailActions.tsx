"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, Zap, Loader2 } from "lucide-react";
import {
  toggleCampaignStatusAction,
  triggerCampaignNowAction,
} from "@/app/actions/dummy-campaign.actions";

interface Props {
  campaignId: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
}

export function DummyCampaignDetailActions({ campaignId, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleStatus = (newStatus: "ACTIVE" | "PAUSED" | "STOPPED") => {
    startTransition(async () => {
      const r = await toggleCampaignStatusAction(campaignId, newStatus);
      if (r.success) {
        flash("success", `Campaign ${newStatus.toLowerCase()}`);
        router.refresh();
      } else {
        flash("error", r.error ?? "Failed");
      }
    });
  };

  const handleTrigger = () => {
    startTransition(async () => {
      const r = await triggerCampaignNowAction(campaignId);
      if (r.success) {
        flash("success", `✅ Sent ${r.data!.sent} to ${r.data!.usersProcessed} tutors`);
        router.refresh();
      } else {
        flash("error", r.error ?? "Trigger failed");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {(status === "DRAFT" || status === "PAUSED") && (
          <button
            onClick={() => handleStatus("ACTIVE")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {status === "PAUSED" ? "Resume" : "Activate"}
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            onClick={() => handleStatus("PAUSED")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
            Pause
          </button>
        )}
        {(status === "ACTIVE" || status === "PAUSED") && (
          <button
            onClick={() => handleStatus("STOPPED")}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-extrabold transition-all disabled:opacity-50"
          >
            <Square size={12} /> Stop
          </button>
        )}
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          Fire Now
        </button>
      </div>
      {msg && (
        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
