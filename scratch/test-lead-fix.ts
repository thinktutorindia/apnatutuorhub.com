import { generateDummyLead } from "../lib/dummy-lead-engine";
import { expandToIndividualClasses } from "../lib/dummy-campaign-types";

async function main() {
  console.log("=== Testing Class Expansion ===");
  const testProfiles = [
    ["1 to 8"],
    ["1 st to5 th all subject", "6 to 8 th english and social science"],
    ["Class 7th"],
    ["Nursery to class 10 ( CBSE board)"],
    ["Classes Can Teach - 1-10th class"],
    ["All subjects till class 9"],
    ["Maths 9-10th eco 11th-12th"],
    ["Classes Can Teach - classes 1 to 10"],
    ["Maths Computer Science and all subjects upto 8th class"],
    ["Class 4", "Class 7"],
    [],
  ];

  testProfiles.forEach((p, idx) => {
    const expanded = expandToIndividualClasses(p);
    console.log(`Profile ${idx + 1}: ${JSON.stringify(p)} -> Expanded: ${JSON.stringify(expanded)}`);
  });

  console.log("\n=== Testing Dummy Lead Generation Samples ===");
  let hasError = false;
  for (let i = 0; i < 20; i++) {
    const lead = await generateDummyLead({
      tutorCity: "Delhi",
      tutorAddress: "Batra, Delhi",
      tutorSubjects: ["English", "Mathematics"],
      tutorClassLevels: ["1 to 8"],
      rateType: "HOURLY",
      userSeed: i,
    });

    const diff = lead.budgetMax - lead.budgetMin;
    console.log(
      `Lead ${i + 1}: Class="${lead.classLevel}" | Subjects=[${lead.subjects.join(", ")}] | Budget=₹${lead.budgetMin}–₹${lead.budgetMax}/hr (Diff: ₹${diff}) | Locality="${lead.locality}"`
    );

    if (lead.classLevel.includes("to") || lead.classLevel.includes("-")) {
      console.error("FAILED: classLevel contains range:", lead.classLevel);
      hasError = true;
    }
    if (diff !== 50 && diff !== 100) {
      console.error("FAILED: diff is not 50 or 100:", diff);
      hasError = true;
    }
  }

  console.log("\n=== Testing Monthly Rate Samples ===");
  for (let i = 0; i < 6; i++) {
    const lead = await generateDummyLead({
      tutorCity: "Delhi",
      tutorSubjects: ["Physics", "Chemistry"],
      tutorClassLevels: ["Class 11 to 12"],
      rateType: "MONTHLY",
      userSeed: i * 7,
    });
    const diff = lead.budgetMax - lead.budgetMin;
    console.log(
      `Monthly Lead ${i + 1}: Class="${lead.classLevel}" | Budget=₹${lead.budgetMin}–₹${lead.budgetMax}/mo (Diff: ₹${diff})`
    );
    if (diff !== 500 && diff !== 1000) {
      console.error("FAILED monthly diff:", diff);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! Discrete classes & tight ₹50-₹100 price differences verified. <<<");
  } else {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
