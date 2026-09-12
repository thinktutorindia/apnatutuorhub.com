async function run() {
  const res = await fetch('https://verified.aquasms.com/assets/js/whatsapp-template/whatsapp-template.js?v=1789217712');
  console.log(await res.text());
}
run().catch(console.error);
