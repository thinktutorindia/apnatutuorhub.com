/**
 * Read live WhatsApp threads and surface chatbot mismatch / loop patterns.
 * Run: npx tsx scripts/analyze_chatbot_failures.ts
 */
import { prisma } from "../lib/prisma";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

function maskPhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length >= 10 ? `…${d.slice(-4)}` : "…????";
}

function snippet(s: string, n = 140) {
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

async function main() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const repeatedBot = await prisma.$queryRaw<
    Array<{ phone: string; body: string; n: bigint }>
  >`
    SELECT phone, body, COUNT(*)::bigint AS n
    FROM whatsapp_chat_messages
    WHERE direction = 'OUTBOUND'
      AND "createdAt" > ${since}
      AND (
        "senderName" ILIKE '%bot%'
        OR step IS NOT NULL
      )
      AND (
        body ILIKE '%kaunsi class%'
        OR body ILIKE '%kaunse subject%'
        OR body ILIKE '%padhate ho%'
        OR body ILIKE '%padhate hain%'
        OR body ILIKE '%email%'
        OR body ILIKE '%password%'
        OR body ILIKE '%teaching area%'
        OR body ILIKE '%locality%'
      )
    GROUP BY phone, body
    HAVING COUNT(*) >= 3
    ORDER BY n DESC
    LIMIT 40
  `;

  const topBotTemplates = await prisma.$queryRaw<
    Array<{ snippet: string; n: bigint; phones: bigint }>
  >`
    SELECT LEFT(body, 90) AS snippet, COUNT(*)::bigint AS n, COUNT(DISTINCT phone)::bigint AS phones
    FROM whatsapp_chat_messages
    WHERE direction = 'OUTBOUND'
      AND "createdAt" > ${since}
      AND (
        body ILIKE '%kaunsi class%'
        OR body ILIKE '%kaunse subject%'
        OR body ILIKE '%padhate%'
        OR body ILIKE '%Email ID%'
        OR body ILIKE '%password%'
      )
    GROUP BY LEFT(body, 90)
    ORDER BY n DESC
    LIMIT 25
  `;

  const mismatchPairs = await prisma.$queryRaw<
    Array<{
      phone: string;
      inbound: string;
      outbound: string;
      inbound_at: Date;
    }>
  >`
    WITH inbound AS (
      SELECT id, phone, body, "createdAt"
      FROM whatsapp_chat_messages
      WHERE direction = 'INBOUND'
        AND "createdAt" > ${since}
        AND length(body) BETWEEN 2 AND 280
    )
    SELECT i.phone, i.body AS inbound, o.body AS outbound, i."createdAt" AS inbound_at
    FROM inbound i
    JOIN LATERAL (
      SELECT body
      FROM whatsapp_chat_messages o
      WHERE o.phone = i.phone
        AND o.direction = 'OUTBOUND'
        AND o."createdAt" > i."createdAt"
        AND o."createdAt" < i."createdAt" + interval '8 minutes'
      ORDER BY o."createdAt" ASC
      LIMIT 1
    ) o ON true
    WHERE
      (
        i.body ~* '(pay|payment|qr|upi|plan|commission|advance|coins?|wallet|kharid|activate|1257|2999|password|login|lead|unlock|interested|nahi|don.?t teach)'
        OR i.body ~* '^(yes|no|nahi|ok|okay|haan|theek|hi|hello|interested)$'
      )
      AND o.body ~* '(kaunsi class|kaunse subject|padhate ho|padhate hain|Email ID|password rakhna|teaching area)'
    ORDER BY i."createdAt" DESC
    LIMIT 80
  `;

  const stuckSessions = await prisma.$queryRaw<
    Array<{ phone: string; step: string | null; last_at: Date; inbound_n: bigint; outbound_n: bigint }>
  >`
    SELECT s.phone, s.step, s."lastMessageAt" AS last_at,
      (SELECT COUNT(*) FROM whatsapp_chat_messages m WHERE m.phone = s.phone AND m.direction = 'INBOUND' AND m."createdAt" > ${since})::bigint AS inbound_n,
      (SELECT COUNT(*) FROM whatsapp_chat_messages m WHERE m.phone = s.phone AND m.direction = 'OUTBOUND' AND m."createdAt" > ${since})::bigint AS outbound_n
    FROM whatsapp_sessions s
    WHERE s.step IN ('T_CLASS', 'T_SUBJECTS', 'T_AREA', 'T_EMAIL', 'T_PASSWORD', 'T_CONVO', 'LANG_SELECT')
      AND s."lastMessageAt" > ${since}
    ORDER BY s."lastMessageAt" DESC
    LIMIT 40
  `;

  const report = {
    since: since.toISOString(),
    repeatedBot: repeatedBot.map((r) => ({
      phone: maskPhone(r.phone),
      n: Number(r.n),
      body: snippet(r.body, 160),
    })),
    topBotTemplates: topBotTemplates.map((r) => ({
      n: Number(r.n),
      phones: Number(r.phones),
      snippet: r.snippet,
    })),
    mismatchCount: mismatchPairs.length,
    mismatchPairs: mismatchPairs.map((r) => ({
      phone: maskPhone(r.phone),
      at: r.inbound_at,
      inbound: snippet(r.inbound, 120),
      outbound: snippet(r.outbound, 140),
    })),
    stuckSessions: stuckSessions.map((s) => ({
      phone: maskPhone(s.phone),
      step: s.step,
      lastAt: s.last_at,
      inbound: Number(s.inbound_n),
      outbound: Number(s.outbound_n),
    })),
  };

  const dir = join(process.cwd(), "scratch");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "chatbot_failure_audit.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    repeated: report.repeatedBot.length,
    templates: report.topBotTemplates.length,
    mismatches: report.mismatchCount,
    stuck: report.stuckSessions.length,
    out,
  }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
