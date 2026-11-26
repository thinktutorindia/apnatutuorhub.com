/**
 * GET /api/cron/stuck-threads — every 30 minutes.
 * READ-ONLY chat scan. Records one SILENT outcome row per stuck thread;
 * it never sends a WhatsApp message.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStuckThreads, type LogMessage } from "@/lib/whatsapp-bot/pipeline/monitoring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";
  if ((isProd || cronSecret) && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [messages, silentSessions] = await Promise.all([
      prisma.whatsappChatMessage.findMany({
        where: { createdAt: { gte: since } },
        select: { phone: true, direction: true, body: true, createdAt: true, senderName: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.whatsappSession.findMany({ where: { unsubscribed: true }, select: { phone: true } }),
    ]);

    const silent = new Set(silentSessions.map((s) => s.phone));
    const stuck = findStuckThreads(messages as LogMessage[], new Date(), (phone) => silent.has(phone));

    for (const t of stuck) {
      await prisma.whatsappReplyOutcome.create({
        data: {
          phone: t.phone,
          decision: "SILENT",
          reason: "stuck_thread",
          channel: null,
          latencyMs: t.minutesWaiting * 60 * 1000,
        },
      });
    }

    return NextResponse.json({
      success: true,
      scannedMessages: messages.length,
      stuckThreads: stuck.length,
      threads: stuck.map((t) => ({ phone: t.phone, minutesWaiting: t.minutesWaiting })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/stuck-threads]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
