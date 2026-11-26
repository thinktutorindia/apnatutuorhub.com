/**
 * PRE-FILTER — pure decisions first, DB counters second.
 * Shadow-only: records outcomes, never sends anything.
 */
import { prisma } from "@/lib/prisma";

export type PrefilterDecision = {
  decision: "REPLY" | "SILENT";
  reason: string | null;
  unsubscribed?: boolean;
  reSubscribed?: boolean;
};

const BUSINESS_AUTO_REPLY =
  /\b(?:thank you for contacting|thank you for your message|thanks for reaching out|currently unavailable|we(?:'re| are) (?:currently )?unavailable|we are away|out of office|auto[- ]reply|will get back to you shortly|we'll respond as soon as possible)\b/i;
const QUOTED_ALERT =
  /(?:\[tuition enquiry|#\d{4,}|client:\s*|class:\s*|mode:\s*|location:\s*|budget:\s*|preference:\s*|reply stop to unsubscribe)/i;
const OPT_OUT =
  /\b(?:stop|unsubscribe|unsub|not interested|don't message|dont message|nahi chahiye|mat bhejo|msg mat karo|message mat karo|dobara mat bhejo|band karo)\b/i;
const RE_SUBSCRIBE = /^(?:start|menu|hi|hello|halo)$/i;
const BARE_ACK = /^(?:ok|okay|thanks|thank you|thx|👍|🙏)$/i;
const AFFIRMATIVE = /^(?:yes|haan|han|ha|1|2|interested|i am interested|i'm interested|ready|confirm|haan ji)$/i;

export type RecentText = { text: string; at?: Date | string };
const DUPLICATE_WINDOW_MS = 5_000;

export function evaluatePrefilter(input: {
  text: string;
  messageType?: string | null;
  messageId?: string | null;
  seenMessageIds?: Set<string>;
  recentTexts?: RecentText[];
  hasPendingQuestion?: boolean;
  alreadyUnsubscribed?: boolean;
  now?: Date;
}): PrefilterDecision {
  const text = (input.text ?? "").trim();
  const now = input.now ?? new Date();

  if (
    input.messageType === "reaction" ||
    /^\[reaction(?::.*)?\]$/i.test(text) ||
    /^reaction\b[\s\r\n]+\d{2}-\d{2}-\d{4}/i.test(text)
  ) {
    return { decision: "SILENT", reason: "reaction" };
  }
  if (/^\[(?:status|read|delivered|sent|failed)(?::.*)?\]$/i.test(text)) {
    return { decision: "SILENT", reason: "status_event" };
  }
  // Broadcast/pending replies are ALWAYS answered — never treated as noise.
  if (AFFIRMATIVE.test(text)) {
    return { decision: "REPLY", reason: "affirmative" };
  }
  if (input.messageId && input.seenMessageIds?.has(input.messageId)) {
    return { decision: "SILENT", reason: "duplicate_message_id" };
  }
  const isRecentDuplicate = input.recentTexts?.some((entry) => {
    if (entry.text.trim().toLowerCase() !== text.toLowerCase() || !text) return false;
    if (!entry.at) return false; // no timestamp → cannot prove it is within the window
    return now.getTime() - new Date(entry.at).getTime() <= DUPLICATE_WINDOW_MS;
  });
  if (isRecentDuplicate) {
    return { decision: "SILENT", reason: "duplicate_text" };
  }
  if (BUSINESS_AUTO_REPLY.test(text)) {
    return { decision: "SILENT", reason: "other_business_auto_reply" };
  }
  if (QUOTED_ALERT.test(text)) {
    return { decision: "SILENT", reason: "quoted_alert" };
  }
  const positiveOverride =
    /\b(?:i am interested|interested in|send (?:me )?lead|demo|ready)\b/i.test(text) &&
    !/\bnot interested\b/i.test(text);
  if (OPT_OUT.test(text) && !positiveOverride) {
    if (input.alreadyUnsubscribed) return { decision: "SILENT", reason: "opt_out", unsubscribed: true };
    // One confirmation reply, then silence on every subsequent message.
    return { decision: "REPLY", reason: "opt_out_confirmation", unsubscribed: true };
  }
  if (RE_SUBSCRIBE.test(text)) {
    return { decision: "REPLY", reason: null, reSubscribed: true };
  }
  if (BARE_ACK.test(text) && !input.hasPendingQuestion) {
    return { decision: "SILENT", reason: "bare_ack_no_pending" };
  }
  return { decision: "REPLY", reason: null };
}

/** Rate + repeat guard. Counters live in the DB so they survive restarts. */
export function rateLimitAllows(counter: {
  windowStart: Date;
  repliesInWindow: number;
  lastReplyText: string | null;
  lastReplyTextCount: number;
}, now = new Date(), replyText = ""): { allowed: boolean; reason: string | null } {
  const windowExpired = now.getTime() - counter.windowStart.getTime() > 10 * 60 * 1000;
  const inWindow = windowExpired ? 0 : counter.repliesInWindow;
  if (inWindow >= 5) return { allowed: false, reason: "rate_limit_5_per_10min" };
  if (replyText && counter.lastReplyText === replyText && counter.lastReplyTextCount >= 2) {
    return { allowed: false, reason: "repeat_text_limit" };
  }
  return { allowed: true, reason: null };
}

/** SHADOW ONLY: writes an outcome row; never sends a message. */
export async function recordOutcome(input: {
  phone: string;
  inboundMessageId?: string | null;
  decision: "REPLY" | "SILENT";
  reason?: string | null;
  fallbackUsed?: boolean;
  channel?: "TEXT" | "TEMPLATE" | "IMAGE";
  latencyMs?: number;
}): Promise<void> {
  await prisma.whatsappReplyOutcome.create({
    data: {
      phone: input.phone,
      inboundMessageId: input.inboundMessageId ?? null,
      decision: input.decision,
      reason: input.reason ?? null,
      fallbackUsed: input.fallbackUsed ?? false,
      channel: input.channel ?? null,
      latencyMs: input.latencyMs ?? null,
    },
  });
}
