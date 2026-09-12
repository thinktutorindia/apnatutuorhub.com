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

  // Look for show / list in whatsapp-templates
  const res = await fetch('https://verified.aquasms.com/whatsapp-templates/show?PageNo=1&PerPageRecord=20', {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  console.log('/whatsapp-templates/show status:', res.status);
  const tplText = await res.text();
  console.log('Templates Show Snippet:');
  console.log(tplText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500));

  // Let's also check /whatsapp-account-detail-master/create?recordid=0
  const wabaFormRes = await fetch('https://verified.aquasms.com/whatsapp-account-detail-master/create?recordid=0', {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  console.log('\nWABA Form Create Status:', wabaFormRes.status);
  const wabaFormText = await wabaFormRes.text();
  console.log('WABA Form Snippet:');
  console.log(wabaFormText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500));
}

run().catch(console.error);
