import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAquaWhatsAppConfig, getAquaWhatsAppStatus } from "../lib/aqua-whatsapp";

async function main() {
  const cfg = getAquaWhatsAppConfig();
  console.log("Config with .env.local:", {
    enabled: cfg.enabled,
    autoDispatch: cfg.autoDispatch,
    apiBase: cfg.apiBase,
    hasToken: Boolean(cfg.systemToken),
    fromNumber: cfg.fromNumber,
    phoneNumberId: cfg.phoneNumberId,
    defaultTemplateId: cfg.defaultTemplateId,
    dailyTestCap: cfg.dailyTestCap
  });

  const st = await getAquaWhatsAppStatus();
  console.log("Status with .env.local:", st);
}

main().catch(console.error);
