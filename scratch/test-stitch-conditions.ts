import { isJunkMessage } from "../lib/gemini-lead-extractor";

const tests = [
  { current: "+91 97176 61509", next: "Dipika" },
  { current: "9667447331", next: "Shukurpur parents" },
];

for (const { current, next } of tests) {
  const hasCurrentPhone = /(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b/.test(current);
  const hasNextPhone = /(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b/.test(next);
  const hasNextEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(next);
  
  const afterPhoneStrip = current
    .replace(/(?:\+?91[\s-]?)?[6-9][\d\s-]{8,14}/g, "")
    .replace(/[+\-\s]/g, "")
    .trim();
  const isPhoneOnly = afterPhoneStrip.length < 5;
  const isNextJunk = isJunkMessage(next);

  console.log(`current: "${current}"`);
  console.log(`  hasCurrentPhone: ${hasCurrentPhone}`);
  console.log(`  afterPhoneStrip: "${afterPhoneStrip}" (len=${afterPhoneStrip.length})`);
  console.log(`  isPhoneOnly: ${isPhoneOnly}`);
  console.log(`  next: "${next}"`);
  console.log(`  hasNextPhone: ${hasNextPhone}`);
  console.log(`  hasNextEmail: ${hasNextEmail}`);
  console.log(`  isNextJunk: ${isNextJunk}`);
  console.log(`  next.length < 150: ${next.length < 150}`);
  console.log(`  WOULD STITCH: ${isPhoneOnly && !hasNextPhone && !hasNextEmail && next.length < 150 && !isNextJunk}`);
  console.log();
}
