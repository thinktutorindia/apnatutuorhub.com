/**
 * OUTBOUND GATE — every proactive send must check opt-out + the 24h window.
 * Pure evaluator plus a Prisma-backed checker. Approved template IDs are untouched.
 */
import { prisma } from "@/lib/prisma";
import type { AquaSendMode } from "@/lib/aqua-whatsapp";

export type OutboundDecision = {
  allowed: boolean;
  mode: AquaSendMode;
  reason: string | null;
};

export function evaluateOutbound(input: {
  unsubscribed: boolean;
  lastInboundAt: Date | null;
  now?: Date;
  mode: AquaSendMode;
  templateId?: string;
}): OutboundDecision {
  const now = input.now ?? new Date();
  if (input.unsubscribed) return { allowed: false, mode: input.mode, reason: "unsubscribed" };
  const withinWindow = input.lastInboundAt != null && now.getTime() - input.lastInboundAt.getTime() <= 24 * 60 * 60 * 1000;
  if (!withinWindow && input.mode !== "template") {
    return {
      allowed: true,
      mode: "template",
      reason: "24h_window_expired_use_template",
      ...(input.templateId ? {} : {}),
    };
  }
  return { allowed: true, mode: input.mode, reason: null };
}

/** Read-only DB check used by the low-level sender. */
export async function canSendWhatsApp(phone: string, mode: AquaSendMode): Promise<OutboundDecision> {
  const [session, lastInbound] = await Promise.all([
    prisma.whatsappSession.findUnique({ where: { phone }, select: { unsubscribed: true } }),
    prisma.whatsappChatMessage.findFirst({
      where: { phone, direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  return evaluateOutbound({
    unsubscribed: session?.unsubscribed ?? false,
    lastInboundAt: lastInbound?.createdAt ?? null,
    mode,
  });
}
