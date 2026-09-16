import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { askGeminiChatbot } from "../lib/whatsapp-bot/ai-agent";

async function testAi() {
  console.log("Testing Gemini Chatbot Brain...");
  const session = {
    id: "test",
    phone: "919311459543",
    userType: null,
    step: "WELCOME",
    data: {},
    retries: 0
  };

  // Test 1: Natural Hindi/English Parent Inquiry
  console.log("\n--- TEST 1: 'Mujhe class 10 ke liye maths science home tutor chahiye Dwarka me' ---");
  const res1 = await askGeminiChatbot("Mujhe class 10 ke liye maths science home tutor chahiye Dwarka me", session);
  console.log("AI Result 1:", JSON.stringify(res1, null, 2));

  // Test 2: General FAQ question
  console.log("\n--- TEST 2: 'What are your tutor fees and is demo class free?' ---");
  const res2 = await askGeminiChatbot("What are your tutor fees and is demo class free?", session);
  console.log("AI Result 2:", JSON.stringify(res2, null, 2));
}

testAi().catch(console.error);
