import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

async function probePinbot() {
  const cfg = getAquaWhatsAppConfig();
  console.log("Probing Pinbot API...");
  console.log("API Base:", cfg.apiBase);
  console.log("Phone Number ID:", cfg.phoneNumberId);
  console.log("From:", cfg.fromNumber);

  // 1. Try GET /v3/{phoneNumberId}
  try {
    const res = await fetch(`${cfg.apiBase}/v3/${cfg.phoneNumberId}`, {
      headers: { apikey: cfg.systemToken }
    });
    console.log("GET /v3/{phoneNumberId}:", res.status);
    const body = await res.text();
    console.log("Body:", body.slice(0, 300));
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // 2. Try GET /v1/wamessage/getwabalist or similar
  try {
    const res = await fetch(`${cfg.apiBase}/v1/wamessage/getwabalist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.systemToken,
        systemtoken: cfg.systemToken
      },
      body: JSON.stringify({
        username: cfg.username,
        password: cfg.password
      })
    });
    console.log("POST /v1/wamessage/getwabalist:", res.status);
    const body = await res.text();
    console.log("Body:", body.slice(0, 300));
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // 3. Try to check webhook settings
  try {
    const res = await fetch(`${cfg.apiBase}/v1/webhook`, {
      headers: { apikey: cfg.systemToken }
    });
    console.log("GET /v1/webhook:", res.status);
    const body = await res.text();
    console.log("Body:", body.slice(0, 300));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

probePinbot().catch(console.error);
