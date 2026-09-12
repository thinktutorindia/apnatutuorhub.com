const fs = require('fs');
const path = require('path');

const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const content = fs.readFileSync(updatedPath, 'utf8');

const match = content.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const leads = JSON.parse(match[1]);

console.log('Total leads:', leads.length);

const targets = leads.filter(l => 
  l.subjects?.match(/(french|german|spanish|japanese|sanskrit|guitar|music|dance|piano|violin)/i) ||
  l.classes?.match(/(french|german|spanish|guitar|music|dance)/i)
);

console.log('Total targets for duplication check:', targets.length);

targets.forEach((l, i) => {
  console.log(`[${i+1}] ${l.leadId} | Phone: ${l.phone} | Subj: "${l.subjects}" | Classes: "${l.classes}" | Loc: "${l.location}" | Fee: "${l.budgetFee}"`);
});
