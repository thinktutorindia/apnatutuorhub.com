import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';

async function main() {
  const cfg = getAquaWhatsAppConfig();
  
  const urls = [
    `${cfg.apiBase}/v3/me/assigned_whatsapp_business_accounts`,
    `${cfg.apiBase}/v3/122109329985463121/assigned_whatsapp_business_accounts`,
    `${cfg.apiBase}/v3/122109329985463121/businesses`,
    `${cfg.apiBase}/v3/me?fields=id,name,businesses,whatsapp_business_accounts`,
    `${cfg.apiBase}/v3/1417510641438661?fields=id,verified_name,display_phone_number,whatsapp_business_account`,
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { apikey: cfg.systemToken, systemtoken: cfg.systemToken },
      });
      console.log(u.slice(0, 75), '->', res.status);
      console.log('  ', await res.text());
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

main().catch(console.error);
