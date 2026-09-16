import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking WhatsApp sessions in DB...");
  const sessions = await prisma.whatsappSession.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 10,
  });
  console.log("Total sessions in DB:", sessions.length);
  console.log("Sessions:", sessions);

  // Check audit logs or notification deliveries for inbound or whatsapp
  const audits = await prisma.auditLog.findMany({
    where: {
      action: { contains: "WHATSAPP" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("\nRecent WhatsApp audits:", audits);
}

main().catch(console.error).finally(() => prisma.$disconnect());
