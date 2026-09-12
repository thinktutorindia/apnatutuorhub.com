async function testLoginEmails() {
  const token = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const password = 'ApnatutorHubApnatutorHubtech@1429Wapp';

  const emails = [
    'care@aquasms.com',
    'youhubteam@gmail.com',
    'info@apnatutorhub.com',
    'support@apnatutorhub.com',
    'apnatutorhub@gmail.com',
    'admin@apnatutorhub.com',
  ];

  for (const email of emails) {
    for (const field of ['username', 'email']) {
      const res = await fetch('https://api.pinbot.ai/v1/wamessage/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          systemtoken: token,
        },
        body: JSON.stringify({
          [field]: email,
          password: password,
        }),
      });
      const text = await res.text();
      console.log(`${field}: ${email} => ${text}`);
      if (!text.includes('User does not exist')) {
        console.log('SUCCESSFUL LOGIN FOUND!', email, text);
      }
    }
  }
}

testLoginEmails().catch(console.error);
