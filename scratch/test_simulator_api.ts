import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { GET, POST, DELETE } from "../app/api/chatbot/simulate/route";

async function testSimulatorApi() {
  console.log("================================================================================");
  console.log("TESTING CHATBOT SIMULATOR API ROUTE");
  console.log("================================================================================");

  const phone = "919311459543";

  // 1. Reset first
  const delReq = new Request(`http://localhost:3000/api/chatbot/simulate?phone=${phone}`, {
    method: "DELETE",
  });
  const delRes = await DELETE(delReq);
  console.log("1. Reset session status:", delRes.status);

  // 2. Send "Hi"
  console.log("\n2. Sending 'Hi' via POST...");
  const postReq1 = new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "Hi", useAi: true })
  });
  const postRes1 = await POST(postReq1);
  const data1 = await postRes1.json();
  console.log("Reply 1 preview:", data1.reply.slice(0, 150) + "...");
  console.log("Quick Replies 1:", data1.quickReplies);
  console.log("Next Step 1:", data1.nextStep);

  // 3. Send natural query: "Mujhe class 10 ke liye maths science tutor chahiye Dwarka me"
  console.log("\n3. Sending natural query with AI...");
  const postReq2 = new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "Mujhe class 10 ke liye maths science tutor chahiye Dwarka me", useAi: true })
  });
  const postRes2 = await POST(postReq2);
  const data2 = await postRes2.json();
  console.log("Reply 2 preview:", data2.reply.slice(0, 150) + "...");
  console.log("Quick Replies 2:", data2.quickReplies);
  console.log("Detected Role:", data2.userType);
  console.log("Extracted Data:", data2.updatedData);

  // 4. Send button response: "Evening Time"
  console.log("\n4. Sending Quick Reply button 'Evening Time'...");
  const postReq3 = new Request("http://localhost:3000/api/chatbot/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: "Evening Time", useAi: true })
  });
  const postRes3 = await POST(postReq3);
  const data3 = await postRes3.json();
  console.log("Reply 3 preview:", data3.reply.slice(0, 150) + "...");
  console.log("Quick Replies 3:", data3.quickReplies);
}

testSimulatorApi().catch(console.error);
