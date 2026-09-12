async function run() {
  const res = await fetch('https://verified.aquasms.com/login');
  const text = await res.text();
  const inlineScripts = text.match(/<script>[\s\S]*?<\/script>/gi) || [];
  for (const s of inlineScripts) {
    console.log('--- INLINE SCRIPT ---');
    console.log(s);
  }
}
run().catch(console.error);
