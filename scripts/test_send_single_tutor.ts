import * as fs from "fs";
import { prisma } from "../lib/prisma";
import { normalizeIndiaWhatsApp, sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { sendBatchEmails } from "../lib/resend-service";
import { renderNewMatchedLeadEmail } from "../emails/NewMatchedLeadEmail";
import { sendWebPush } from "../lib/web-push";

try {
  const localEnv = fs.readFileSync(".env.local", "utf8");
  for (const line of localEnv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    const key = k.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "").trim();
  }
} catch {}

async function testSingleTutor() {
  console.log("Testing live dispatch to Abdullah Sheikh...\n");

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "itsabdullahsheikh760@gmail.com" },
        { phone: "9870302711" },
      ],
    },
    include: { tutorProfile: true },
  });

  if (!user) {
    console.error("Abdullah Sheikh not found in DB!");
    return;
  }

  const phone = normalizeIndiaWhatsApp(user.phone || "9870302711")!;
  const email = user.email;
  const inquiryCode = "31842";
  const clientName = "Mrs. Sharma";
  const classLevel = "Class 8";
  const subjects = ["Mathematics", "Science"];
  const mode = "Home Tuition (Offline)";
  const location = "Sangam Vihar, 16 No. Road, Near Kumar Sweets, New Delhi";
  const budgetFormatted = "₹5,220 – ₹5,700 / month";
  const timing = "Evening (5:00 PM to 7:00 PM)";
  const preference = "Any (Male or Female Tutor)";
  const actionUrl = "https://apnatutorhub.com/tutor/leads";

  console.log("Recipient:", {
    name: user.name,
    phone,
    email,
    location,
    classLevel,
    subjects,
    mode,
    budgetFormatted,
  });

  // 1. In-App Notification
  console.log("\n[1/4] Creating in-app notification...");
  const notif = await prisma.notification.create({
    data: {
      userId: user.id,
      type: "LEAD_MATCHED",
      priority: "HIGH",
      channel: "WEB",
      title: `🎯 New Tuition Requirement in ${location}`,
      message: `${classLevel} · ${subjects.join(", ")} needed. Budget: ${budgetFormatted}. Schedule: ${timing}.`,
      actionUrl: "/tutor/leads",
      isRead: false,
    },
  });
  console.log("✅ In-App Notification created:", notif.id);

  // 2. Web Push (if subscribed)
  console.log("\n[2/4] Sending Web Push notification...");
  try {
    await sendWebPush(user.id, {
      title: `🎯 New Tuition Requirement in ${location}`,
      body: `${classLevel} (${subjects.join(", ")}) · ${budgetFormatted}`,
      url: "/tutor/leads",
      tag: "geo-lead-" + inquiryCode,
    });
    console.log("✅ Web Push invoked (sent if user has browser subscription)");
  } catch (err) {
    console.warn("Web push notice:", err instanceof Error ? err.message : String(err));
  }

  // 3. Email (Resend)
  console.log("\n[3/4] Sending Email via Resend...");
  try {
    const html = renderNewMatchedLeadEmail({
      tutorName: user.name || "Tutor",
      inquiryCode,
      classLevel,
      board: "CBSE",
      subjects,
      city: location,
      teachingMode: "OFFLINE",
      budgetFormatted,
      timing,
      coinCost: 50,
      leadUrl: actionUrl,
    });

    const emailRes = await sendBatchEmails([
      {
        to: email,
        subject: `🎯 New Tuition Requirement #${inquiryCode} in ${location} — ApnaTutorHub`,
        html,
      },
    ]);
    console.log("✅ Email Dispatch Result:", emailRes);
  } catch (err) {
    console.warn("Email notice:", err instanceof Error ? err.message : String(err));
  }

  // 4. WhatsApp (Aqua SMS Pinbot)
  console.log("\n[4/4] Sending WhatsApp Message via Aqua SMS...");
  const placeholders = [
    inquiryCode,
    clientName,
    `${classLevel} (${subjects.join(", ")})`,
    mode,
    location,
    budgetFormatted,
    preference,
  ];

  try {
    const waRes = await sendAquaWhatsAppMessage({
      to: phone,
      mode: "template",
      templateId: "tuition_enquiry_direct",
      placeholders,
      bypassDailyCap: true,
    });
    console.log("✅ WhatsApp Dispatch Result:", waRes);

    if (waRes.ok) {
      await prisma.whatsappChatMessage.create({
        data: {
          phone,
          direction: "OUTBOUND",
          senderName: "System Broadcast",
          body: `[Tuition Enquiry #${inquiryCode}]\nClient: ${clientName}\nClass: ${classLevel} (${subjects.join(", ")})\nMode: ${mode}\nLocation: ${location}\nBudget: ${budgetFormatted}\nPreference: ${preference}`,
          step: "BROADCAST_LEAD",
          messageId: waRes.providerMessageId || null,
          isRead: true,
        },
      });
    }
  } catch (err) {
    console.warn("WhatsApp notice:", err instanceof Error ? err.message : String(err));
  }

  console.log("\n🎉 Test dispatch to Abdullah Sheikh finished successfully!");
}

testSingleTutor().catch(console.error).finally(() => prisma.$disconnect());
