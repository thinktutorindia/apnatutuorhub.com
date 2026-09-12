async function test() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

  const configs = [
    { headers: { apikey: token } },
    { headers: { 'api-key': token } },
    { headers: { apikey: token, 'Content-Type': 'application/json' } },
    { headers: { systemtoken: token, 'Content-Type': 'application/json' } },
    { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } },
  ];

  for (const c of configs) {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
      method: 'POST',
      headers: c.headers,
      body: JSON.stringify({
        from: '919319193109',
        to: '919311459543',
        type: 'template',
        message: {
          templateid: '3750880',
          placeholders: ['032203', 'Parent', 'Class 11th', 'Home', 'Delhi', '800', 'Any', 'Evening'],
        },
      }),
    });
    console.log(Object.keys(c.headers).join(','), '->', await res.text());
  }
}

test().catch(console.error);
