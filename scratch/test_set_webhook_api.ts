import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';

async function testSettingWebhook() {
  const cfg = getAquaWhatsAppConfig();
  const targetUrl = 'https://www.apnatutorhub.com/api/webhooks/whatsapp';

  const payloads = [
    {
      desc: 'POST /v3/{id} with webhook_configuration',
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}`,
      method: 'POST',
      body: { webhook_configuration: { application: targetUrl } },
    },
    {
      desc: 'POST /v3/{id}/subscriptions with webhook_url',
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}/subscriptions`,
      method: 'POST',
      body: { webhook_url: targetUrl },
    },
    {
      desc: 'POST /v3/{id}/webhook_configuration',
      url: `${cfg.apiBase}/v3/${cfg.phoneNumberId}/webhook_configuration`,
      method: 'POST',
      body: { application: targetUrl },
    },
    {
      desc: 'POST /v1/webhook or similar',
      url: `${cfg.apiBase}/v1/settings/webhook`,
      method: 'POST',
      body: { webhook_url: targetUrl, phone_number_id: cfg.phoneNumberId },
    }
  ];

  for (const p of payloads) {
    console.log(`\nTesting: ${p.desc}`);
    try {
      const res = await fetch(p.url, {
        method: p.method,
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.systemToken,
        },
        body: JSON.stringify(p.body),
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text);
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  }
}

testSettingWebhook();
