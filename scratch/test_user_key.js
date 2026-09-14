const API_KEY = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

async function main() {
  console.log('--- Testing API Key:', API_KEY, '---');

  // Test 1: Pinbot /v1/wamessage/send
  console.log('\n[1] Testing https://api.pinbot.ai/v1/wamessage/send ...');
  try {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'systemtoken': API_KEY,
      },
      body: JSON.stringify({
        from: '919319193109',
        to: '919311459543',
        type: 'template',
        message: {
          templateid: '3750880',
          placeholders: ['Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test'],
        },
      }),
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Network / Fetch error:', err.message);
  }

  // Test 2: Pinbot /v2/wamessage/send
  console.log('\n[2] Testing https://api.pinbot.ai/v2/wamessage/send ...');
  try {
    const res = await fetch('https://api.pinbot.ai/v2/wamessage/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'systemtoken': API_KEY,
      },
      body: JSON.stringify({
        from: '919319193109',
        to: '919311459543',
        type: 'template',
        message: {
          templateid: '3750880',
          placeholders: ['Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test'],
        },
      }),
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Network / Fetch error:', err.message);
  }

  // Test 3: Pinbot with various header combinations
  console.log('\n[3] Testing header variations on Pinbot ...');
  const headerVariations = [
    { name: 'apikey header', headers: { 'Content-Type': 'application/json', 'apikey': API_KEY } },
    { name: 'apiKey header', headers: { 'Content-Type': 'application/json', 'apiKey': API_KEY } },
    { name: 'systemtoken header', headers: { 'Content-Type': 'application/json', 'systemtoken': API_KEY } },
    { name: 'Authorization Bearer', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } },
    { name: 'Authorization Token', headers: { 'Content-Type': 'application/json', 'Authorization': API_KEY } },
    { name: 'x-api-key', headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY } },
  ];

  for (const v of headerVariations) {
    try {
      const res = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
        method: 'POST',
        headers: v.headers,
        body: JSON.stringify({
          from: '919319193109',
          to: '919311459543',
          type: 'text',
          message: { text: 'Test message' },
        }),
      });
      console.log(`  Header [${v.name}] -> Status: ${res.status} | Body: ${await res.text()}`);
    } catch (err) {
      console.log(`  Header [${v.name}] -> Error: ${err.message}`);
    }
  }

  // Test 4: Pinbot /v1/wamessage/encryption & /v1/wamessage/sendRequest
  console.log('\n[4] Testing /v1/wamessage/encryption and /sendRequest ...');
  for (const endpoint of ['/v1/wamessage/encryption', '/v1/wamessage/sendRequest', '/v1/wamessage/optin', '/v1/wamessage/media']) {
    try {
      const res = await fetch(`https://api.pinbot.ai${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
          'systemtoken': API_KEY,
        },
        body: JSON.stringify({}),
      });
      console.log(`  Endpoint ${endpoint} -> Status: ${res.status} | Body: ${await res.text()}`);
    } catch (err) {
      console.log(`  Endpoint ${endpoint} -> Error: ${err.message}`);
    }
  }

  // Test 5: What if invalid key vs this key?
  console.log('\n[5] Comparing response with dummy key (to see if key is validated or endpoint is rejected) ...');
  try {
    const dummyKey = '00000000-0000-0000-0000-000000000000';
    const resDummy = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': dummyKey },
      body: JSON.stringify({ from: '919319193109', to: '919311459543', type: 'text', message: { text: 'Hi' } }),
    });
    console.log('Dummy key response:', resDummy.status, await resDummy.text());
  } catch (err) {
    console.log('Dummy key error:', err.message);
  }
}

main().catch(console.error);
