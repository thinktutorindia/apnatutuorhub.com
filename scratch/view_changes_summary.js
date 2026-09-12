const fs = require('fs');
const path = require('path');

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'leads_diff_summary.json'), 'utf8'));

console.log('Sample updated locations:');
const locChanges = summary.changes.filter(c => c.changes.some(x => x.field === 'location'));
locChanges.slice(0, 30).forEach(c => {
  const ch = c.changes.find(x => x.field === 'location');
  console.log(`- [${c.leadId}] "${ch.from}" -> "${ch.to}"`);
});

console.log('\nAll Class / Subject / Budget changes:');
const nonLoc = summary.changes.filter(c => c.changes.some(x => x.field !== 'location'));
nonLoc.forEach(c => {
  console.log(`\nLead ${c.leadId} (${c.phone}):`);
  c.changes.forEach(ch => {
    console.log(`  ${ch.field}: "${ch.from}" -> "${ch.to}"`);
  });
});
