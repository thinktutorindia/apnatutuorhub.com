import fs from 'fs';

const envPath = '.env.local';
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace('AQUA_WHATSAPP_TEMPLATE_ID="3743260"', 'AQUA_WHATSAPP_TEMPLATE_ID="3750880"');
fs.writeFileSync(envPath, env, 'utf8');
console.log('Successfully updated AQUA_WHATSAPP_TEMPLATE_ID to 3750880 in .env.local');
