async function run() {
  const res = await fetch('https://verified.aquasms.com/assets/js/api-report-master/api-report-master.js?v=1789217833');
  console.log(await res.text());
}
run().catch(console.error);
