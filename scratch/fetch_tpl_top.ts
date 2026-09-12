async function run() {
  const res = await fetch('https://verified.aquasms.com/assets/js/whatsapp-template/whatsapp-template.js?v=1789217712');
  const text = await res.text();
  console.log(text.slice(0, 1500));
}
run().catch(console.error);
