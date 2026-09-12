const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const c = fs.readFileSync(srcHtmlPath, 'utf8');

const regex513 = /513/g;
let m;
while ((m = regex513.exec(c)) !== null) {
  console.log(`[Pos ${m.index}]: ${c.slice(Math.max(0, m.index - 40), m.index + 50).replace(/\n/g, ' ')}`);
}
