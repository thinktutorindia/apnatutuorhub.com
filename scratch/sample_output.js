const fs = require('fs');
const path = require('path');

const leads = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json'), 'utf8'));

console.log('Sample 15 enriched leads:');
leads.slice(0, 15).forEach(l => {
  console.log(`[${l.leadId}] ${l.classes} · ${l.subjects} · ${l.location} · ${l.budgetFee}`);
});
