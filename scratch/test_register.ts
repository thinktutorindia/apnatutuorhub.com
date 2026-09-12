async function testRegister() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  const res = await fetch('https://api.pinbot.ai/v1/wamessage/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      systemtoken: token,
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });
  console.log('/v1/wamessage/register status:', res.status, await res.text());
}

testRegister().catch(console.error);
