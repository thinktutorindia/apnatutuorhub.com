async function test() {
  const url1 = 'https://apnatutorhub.com/api/webhooks/whatsapp';
  const url2 = 'https://www.apnatutorhub.com/api/webhooks/whatsapp';
  for (const u of [url1, url2]) {
    try {
      const res = await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
        redirect: 'manual'
      });
      console.log(u, 'Status:', res.status, 'Location:', res.headers.get('location'));
      const text = await res.text();
      console.log('Body:', text.slice(0, 150));
    } catch (e: any) {
      console.error(u, 'Error:', e.message);
    }
  }
}
test();
