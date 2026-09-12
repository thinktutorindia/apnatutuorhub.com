import * as fs from 'fs';

const files = ['app/actions/admin.actions.ts', 'app/actions/tutor.actions.ts', 'app/actions/onboarding.actions.ts'];
for (const f of files) {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    c.split('\n').forEach((l, i) => {
      if (l.toLowerCase().includes('geocode')) {
        console.log(`${f}:${i + 1}: ${l.trim()}`);
      }
    });
  }
}
