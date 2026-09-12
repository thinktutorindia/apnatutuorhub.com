async function testBases() {
  const hosts = [
    'https://api.aquasms.com',
    'https://wa.aquasms.com',
    'https://waba.aquasms.com',
    'https://consolev1.pinbot.ai',
    'https://api.pinbot.ai',
    'https://v1.pinbot.ai',
    'https://whatsapp.aquasms.com',
    'https://api2.pinbot.ai',
    'https://pinbot.ai',
  ];

  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

  for (const h of hosts) {
    try {
      const res = await fetch(`${h}/v1/wamessage/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          systemtoken: token,
          apikey: token,
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
        signal: AbortSignal.timeout(4000),
      });
      const text = await res.text();
      console.log(h, '-> Status:', res.status, 'Response:', text.slice(0, 200));
    } catch (e: any) {
      console.log(h, '-> Error:', e.message);
    }
  }
}

testBases().catch(console.error);
