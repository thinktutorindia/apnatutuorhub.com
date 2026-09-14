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

  const accRes = await fetch('https://verified.aquasms.com/account', {
    headers: { 'Cookie': cookieHeader },
  });
  const html = await accRes.text();

  const links = [];
  for (const m of html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = m[2].replace(/<[^>]+>/g, '').trim();
    if (m[1] !== '#' && !m[1].startsWith('javascript:')) {
      links.push({ text: t, href: m[1] });
    }
  }
  console.log('Account Links Count:', links.length);
  for (const l of links) {
    console.log(`  ${l.text || '(icon)'} -> ${l.href}`);
  }

  // Look for any input fields or tokens
  const inputs = [];
  for (const m of html.matchAll(/<input[^>]*>/gi)) {
    inputs.push(m[0]);
  }
  console.log('\nInputs in account:', inputs);
}

run().catch(console.error);
