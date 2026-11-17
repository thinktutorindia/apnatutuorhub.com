import rows from "../exports/presend_tutor_leads_650.json";
import { extractAllGrades } from "../lib/whatsapp-bot/leads-helper";

const R = rows as any[];
const issues: string[] = [];
const stat = (label: string, v: string | number) => console.log(`${label}: ${v}`);

// ── A. Basic integrity ──
stat("ROWS", R.length);
stat("unique phones", new Set(R.map((r) => r.normalizedPhone)).size);
stat("unique enquiryIds", new Set(R.map((r) => r.enquiryId)).size);
stat("unique userIds", new Set(R.map((r) => r.userId)).size);
const idSeqOk = R.every((r, i) => Number(r.enquiryId) === 32201 + i);
stat("enquiryId sequential", idSeqOk);

// ── B. Name quality ──
const nameCounts: Record<string, number> = {};
for (const r of R) nameCounts[r.parentName] = (nameCounts[r.parentName] || 0) + 1;
stat("unique parent names", Object.keys(nameCounts).length);
stat(
  "name distribution (min/max)",
  `${Math.min(...Object.values(nameCounts))} / ${Math.max(...Object.values(nameCounts))}`
);
// consecutive same-name streaks
let maxStreak = 1,
  cur = 1;
for (let i = 1; i < R.length; i++) {
  cur = R[i].parentName === R[i - 1].parentName ? cur + 1 : 1;
  maxStreak = Math.max(maxStreak, cur);
}
stat("max consecutive same-name", maxStreak);
// name == tutor name
stat(
  "parentName == tutorName leaks",
  R.filter((r) => r.parentName.toLowerCase() === (r.tutorName || "").toLowerCase().trim()).length
);
// first-name duplicates of same person style
console.log(
  "top repeated names:",
  Object.entries(nameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => `${e[1]}x ${e[0]}`)
    .join(", ")
);

// ── C. Area quality (aggressive) ──
const areaCounts: Record<string, number> = {};
for (const r of R) areaCounts[r.leadArea] = (areaCounts[r.leadArea] || 0) + 1;
stat("unique areas", Object.keys(areaCounts).length);
console.log(
  "top repeated areas:",
  Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((e) => `${e[1]}x "${e[0]}"`)
    .join("\n  ")
);
// double-sector ordering ("Sector 150, Sector Chi-5")
const doubleSector = R.filter((r) => /^Sector\s*[\w-]+,\s*Sector/i.test(r.leadArea));
stat("areas starting Sector X, Sector Y", doubleSector.length);
// pincode / city-suffix remnants
stat("areas with 6-digit pincode", R.filter((r) => /\d{6}/.test(r.leadArea)).length);
stat("areas containing city dup ('X, X')", R.filter((r) => /(\w[\w ]*),\s*\1\b/i.test(r.leadArea)).length);
// single-word locality + generic landmark
const thin = R.filter((r) => r.leadArea.split(",")[0].trim().split(" ").length === 1 && /\(near (Main Market|Main Chowk|Community Centre)\)/.test(r.leadArea));
stat("thin areas (1-word locality + generic near)", thin.length);
console.log(
  "  samples:",
  thin
    .slice(0, 12)
    .map((r) => `"${r.leadArea}" (tutorLoc=${r.tutorLocality})`)
    .join("\n  ")
);
// near-landmark distribution
const nearCounts: Record<string, number> = {};
for (const r of R) {
  const m = r.leadArea.match(/\(near ([^)]+)\)/)?.[1] || "NONE";
  nearCounts[m] = (nearCounts[m] || 0) + 1;
}
console.log(
  "landmark distribution:",
  Object.entries(nearCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((e) => `${e[1]}x ${e[0]}`)
    .join(", ")
);

// ── D. Distance sanity ──
stat("dist > 5km", R.filter((r) => r.distanceKm > 5).length);
stat("dist 0 km", R.filter((r) => r.distanceKm < 0.2).length);
// distance vs message label consistency
stat(
  "message distance mismatch",
  R.filter((r) => !r.renderedMessage.includes(`(~${r.distanceKm} km nearby)`)).length
);

// ── E. Fee bands ──
const feeBad = R.filter((r) => {
  const g = Number(r.targetClass.match(/\d+/)?.[0] || 0);
  const nums = (r.budget.match(/[\d,]+/g) || []).map((s: string) => Number(s.replace(/,/g, "")));
  if (g <= 5) return !/month/.test(r.budget) || nums[0] < 6000 || nums[1] > 6800;
  if (g <= 8) return !/month/.test(r.budget) || nums[0] < 6800 || nums[1] > 7600;
  if (g <= 10) return !/hour/.test(r.budget) || nums[0] < 700 || nums[1] > 850;
  return !/hour/.test(r.budget) || nums[0] < 850 || nums[1] > 1050;
});
stat("fee-band violations", feeBad.length);
if (feeBad.length) console.log(feeBad.slice(0, 5).map((r) => `${r.srNo} ${r.targetClass} ${r.budget}`).join("\n"));

// ── F. Subject logic deep ──
// grade mismatch: 9-10 with senior-only subjects, 11-12 with junior subjects
const subjBad = R.filter((r) => {
  const g = Number(r.targetClass.match(/\d+/)?.[0] || 0);
  if (g >= 11) return /^(Science|Commerce|All Subjects|English|Social Science|EVS)$/i.test(r.targetSubject);
  if (g >= 9) return /^(All Subjects|Accountancy|Business Studies|Political Science|History|Economics|Physics|Chemistry|Biology)$/i.test(r.targetSubject);
  return r.targetSubject !== "All Subjects";
});
stat("grade/subject band violations", subjBad.length);
// subject never contains junk
stat(
  "subject junk",
  R.filter((r) => /for\s+class|class\s*[\divx]+/i.test(r.targetSubject)).length
);

// ── G. Rendered message integrity (new 7-param layout) ──
stat(
  "message field mismatches",
  R.filter(
    (r) =>
      !r.renderedMessage.includes(`#${r.enquiryId}`) ||
      !r.renderedMessage.includes(`Name : ${r.parentName}`) ||
      !r.renderedMessage.includes(`Class : ${r.targetClass}`) ||
      !r.renderedMessage.includes(`Subject : ${r.targetSubject}`) ||
      !r.renderedMessage.includes(r.leadArea) ||
      !r.renderedMessage.includes(r.budget) ||
      !/Mode : Home Tuition \(Offline\)/.test(r.renderedMessage) ||
      /Any \(Male or Female Tutor\)/.test(r.renderedMessage)
  ).length
);
// phone column clean, no test/demo leakage, no non-NCR
stat("phone col not 10-digit", R.filter((r) => !/^\d{10}$/.test(String(r.phone))).length);
stat("test/demo leaked", R.filter((r) => /demo|test|pending kyc/i.test(r.tutorName) || /\.test@|test@apnatutorhub/i.test(r.email)).length);
stat("wa.* placeholder emails", R.filter((r) => /^wa\.\d+@apnatutorhub\.com$/i.test(r.email)).length);
stat("invalid emails", R.filter((r) => r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email)).length);
console.log(
  "cities:",
  [...new Set(R.map((r) => r.tutorCity))].sort().join(", ")
);
console.log(
  "non-name tutor names:",
  R.filter((r) => isJunkName(r.tutorName)).slice(0, 10).map((r) => r.tutorName).join(", ")
);
function isJunkName(n: string): boolean {
  const l = (n || "").toLowerCase().trim();
  if (!l) return true;
  if (/^tutor(\s|$|\d)/.test(l)) return true;
  if (/\d/.test(n)) return true;
  if (/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}]/u.test(n)) return true;
  if (/\b(school|academy|institute|coaching|classes|centre|center|tuition)\b/.test(l)) return true;
  if (/\b(delhi|noida|gurgaon|gurugram|rohini|dwarka|faridabad|ghaziabad)\b$/.test(l)) return true;
  if (n.split(/\s+/).length >= 6) return true;
  return false;
}
stat("mojibake in message", R.filter((r) => /Ã|â€|Â/.test(r.renderedMessage)).length);

// ── H. Class plausibility: does tutor actually teach picked grade? ──
{
  let n = 0;
  for (const r of R) {
    const g = Number(r.targetClass.match(/\d+/)?.[0] || 0);
    const grades = extractAllGrades(String(r.tutorClasses || ""));
    if (grades.size > 0 && !grades.has(g)) {
      n++;
      if (n <= 5) console.log(`  grade-mismatch sample: #${r.srNo} ${r.targetClass} from tutorClasses="${r.tutorClasses}"`);
    }
  }
  console.log(`picked grade outside tutor classes: ${n}`);
}

if (issues.length) console.log("EXPLICIT ISSUES:\n" + issues.join("\n"));
