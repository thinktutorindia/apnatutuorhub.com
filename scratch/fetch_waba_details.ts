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

  const context = Buffer.from('wabaid=').toString('base64');
  const u = `https://verified.aquasms.com/whatsapp-account-detail-master/show?context=${context}&PageNo=1&PerPageRecord=20`;
  const res = await fetch(u, {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  console.log('Status:', res.status);
  const showText = await res.text();
  console.log('Full Text:');
  console.log(showText);

  // Also check /get-user-list
  const userListRes = await fetch('https://verified.aquasms.com/get-user-list', {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  console.log('userListRes status:', userListRes.status);
  console.log((await userListRes.text()).slice(0, 1000));

  // Let's get the full HTML of whatsapp-account-detail-master/create?recordid=0
  const wabaFormRes = await fetch('https://verified.aquasms.com/whatsapp-account-detail-master/create?recordid=0', {
    headers: { 'Cookie': cookieHeader, 'X-Requested-With': 'XMLHttpRequest' },
  });
  const formHtml = await wabaFormRes.text();
  console.log('\nwabaFormRes length:', formHtml.length);
  
  // Extract all script tags
  const scripts = formHtml.match(/<script[\s\S]*?<\/script>/gi) || [];
  for (const s of scripts) {
    console.log('--- SCRIPT ---');
    console.log(s);
  }

  // Extract all input and select names/values
  const inputs = formHtml.match(/<input[^>]*>/gi) || [];
  console.log('\n--- INPUTS ---');
  for (const inp of inputs) {
    console.log(inp);
  }

  const selects = formHtml.match(/<select[^>]*>[\s\S]*?<\/select>/gi) || [];
  console.log('\n--- SELECTS ---');
  for (const sel of selects) {
    console.log(sel);
  }
}

run().catch(console.error);
