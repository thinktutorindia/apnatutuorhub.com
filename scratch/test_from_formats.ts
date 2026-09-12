async function test() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const froms = ['919319193109', '9319193109', '+919319193109'];

  for (const f of froms) {
    const res = await fetch('https://api.pinbot.ai/v1/wamessage/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: token,
        systemtoken: token,
      },
      body: JSON.stringify({
        from: f,
        to: '919311459543',
        type: 'template',
        message: {
          templateid: '3750880',
          placeholders: ['032203', 'Parent', 'Class 11th', 'Home', 'Delhi', '800', 'Any', 'Evening'],
        },
      }),
    });
    console.log('from:', f, '->', await res.text());
  }
}

test().catch(console.error);
