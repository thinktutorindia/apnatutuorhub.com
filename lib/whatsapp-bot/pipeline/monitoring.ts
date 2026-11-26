/**
 * MONITORING — pure helpers for stuck-thread detection and the weekly report.
 * No DB/network/sends. The cron route and report script supply the data.
 */
export type LogMessage = {
  phone: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  createdAt: Date | string;
  senderName?: string | null;
  status?: string | null;
};

export type StuckThread = {
  phone: string;
  lastInboundAt: Date;
  minutesWaiting: number;
};

const SILENT_BODY = /^\[(?:reaction|status|read|delivered|sent|failed)(?::.*)?\]$/i;
const OPT_OUT = /\b(?:stop|unsubscribe|not interested|don't message|nahi chahiye)\b/i;

export function findStuckThreads(
  messages: LogMessage[],
  now = new Date(),
  intentionallySilent: (phone: string) => boolean = () => false
): StuckThread[] {
  const byPhone = new Map<string, LogMessage[]>();
  for (const m of messages) {
    const arr = byPhone.get(m.phone) ?? [];
    arr.push(m);
    byPhone.set(m.phone, arr);
  }

  const out: StuckThread[] = [];
  for (const [phone, arr] of byPhone) {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const last = arr[arr.length - 1];
    if (last.direction !== "INBOUND") continue;
    if (SILENT_BODY.test(last.body.trim()) || OPT_OUT.test(last.body)) continue;
    if (intentionallySilent(phone)) continue;
    const minutes = Math.floor((now.getTime() - new Date(last.createdAt).getTime()) / 60000);
    if (minutes < 30) continue;
    out.push({ phone, lastInboundAt: new Date(last.createdAt), minutesWaiting: minutes });
  }
  return out.sort((a, b) => b.minutesWaiting - a.minutesWaiting);
}

export type WeeklyInput = {
  outcomes: Array<{ decision: string; reason: string | null; fallbackUsed: boolean; channel: string | null; createdAt: Date | string }>;
  rejectedSaves: Array<{ field: string; reason: string; createdAt: Date | string }>;
  failedDeliveries: Array<{ reason: string; createdAt: Date | string }>;
};

export function aggregateWeekly(input: WeeklyInput) {
  const count = <T>(items: T[], key: (x: T) => string) => {
    const m: Record<string, number> = {};
    for (const i of items) { const k = key(i) || "unknown"; m[k] = (m[k] ?? 0) + 1; }
    return m;
  };
  return {
    outcomesByDecision: count(input.outcomes, (o) => o.decision),
    silentReasons: count(input.outcomes.filter((o) => o.decision === "SILENT"), (o) => o.reason ?? "unknown"),
    fallbackUsed: input.outcomes.filter((o) => o.fallbackUsed).length,
    templateVsText: count(input.outcomes, (o) => o.channel ?? "none"),
    rejectedSavesByField: count(input.rejectedSaves, (r) => r.field),
    rejectedSaveReasons: count(input.rejectedSaves, (r) => r.reason.split(":")[0]),
    failedDeliveriesByReason: count(input.failedDeliveries, (f) => f.reason),
  };
}
