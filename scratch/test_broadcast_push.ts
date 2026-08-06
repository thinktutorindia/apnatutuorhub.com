import { PrismaClient } from "@prisma/client";
import { broadcastNotification } from "../lib/aws-notification";
import { isWebPushConfigured } from "../lib/web-push";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking VAPID Web Push configuration:", isWebPushConfigured());

  const result = await broadcastNotification({
    target: "ALL",
    title: "⚡ Admin Broadcast Push Test",
    message: "This is a live test broadcast dispatched from the server action engine.",
    actionUrl: "/tutor/leads",
  });

  console.log("Broadcast result:", result);
}

main()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
