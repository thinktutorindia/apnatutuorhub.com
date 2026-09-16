import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { sendAquaWhatsAppMessage } from '../lib/aqua-whatsapp';

async function main() {
  console.log('Sending tuition_alert_v2 template to 9311459543...');

  const placeholders = [
    'ATH-9842',              // 1: Enquiry #
    'Pooja Sharma',           // 2: Client Name
    'Class 10 CBSE (Maths)', // 3: Class
    'Home Tuition',          // 4: Mode
    'Sector 14, Rohini, Delhi', // 5: Location
    'Rs 8,000 / month',      // 6: Fees
    'Female Tutor',          // 7: Gender Preference
    'Mon-Wed-Fri, 5:00 PM',  // 8: Schedule
  ];

  console.log('Placeholders to send:', placeholders);

  const res = await sendAquaWhatsAppMessage({
    to: '9311459543',
    mode: 'template',
    templateId: 'tuition_alert_v2',
    placeholders,
  });

  console.log('\n--- SEND RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
