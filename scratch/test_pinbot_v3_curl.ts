async function testPinbotV3() {
  const url = 'https://partnersv1.pinbot.ai/v3/1417510641438661/messages';
  const apiKey = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const targetPhone = '919311459543'; // User's test number

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: targetPhone,
    type: 'template',
    template: {
      name: 'information2',
      language: {
        code: 'en',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '032203' },
            { type: 'text', text: 'Parent' },
            { type: 'text', text: 'Class 11th' },
            { type: 'text', text: 'Home' },
            { type: 'text', text: 'Delhi' },
            { type: 'text', text: '800' },
            { type: 'text', text: 'Any' },
            { type: 'text', text: 'Evening' },
          ],
        },
      ],
    },
  };

  console.log('Sending request to:', url);
  console.log('Target Phone:', targetPhone);
  console.log('Payload:', JSON.stringify(body, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    });

    console.log('\n--- RESPONSE STATUS ---');
    console.log('HTTP Status:', res.status, res.statusText);

    const resText = await res.text();
    console.log('Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(resText), null, 2));
    } catch {
      console.log(resText);
    }
  } catch (err: any) {
    console.error('Fetch error:', err);
  }
}

testPinbotV3();
