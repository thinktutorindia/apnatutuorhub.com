async function run() {
  const endpoints = [
    'https://verified.aquasms.com/v1/wamessage/send',
    'https://verified.aquasms.com/api/v1/wamessage/send',
    'https://verified.aquasms.com/api/send',
    'https://verified.aquasms.com/wamessage/send',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      console.log(ep, 'status:', res.status, 'text:', (await res.text()).slice(0, 150));
    } catch (e: any) {
      console.log(ep, 'error:', e.message);
    }
  }
}
run().catch(console.error);
