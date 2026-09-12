import * as fs from 'fs';

for (const envFile of ['.env', '.env.local', '.env.production']) {
  if (fs.existsSync(envFile)) {
    console.log(`Checking ${envFile}:`);
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    lines.forEach((l) => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const key = trimmed.split('=')[0].trim();
        if (
          key.includes('WHATSAPP') ||
          key.includes('WATI') ||
          key.includes('SMS') ||
          key.includes('RESEND') ||
          key.includes('AWS') ||
          key.includes('AQUA')
        ) {
          console.log('  ', key);
        }
      }
    });
  }
}
