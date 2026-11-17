import fs from "fs";
import path from "path";

const jsonPath = path.join(process.cwd(), "exports", "presend_tutor_leads_650.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

console.log("=== PRESEND LEAD FILE AUDIT VERIFICATION ===");
console.log("Total records in output:", data.length);

// 1. Business names
const biz = data.filter((d: any) => /studyhelpline|achiievers|bhawani\s+building/i.test(d.tutorName));
console.log("1. Business names found:", biz.length, biz.length === 0 ? "✅ PASS" : "❌ FAIL");

// 2. Bad names (short or non-alpha)
const bad = data.filter((d: any) => d.tutorName.trim().length <= 2 || !/^[A-Za-z]/.test(d.tutorName));
console.log("2. Bad/unusable names found:", bad.length, bad.length === 0 ? "✅ PASS" : "❌ FAIL");

// 3. ALL CAPS or trailing punctuation in tutor names
const caps = data.filter((d: any) => /\b[A-Z]{2,}\b/.test(d.tutorName) || /[.,]$/.test(d.tutorName));
console.log("3. ALL CAPS or trailing punctuation in names:", caps.length, caps.length === 0 ? "✅ PASS" : "❌ FAIL");

// 4. Junk tutor localities
const junkLoc = data.filter(
  (d: any) =>
    /\b(mathematics|maths|physics|chemistry|alpha|beta|outside|border|online)\b/i.test(d.tutorLocality) ||
    /^(north|south|east|west)$/i.test(d.tutorLocality)
);
console.log("4. Junk tutor localities found:", junkLoc.length, junkLoc.length === 0 ? "✅ PASS" : "❌ FAIL");

// 5. Raw address suffixes in tutor locality
const suffixes = data.filter((d: any) =>
  /\b\d{5,6}\b|india|uttarakhand|haryana|uttar\s+pradesh/i.test(d.tutorLocality)
);
console.log("5. Raw address suffixes in locality:", suffixes.length, suffixes.length === 0 ? "✅ PASS" : "❌ FAIL");

// 6. Canonical NCR cities
const nonNcrCities = data.filter((d: any) => !/^(Delhi|Noida|Greater Noida|Gurugram|Ghaziabad|Faridabad)$/.test(d.tutorCity));
console.log("6. Non-canonical/Inconsistent cities found:", nonNcrCities.length, nonNcrCities.length === 0 ? "✅ PASS" : "❌ FAIL");
const cityCounts: Record<string, number> = {};
data.forEach((d: any) => { cityCounts[d.tutorCity] = (cityCounts[d.tutorCity] || 0) + 1; });
console.log("   City breakdown:", cityCounts);

// 7. Distance check (<= 5.0 km)
const maxDist = Math.max(...data.map((d: any) => d.distanceKm));
const over5km = data.filter((d: any) => d.distanceKm > 5.0);
console.log(`7. Max distance: ${maxDist} km | Over 5km count: ${over5km.length}`, over5km.length === 0 ? "✅ PASS" : "❌ FAIL");

// 8. Fake and typo emails
const fakeEmails = data.filter((d: any) => /apnatutorhub\.com/i.test(d.email));
const typoEmails = data.filter((d: any) => /@gamil\.|@gmial\.|@yaho\.|@hotmial\./i.test(d.email));
console.log("8a. Fake apnatutorhub.com emails:", fakeEmails.length, fakeEmails.length === 0 ? "✅ PASS" : "❌ FAIL");
console.log("8b. Typo domain emails (gamil/gmial):", typoEmails.length, typoEmails.length === 0 ? "✅ PASS" : "❌ FAIL");
if (typoEmails.length > 0) {
  console.log("   Typo emails details:", typoEmails.map((d: any) => ({ sr: d.srNo, name: d.tutorName, email: d.email })));
}

// 9. Client name check (NEVER bare "Parent")
const parentNameCount = data.filter((d: any) => d.parentName === "Parent" || d.renderedMessage.includes("Name : Parent"));
console.log("9. Generic 'Parent' in name/message:", parentNameCount.length, parentNameCount.length === 0 ? "✅ PASS" : "❌ FAIL");

// 10. Class 1-8 All Subjects + Monthly check
const class1to8Bad = data.filter((d: any) => {
  const g = Number(d.targetClass.match(/\d+/)?.[0] || 0);
  return g <= 8 && (d.targetSubject !== "All Subjects" || !d.budget.includes("/ month"));
});
console.log("10. Class 1-8 subject/fee rule violations:", class1to8Bad.length, class1to8Bad.length === 0 ? "✅ PASS" : "❌ FAIL");

// 11. Class 9-12 specific subject + Hourly check
const class9to12Bad = data.filter((d: any) => {
  const g = Number(d.targetClass.match(/\d+/)?.[0] || 0);
  return (
    g >= 9 &&
    (d.targetSubject === "All Subjects" ||
      !d.budget.includes("/ hour") ||
      (g >= 11 && /^(science|commerce)$/i.test(d.targetSubject)))
  );
});
console.log("11. Class 9-12 subject/fee rule violations:", class9to12Bad.length, class9to12Bad.length === 0 ? "✅ PASS" : "❌ FAIL");

// Explicit User Feedback Checks
console.log("\n--- Specific User Highlight Tutors ---");
const checkTutors = [
  "Xyz",
  "Jayanti Jha",
  "Md Faisal",
  "Sheetal",
  "Amit Kishore Rajput",
  "Ruchi Malviya",
  "Manisha Sharma",
  "Arshi",
  "Sanjay Kumar",
  "Santosh",
  "Pooja Lohiya",
  "Harshita Rawat",
  "Vikas",
  "Manoj Yadav",
];
checkTutors.forEach((name) => {
  const matches = data.filter((d: any) => d.tutorName.toLowerCase() === name.toLowerCase());
  if (matches.length === 0) {
    console.log(`[REMOVED ✅] "${name}" is not in dataset`);
  } else {
    matches.forEach((d: any) => {
      console.log(`[Sr #${d.srNo} PRESENT] "${d.tutorName}" | Locality: "${d.tutorLocality}" (${d.tutorCity}) | Class: "${d.targetClass}" | Subject: "${d.targetSubject}"`);
    });
  }
});




// Check Gokal Puri
console.log("\n--- Gokal Puri Tutors Check ---");
data
  .filter((d: any) => /gokal\s*puri/i.test(d.tutorLocality) || /gokal\s*puri/i.test(d.renderedMessage))
  .forEach((d: any) => {
    console.log(`[Sr #${d.srNo}] ${d.tutorName}: Locality="${d.tutorLocality}" (${d.tutorCity}) | Area="${d.leadArea}" (~${d.distanceKm} km) | Msg Area Line: ${d.placeholders[4]}`);
  });

// Check Hindi, Economics, Accounts tutors
console.log("\n--- Subject Checks (Hindi, Economics, Accountancy, Chemistry) ---");
data
  .filter((d: any) => ["Hindi", "Economics", "Accountancy", "Chemistry"].includes(d.targetSubject))
  .slice(0, 10)
  .forEach((d: any) => {
    console.log(`[Sr #${d.srNo}] ${d.tutorName}: Subjects="${d.tutorSubjects}" -> Pitched Class="${d.targetClass}", Subject="${d.targetSubject}"`);
  });

