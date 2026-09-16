import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { sendAquaWhatsAppMessage, getAquaWhatsAppStatus } from '../lib/aqua-whatsapp';

async function main() {
  console.log('Testing sendAquaWhatsAppMessage via lib/aqua-whatsapp.ts...');

  const status = await getAquaWhatsAppStatus();
  console.log('WhatsApp Status:', {
    enabled: status.enabled,
    hasToken: status.hasSystemToken,
    apiBase: status.apiBase,
    dailyRemaining: status.dailyRemaining,
  });

  const res = await sendAquaWhatsAppMessage({
    to: '919311459543',
    mode: 'template',
    templateId: 'information2',
    placeholders: [
      '032203',
      'Parent',
      'Class 11th',
      'Home',
      'Delhi',
      '800',
      'Any',
      'Evening',
    ],
  });

  console.log('\nsendAquaWhatsAppMessage Result:');
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
