const fs = require('fs');
const path = require('path');

const srcHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const rawHtml = fs.readFileSync(srcHtmlPath, 'utf8');

const feedStart = rawHtml.indexOf('id="cardsFeed"');
const feedDivStart = rawHtml.lastIndexOf('<div', feedStart);
console.log('cardsFeed start at index:', feedDivStart);

// Let's find where cardsFeed ends
// It is followed by the table section or similar
const tableStart = rawHtml.indexOf('id="leadsTable"');
console.log('leadsTable start at index:', tableStart);
console.log('Snippet between end of cards and table:');
console.log(rawHtml.slice(tableStart - 300, tableStart + 100));

const tbodyStart = rawHtml.indexOf('<tbody id="tableBody"');
const tbodyEnd = rawHtml.indexOf('</tbody>', tbodyStart);
console.log('tableBody range:', tbodyStart, 'to', tbodyEnd);

const scriptStart = rawHtml.indexOf('<script>');
console.log('scriptStart at:', scriptStart);
console.log('Snippet between end of table and script:');
console.log(rawHtml.slice(scriptStart - 200, scriptStart + 100));
