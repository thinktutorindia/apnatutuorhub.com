async function run() {
  const res = await fetch('https://verified.aquasms.com/assets/js/chat-log/chat-log.js?v=1789236482');
  console.log(await res.text());
}
run().catch(console.error);
