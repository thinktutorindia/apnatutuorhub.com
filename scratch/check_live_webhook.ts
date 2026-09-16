async function checkLiveWebhook() {
  try {
    const res = await fetch("https://apnatutorhub.com/api/webhooks/whatsapp");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

checkLiveWebhook();
