import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { sendAquaWhatsAppMessage } from '../lib/aqua-whatsapp';

async function main() {
  const targetPhone = '919311459543';
  console.log(`Sending WhatsApp message to ${targetPhone}...`);

  const result = await sendAquaWhatsAppMessage({
    to: targetPhone,
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

  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
