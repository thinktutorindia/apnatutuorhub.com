import { PrismaClient } from "@prisma/client";
import { sendWebPush, isWebPushConfigured } from "../lib/web-push";

const prisma = new PrismaClient();

async function main() {
  const email = "youhubteam@gmail.com";
  console.log(`Checking VAPID Web Push status for: ${email}...`);

  console.log("VAPID Configured:", isWebPushConfigured());

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, pushSubscription: true },
  });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);
  console.log("Push Subscription in DB:", user.pushSubscription ? "ACTIVE ✅" : "NO SUBSCRIPTION YET ⚠️");

  if (!user.pushSubscription) {
    console.log("\n💡 Note: Web Push requires the user browser to enable notifications via Service Worker.");
    console.log("When you log in to http://192.168.137.1:3000 as youhubteam@gmail.com, click 'Enable Push Notifications' in the banner to register your device token!");
  }

  // Attempt VAPID Web Push dispatch
  await sendWebPush(user.id, {
    title: "🎯 New Tuition Lead Alert!",
    body: "Class 10 Mathematics requirement posted in Sangam Vihar (110080). Budget: ₹500–₹800/hr.",
    url: "/tutor/leads",
    tag: "vapid-lead-alert-" + Date.now(),
  });

  console.log("\n✅ VAPID Web Push dispatch completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error sending VAPID push:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
