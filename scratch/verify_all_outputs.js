const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const publicHtmlPath = path.join(__dirname, '..', 'public', 'today_parents_dashboard_upload.html');
const jsonPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
const csvPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.csv');

console.log('=== VERIFICATION OF ALL OUTPUTS ===\n');

// 1. Check file existence and size
console.log('1. Checking File Existence & Sizes:');
console.log('  Dashboard (dataupload):', fs.statSync(htmlPath).size, 'bytes');
console.log('  Dashboard (public):    ', fs.statSync(publicHtmlPath).size, 'bytes');
console.log('  JSON dataset:          ', fs.statSync(jsonPath).size, 'bytes');
console.log('  CSV dataset:           ', fs.statSync(csvPath).size, 'bytes');

// 2. Hash check parity between datauploadrawdata and public
const h1 = fs.readFileSync(htmlPath);
const h2 = fs.readFileSync(publicHtmlPath);
console.log('  Parity match:', h1.equals(h2) ? '✓ EXACT PARITY (MATCH)' : '✗ MISMATCH');

// 3. Check for any "Delete" markers in the files
const htmlStr = h1.toString('utf8');
const jsonStr = fs.readFileSync(jsonPath, 'utf8');
const csvStr = fs.readFileSync(csvPath, 'utf8');

const deleteInHtml = (htmlStr.match(/delete\s*this/gi) || []).length;
const deleteInJson = (jsonStr.match(/delete\s*this/gi) || []).length;
const deleteInCsv = (csvStr.match(/delete\s*this/gi) || []).length;

console.log('\n2. Checking for Deleted/Junk Markers ("Delete this Rohit" / "Delete this"):');
console.log('  In HTML:', deleteInHtml === 0 ? '✓ 0 (CLEAN)' : `✗ ${deleteInHtml} found`);
console.log('  In JSON:', deleteInJson === 0 ? '✓ 0 (CLEAN)' : `✗ ${deleteInJson} found`);
console.log('  In CSV: ', deleteInCsv === 0 ? '✓ 0 (CLEAN)' : `✗ ${deleteInCsv} found`);

// 4. Verify JSON and Array length
const leads = JSON.parse(jsonStr);
console.log('\n3. Lead Count Verification:');
console.log(`  Total Leads: ${leads.length}`);
console.log(`  First Lead: ${leads[0].leadId} (${leads[0].phone})`);
console.log(`  Last Lead:  ${leads[leads.length - 1].leadId} (${leads[leads.length - 1].phone})`);

// 5. Fee Structure Verification
console.log('\n4. Fee Structure Adherence:');
const feeBands = {};
leads.forEach(l => {
  feeBands[l.budgetFee] = (feeBands[l.budgetFee] || 0) + 1;
});
console.table(feeBands);

// Check if any fees fall outside the 4 allowed bands
const allowedFees = [
  '₹5,500 – ₹6,500 / month',
  '₹6,000 – ₹8,000 / month',
  '₹500 – ₹800 / hour',
  '₹600 – ₹1,000 / hour'
];
const nonStandardFees = leads.filter(l => !allowedFees.includes(l.budgetFee));
console.log(`  Non-standard fees count: ${nonStandardFees.length} (Expected: 0)`);

// 6. Online Mode Strictness & Class 1-5 avoidance
console.log('\n5. Online Mode Verification:');
const onlineLeads = leads.filter(l => l.mode === 'ONLINE' || l.isOnline);
console.log(`  Total Online Leads: ${onlineLeads.length}`);
const nonStrictOnlineLocs = onlineLeads.filter(l => !l.location.toLowerCase().includes('online'));
console.log(`  Online leads without 'Online' in location: ${nonStrictOnlineLocs.length} (Expected: 0)`);

const online1to5 = onlineLeads.filter(l => {
  const cls = (l.classes || '').toLowerCase();
  return cls.includes('1st') || cls.includes('2nd') || cls.includes('3rd') || 
         cls.includes('4th') || cls.includes('5th') || cls.includes('nursery') || cls.includes('kg');
});
console.log(`  Online Leads with Class 1-5 (Should be 0): ${online1to5.length} ${online1to5.length === 0 ? '✓ PASS' : '✗ FAIL'}`);
if (online1to5.length > 0) {
  online1to5.forEach(l => console.log('   Issue:', l.leadId, l.classes, l.location));
}

// Tutor Preference / Gender Duplication Check
console.log('\n6. Tutor Preference & Gender Duplication Verification:');
const femaleLeads = leads.filter(l => (l.tutorPreference || '').toLowerCase().includes('female'));
const maleLeads = leads.filter(l => (l.tutorPreference || '').toLowerCase().includes('male') && !(l.tutorPreference || '').toLowerCase().includes('female'));
const anyTutorLeads = leads.filter(l => (l.tutorPreference || '').toLowerCase().includes('any'));

console.log(`  Female Tutor Only leads: ${femaleLeads.length}`);
console.log(`  Male Tutor Preferred leads: ${maleLeads.length}`);
console.log(`  Any Tutor leads: ${anyTutorLeads.length}`);
console.log(`  Total Tutor preferences sum: ${femaleLeads.length + maleLeads.length + anyTutorLeads.length} / ${leads.length}`);

// 7. Language & Music Duplication Verification
console.log('\n7. Language & Skill Duplication Verification:');
const languageOrSkillLeads = leads.filter(l => 
  l.subjects?.match(/(french|german|spanish|sanskrit|guitar|dance|music)/i)
);
console.log(`  Specialized Skill / Language Leads: ${languageOrSkillLeads.length}`);

// 8. Sensitive House Numbers Check
console.log('\n8. Address Privacy Check (No full house/door numbers):');
const houseNumLeads = leads.filter(l => 
  l.location?.match(/(house\s*no|h\.?\s*no|flat\s*no|plot\s*no|qtr\.?\s*no|door\s*no|\bhn\b)/i)
);
console.log(`  Leads with raw house/door numbers: ${houseNumLeads.length} (Expected: 0)`);
if (houseNumLeads.length > 0) {
  houseNumLeads.forEach(l => console.log('   Issue in:', l.leadId, l.location));
}

// 9. JavaScript Syntax Check in Node VM
console.log('\n9. Dashboard Script VM Execution Check:');
const scriptMatch = htmlStr.match(/<script>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  const sandbox = {
    window: { addEventListener: () => {}, location: { reload: () => {} } },
    document: {
      addEventListener: () => {},
      getElementById: () => ({ addEventListener: () => {}, innerHTML: '', textContent: '', value: '', style: { setProperty: () => {} } }),
      querySelectorAll: () => [],
      querySelector: () => null,
      documentElement: { outerHTML: '' },
      body: { appendChild: () => {}, removeChild: () => {} }
    },
    navigator: { clipboard: { writeText: () => {} } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console: console,
    encodeURIComponent: encodeURIComponent,
    alert: () => {},
    confirm: () => true
  };
  vm.createContext(sandbox);
  try {
    vm.runInContext(scriptMatch[1], sandbox);
    console.log('  VM Execution: ✓ PASSED WITH 0 ERRORS');
    console.log('  VM allLeads length:', sandbox.allLeads ? sandbox.allLeads.length : 'none');
  } catch (err) {
    console.error('  VM Execution Error:', err.message);
  }
}

console.log('\n=== ALL AUDIT CHECKS COMPLETE ===');
