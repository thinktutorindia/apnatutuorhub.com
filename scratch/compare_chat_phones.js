const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'WhatsApp Chat with all data.txt');
const updatedHtmlPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'today_parents_dashboard_updated_2026-09-11 (1).html');

const chatContent = fs.readFileSync(chatPath, 'utf8');
const htmlContent = fs.readFileSync(updatedHtmlPath, 'utf8');

const leadsMatch = htmlContent.match(/const\s+allLeads\s*=\s*(\[[\s\S]*?\]);\s*\n/);
const leads = JSON.parse(leadsMatch[1]);

// Extract all 10-digit Indian phone numbers from chat
const phoneRegex = /(?:\+91[\s-]?)?([6-9]\d{9})/g;
const chatPhones = new Set();
let m;
while ((m = phoneRegex.exec(chatContent)) !== null) {
  chatPhones.add(m[1]);
}

// Extract normalized phones from 513 leads
const leadPhones = new Set();
leads.forEach(l => {
  const digits = (l.phone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    leadPhones.add(digits.slice(-10));
  }
});

console.log('Unique 10-digit phones found in WhatsApp Chat:', chatPhones.size);
console.log('Unique phones in 513 leads:', leadPhones.size);

// Check overlap
let overlap = 0;
chatPhones.forEach(p => {
  if (leadPhones.has(p)) overlap++;
});

console.log(`Phones in WhatsApp Chat matching 513 leads: ${overlap} / ${leadPhones.size}`);

// Tutors vs parents in chat
const tutorLines = chatContent.split('\n').filter(l => l.match(/\b(tutor|female teacher|male teacher|cv|resume|experience)\b/i)).length;
const parentLines = chatContent.split('\n').filter(l => l.match(/\b(parent|parents|require|need tutor|home tutor)\b/i)).length;
console.log('Lines mentioning tutor keywords in chat:', tutorLines);
console.log('Lines mentioning parent keywords in chat:', parentLines);
