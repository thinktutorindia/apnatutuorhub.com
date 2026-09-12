const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const c = fs.readFileSync(srcHtmlPath, 'utf8');

const allLeadsStartIndex = c.indexOf('const allLeads = [');
const allLeadsEndIndex = c.indexOf('];\n', allLeadsStartIndex) + 2;

console.log('allLeadsStartIndex:', allLeadsStartIndex, c.slice(allLeadsStartIndex, allLeadsStartIndex + 70));
console.log('allLeadsEndIndex:', allLeadsEndIndex, c.slice(allLeadsEndIndex - 70, allLeadsEndIndex));
