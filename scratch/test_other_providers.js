const KEY = 'fef2faab-a8ed-11f1-afb3-02c8a5e042bd';

async function testOtherProviders() {
  console.log('Testing key against other WhatsApp / SMS API providers...');

  // 1. Fast2SMS
  try {
    const res = await fetch('https://www.fast2sms.com/dev/wallet', {
      headers: { authorization: KEY },
    });
    console.log('Fast2SMS wallet:', res.status, (await res.text()).slice(0, 100));
  } catch (e) {
    console.log('Fast2SMS error:', e.message);
  }

  // 2. Gupshup
  try {
    const res = await fetch('https://api.gupshup.io/sm/api/v1/users', {
      headers: { apikey: KEY },
    });
    console.log('Gupshup:', res.status, (await res.text()).slice(0, 100));
  } catch (e) {
    console.log('Gupshup error:', e.message);
  }

  // 3. MSG91
  try {
    const res = await fetch('https://control.msg91.com/api/v5/balance.php', {
      headers: { authkey: KEY },
    });
    console.log('MSG91 balance:', res.status, (await res.text()).slice(0, 100));
  } catch (e) {
    console.log('MSG91 error:', e.message);
  }

  // 4. Interakt
  try {
    const res = await fetch('https://api.interakt.ai/v1/public/track/users/', {
      headers: { Authorization: `Basic ${KEY}` },
    });
    console.log('Interakt:', res.status, (await res.text()).slice(0, 100));
  } catch (e) {
    console.log('Interakt error:', e.message);
  }
}

testOtherProviders().catch(console.error);
