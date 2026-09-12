import * as fs from 'fs';

const content = fs.readFileSync('components/admin/AdminEditUserForm.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 1040; i < 1100; i++) {
  console.log(i + 1, lines[i]);
}
