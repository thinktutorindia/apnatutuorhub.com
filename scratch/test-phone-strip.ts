// Debug the phone strip regex
const tests = ["+91 97176 61509", "9667447331", "+917862929000", "+91 85069 51507", "8130698303"];

for (const t of tests) {
  const afterPhoneStrip = t
    .replace(/(?:\+?91[\s-]?)?[6-9][\d\s-]{8,14}/g, "")
    .replace(/[+\-\s]/g, "")
    .trim();
  console.log(`"${t}" -> afterStrip: "${afterPhoneStrip}" (len=${afterPhoneStrip.length}, isPhoneOnly=${afterPhoneStrip.length < 5})`);
}
