const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const leads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Total leads currently:', leads.length);

// 1. Online leads with Class 1-5
const online1to5 = leads.filter(l => {
  const isOnline = l.mode === 'ONLINE' || (l.location || '').includes('Online') || l.isOnline;
  if (!isOnline) return false;
  const cls = (l.classes || '').toLowerCase();
  return cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') || cls.includes('5th') || cls.includes('nursery') || cls.includes('kg');
});

console.log('Online leads with Class 1 to 5:', online1to5.length);
online1to5.forEach(l => console.log(`- [${l.leadId}] ${l.classes} | ${l.subjects} | ${l.location}`));

// 2. Leads with Female Tutor Requirement
const femalePrefLeads = leads.filter(l => {
  const pref = (l.tutorPreference || '').toLowerCase();
  const notes = (l.notes || '').toLowerCase();
  const raw = (l.rawEnquiry || '').toLowerCase();
  return pref.includes('female') || notes.includes('female') || raw.includes('female');
});

console.log('\nLeads with Female Tutor preference:', femalePrefLeads.length);
femalePrefLeads.slice(0, 15).forEach(l => {
  console.log(`- [${l.leadId}] pref="${l.tutorPreference}", notes="${l.notes?.slice(0, 60)}", raw="${l.rawEnquiry?.slice(0, 60)}"`);
});
