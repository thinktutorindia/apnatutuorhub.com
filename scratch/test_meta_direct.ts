import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';

async function testMetaDirect() {
  const cfg = getAquaWhatsAppConfig();
  console.log('Testing Meta Graph API directly...');

  const token = cfg.systemToken;
  const phoneId = cfg.phoneNumberId;

  // 1. GET fields
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=verified_name,display_phone_number,webhook_configuration`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Meta GET status:', res.status);
    const body = await res.json();
    console.log('Meta GET body:', body);
  } catch (e: any) {
    console.error('Meta GET error:', e.message);
  }
}

testMetaDirect();
