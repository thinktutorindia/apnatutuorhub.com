import crypto from 'crypto';

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha1(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}

async function run() {
  const getRes = await fetch('https://verified.aquasms.com/login');
  const text = await getRes.text();
  const csrfToken = text.match(/name="_token"\s+value="([^"]+)"/)?.[1] || '';
  const salt = text.match(/var\s+salt\s*=\s*'([^']+)'/)?.[1] || '';

  const rawCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [getRes.headers.get('set-cookie') || ''];
  let cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';
  const passHashed = sha1(salt + md5(password));

  const params = new URLSearchParams();
  params.append('_token', csrfToken);
  params.append('inputEmailAddress', username);
  params.append('inputPassword', passHashed);

  const authRes = await fetch('https://verified.aquasms.com/authenticate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader,
      'Referer': 'https://verified.aquasms.com/login',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: params.toString(),
    redirect: 'manual',
  });

  const authCookies = authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [authRes.headers.get('set-cookie') || ''];
  cookieHeader = authCookies.map(c => c.split(';')[0]).join('; ');

  // Check possible account pages: /my-account, /manage-account, /api-key, /user-master, /profile
  const candidates = [
    '/my-account',
    '/manage-account',
    '/account',
    '/api-report-master',
    '/change-password',
    '/whatsapp-account-detail-master',
  ];

  for (const uri of candidates) {
    const r = await fetch(`https://verified.aquasms.com${uri}`, {
      headers: { 'Cookie': cookieHeader },
    });
    console.log(`${uri} -> Status: ${r.status}`);
    const html = await r.text();
    // Search for keywords like "api", "token", "key", "waba", "919"
    const matches = html.match(/systemtoken|system_token|apikey|api_key|token|WABA|9319193109|[a-f0-9]{8}-[a-f0-9]{4}/gi) || [];
    console.log(`  Matches for tokens/keys (${matches.length}):`, Array.from(new Set(matches)));
    if (uri === '/my-account' || uri === '/manage-account' || uri === '/api-report-master') {
      const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Snippet: ${clean.slice(0, 500)}`);
    }
  }
}

run().catch(console.error);
