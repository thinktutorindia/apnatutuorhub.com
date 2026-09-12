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
  const tokenMatch = text.match(/name="_token"\s+value="([^"]+)"/);
  const csrfToken = tokenMatch ? tokenMatch[1] : '';
  const saltMatch = text.match(/var\s+salt\s*=\s*'([^']+)'/);
  const salt = saltMatch ? saltMatch[1] : '';

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

  const detailRes = await fetch('https://verified.aquasms.com/whatsapp-account-detail-master', {
    headers: { 'Cookie': cookieHeader },
  });
  const detailHtml = await detailRes.text();

  console.log('--- Account Detail Page Scripts ---');
  const scripts = detailHtml.match(/<script[\s\S]*?<\/script>/gi) || [];
  for (const s of scripts) {
    if (!s.includes('src="') || s.includes('account') || s.includes('master')) {
      console.log(s.slice(0, 500));
    }
  }

  // Also check documentation link
  console.log('\n--- Checking API Documentation link ---');
  const docMatch = detailHtml.match(/href="([^"]*documentation[^"]*)"/i);
  console.log('Doc link:', docMatch ? docMatch[1] : 'none');
}

run().catch(console.error);
