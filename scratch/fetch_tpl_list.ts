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

  const tplPage = await fetch('https://verified.aquasms.com/whatsapp-templates', {
    headers: { 'Cookie': cookieHeader },
  });
  const tplHtml = await tplPage.text();
  const formHtml = tplHtml.match(/<form[^>]*id="WhatsappTemplateSearchForm"[^>]*>[\s\S]*?<\/form>/i)?.[0] || '';

  const fieldMatches = Array.from(formHtml.matchAll(/name="([^"]+)"/gi)).map(m => m[1]);
  console.log('Form Field Names:', fieldMatches);

  const searchParams = new URLSearchParams();
  for (const f of fieldMatches) {
    searchParams.append(f, '');
  }
  const context = Buffer.from(searchParams.toString()).toString('base64');

  const tplRes = await fetch(`https://verified.aquasms.com/whatsapp-templates/show?context=${encodeURIComponent(context)}&PageNo=1&PerPageRecord=50`, {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  const tplData = await tplRes.text();
  console.log('\n--- TEMPLATES TABLE RESULT ---');
  console.log(tplData.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000));
}

run().catch(console.error);
