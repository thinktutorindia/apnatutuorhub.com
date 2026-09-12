import dns from 'dns';

async function run() {
  dns.reverse('68.183.90.255', (err, hostnames) => {
    console.log('Reverse DNS for 68.183.90.255:', err ? err.message : hostnames);
  });
}
run().catch(console.error);
