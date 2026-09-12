import * as fs from 'fs';

const content = fs.readFileSync('app/actions/admin.actions.ts', 'utf8');
const lines = content.split('\n');
let found = 0;
lines.forEach((l, i) => {
  if (l.includes('adminUpdateFullUserAction')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
    found++;
  }
});
if (!found) console.log('adminUpdateFullUserAction not found in admin.actions.ts');
