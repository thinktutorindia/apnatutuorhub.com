import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

async function checkWebhookConfig() {
  const cfg = getAquaWhatsAppConfig();
  const res = await fetch(`${cfg.apiBase}/v3/${cfg.phoneNumberId}`, {
    headers: { apikey: cfg.systemToken }
  });
  const data = await res.json();
  console.log("Full Phone Number Info:\n", JSON.stringify(data, null, 2));
}

checkWebhookConfig().catch(console.error);
