import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';

async function main() {
  const cfg = getAquaWhatsAppConfig();
  
  const endpoints = [
    '/v3/debug_token?input_token=' + cfg.systemToken,
    '/v3/app',
    '/v3/me/accounts',
    '/v3/me/businesses',
    '/v3/122109329985463121/businesses',
    '/v3/122109329985463121/assigned_whatsapp_business_accounts',
    '/v3/1417510641438661?fields=business_account',
    '/v3/1417510641438661?fields=account_id',
    '/v3/1417510641438661?fields=owner_business_info',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${cfg.apiBase}${ep}`, {
        headers: { apikey: cfg.systemToken },
      });
      console.log(ep.slice(0, 50), '->', res.status, (await res.text()).slice(0, 150));
    } catch (e: any) {
      console.log(ep, 'error:', e.message);
    }
  }
}

main().catch(console.error);
