const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');
const c = fs.readFileSync(p, 'utf8');

const cardStart = c.indexOf('class="lead-card"');
if (cardStart !== -1) {
  const divStart = c.lastIndexOf('<div', cardStart);
  const nextCard = c.indexOf('class="lead-card"', cardStart + 20);
  const nextDivStart = c.lastIndexOf('<div', nextCard);
  console.log('--- Sample Lead Card HTML ---');
  console.log(c.slice(divStart, nextDivStart));
}
