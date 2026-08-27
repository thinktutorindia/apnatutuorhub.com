"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLeadRefundAction } from "@/app/actions/wallet.actions";

export function RequestLeadRefundButton({
  purchaseId,
  purchasedAt,
}: {
  purchaseId: string;
  purchasedAt?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const withinWindow =
    !purchasedAt ||
    Date.now() - new Date(purchasedAt).getTime() <= 48 * 60 * 60 * 1000;

  if (!withinWindow || done) {
    return done ? (
      <span className="text-[11px] font-800 text-emerald-800">Refund requested</span>
    ) : null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await requestLeadRefundAction(purchaseId);
            if (!res.success) {
              setMessage(res.error || "Could not submit refund request.");
              return;
            }
            setDone(true);
            router.refresh();
          });
        }}
        className="text-[11px] font-800 text-rose-800 hover:underline disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Report unreachable — refund"}
      </button>
      {message && <p className="text-[10px] font-700 text-rose-700 max-w-[180px] text-right">{message}</p>}
    </div>
  );
}
