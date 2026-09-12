async function run() {
  const res = await fetch('https://verified.aquasms.com/assets/js/whatsapp-account-detail-master/whatsapp-account-detail-master.js?v=1789217688');
  console.log(await res.text());
}
run().catch(console.error);
