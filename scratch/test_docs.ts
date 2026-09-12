import http from 'http';
import https from 'https';

async function testUrls() {
  const urls = [
    'http://68.183.90.255:5976/documentation/static/index.html',
    'https://verified.aquasms.com/documentation',
    'https://verified.aquasms.com/api-doc',
    'https://api.pinbot.ai/documentation',
    'https://api.pinbot.ai/docs',
    'https://api.pinbot.ai/swagger',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(4000) });
      console.log(u, '-> Status:', res.status);
    } catch (e: any) {
      console.log(u, '-> Error:', e.message);
    }
  }
}

testUrls().catch(console.error);
