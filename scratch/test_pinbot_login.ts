async function run() {
  const username = 'ApnatutorHubApnatutorHub_tech1429Wapp';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  // Try with different systemtokens:
  // 1. Current systemtoken in env
  // 2. _usersecretkey from portal
  // 3. decoded _usersecretkey
  const envToken = 'fef226d4-8d9e-4e4b-b0dc-df6524ca42bd'; // from env
  const portalSecret = 'gCjpLsv6zI14j%2B5OzbH%2BGdJLLqSr9lScW94pgPIrPTMctqVhDKfso4AF5OAoGbpw';
  const portalDecoded = decodeURIComponent(portalSecret);

  const tokens = [envToken, portalSecret, portalDecoded];
  const usernames = [username, 'ApnatutorHub_tech1429Wapp', 'ApnatutorHub_tech', 'ApnatutorHub'];

  for (const token of tokens) {
    for (const u of usernames) {
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
      console.log(`token: ${token.slice(0, 8)}... | user: ${u} => ${text}`);
      if (!text.includes('User does not exist') && !text.includes('Authentication failed')) {
        console.log('INTERESTING RESULT:', text);
      }
    }
  }
}
run().catch(console.error);
