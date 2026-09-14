import crypto from 'crypto';

function md5(str) { return crypto.createHash('md5').update(str).digest('hex'); }
function sha1(str) { return crypto.createHash('sha1').update(str).digest('hex'); }

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

  const res = await fetch('https://verified.aquasms.com/api-report-master', {
    headers: { 'Cookie': cookieHeader },
  });
  const html = await res.text();
  for (const m of html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text.toLowerCase().includes('doc') || text.toLowerCase().includes('api') || m[1].includes('doc') || m[1].includes('api')) {
      console.log(text, '-->', m[1]);
    }
  }

  // Also search for any occurrence of the user's key in the entire page
  const userKey = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  console.log('Does page contain fef2faab?', html.includes(userKey) || html.includes('fef2faab'));
}
run().catch(console.error);
