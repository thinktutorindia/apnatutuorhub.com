import https from 'https';

async function run() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  try {
    const res = await fetch('https://68.183.90.255:5976/documentation/static/index.html', {
      // @ts-ignore
      agent,
    });
    console.log('Doc status:', res.status);
    const text = await res.text();
    console.log('Doc text snippet:', text.slice(0, 1000));
  } catch (e: any) {
    console.error('Doc fetch error:', e.message);
  }
}

run().catch(console.error);
