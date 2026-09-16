import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { askGeminiChatbot } from "../lib/whatsapp-bot/ai-agent";

async function testSequence() {
  const session: any = {
    id: "test",
    phone: "919311459543",
    userType: null,
    step: "WELCOME",
    data: {},
    retries: 0
  };

  console.log("=== TURN 1: User sends '1' ===");
  const res1 = await askGeminiChatbot("1", session);
  console.log("Bot reply 1:\n", res1?.reply);
  console.log("Quick replies 1:", res1?.quickReplies);
  console.log("Detected role 1:", res1?.detectedRole);
  console.log("Extracted data 1:", res1?.extractedData);

  // Update session with Turn 1 results
  session.userType = res1?.detectedRole || "TUTOR";
  session.data = { ...session.data, ...res1?.extractedData };
  session.step = "COLLECTING_INFO";

  console.log("\n=== TURN 2: User sends 'sangam vihar' ===");
  const res2 = await askGeminiChatbot("sangam vihar", session);
  console.log("Bot reply 2:\n", res2?.reply);
  console.log("Quick replies 2:", res2?.quickReplies);
  console.log("Extracted data 2:", res2?.extractedData);

  // Update session with Turn 2 results
  session.data = { ...session.data, ...res2?.extractedData };

  console.log("\n=== TURN 3: User sends 'Aman, teach Maths class 9 and 10' ===");
  const res3 = await askGeminiChatbot("Aman, teach Maths class 9 and 10", session);
  console.log("Bot reply 3:\n", res3?.reply);
  console.log("Quick replies 3:", res3?.quickReplies);
  console.log("Extracted data 3:", res3?.extractedData);
  console.log("Is Complete 3:", res3?.isComplete);
}

testSequence().catch(console.error);
