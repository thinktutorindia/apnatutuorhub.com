const fs = require('fs');
const path = require('path');

const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const content = fs.readFileSync(updatedPath, 'utf8');

const match = content.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const leads = JSON.parse(match[1]);

console.log('Total leads initially:', leads.length);

// 1. Leads with delete marker
const deleteLeads = leads.filter(l => 
  JSON.stringify(l).toLowerCase().includes('delete') ||
  JSON.stringify(l).toLowerCase().includes('remove')
);
console.log('Leads marked for deletion:', deleteLeads.length);
deleteLeads.forEach(l => console.log(`- ${l.leadId} (${l.phone}): classes="${l.classes}", loc="${l.location}", fee="${l.budgetFee}"`));

// 2. Leads with Language
const languageLeads = leads.filter(l => 
  l.subjects?.match(/(french|german|spanish|japanese|sanskrit|foreign|language)/i) ||
  l.classes?.match(/(french|german|spanish|japanese|sanskrit|foreign|language)/i) ||
  l.notes?.match(/(french|german|spanish|japanese|sanskrit|foreign|language)/i)
);
console.log('\nLeads with Foreign Languages / Sanskrit:', languageLeads.length);
languageLeads.forEach(l => {
  console.log(`- ${l.leadId}: subj="${l.subjects}", class="${l.classes}", notes="${l.notes?.slice(0, 80)}"`);
});

// 3. Leads with Music / Guitar / Dance / Arts
const musicLeads = leads.filter(l => 
  l.subjects?.match(/(music|guitar|dance|piano|singing|art|drawing|painting)/i) ||
  l.classes?.match(/(music|guitar|dance|piano|singing|art|drawing|painting)/i) ||
  l.notes?.match(/(music|guitar|dance|piano|singing|art|drawing|painting)/i)
);
console.log('\nLeads with Music / Guitar / Dance / Arts:', musicLeads.length);
musicLeads.forEach(l => {
  console.log(`- ${l.leadId}: subj="${l.subjects}", class="${l.classes}", notes="${l.notes?.slice(0, 80)}"`);
});

// 4. Leads with Full Address (House #, Plot #, Flat #, Street #)
const fullAddressLeads = leads.filter(l => 
  l.location?.match(/(house\s*no|h\.?\s*no|flat\s*no|plot\s*no|qtr\.?\s*no|c\s*\d+|b\d+\/\d+|\d+\/\d+|block\s*[a-z]\s*,\s*house|\b\d{2,4}\b.*road|\b\d{2,4}\b.*lane|\b\d{2,4}\b.*colony)/i)
);
console.log('\nLeads with raw house/door address numbers:', fullAddressLeads.length);
fullAddressLeads.slice(0, 15).forEach(l => {
  console.log(`- ${l.leadId}: loc="${l.location}"`);
});

// 5. Leads marked Online
const onlineLeads = leads.filter(l => 
  l.location?.match(/online/i) || l.classes?.match(/online/i) || l.mode?.match(/online/i) || l.notes?.match(/online/i)
);
console.log('\nLeads with Online reference:', onlineLeads.length);
