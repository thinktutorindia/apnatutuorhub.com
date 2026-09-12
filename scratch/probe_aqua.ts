import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { getAquaWhatsAppConfig, probeAquaWhatsAppLogin } from '../lib/aqua-whatsapp';

async function probe() {
  const cfg = getAquaWhatsAppConfig();
  console.log('Aqua Config:', {
    enabled: cfg.enabled,
    apiBase: cfg.apiBase,
    hasToken: Boolean(cfg.systemToken),
    hasUser: Boolean(cfg.username),
    hasPass: Boolean(cfg.password),
    from: cfg.fromNumber,
    templateId: cfg.defaultTemplateId,
  });

  const probeRes = await probeAquaWhatsAppLogin();
  console.log('Aqua Login Probe Result:', probeRes);
}

probe().catch(console.error);
