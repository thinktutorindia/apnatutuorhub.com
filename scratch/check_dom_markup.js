const fs = require('fs');
const path = require('path');

const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const content = fs.readFileSync(updatedPath, 'utf8');

// Check card 7 (ATH-PAR-008) in HTML markup
const matchCard7 = content.match(/data-lead-id="ATH-PAR-008"[\s\S]*?<\/div>\s*<\/div>/);
if (matchCard7) {
  console.log('--- Card ATH-PAR-008 in HTML markup ---');
  console.log(matchCard7[0].slice(0, 400));
} else {
  console.log('Card ATH-PAR-008 not found by data-lead-id');
  // Check if leadId is in card
  const idx = content.indexOf('ATH-PAR-008');
  if (idx !== -1) {
    console.log('Context around ATH-PAR-008:');
    console.log(content.slice(idx - 100, idx + 400));
  }
}
