import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { POST, DELETE } from "../app/api/chatbot/simulate/route";

async function testNewUser() {
  const phone = `91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
  console.log(`=== TESTING AS BRAND NEW USER (PHONE: ${phone}) ===\n`);

  // Turn 1: User taps "1️⃣ I'm a Tutor"
  console.log("👉 Turn 1: User taps '1️⃣ I\'m a Tutor'");
  const res1 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "1️⃣ I'm a Tutor", useAi: true }),
  }));
  const data1 = await res1.json();
  console.log("\nBot reply 1:\n", data1.reply);
  console.log("\nQuick replies 1:", data1.quickReplies);

  // Turn 2: User provides Name, Phone, Email, Locality, and Subjects
  console.log("\n👉 Turn 2: User sends: 'Rohit, 9876543210, rohit@gmail.com, Sangam Vihar, Class 1-10 Maths'");
  const res2 = await POST(new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      message: "Rohit, 9876543210, rohit@gmail.com, Sangam Vihar, Class 1-10 Maths",
      useAi: true,
    }),
  }));
  const data2 = await res2.json();
  console.log("\nBot reply 2:\n", data2.reply);
  console.log("\nQuick replies 2:", data2.quickReplies);
  console.log("\nExtracted fields 2:", data2.updatedData);
}

testNewUser().catch(console.error);
