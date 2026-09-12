import * as fs from 'fs';

const content = fs.readFileSync('components/admin/AdminEditUserForm.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('parentAddress') || l.includes('parentCity') || l.includes('parentLat')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
