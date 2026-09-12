async function test() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  // 1. Test /v1/wamessage/encryption
  const encRes = await fetch('https://api.pinbot.ai/v1/wamessage/encryption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', systemtoken: token, apikey: token },
    body: JSON.stringify({ username, password }),
  });
  console.log('/v1/wamessage/encryption:', encRes.status, await encRes.text());

  // 2. Test /v1/wamessage/sendRequest
  const reqRes = await fetch('https://api.pinbot.ai/v1/wamessage/sendRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', systemtoken: token, apikey: token },
    body: JSON.stringify({}),
  });
  console.log('/v1/wamessage/sendRequest:', reqRes.status, await reqRes.text());

  // 3. Test /v1/wamessage/sendMessage
  const msgRes = await fetch('https://api.pinbot.ai/v1/wamessage/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', systemtoken: token, apikey: token },
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
  console.log('/v1/wamessage/sendMessage:', msgRes.status, await msgRes.text());
}

test().catch(console.error);
