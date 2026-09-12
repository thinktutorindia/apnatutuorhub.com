const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const leads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Total leads:', leads.length);
const locMap = {};
leads.forEach(l => {
  if (l.mode !== 'ONLINE' && !l.location.includes('Online')) {
    locMap[l.location] = (locMap[l.location] || 0) + 1;
  }
});

console.log('Unique offline locations count:', Object.keys(locMap).length);
console.log('\nTop 25 most frequent offline locations:');
const sorted = Object.entries(locMap).sort((a,b) => b[1] - a[1]);
sorted.slice(0, 25).forEach(([loc, cnt]) => console.log(`- (${cnt}) ${loc}`));
