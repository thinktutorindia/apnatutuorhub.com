import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';
import { resend, DEFAULT_FROM_EMAIL } from '../lib/resend-service';

async function checkConfig() {
  console.log('--- EMAIL (RESEND) CONFIG ---');
  console.log('Resend Client configured:', Boolean(resend));
  console.log('Default From Email:', DEFAULT_FROM_EMAIL);

  console.log('\n--- WHATSAPP (AQUA) CONFIG ---');
  const aquaCfg = getAquaWhatsAppConfig();
  console.log('Enabled:', aquaCfg.enabled);
  console.log('API Base:', aquaCfg.apiBase);
  console.log('Has System Token:', Boolean(aquaCfg.systemToken));
  console.log('From Number:', aquaCfg.fromNumber);
  console.log('Default Template ID:', aquaCfg.defaultTemplateId);
  console.log('Daily Cap:', aquaCfg.dailyTestCap);
}

checkConfig().catch(console.error);
