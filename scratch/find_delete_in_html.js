const fs = require('fs');
const html = fs.readFileSync('datauploadrawdata/today_parents_dashboard_upload.html', 'utf8');

let match;
const regex = /delete\s*this/gi;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  const start = Math.max(0, match.index - 80);
  const end = Math.min(html.length, match.index + 120);
  console.log(`[Occurrence ${count} at pos ${match.index}]:`);
  console.log(html.slice(start, end).replace(/\n/g, ' '));
  console.log('---');
}
