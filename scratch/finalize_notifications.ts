import { prisma } from "../lib/prisma";

async function finalize() {
  await prisma.notification.update({
    where: { id: "cmu2n1r4x000115j8qgyl8a7q" },
    data: { status: "DELIVERED", deliveredAt: new Date(), sentAt: new Date() }
  });

  await prisma.notification.update({
    where: { id: "cmu2n1rp0000315j8z44myks8" },
    data: { status: "DELIVERED", deliveredAt: new Date(), sentAt: new Date() }
  });

  const delRihan = await prisma.notificationDelivery.findFirst({
    where: { notificationId: "cmu2n1rp0000315j8z44myks8" }
  });
  if (!delRihan) {
    await prisma.notificationDelivery.create({
      data: {
        notificationId: "cmu2n1rp0000315j8z44myks8",
        channel: "WHATSAPP",
        provider: "AQUA_SMS",
        status: "DELIVERED",
        providerMessageId: "wamid.HBgMOTE5NTk5Njg5MTM5FQIAERgSM0FFQ0EzOEJEQjM0MzQzOTBDAA=="
      }
    });
  }

  console.log("All notifications and deliveries successfully finalized!");
}

finalize().finally(() => prisma.$disconnect());
