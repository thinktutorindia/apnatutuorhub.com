import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { POST } from '../app/api/webhooks/whatsapp/route';

async function testLocalWebhook() {
  console.log('Testing WhatsApp Webhook POST with "Hi"...');

  // Simulate Meta Cloud API v3 inbound payload
  const mockMetaPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1417510641438661',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919319193109',
                phone_number_id: '1417510641438661',
              },
              contacts: [
                {
                  profile: { name: 'Admin User' },
                  wa_id: '919311459543',
                },
              ],
              messages: [
                {
                  from: '919311459543',
                  id: 'wamid.TEST_INBOUND_123',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Hi' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const req = new Request('http://localhost:3000/api/webhooks/whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mockMetaPayload),
  });

  try {
    const res = await POST(req);
    console.log('Webhook Response Status:', res.status);
    const data = await res.json();
    console.log('Webhook Response Body:', data);
  } catch (err) {
    console.error('Webhook Execution Error:', err);
  }
}

testLocalWebhook();
