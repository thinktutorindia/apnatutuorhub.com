import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

async function probeRoutes() {
  const cfg = getAquaWhatsAppConfig();
  const phoneId = cfg.phoneNumberId;
  const token = cfg.systemToken;

  const targetUrl = "https://apnatutorhub.com/api/webhooks/whatsapp";

  const tests = [
    { method: "POST", path: `/v3/${phoneId}`, body: { webhook_url: targetUrl } },
    { method: "POST", path: `/v3/${phoneId}`, body: { override_callback_uri: targetUrl } },
    { method: "PUT", path: `/v3/${phoneId}`, body: { webhook_configuration: { application: targetUrl } } },
    { method: "PATCH", path: `/v3/${phoneId}`, body: { webhook_configuration: { application: targetUrl } } },
    { method: "POST", path: `/v3/${phoneId}/override_callback_uri`, body: { override_callback_uri: targetUrl } },
    { method: "POST", path: `/v3/whatsapp/webhook`, body: { phone_number_id: phoneId, url: targetUrl } },
    { method: "POST", path: `/v1/whatsapp/webhook`, body: { phone_number_id: phoneId, url: targetUrl } },
    { method: "POST", path: `/v3/webhook`, body: { url: targetUrl } }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${cfg.apiBase}${t.path}`, {
        method: t.method,
        headers: {
          "Content-Type": "application/json",
          apikey: token,
          systemtoken: token
        },
        body: JSON.stringify(t.body)
      });
      console.log(`${t.method} ${t.path}: status ${res.status}`);
      const txt = await res.text();
      console.log("->", txt.slice(0, 150));
    } catch (e: any) {
      console.log(`Error on ${t.path}:`, e.message);
    }
  }
}

probeRoutes().catch(console.error);
