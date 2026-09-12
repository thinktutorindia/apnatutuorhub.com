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

  const createRes = await fetch('https://verified.aquasms.com/campaign/create', {
    headers: { 'Cookie': cookieHeader },
  });
  const html = await createRes.text();

  const formMatch = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
  console.log('Campaign forms:', formMatch.length);
  for (const f of formMatch) {
    console.log('FORM ACTION:', f.match(/action="([^"]+)"/)?.[1], 'METHOD:', f.match(/method="([^"]+)"/)?.[1]);
    const inputs = Array.from(f.matchAll(/name="([^"]+)"/gi)).map(m => m[1]);
    console.log('INPUTS:', inputs);
  }

  // Scripts in campaign/create
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  for (const s of scripts) {
    if (s.includes('campaign') || s.includes('template') || s.includes('submit')) {
      console.log('SCRIPT:', s.slice(0, 300));
    }
  }
}

run().catch(console.error);
