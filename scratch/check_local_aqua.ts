import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';

const cfg = getAquaWhatsAppConfig();
console.log('--- AQUA WHATSAPP (.env.local) ---');
console.log('Enabled:', cfg.enabled);
console.log('API Base:', cfg.apiBase);
console.log('Has System Token:', Boolean(cfg.systemToken));
console.log('Has Username:', Boolean(cfg.username));
console.log('From Number:', cfg.fromNumber ? `${cfg.fromNumber.slice(0, 4)}...${cfg.fromNumber.slice(-4)}` : '(none)');
console.log('Default Template ID:', cfg.defaultTemplateId || '(none)');
console.log('Daily Cap:', cfg.dailyTestCap);
