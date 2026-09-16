import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAquaWhatsAppConfig } from "../lib/aqua-whatsapp";

const cfg = getAquaWhatsAppConfig();
console.log("Aqua Config:", {
  apiBase: cfg.apiBase,
  fromNumber: cfg.fromNumber,
  phoneNumberId: cfg.phoneNumberId,
  defaultTemplateId: cfg.defaultTemplateId,
  templateNameEnv: process.env.AQUA_WHATSAPP_TEMPLATE_NAME,
  systemTokenPrefix: cfg.systemToken.slice(0, 8) + "..."
});
