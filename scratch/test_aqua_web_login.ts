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

  // Extract CSRF token
  const tokenMatch = text.match(/name="_token"\s+value="([^"]+)"/);
  const csrfToken = tokenMatch ? tokenMatch[1] : '';

  // Extract Salt
  const saltMatch = text.match(/var\s+salt\s*=\s*'([^']+)'/);
  const salt = saltMatch ? saltMatch[1] : '';

  console.log('CSRF Token:', csrfToken);
  console.log('Salt found in page:', salt);

  const rawCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [getRes.headers.get('set-cookie') || ''];
  const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  // Calculate the hash exact to checkBeforeSubmit()
  // var hash = CryptoJS.MD5(id);
  // var id2 = $.sha1(String(salt + hash));
  const passMd5 = md5(password);
  const passHashed = sha1(salt + passMd5);

  console.log('Raw Password Length:', password.length);
  console.log('MD5:', passMd5);
  console.log('SHA1(salt + md5):', passHashed);

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://verified.aquasms.com',
    },
    body: params.toString(),
    redirect: 'manual',
  });

  console.log('Auth Status:', authRes.status);
  const redirectLoc = authRes.headers.get('location');
  console.log('Redirect Location:', redirectLoc);

  const authCookies = authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [authRes.headers.get('set-cookie') || ''];
  const newCookieHeader = authCookies.map(c => c.split(';')[0]).join('; ');

  if (redirectLoc) {
    const nextRes = await fetch(redirectLoc.startsWith('http') ? redirectLoc : `https://verified.aquasms.com${redirectLoc}`, {
      headers: {
        'Cookie': newCookieHeader || cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    console.log('Next Page Status:', nextRes.status, 'URL:', nextRes.url);
    const nextHtml = await nextRes.text();
    const titleMatch = nextHtml.match(/<title>([^<]+)<\/title>/i);
    console.log('Next Page Title:', titleMatch ? titleMatch[1] : 'No title');
    
    // Check if logged in
    if (nextHtml.includes('dashboard') || nextHtml.includes('logout') || nextHtml.includes('Dashboard')) {
      console.log('SUCCESS! LOGGED IN TO AQUA SMS PORTAL!');
    } else {
      console.log('Page snippet:', nextHtml.slice(0, 1000));
    }
  }
}

run().catch(console.error);
