async function test() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

  const authHeaders = [
    { authtoken: token },
    { 'auth-token': token },
    { authToken: token },
    { Authorization: token },
    { apikey: token },
    { systemtoken: token },
    { token: token },
    { 'x-auth-token': token },
    { 'X-Auth-Token': token },
  ];

  for (const h of authHeaders) {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...h,
      },
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
    console.log(Object.keys(h)[0], '->', await res.text());
  }
}

test().catch(console.error);
