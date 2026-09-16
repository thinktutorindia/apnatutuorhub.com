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

  const endpoints = [
    'https://verified.aquasms.com/automaticCreativeSpec/get-waba-list',
    'https://verified.aquasms.com/whatsappTemplate/get-waba-list',
    'https://verified.aquasms.com/whatsapp-templates/get-waba-list',
    'https://verified.aquasms.com/automatic-creative-spec/get-waba-list',
  ];

  for (const ep of endpoints) {
    // Try GET
    const rGet = await fetch(ep, { headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' } });
    console.log('GET', ep, '->', rGet.status, (await rGet.text()).slice(0, 300));

    // Try POST
    const rPost = await fetch(ep, {
      method: 'POST',
      headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `_token=${csrfToken}`,
    });
    console.log('POST', ep, '->', rPost.status, (await rPost.text()).slice(0, 300));
  }
}

run().catch(console.error);
