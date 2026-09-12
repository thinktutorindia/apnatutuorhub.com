const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_dashboard_upload.html');
const c = fs.readFileSync(p, 'utf8');

const feedIdx = c.indexOf('id="cardsFeed"');
console.log('Context around cardsFeed:');
console.log(c.slice(feedIdx, feedIdx + 500));

const tableIdx = c.indexOf('id="leadsTable"');
console.log('\nContext around leadsTable:');
console.log(c.slice(tableIdx, tableIdx + 500));
