const fs = require('fs');
const path = require('path');

const chatContent = fs.readFileSync(path.join(__dirname, '..', 'datauploadrawdata', 'parents data', 'WhatsApp Chat with all data.txt'), 'utf8');

const deletePhones = [
  { id: 'ATH-PAR-002', phone: '7942780882' },
  { id: 'ATH-PAR-042', phone: '8383851908' },
  { id: 'ATH-PAR-068', phone: '9643277845' },
  { id: 'ATH-PAR-168', phone: '9625199799' },
  { id: 'ATH-PAR-333', phone: '9971055503' },
  { id: 'ATH-PAR-358', phone: '9716377690' },
  { id: 'ATH-PAR-360', phone: '9871582885' },
  { id: 'ATH-PAR-415', phone: '9625634002' },
  { id: 'ATH-PAR-427', phone: '9310863971' },
];

console.log('--- Context for leads marked "Delete this Rohit" ---');
deletePhones.forEach(({ id, phone }) => {
  console.log(`\n=== Checking ${id} (${phone}) ===`);
  const lines = chatContent.split('\n');
  let matches = [];
  lines.forEach((l, i) => {
    if (l.includes(phone)) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 5);
      matches.push(lines.slice(start, end).join('\n'));
    }
  });
  if (matches.length === 0) {
    console.log('No direct match in WhatsApp chat (might be from an older sheet or cancelled)');
  } else {
    console.log(matches.slice(0, 2).join('\n---\n'));
  }
});
