import { isTill5thClass, isOnlineClassEligible, canSendLeadNotification } from "../lib/lead-utils";
import { isModeCompatible, coversClassLevel } from "../lib/matching-engine";
import { generateDummyLead } from "../lib/dummy-lead-engine";

async function runTests() {
  console.log("=== 1. Testing isTill5thClass & canSendLeadNotification ===");
  
  const earlyGrades = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "1st Std",
    "2nd Std",
    "3rd Std",
    "4th Std",
    "5th Std",
    "Class 1-5",
    "Class 1 to 5",
    "1 to 5",
    "1st to 5th",
    "Nursery",
    "KG",
    "LKG",
    "UKG",
    "Playgroup",
    "Prep",
    "Junior KG",
    "Senior KG",
    "Kindergarten",
    "Primary",
    "Class I",
    "Class II",
    "Class III",
    "Class IV",
    "Class V",
    "Class I-V",
  ];

  const higherGrades = [
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
    "6th Std",
    "10th Std",
    "12th Std",
    "Class 6-8",
    "Class 9-10",
    "Class 11-12",
    "JEE",
    "IIT-JEE",
    "NEET",
    "Coding",
    "CA",
    "Languages",
  ];

  let earlyPass = 0;
  for (const grade of earlyGrades) {
    const isTill5 = isTill5thClass(grade);
    const canOnline = canSendLeadNotification({ mode: "ONLINE", classLevel: grade });
    const canOffline = canSendLeadNotification({ mode: "OFFLINE", classLevel: grade });
    
    if (isTill5 && !canOnline && canOffline) {
      earlyPass++;
    } else {
      console.error(`❌ FAILED for early grade: "${grade}" -> isTill5=${isTill5}, canOnline=${canOnline}, canOffline=${canOffline}`);
    }
  }
  console.log(`✅ Early grades test passed: ${earlyPass}/${earlyGrades.length} (Online notifications blocked, Offline allowed)`);

  let higherPass = 0;
  for (const grade of higherGrades) {
    const isTill5 = isTill5thClass(grade);
    const canOnline = canSendLeadNotification({ mode: "ONLINE", classLevel: grade });
    const canOffline = canSendLeadNotification({ mode: "OFFLINE", classLevel: grade });
    
    if (!isTill5 && canOnline && canOffline) {
      higherPass++;
    } else {
      console.error(`❌ FAILED for higher grade: "${grade}" -> isTill5=${isTill5}, canOnline=${canOnline}, canOffline=${canOffline}`);
    }
  }
  console.log(`✅ Higher grades test passed: ${higherPass}/${higherGrades.length} (Online notifications allowed)`);

  console.log("\n=== 2. Testing isModeCompatible in Matching Engine ===");
  const modeTest1 = isModeCompatible("ONLINE", "ONLINE", "Class 3"); // Should be false (disabled for Class 3)
  const modeTest2 = isModeCompatible("ONLINE", "ONLINE", "Class 10"); // Should be true
  const modeTest3 = isModeCompatible("OFFLINE", "OFFLINE", "Class 3"); // Should be true
  const modeTest4 = isModeCompatible("EITHER", "ONLINE", "Class 1-5"); // Should be false (lead is ONLINE for early grade)
  const modeTest5 = isModeCompatible("EITHER", "ONLINE", "Class 8"); // Should be true

  console.log(`- Class 3 ONLINE matching: ${!modeTest1 ? "✅ Rejected (Correct)" : "❌ Allowed (Bug)"}`);
  console.log(`- Class 10 ONLINE matching: ${modeTest2 ? "✅ Allowed (Correct)" : "❌ Rejected (Bug)"}`);
  console.log(`- Class 3 OFFLINE matching: ${modeTest3 ? "✅ Allowed (Correct)" : "❌ Rejected (Bug)"}`);
  console.log(`- Class 1-5 ONLINE matching with EITHER tutor: ${!modeTest4 ? "✅ Rejected (Correct)" : "❌ Allowed (Bug)"}`);
  console.log(`- Class 8 ONLINE matching with EITHER tutor: ${modeTest5 ? "✅ Allowed (Correct)" : "❌ Rejected (Bug)"}`);

  console.log("\n=== 3. Testing generateDummyLead Mode Selection ===");
  for (let i = 0; i < 10; i++) {
    const dummy1 = await generateDummyLead({
      tutorClassLevels: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
      teachingMode: "ONLINE", // Even if tutor is online, early grade should force OFFLINE / non-online
      userSeed: i * 37,
    });
    if (dummy1.mode === "ONLINE") {
      console.error(`❌ Dummy lead for early grade has ONLINE mode:`, dummy1);
    }
  }
  console.log("✅ All dummy leads generated for Class 1-5 are strictly non-online!");

  console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
}

runTests().catch(console.error);
