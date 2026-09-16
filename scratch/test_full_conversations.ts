import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { POST, DELETE } from "../app/api/chatbot/simulate/route";

async function runScenario(scenarioName: string, phone: string, turns: string[]) {
  console.log(`\n======================================================`);
  console.log(`🤖 SCENARIO: ${scenarioName} (${phone})`);
  console.log(`======================================================`);

  await DELETE(new Request(`http://localhost:3000/api/chatbot/simulate?phone=${phone}`, { method: "DELETE" }));

  for (let i = 0; i < turns.length; i++) {
    const msg = turns[i];
    console.log(`\n👉 TURN ${i + 1}: User sends: "${msg}"`);
    const res = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: msg, useAi: true }),
    }));
    const data = await res.json();
    console.log(`💬 Bot (${data.nextStep} | ${data.userType || "N/A"}):`);
    console.log(data.reply);
    console.log(`🔘 Buttons:`, data.quickReplies?.slice(0, 4));
    console.log(`📦 Extracted:`, data.updatedData);
  }
}

async function main() {
  // Scenario 1: Tutor - Sangam Vihar
  await runScenario("Tutor Registration - Sangam Vihar", "919311459543", [
    "1",
    "sangam vihar",
    "Aman, teach Maths for class 10",
    "4 years exp, prefer both home and online",
  ]);

  // Scenario 2: Parent Natural Language
  await runScenario("Parent Natural Language Request", "919876543210", [
    "I need a physics home tutor for my son in class 12 in Dwarka sector 6",
    "Evening 5 PM, budget around 8000 per month",
  ]);

  // Scenario 3: General Question
  await runScenario("Fees & Demo Class Question", "919111222333", [
    "What are your fees for class 10 tutor and is there a demo class?",
  ]);
}

main().catch(console.error);
