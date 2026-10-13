import { prisma } from "../lib/prisma";

const EXPLICIT_OPT_OUT_PATTERNS = [
  /\bnot interested\b/i,
  /\bno need\b/i,
  /\bstop\b/i,
  /\bdon't message\b/i,
  /\bdont message\b/i,
  /\bunsubscribe\b/i,
  /\bwrong number\b/i,
  /^no$/i,
  /^nahi$/i,
  /^nahin$/i,
];

function isOptOut(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  for (const p of EXPLICIT_OPT_OUT_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
}

async function run() {
  const replies = await prisma.$queryRaw<Array<{ phone: string; body: string; contactName: string | null }>>`
    SELECT DISTINCT ON (phone) phone, body, "contactName"
    FROM whatsapp_chat_messages
    WHERE direction = 'INBOUND'
    ORDER BY phone, "createdAt" DESC
  `;

  let optOuts = 0;
  let activeInbound = 0;

  for (const r of replies) {
    if (isOptOut(r.body)) {
      optOuts++;
    } else {
      activeInbound++;
    }
  }

  console.log({ totalSenders: replies.length, optOuts, activeInbound });
}

run().catch(console.error).finally(() => prisma.$disconnect());
