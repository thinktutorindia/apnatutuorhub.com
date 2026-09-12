import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { getAquaWhatsAppStatus } from '../lib/aqua-whatsapp';

async function check() {
  const status = await getAquaWhatsAppStatus();
  console.log('Aqua WhatsApp Status:', status);
}

check().catch(console.error);
