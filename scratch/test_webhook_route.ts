import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { POST } from "../app/api/webhooks/whatsapp/route";

async function testWebhook() {
  console.log("Testing /api/webhooks/whatsapp route...");

  // Meta Cloud API v3 format as sent by Aqua SMS / Pinbot
  const mockPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1417510641438661",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "919319193109",
                phone_number_id: "1417510641438661"
              },
              contacts: [
                {
                  profile: { name: "Tester" },
                  wa_id: "919999999999"
                }
              ],
              messages: [
                {
                  from: "919999999999",
                  id: "wamid.test_msg_001",
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: "Hi" },
                  type: "text"
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };

  const req = new Request("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mockPayload)
  });

  const res = await POST(req);
  console.log("Webhook Response Status:", res.status);
  const data = await res.json();
  console.log("Webhook Response Data:", data);
}

testWebhook().catch(console.error);
