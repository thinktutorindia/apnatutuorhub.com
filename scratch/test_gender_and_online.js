const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const leads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Original count:', leads.length);

// 1. Process Online 1-5 leads -> upgrade to Class 6, 7, 8
const upgradedClasses = ['Class 6th', 'Class 7th', 'Class 8th'];
let onlineUpgradeCount = 0;

leads.forEach(l => {
  const isOnline = l.mode === 'ONLINE' || (l.location || '').includes('Online') || l.isOnline;
  if (isOnline) {
    const cls = (l.classes || '').toLowerCase();
    if (cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') || cls.includes('5th') || cls.includes('nursery') || cls.includes('kg')) {
      const newClass = upgradedClasses[onlineUpgradeCount % upgradedClasses.length];
      console.log(`Upgrading Online lead [${l.leadId}]: "${l.classes}" -> "${newClass}"`);
      l.classes = newClass;
      l.budgetFee = '₹6,000 – ₹8,000 / month';
      onlineUpgradeCount++;
    }
  }
});

console.log(`Upgraded ${onlineUpgradeCount} online leads to Class 6th / 7th / 8th.`);

// 2. Duplicate female tutor requirements for male tutors
const processedLeads = [];
let femaleDuplicatedCount = 0;

leads.forEach(l => {
  const pref = (l.tutorPreference || '').trim();
  const isFemaleOnly = pref.toLowerCase().includes('female');

  if (isFemaleOnly) {
    femaleDuplicatedCount++;
    // Lead 1: Female Tutor Only
    const femaleLead = {
      ...l,
      tutorPreference: 'Female Tutor Only',
      _splitGender: 'FEMALE'
    };

    // Lead 2: Male Tutor Only
    const maleLead = {
      ...l,
      tutorPreference: 'Male Tutor Preferred',
      _splitGender: 'MALE'
    };

    processedLeads.push(femaleLead);
    processedLeads.push(maleLead);
  } else {
    processedLeads.push(l);
  }
});

console.log(`Female-only leads duplicated: ${femaleDuplicatedCount}`);
console.log(`Total leads after gender duplication: ${processedLeads.length}`);

// Re-index sequentially
processedLeads.forEach((l, idx) => {
  const num = String(idx + 1).padStart(3, '0');
  l.leadId = `ATH-PAR-${num}`;
  l.inquiryNumber = idx + 1;
});

console.log(`First lead: ${processedLeads[0].leadId}, Last lead: ${processedLeads[processedLeads.length - 1].leadId}`);

// Verify gender preference counts
const prefMap = {};
processedLeads.forEach(l => {
  prefMap[l.tutorPreference] = (prefMap[l.tutorPreference] || 0) + 1;
});
console.log('Tutor preference distributions:');
console.table(prefMap);

// Verify no online 1-5 leads remain
const checkOnline1to5 = processedLeads.filter(l => {
  const isOnline = l.mode === 'ONLINE' || (l.location || '').includes('Online') || l.isOnline;
  if (!isOnline) return false;
  const cls = (l.classes || '').toLowerCase();
  return cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || cls.includes('4th') || cls.includes('5th') || cls.includes('nursery') || cls.includes('kg');
});
console.log('Remaining Online Class 1-5 leads:', checkOnline1to5.length, '(Expected: 0)');
