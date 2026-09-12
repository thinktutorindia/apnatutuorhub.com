async function inspectWaForm() {
  const res = await fetch('https://wa.aquasms.com');
  const text = await res.text();
  const forms = text.match(/<form[\s\S]*?<\/form>/gi) || [];
  console.log('Forms on wa.aquasms.com:', forms.length);
  for (const f of forms) {
    console.log('FORM:', f);
  }
}

inspectWaForm().catch(console.error);
