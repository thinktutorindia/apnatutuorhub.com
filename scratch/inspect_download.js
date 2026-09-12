const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const c = fs.readFileSync(p, 'utf8');

const idx = c.indexOf('function downloadUpdatedHTML');
if (idx !== -1) {
  console.log(c.slice(idx, idx + 1200));
}
