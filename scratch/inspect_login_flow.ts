async function run() {
  const res = await fetch('https://api.pinbot.ai/documentation/json');
  const spec = await res.json();
  console.log('ENCRYPTION:', JSON.stringify(spec.paths['/v1/wamessage/encryption'], null, 2));
  console.log('LOGIN:', JSON.stringify(spec.paths['/v1/wamessage/login'], null, 2));
  console.log('SEND_REQUEST:', JSON.stringify(spec.paths['/v1/wamessage/sendRequest'], null, 2));
  console.log('REGISTER:', JSON.stringify(spec.paths['/v1/wamessage/register'], null, 2));
}
run().catch(console.error);
