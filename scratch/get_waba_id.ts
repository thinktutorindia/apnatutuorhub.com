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

  const pages = [
    'https://verified.aquasms.com/whatsapp-account-detail-master',
    'https://verified.aquasms.com/whatsapp-account-detail-master/show?PageNo=1&PerPageRecord=20',
    'https://verified.aquasms.com/whatsapp-account-detail-master/create?recordid=0',
    'https://verified.aquasms.com/api-report-master',
    'https://verified.aquasms.com/campaign-master/create?recordid=0'
  ];

  for (const url of pages) {
    const res = await fetch(url, { headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' } });
    const html = await res.text();
    console.log('\n========================================');
    console.log('=== URL:', url, 'Status:', res.status);
    console.log('========================================');
    
    // Look for inputs, tables, or IDs
    const inputs = html.match(/<input[^>]*>/gi) || [];
    for (const inp of inputs) {
      if (inp.includes('waba') || inp.includes('number') || inp.includes('id') || inp.includes('phone')) {
        console.log('Input:', inp);
      }
    }
    const selects = html.match(/<select[^>]*>[\s\S]*?<\/select>/gi) || [];
    for (const sel of selects) {
      if (sel.includes('waba') || sel.includes('phone') || sel.includes('9319193109')) {
        console.log('Select:', sel);
      }
    }
    const matches = html.match(/\b\d{14,18}\b/g);
    if (matches) {
      console.log('Found 14-18 digit IDs:', Array.from(new Set(matches)));
    }
  }
}

run().catch(console.error);
