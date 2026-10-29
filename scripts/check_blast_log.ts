import { prisma } from "../lib/prisma";

async function main() {
  const recentBlasts = await prisma.whatsappChatMessage.findMany({
    where: { step: "INTERESTED_BLAST", createdAt: { gte: new Date("2026-10-14T00:00:00Z") } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Today INTERESTED_BLAST:", recentBlasts.map((r) => ({ phone: r.phone, at: r.createdAt.toISOString(), messageId: r.messageId, status: r.status })));

  const rohit = await prisma.user.findFirst({
    where: { name: { contains: "Rohit", mode: "insensitive" }, role: "TUTOR" },
    select: { id: true, name: true, phone: true, email: true },
  });
  console.log("Rohit user row:", rohit);

  const phones = ["919311459588", "9311459588", "919311459543", "9311459543"];
  const msgs = await prisma.whatsappChatMessage.findMany({
    where: { phone: { in: phones } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      createdAt: true,
      direction: true,
      step: true,
      messageId: true,
      status: true,
      messageType: true,
      phone: true,
      body: true,
    },
  });
  for (const m of msgs) {
    console.log({
      at: m.createdAt.toISOString(),
      phone: m.phone,
      dir: m.direction,
      step: m.step,
      type: m.messageType,
      messageId: m.messageId,
      status: m.status,
      preview: m.body.slice(0, 100).replace(/\n/g, " "),
    });
  }
}

main().finally(() => prisma.$disconnect());
