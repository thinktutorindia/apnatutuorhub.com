async function checkTemplates() {
  const apikey = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';
  const urls = [
    'https://partnersv1.pinbot.ai/v3/1417510641438661/message_templates',
    'https://partnersv1.pinbot.ai/v3/1417510641438661/templates',
    'https://partnersv1.pinbot.ai/v3/1417510641438661/meta_templates',
    'https://api.pinbot.ai/v1/wamessage/templates',
    'https://api.pinbot.ai/v2/wamessage/templates',
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      console.log(`Trying ${url}...`);
      const res = await fetch(url, {
        headers: { apikey, systemtoken: apikey },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log(`-> Status ${res.status}:`, (await res.text()).slice(0, 200));
    } catch (e: any) {
      clearTimeout(timeout);
      console.log(`-> Error: ${e.message}`);
    }
  }
}

checkTemplates();
