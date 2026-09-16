import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { prisma } from "../lib/prisma";
import { getOrCreateSession, updateSession, resetSession } from "../lib/whatsapp-bot/session";
import { processMessage } from "../lib/whatsapp-bot/engine";
import { MSG } from "../lib/whatsapp-bot/messages";
import { getAquaWhatsAppConfig, getAquaWhatsAppStatus } from "../lib/aqua-whatsapp";

async function main() {
  console.log("================================================================================");
  console.log("1. TESTING DATABASE TABLE (whatsappSession)");
  console.log("================================================================================");
  const testPhone = "919999999999";
  
  try {
    const session = await getOrCreateSession(testPhone);
    console.log("✅ getOrCreateSession succeeded:", session);

    await updateSession(testPhone, "T_NAME", { test: true }, "TUTOR", 0);
    console.log("✅ updateSession succeeded");

    await resetSession(testPhone);
    console.log("✅ resetSession succeeded");

    // Clean up test session
    await prisma.whatsappSession.deleteMany({ where: { phone: testPhone } });
    console.log("✅ Test session cleaned up");
  } catch (err: any) {
    console.error("❌ Database session error:", err.message);
  }

  console.log("\n================================================================================");
  console.log("2. TESTING BOT ENGINE STATE MACHINE (Simulated conversation)");
  console.log("================================================================================");

  // Step 1: User says "Hi"
  let mockSession = {
    id: "test",
    phone: "919876543210",
    userType: null,
    step: "WELCOME",
    data: {},
    retries: 0
  };

  const res1 = await processMessage(mockSession, "Hi");
  console.log("Inbound: 'Hi'");
  console.log("Bot reply preview:\n", res1.reply.slice(0, 150) + "...");
  console.log("Next step:", res1.nextStep);

  // Step 2: User selects "1" (Tutor)
  mockSession.step = res1.nextStep;
  mockSession.data = res1.updatedData;
  const res2 = await processMessage(mockSession, "1");
  console.log("\nInbound: '1' (Tutor)");
  console.log("Bot reply preview:\n", res2.reply.slice(0, 150) + "...");
  console.log("Next step:", res2.nextStep);

  // Step 3: User gives Name
  mockSession.step = res2.nextStep;
  mockSession.data = res2.updatedData;
  const res3 = await processMessage(mockSession, "Rohan Verma");
  console.log("\nInbound: 'Rohan Verma'");
  console.log("Bot reply preview:\n", res3.reply.slice(0, 150) + "...");
  console.log("Next step:", res3.nextStep);

  // Step 4: User types natural language or something unexpected e.g. "I want to teach maths in delhi"
  mockSession.step = "WELCOME";
  mockSession.data = {};
  const resNatural = await processMessage(mockSession, "I need a physics home tutor in Janakpuri");
  console.log("\nInbound natural language at WELCOME: 'I need a physics home tutor in Janakpuri'");
  console.log("Bot reply preview:\n", resNatural.reply.slice(0, 150) + "...");
  console.log("Next step:", resNatural.nextStep);

  console.log("\n================================================================================");
  console.log("3. TESTING AQUA SMS / PINBOT CONFIG & TEXT REPLIES");
  console.log("================================================================================");
  const cfg = getAquaWhatsAppConfig();
  console.log("Aqua WhatsApp enabled:", cfg.enabled);
  console.log("Aqua API Base:", cfg.apiBase);
  console.log("Aqua Sender:", cfg.fromNumber);
  console.log("Aqua Phone Number ID:", cfg.phoneNumberId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
