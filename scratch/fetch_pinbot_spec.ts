async function run() {
  for (const url of ['https://api.pinbot.ai/documentation/json', 'https://api.pinbot.ai/json']) {
    try {
      const res = await fetch(url);
      console.log(url, 'status:', res.status);
      if (res.ok) {
        const text = await res.text();
        console.log('JSON spec length:', text.length);
        const spec = JSON.parse(text);
        console.log('Paths in spec:', Object.keys(spec.paths || {}));
        console.log('Security definitions:', spec.securityDefinitions || spec.components?.securitySchemes);
        return;
      }
    } catch (e: any) {
      console.log(url, 'error:', e.message);
    }
  }
}
run().catch(console.error);
