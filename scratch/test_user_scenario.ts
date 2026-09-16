import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { POST, DELETE } from "../app/api/chatbot/simulate/route";

async function testUserScenario() {
  const phone = "919311459543";

  // Reset first
  await DELETE(new Request(`http://localhost:3000/api/chatbot/simulate?phone=${phone}`, { method: "DELETE" }));
  console.log("Reset session.\n");

  // Turn 1: "1"
  console.log("--- TURN 1: User sends '1' ---");
  const res1 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "1", useAi: true })
  }));
  const data1 = await res1.json();
  console.log("Bot reply 1:\n", data1.reply);
  console.log("Quick replies 1:", data1.quickReplies);
  console.log("Next step 1:", data1.nextStep);
  console.log("User role 1:", data1.userType);

  // Turn 2: "sangam vihar"
  console.log("\n--- TURN 2: User sends 'sangam vihar' ---");
  const res2 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "sangam vihar", useAi: true })
  }));
  const data2 = await res2.json();
  console.log("Bot reply 2:\n", data2.reply);
  console.log("Quick replies 2:", data2.quickReplies);
  console.log("Extracted data 2:", data2.updatedData);
  console.log("Next step 2:", data2.nextStep);

  // Turn 3: "Aman, teach Maths for class 10"
  console.log("\n--- TURN 3: User sends 'Aman, teach Maths for class 10' ---");
  const res3 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "Aman, teach Maths for class 10", useAi: true })
  }));
  const data3 = await res3.json();
  console.log("Bot reply 3:\n", data3.reply);
  console.log("Quick replies 3:", data3.quickReplies);
  console.log("Extracted data 3:", data3.updatedData);
}

testUserScenario().catch(console.error);
