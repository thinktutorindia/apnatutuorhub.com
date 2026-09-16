import crypto from 'crypto';

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha1(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}

async function check() {
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

  const authCookies = (authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [authRes.headers.get('set-cookie') || '']).map(c => c.split(';')[0]).join('; ');
  cookieHeader = authCookies;

  // Let's check menu / routes in the dashboard
  const homeRes = await fetch('https://verified.aquasms.com/home', { headers: { 'Cookie': cookieHeader } });
  const homeHtml = await homeRes.text();

  console.log('--- Menu links in dashboard ---');
  const links = homeHtml.match(/href="([^"]+)"/gi) || [];
  const uniqueLinks = Array.from(new Set(links.map(l => l.replace(/href="|"/gi, ''))));
  console.log('Links:', uniqueLinks.filter(l => !l.includes('.css') && !l.includes('.js') && !l.includes('#')));

  // Check detail master
  const detailRes = await fetch('https://verified.aquasms.com/whatsapp-account-detail-master', { headers: { 'Cookie': cookieHeader } });
  const detailHtml = await detailRes.text();
  console.log('\n--- Detail Master mentions ---');
  const mentions = detailHtml.split('\n').filter(l => /webhook|callback|aisensy|apnatutorhub/i.test(l));
  console.log(mentions);
}

check().catch(console.error);
