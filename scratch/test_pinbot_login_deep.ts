async function testLogin() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  // Let's test different headers and body structures for login
  const tests = [
    {
      desc: 'header systemtoken + body username/password',
      headers: { systemtoken: token },
      body: { username, password },
    },
    {
      desc: 'header apikey + body username/password',
      headers: { apikey: token },
      body: { username, password },
    },
    {
      desc: 'header systemtoken + header apikey + body username/password',
      headers: { systemtoken: token, apikey: token },
      body: { username, password },
    },
    {
      desc: 'body systemtoken + body username/password',
      headers: {},
      body: { systemtoken: token, username, password },
    },
    {
      desc: 'header systemtoken + body token/username/password',
      headers: { systemtoken: token },
      body: { token, username, password },
    },
  ];

  for (const t of tests) {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...t.headers },
      body: JSON.stringify(t.body),
    });
    console.log(t.desc, '->', await res.text());
  }
}

testLogin().catch(console.error);
