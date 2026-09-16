import crypto from 'crypto';

function md5(str: string): string { return crypto.createHash('md5').update(str).digest('hex'); }
function sha1(str: string): string { return crypto.createHash('sha1').update(str).digest('hex'); }

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
    },
    body: params.toString(),
    redirect: 'manual',
  });

  const authCookies = authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [authRes.headers.get('set-cookie') || ''];
  cookieHeader = authCookies.map(c => c.split(';')[0]).join('; ');

  const res = await fetch('https://verified.aquasms.com/account', {
    headers: { 'Cookie': cookieHeader }
  });
  const html = await res.text();

  const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/gi)).map(m => m[1]);
  console.log('Scripts on /account:', scripts);

  for (const s of scripts) {
    if (s.includes('campaign') || s.includes('app') || s.includes('custom') || s.includes('whatsapp')) {
      const scriptUrl = s.startsWith('http') ? s : `https://verified.aquasms.com${s.startsWith('/') ? '' : '/'}${s}`;
      const sRes = await fetch(scriptUrl, { headers: { 'Cookie': cookieHeader } });
      const js = await sRes.text();
      console.log('\n--- Script:', scriptUrl);
      const fnIdx = js.indexOf('findWabausername');
      if (fnIdx !== -1) {
        console.log('findWabausername implementation:');
        console.log(js.slice(fnIdx, fnIdx + 600));
      }
    }
  }
}

run().catch(console.error);
