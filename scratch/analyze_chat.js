const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'WhatsApp Chat with all data.txt');
const content = fs.readFileSync(chatPath, 'utf8');
const lines = content.split('\n');

console.log('Total chat lines:', lines.length);

// Let's sample 30 messages across the file to understand what this chat is
console.log('\n--- Sample messages from beginning ---');
for (let i = 0; i < Math.min(lines.length, 40); i++) {
  if (lines[i].trim()) console.log(lines[i].slice(0, 120));
}

console.log('\n--- Sample messages from middle ---');
const mid = Math.floor(lines.length / 2);
for (let i = mid; i < mid + 30; i++) {
  if (lines[i].trim()) console.log(lines[i].slice(0, 120));
}

console.log('\n--- Sample messages from end ---');
for (let i = Math.max(0, lines.length - 40); i < lines.length; i++) {
  if (lines[i].trim()) console.log(lines[i].slice(0, 120));
}

// Search for patterns: parent requirements, "Class", "Subject", "Location", "Delhi", phone numbers
let reqCount = 0;
const reqSnippets = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/(requirement|require|class|subject|tutor|parent|budget|location|mode)/i) && line.length > 30) {
    reqCount++;
    if (reqSnippets.length < 15) {
      reqSnippets.push(`Line ${i}: ${line.slice(0, 150)}`);
    }
  }
}
console.log('\nPotential requirement lines found:', reqCount);
console.log('Sample requirement lines:');
reqSnippets.forEach(s => console.log(s));
