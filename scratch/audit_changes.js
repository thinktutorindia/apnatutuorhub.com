const fs = require('fs');
const path = require('path');

const origPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');

function extractLeads(htmlContent) {
  const match = htmlContent.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
  return match ? JSON.parse(match[1]) : null;
}

const cOrig = fs.readFileSync(origPath, 'utf8');
const cUpdated = fs.readFileSync(updatedPath, 'utf8');

const leadsOrig = extractLeads(cOrig);
const leadsUpdated = extractLeads(cUpdated);

const changes = [];
leadsUpdated.forEach((u, i) => {
  const o = leadsOrig[i];
  const leadChanges = [];
  ['location', 'subjects', 'classes', 'budgetFee', 'parentName', 'studentName', 'notes'].forEach(k => {
    if (o[k] !== u[k]) {
      leadChanges.push({ field: k, from: o[k], to: u[k] });
    }
  });
  if (leadChanges.length > 0) {
    changes.push({ index: i, leadId: u.leadId, phone: u.phone, changes: leadChanges });
  }
});

console.log(`Total Leads Changed: ${changes.length} / ${leadsUpdated.length}`);

// Category breakdown
const locationChanges = changes.filter(c => c.changes.some(x => x.field === 'location'));
const classChanges = changes.filter(c => c.changes.some(x => x.field === 'classes'));
const feeChanges = changes.filter(c => c.changes.some(x => x.field === 'budgetFee'));
const subjectChanges = changes.filter(c => c.changes.some(x => x.field === 'subjects'));
const notesChanges = changes.filter(c => c.changes.some(x => x.field === 'notes'));

console.log(`- Location updated: ${locationChanges.length}`);
console.log(`- Classes updated: ${classChanges.length}`);
console.log(`- Fee / Budget updated: ${feeChanges.length}`);
console.log(`- Subjects updated: ${subjectChanges.length}`);
console.log(`- Notes updated: ${notesChanges.length}`);

// Check for delete requests or special notes
const deleteLeads = changes.filter(c => JSON.stringify(c).toLowerCase().includes('delete') || JSON.stringify(c).toLowerCase().includes('junk') || JSON.stringify(c).toLowerCase().includes('remove'));
console.log('\n--- Leads with "delete" or "remove" markers ---');
deleteLeads.forEach(d => {
  console.log(`Lead ${d.index} (${d.leadId}, ${d.phone}):`, d.changes);
});

// Check location patterns: Delhi NCR vs Outside vs Online
let onlineCount = 0;
let outsideNcrCount = 0;
let specificDelhiNcr = 0;

leadsUpdated.forEach((l, i) => {
  const loc = (l.location || '').toLowerCase();
  if (loc.includes('online')) onlineCount++;
  else if (loc.includes('himachal') || loc.includes('shimla') || loc.includes('mumbai') || loc.includes('nerul') || loc.includes('pune') || loc.includes('bihar') || loc.includes('patna')) {
    outsideNcrCount++;
  } else {
    specificDelhiNcr++;
  }
});

console.log('\n--- Location distribution in updated file ---');
console.log(`Online: ${onlineCount}`);
console.log(`Outside NCR detected: ${outsideNcrCount}`);
console.log(`Delhi NCR: ${specificDelhiNcr}`);

// Save summary of all changes to scratch/leads_diff_summary.json for reference
fs.writeFileSync(
  path.join(__dirname, 'leads_diff_summary.json'),
  JSON.stringify({ totalChanges: changes.length, changes }, null, 2)
);
console.log('\nWrote full changes details to scratch/leads_diff_summary.json');
