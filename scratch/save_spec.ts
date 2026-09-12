import fs from 'fs';

async function run() {
  const res = await fetch('https://api.pinbot.ai/documentation/json');
  const text = await res.text();
  fs.writeFileSync('scratch/pinbot_spec_full.json', text, 'utf8');
  console.log('Saved scratch/pinbot_spec_full.json, size:', text.length);
}
run().catch(console.error);
