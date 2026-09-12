async function test() {
  const portalSecret = 'gCjpLsv6zI14j%2B5OzbH%2BGdJLLqSr9lScW94pgPIrPTMctqVhDKfso4AF5OAoGbpw';
  const decoded = decodeURIComponent(portalSecret);

  for (const t of [portalSecret, decoded]) {
    for (const ep of ['https://api.pinbot.ai/v1/wamessage/send', 'https://api.pinbot.ai/v2/wamessage/send']) {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          systemtoken: t,
          apikey: t,
        },
        body: JSON.stringify({
          from: '919319193109',
          to: '919311459543',
          type: 'template',
          message: {
            templateid: '3750880',
            placeholders: ['032203', 'Parent', 'Class 11th', 'Home', 'Delhi', '800', 'Any', 'Evening'],
          },
        }),
      });
      console.log(ep, t.slice(0, 10), await res.text());
    }
  }
}

test().catch(console.error);
