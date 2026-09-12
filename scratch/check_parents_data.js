const fs = require('fs');
const path = require('path');

const origPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const updatedPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const chatPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'WhatsApp Chat with all data.txt');

console.log('=== Checking files in parents data ===');
console.log('Updated HTML exists:', fs.existsSync(updatedPath), 'size:', fs.statSync(updatedPath).size);
console.log('WhatsApp Chat exists:', fs.existsSync(chatPath), 'size:', fs.statSync(chatPath).size);

const cUpdated = fs.readFileSync(updatedPath, 'utf8');
const cOrig = fs.readFileSync(origPath, 'utf8');

console.log('\n--- Searching for script or JSON data in updated HTML ---');
const allLeadsIndices = [];
let pos = 0;
while ((pos = cUpdated.indexOf('allLeads', pos)) !== -1) {
  allLeadsIndices.push(pos);
  pos += 8;
}
console.log('Occurrences of "allLeads":', allLeadsIndices.length);
if (allLeadsIndices.length > 0) {
  for (const idx of allLeadsIndices.slice(0, 5)) {
    console.log(`[Around index ${idx}]:`, cUpdated.slice(Math.max(0, idx - 50), idx + 150).replace(/\n/g, ' '));
  }
}

// Check for script tags
const scriptMatches = cUpdated.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('\nTotal <script> tags in updated file:', scriptMatches.length);
scriptMatches.forEach((s, i) => {
  console.log(`Script ${i} length: ${s.length}, snippet:`, s.slice(0, 100).replace(/\n/g, ' '));
});

// Check for lead card count
const cardsUpdated = (cUpdated.match(/class="[^"]*lead-card[^"]*"/gi) || []).length;
const cardsOrig = (cOrig.match(/class="[^"]*lead-card[^"]*"/gi) || []).length;
console.log('\nLead card element counts:');
console.log('Orig:', cardsOrig);
console.log('Updated:', cardsUpdated);

// Check WhatsApp chat head/tail
const chatContent = fs.readFileSync(chatPath, 'utf8');
console.log('\nWhatsApp chat total lines:', chatContent.split('\n').length);
console.log('First 5 lines of chat:');
console.log(chatContent.split('\n').slice(0, 5).join('\n'));
