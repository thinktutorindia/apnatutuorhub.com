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

  const getUrls = [
    'https://verified.aquasms.com/whatsapp-account-detail-master/show?PageNo=1&PerPageRecord=50',
    'https://verified.aquasms.com/whatsapp-account-detail-master/edit?recordid=1',
    'https://verified.aquasms.com/account',
    'https://verified.aquasms.com/user-master',
    'https://verified.aquasms.com/whatsapp-templates',
  ];

  for (const u of getUrls) {
    const res = await fetch(u, {
      headers: {
        'Cookie': cookieHeader,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    console.log('\n=== GET', u, '->', res.status);
    const txt = await res.text();
    console.log(txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
    const ids = txt.match(/\b\d{14,18}\b/g);
    if (ids) console.log('IDs found:', Array.from(new Set(ids)));
  }
}

run().catch(console.error);
