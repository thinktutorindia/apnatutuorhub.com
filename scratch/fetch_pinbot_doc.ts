async function run() {
  const res = await fetch('https://api.pinbot.ai/documentation');
  const text = await res.text();
  console.log('Doc length:', text.length);
  console.log('Snippet:', text.slice(0, 2000));
}
run().catch(console.error);
