import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

async function testUpdateWebhook() {
  const cfg = getAquaWhatsAppConfig();
  console.log("Trying to inspect or update webhook on Pinbot...");

  // Let's test POST /v3/1417510641438661 or POST /v3/1417510641438661/webhook
  // Standard Meta Cloud API: POST /{PHONE_NUMBER_ID}
  // body: { "webhook_configuration": { "application": "https://apnatutorhub.com/api/webhooks/whatsapp" } }
  
  const targetUrl = "https://apnatutorhub.com/api/webhooks/whatsapp";

  const attempts = [
    {
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}`,
      method: "POST",
      body: { webhook_configuration: { application: targetUrl } }
    },
    {
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}/webhook`,
      method: "POST",
      body: { webhook_url: targetUrl }
    },
    {
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}/subscriptions`,
      method: "POST",
      body: { webhook_url: targetUrl }
    }
  ];

  for (const att of attempts) {
    try {
      console.log(`\nAttempting ${att.method} ${att.url}...`);
      const res = await fetch(att.url, {
        method: att.method,
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.systemToken
        },
        body: JSON.stringify(att.body)
      });
      console.log("Status:", res.status);
      const txt = await res.text();
      console.log("Response:", txt.slice(0, 300));
    } catch (e: any) {
      console.log("Error:", e.message);
    }
  }
}

testUpdateWebhook().catch(console.error);
