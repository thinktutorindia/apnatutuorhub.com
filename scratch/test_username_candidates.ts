async function testUsernames() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  const candidates = [
    'ApnatutorHub',
    'ApnatutorHub_tech',
    'ApnatutorHub_tech1429Wapp',
    'apnatutorhub',
    'apnatutorhub_tech',
    '919319193109',
    '9319193109',
    'care@aquasms.com',
    '51465',
    '53185',
    '9716726087',
    '+919716726087',
    'apnatutorhub.com',
  ];

  for (const u of candidates) {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        systemtoken: token,
      },
      body: JSON.stringify({
        username: u,
        password: password,
      }),
    });
    const text = await res.text();
    console.log(`Username: "${u}" => ${text}`);
    if (!text.includes('User does not exist')) {
      console.log('FOUND MATCHING USERNAME!', u, text);
    }
  }
}

testUsernames().catch(console.error);
