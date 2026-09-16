import { getAquaWhatsAppConfig, getAquaWhatsAppStatus } from "../lib/aqua-whatsapp";

async function main() {
  const cfg = getAquaWhatsAppConfig();
  console.log("Config:", {
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
  console.log("Status:", st);

  console.log("Resend key present:", Boolean(process.env.RESEND_API_KEY));
  console.log("Resend from:", process.env.RESEND_FROM_EMAIL);
}

main().catch(console.error);
