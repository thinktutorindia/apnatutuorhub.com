/**
 * READ-ONLY weekly report: rejected saves, fallbacks, rate-limit hits, opt-outs,
 * stuck threads and failed deliveries. No DB writes, no sends.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/weekly_whatsapp_report.ts
 */
import { prisma } from "../lib/prisma";
import { aggregateWeekly } from "../lib/whatsapp-bot/pipeline/monitoring";
import * as fs from "fs";

async function main() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [outcomes, rejectedSaves, failed] = await Promise.all([
    prisma.whatsappReplyOutcome.findMany({ where: { createdAt: { gte: since } }, select: { decision: true, reason: true, fallbackUsed: true, channel: true, createdAt: true } }),
    prisma.whatsappRejectedSave.findMany({ where: { createdAt: { gte: since } }, select: { field: true, reason: true, createdAt: true } }),
    prisma.notificationDelivery.findMany({ where: { status: "FAILED", createdAt: { gte: since } }, select: { errorMessage: true, createdAt: true } }),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    since: since.toISOString(),
    ...aggregateWeekly({
      outcomes,
      rejectedSaves,
      failedDeliveries: failed.map((f) => ({ reason: f.errorMessage ?? "unknown", createdAt: f.createdAt })),
    }),
    totalOutcomes: outcomes.length,
    totalRejectedSaves: rejectedSaves.length,
    totalFailedDeliveries: failed.length,
  };

  console.log(JSON.stringify(report, null, 2));
  fs.mkdirSync("exports", { recursive: true });
  fs.writeFileSync("exports/weekly_whatsapp_report.json", JSON.stringify(report, null, 2), "utf8");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
