import { prisma } from "../lib/prisma";
import { normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";

export async function syncInterestedLeads(dryRun = true) {
  // 1. Get all distinct inbound senders
  const replies = await prisma.$queryRaw<Array<{ phone: string; body: string; contactName: string | null; createdAt: Date }>>`
    SELECT DISTINCT ON (phone) phone, body, "contactName", "createdAt"
    FROM whatsapp_chat_messages
    WHERE direction = 'INBOUND'
    ORDER BY phone, "createdAt" DESC
  `;

  const positiveKeywords = [
    "interested", "yes", "ha", "haa", "chahiye", "demo", "tutor",
    "need", "class", "join", "start", "sir", "subjects", "fee", "fees"
  ];

  const negativeKeywords = [
    "not interested", "no need", "stop", "don't message", "dont message", "unsubscribe"
  ];

  const candidates: Array<{ phone: string; name: string | null; lastMsg: string }> = [];

  for (const r of replies) {
    const text = (r.body || "").toLowerCase().trim();
    if (negativeKeywords.some(k => text.includes(k))) continue;
    if (text === "no") continue;

    const isMatch = positiveKeywords.some(k => text.includes(k)) || text === "ok" || text === "okay" || text === "1";
    if (isMatch) {
      candidates.push({
        phone: r.phone,
        name: r.contactName,
        lastMsg: r.body
      });
    }
  }

  console.log(`Found ${candidates.length} positive/interested WhatsApp candidates.`);
  return candidates;
}

if (require.main === module) {
  syncInterestedLeads().then(() => prisma.$disconnect());
}
