import * as fs from 'fs';

const content = fs.readFileSync('components/admin/AdminEditUserForm.tsx', 'utf8');
const lines = content.split('\n').slice(593, 1046);
lines.forEach((l, i) => {
  if (l.includes('name="') || l.includes("name='")) {
    console.log(`Line ${594 + i}: ${l.trim()}`);
  }
});
