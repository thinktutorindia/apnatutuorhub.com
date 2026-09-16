import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { POST, DELETE } from "../app/api/chatbot/simulate/route";

async function test() {
  const phone = "919311459543";

  // Reset
  await DELETE(new Request(`http://localhost:3000/api/chatbot/simulate?phone=${phone}`, { method: "DELETE" }));
  console.log("=== RESET SESSION ===\n");

  // Turn 1: User taps "1️⃣ I'm a Tutor"
  console.log("--- TURN 1: User taps '1️⃣ I\'m a Tutor' ---");
  const res1 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "1️⃣ I'm a Tutor", useAi: true }),
  }));
  const data1 = await res1.json();
  console.log("Bot reply 1:\n", data1.reply);
  console.log("Quick replies 1:", data1.quickReplies);

  // Turn 2: User provides name & area: "Rohit, Sangam Vihar, Class 1-10 Maths"
  console.log("\n--- TURN 2: User sends 'Rohit, Sangam Vihar, Class 1-10 Maths' ---");
  const res2 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "Rohit, Sangam Vihar, Class 1-10 Maths", useAi: true }),
  }));
  const data2 = await res2.json();
  console.log("Bot reply 2:\n", data2.reply);
  console.log("Quick replies 2:", data2.quickReplies);
  console.log("Next step 2:", data2.nextStep);

  // Turn 3: User taps "💰 View Coin Plans"
  console.log("\n--- TURN 3: User taps '💰 View Coin Plans' ---");
  const res3 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "💰 View Coin Plans", useAi: true }),
  }));
  const data3 = await res3.json();
  console.log("Bot reply 3:\n", data3.reply);
  console.log("Quick replies 3:", data3.quickReplies);
}

test().catch(console.error);
