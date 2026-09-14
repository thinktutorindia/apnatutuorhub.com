const API_KEY = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

async function testAll() {
  console.log('Testing query params and body params on api.pinbot.ai...');

  const queryParams = ['apikey', 'apiKey', 'systemtoken', 'token', 'key', 'auth'];
  for (const q of queryParams) {
    try {
      const res = await fetch(`https://api.pinbot.ai/v1/wamessage/send?${q}=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '919319193109',
          to: '919311459543',
          type: 'text',
          message: { text: 'test' },
        }),
      });
      console.log(`Query ?${q}=... -> Status: ${res.status} | Body: ${await res.text()}`);
    } catch (e) {
      console.log(`Query ?${q}=... -> Error: ${e.message}`);
    }
  }

  // Test body token
  const bodyFields = ['apikey', 'apiKey', 'systemtoken', 'token', 'key', 'authtoken'];
  for (const f of bodyFields) {
    try {
      const res = await fetch(`https://api.pinbot.ai/v1/wamessage/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [f]: API_KEY,
          from: '919319193109',
          to: '919311459543',
          type: 'text',
          message: { text: 'test' },
        }),
      });
      console.log(`Body field { ${f}: ... } -> Status: ${res.status} | Body: ${await res.text()}`);
    } catch (e) {
      console.log(`Body field { ${f}: ... } -> Error: ${e.message}`);
    }
  }

  // Test GET endpoints with apikey header
  const getEndpoints = [
    '/v1/wamessage/media',
    '/v1/wamessage/optin',
    '/v1/wamessage/profile',
    '/v1/wamessage/account',
    '/v1/wamessage/templates',
    '/v1/wamessage/status',
    '/v2/wamessage/profile',
    '/v2/wamessage/templates',
  ];
  for (const ep of getEndpoints) {
    try {
      const res = await fetch(`https://api.pinbot.ai${ep}`, {
        method: 'GET',
        headers: { apikey: API_KEY, systemtoken: API_KEY },
      });
      console.log(`GET ${ep} -> Status: ${res.status} | Body: ${(await res.text()).slice(0, 150)}`);
    } catch (e) {
      console.log(`GET ${ep} -> Error: ${e.message}`);
    }
  }
}

testAll().catch(console.error);
