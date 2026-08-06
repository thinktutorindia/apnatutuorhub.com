import { PrismaClient } from "@prisma/client";
import { createNotification } from "../lib/notification-engine";

const prisma = new PrismaClient();

async function main() {
  const email = "youhubteam@gmail.com";
  console.log(`Sending live notifications to: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, pushSubscription: true },
  });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  console.log(`Target User: ${user.name} (${user.id})`);
  console.log("Device Token Status:", user.pushSubscription ? "CONNECTED ✅" : "NOT YET CONNECTED ⚠️ (Click 'Turn On Push Notifications' on /tutor/dashboard)");

  // 1. In-App Web Bell Notification
  const webId = await createNotification({
    userId: user.id,
    type: "LEAD_MATCHED",
    priority: "HIGH",
    channel: "WEB",
    title: "🚀 Immediate Tuition Opportunity in Sangam Vihar!",
    message: "New Class 10 Math & Physics lead posted. Click to view requirement details.",
    actionUrl: "/tutor/leads",
  });
  console.log(`In-App Bell Notification Created: ID ${webId}`);

  // 2. VAPID Web Push Notification
  const pushId = await createNotification({
    userId: user.id,
    type: "LEAD_MATCHED",
    priority: "CRITICAL",
    channel: "PUSH",
    title: "🔔 Push Alert: Class 10 Tuition Lead",
    message: "A parent near 110080 is offering ₹600/hr. Open ThinkTutor to apply.",
    actionUrl: "http://192.168.137.1:3000/tutor/leads",
  });
  console.log(`VAPID Push Notification Dispatched: ID ${pushId}`);

  console.log("\n✅ Dispatch sequence complete!");
}

main()
  .catch((e) => {
    console.error("Error in notification dispatch:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
