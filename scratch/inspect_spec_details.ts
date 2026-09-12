async function run() {
  const res = await fetch('https://api.pinbot.ai/documentation/json');
  const spec = await res.json();
  console.log('LOGIN:', JSON.stringify(spec.paths['/v1/wamessage/login'], null, 2));
  console.log('SEND:', JSON.stringify(spec.paths['/v1/wamessage/send'], null, 2));
}
run().catch(console.error);
