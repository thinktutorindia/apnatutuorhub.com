import { assessIntake, sealLeadEntry, type IntakeDraft } from "../lib/whatsapp-bot/intake";
import { registerParentFromWhatsapp } from "../lib/whatsapp-bot/auto-register";

let failed = 0;

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    console.log(`ok  ${name}`);
    return;
  }
  failed++;
  console.error(`FAIL ${name} — ${detail}`);
}

function turn(message: string, prev?: IntakeDraft) {
  return assessIntake(message, prev);
}

const junk = ["Please call", "Online le skti hu m", "Are you not attending the class", "Hindi", "1", "Hindi medium classes only"];
for (const sample of junk) {
  const r = turn(sample);
  check(`reject ${sample}`, !r.ready && /class/i.test(r.reply), r.reply.slice(0, 80));
}

const class4 = turn("Class 4 Physics Rohini");
check("class 4 physics explains", !class4.ready && /all subjects/i.test(class4.reply), class4.reply.slice(0, 120));
const class4yes = turn("HAAN", class4.draft);
check("class 4 confirm still needs nothing wrong", class4yes.ready && class4yes.draft.subjects?.join() === "All Subjects" && class4yes.draft.mode === "OFFLINE" && class4yes.draft.area === "Rohini", JSON.stringify(class4yes.draft));

const onlineJunior = turn("Class 3 online Dwarka");
check("class 3 online blocked", !onlineJunior.ready && /online/i.test(onlineJunior.reply) && onlineJunior.draft.mode === "OFFLINE", onlineJunior.reply.slice(0, 100));

const goodJunior = turn("Class 8 All Subjects Mukundpur");
check("class 8 ready", goodJunior.ready && goodJunior.draft.mode === "OFFLINE" && goodJunior.draft.subjects?.[0] === "All Subjects", JSON.stringify(goodJunior.draft));

const class1 = turn("Class 1, All Subjects, Sector 6");
check("class 1 sector", class1.ready && class1.draft.area === "Sector 6" && class1.draft.mode === "OFFLINE", JSON.stringify(class1.draft));

const nursery = turn("Nursery All Subjects Pitampura");
check("nursery", nursery.ready && nursery.draft.mode === "OFFLINE", JSON.stringify(nursery.draft));

const class9 = turn("Class 9 General Science Rohini");
check("class 9 science", class9.ready && class9.draft.subjects?.some((s) => /science/i.test(s)) && class9.draft.mode !== "ONLINE", JSON.stringify(class9.draft));

const class9all = turn("Class 9 All Subjects Rohini");
check("class 9 all subjects rejected", !class9all.ready && /subject/i.test(class9all.reply), class9all.reply.slice(0, 120));

const class10 = turn("Class 10 Maths, Noida");
check("class 10 maths", class10.ready && class10.draft.subjects?.some((s) => /math/i.test(s)), JSON.stringify(class10.draft));

const class11sci = turn("Class 11 Science Dwarka");
check("class 11 science rejected", !class11sci.ready && /physics|subject|science/i.test(class11sci.reply), class11sci.reply.slice(0, 140));

const class11 = turn("Class 11 Physics Noida");
check("class 11 physics", class11.ready && class11.draft.subjects?.some((s) => /physics/i.test(s)), JSON.stringify(class11.draft));

const class12 = turn("Class 12 Accounts Dwarka");
check("class 12 accounts", class12.ready && class12.draft.subjects?.some((s) => /account/i.test(s)), JSON.stringify(class12.draft));

const jee = turn("JEE Physics Rohini");
check("jee physics", jee.ready, JSON.stringify(jee.draft));

const house = turn("House no 12 near SBI branch");
check("house number rejected", !house.ready, house.reply.slice(0, 80));

const sentence = turn("Mai Mukundpur se hu, class 5 all subjects");
check("sentence keeps locality", !sentence.ready || sentence.draft.area === "Mukundpur", JSON.stringify(sentence.draft));
if (!sentence.ready && sentence.draft.area === "Mukundpur" && sentence.draft.classLevel) {
  check("class 5 from sentence becomes ready or asks confirm", sentence.draft.subjects?.[0] === "All Subjects", JSON.stringify(sentence.draft));
}

const missingArea = turn("Class 6 All Subjects");
check("asks locality", !missingArea.ready && /locality|mohalla|sector/i.test(missingArea.reply), missingArea.reply.slice(0, 100));

const onlineSenior = turn("Class 10 Maths online Rohini");
check("class 10 online allowed", onlineSenior.ready && onlineSenior.draft.mode === "ONLINE", JSON.stringify(onlineSenior.draft));

const class7 = turn("Class 7 All Subjects Janakpuri");
check("class 7", class7.ready && class7.draft.mode === "OFFLINE", JSON.stringify(class7.draft));

const accountsJunior = turn("Class 6 Accounts Rohini");
check("class 6 accounts explained", !accountsJunior.ready && /11|accounts|all subjects/i.test(accountsJunior.reply), accountsJunior.reply.slice(0, 120));

const step1 = turn("Class 5");
const step2 = turn("Pitampura", step1.draft);
check("class 5 then area", !step1.ready && step2.ready && step2.draft.subjects?.[0] === "All Subjects" && step2.draft.area === "Pitampura", JSON.stringify(step2.draft));

for (let n = 1; n <= 8; n++) {
  const good = turn(`Class ${n} All Subjects Rohini`);
  const sealed = sealLeadEntry(good.draft);
  check(`class ${n} saves`, good.ready && sealed.ok && good.draft.mode === "OFFLINE" && good.draft.subjects?.[0] === "All Subjects", JSON.stringify(good.draft));
  const physics = sealLeadEntry({ classLevel: `Class ${n}`, subjects: ["Physics"], area: "Rohini", mode: "OFFLINE" });
  check(`class ${n} physics cannot save`, !turn(`Class ${n} Physics Rohini`).ready && !physics.ok, physics.ok ? "sealed" : physics.reason);
}
for (const n of [9, 10]) {
  const good = turn(`Class ${n} Maths Rohini`);
  check(`class ${n} maths saves`, good.ready && sealLeadEntry(good.draft).ok, JSON.stringify(good.draft));
  const all = sealLeadEntry({ classLevel: `Class ${n}`, subjects: ["All Subjects"], area: "Rohini", mode: "OFFLINE" });
  check(`class ${n} all subjects cannot save`, !all.ok, all.ok ? "sealed" : all.reason);
}
for (const n of [11, 12]) {
  const good = turn(`Class ${n} Physics Noida`);
  check(`class ${n} physics saves`, good.ready && sealLeadEntry(good.draft).ok, JSON.stringify(good.draft));
  const science = sealLeadEntry({ classLevel: `Class ${n}`, subjects: ["Science"], area: "Noida", mode: "OFFLINE" });
  check(`class ${n} science cannot save`, !science.ok, science.ok ? "sealed" : science.reason);
}

const blocked = ["Please call", "Online le skti hu m", "Hindi", "1", "House no 12 near SBI", "Are you not attending the class"];
for (const sample of blocked) {
  const sealed = sealLeadEntry({ classLevel: sample, subjects: ["All Subjects"], area: sample, mode: "OFFLINE" });
  check(`cannot store ${sample}`, !sealed.ok, sealed.ok ? "sealed" : sealed.reason);
}

async function rejectWrites() {
  const samples = [
    { classLevel: "Please call", subjects: ["All Subjects"], area: "Rohini" },
    { classLevel: "Hindi", subjects: ["All Subjects"], area: "Delhi" },
    { classLevel: "Online le skti hu m", subjects: ["All Subjects"], area: "Ncr" },
    { classLevel: "Class 4", subjects: ["Physics"], area: "Rohini", modeKey: "2" },
    { classLevel: "Class 8", subjects: ["All Subjects"], area: "near SBI branch house no 12" },
    { classLevel: "Class 11", subjects: ["Science"], area: "Dwarka" },
  ];
  for (const sample of samples) {
    const result = await registerParentFromWhatsapp("919000000000", sample);
    check(`register blocked ${sample.classLevel}`, !result.ok, result.ok ? "wrote a lead" : result.error);
  }
}

rejectWrites().then(() => {
  console.log(failed === 0 ? "ALL PASSED" : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
});
