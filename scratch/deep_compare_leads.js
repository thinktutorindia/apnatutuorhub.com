const fs = require('fs');
const path = require('path');

const origPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');

function extractLeads(htmlContent) {
  const match = htmlContent.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
  if (!match) {
    // Try alternate regex
    const m2 = htmlContent.match(/allLeads\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
    if (m2) return JSON.parse(m2[1]);
    return null;
  }
  return JSON.parse(match[1]);
}

function extractStaffEdits(htmlContent) {
  const match = htmlContent.match(/staffEdits\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch(e) {}
  }
  return null;
}

const cOrig = fs.readFileSync(origPath, 'utf8');
const cUpdated = fs.readFileSync(updatedPath, 'utf8');

const leadsOrig = extractLeads(cOrig);
const leadsUpdated = extractLeads(cUpdated);

console.log('--- Leads Extraction ---');
console.log('Orig leads count:', leadsOrig ? leadsOrig.length : 'NOT FOUND');
console.log('Updated leads count:', leadsUpdated ? leadsUpdated.length : 'NOT FOUND');

if (leadsOrig && leadsUpdated) {
  let differences = [];
  let locationDiffs = 0;
  let subjectDiffs = 0;
  let classDiffs = 0;
  let otherDiffs = 0;

  for (let i = 0; i < Math.max(leadsOrig.length, leadsUpdated.length); i++) {
    const o = leadsOrig[i];
    const u = leadsUpdated[i];
    if (!o || !u) {
      differences.push({ index: i, type: 'missing', o, u });
      continue;
    }

    const diff = {};
    for (const key of Object.keys(u)) {
      if (JSON.stringify(o[key]) !== JSON.stringify(u[key])) {
        diff[key] = { from: o[key], to: u[key] };
        if (key === 'location') locationDiffs++;
        else if (key === 'subjects') subjectDiffs++;
        else if (key === 'classes') classDiffs++;
        else otherDiffs++;
      }
    }
    if (Object.keys(diff).length > 0) {
      differences.push({ index: i, leadId: u.leadId, phone: u.phone, diff });
    }
  }

  console.log('\n--- Differences between original and updated HTML ---');
  console.log('Total leads with changes:', differences.length);
  console.log(`Location changes: ${locationDiffs}`);
  console.log(`Subject changes: ${subjectDiffs}`);
  console.log(`Class changes: ${classDiffs}`);
  console.log(`Other changes: ${otherDiffs}`);

  console.log('\nFirst 15 sample differences:');
  differences.slice(0, 15).forEach((d) => {
    console.log(`\n[Lead ${d.index} | ${d.leadId} | ${d.phone}]`);
    for (const [k, v] of Object.entries(d.diff)) {
      console.log(`  ${k}: "${v.from}" -> "${v.to}"`);
    }
  });

  // Check if any leads have _isEdited
  const editedFlags = leadsUpdated.filter(l => l._isEdited || l.isEdited);
  console.log('\nLeads with isEdited flag:', editedFlags.length);
}

// Check staffEdits variable in updated file
const editsFound = extractStaffEdits(cUpdated);
console.log('staffEdits object found:', editsFound ? Object.keys(editsFound).length : 'none');
