import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { probeAquaWhatsAppLogin, getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

async function testLogin() {
  console.log("Testing Pinbot login...");
  const res = await probeAquaWhatsAppLogin();
  console.log("Login Result:", res);

  const cfg = getAquaWhatsAppConfig();
  // Let's call /v1/wamessage/login directly to see the full response payload
  const rawLoginRes = await fetch(`${cfg.apiBase}/v1/wamessage/login`, {
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

  console.log("Login HTTP Status:", rawLoginRes.status);
  const loginData = await rawLoginRes.json();
  console.log("Login Full Data:\n", JSON.stringify(loginData, null, 2));
}

testLogin().catch(console.error);
