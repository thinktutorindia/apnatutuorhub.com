import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { askGeminiChatbot } from "../lib/whatsapp-bot/ai-agent";

async function testExact() {
  const session = {
    id: "test",
    phone: "919999000000",
    userType: null,
    step: "WELCOME",
    data: {},
    retries: 0,
  };

  console.log("Testing message: '1' with session step: 'WELCOME'...");
  const res1 = await askGeminiChatbot("1", session);
  console.log("Turn 1 output:", JSON.stringify(res1, null, 2));

  // Now simulate what engine does with res1
  const role = (res1?.detectedRole as string)?.toUpperCase() || "TUTOR";
  const session2 = {
    id: "test",
    phone: "919999000000",
    userType: role,
    step: role === "TUTOR" ? "T_CONVO" : "P_CONVO",
    data: res1?.extractedData || {},
    retries: 0,
  };

  console.log("\nTesting message: 'sangam vihar' with session2:", session2);
  const res2 = await askGeminiChatbot("sangam vihar", session2);
  console.log("Turn 2 output:", JSON.stringify(res2, null, 2));
}

testExact().catch(console.error);
