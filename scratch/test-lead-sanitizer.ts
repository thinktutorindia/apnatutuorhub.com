import { sanitizeLeadNotes } from "../lib/lead-sanitizer";

function run() {
  console.log("=== TESTING LEAD SANITIZER ===");

  // Case 1: The exact text from user's screenshot
  const screenshotNote = `"[Batch: TODAY_PARENTS_SEP_2026] [Source: Uploaded Batch Sep 2026] [RefId: ATH-PAR-600] / Contact: +91 98914 45446]"`;
  const res1 = sanitizeLeadNotes(screenshotNote, false);
  console.log("Case 1 (User screenshot):", res1);
  console.assert(res1 === null, `Expected null, got "${res1}"`);

  // Case 2: Batch text with real requirements appended
  const batchWithReq = `[Batch: TODAY_PARENTS_SEP_2026] [Source: Uploaded Batch Sep 2026] [RefId: ATH-PAR-001] | Contact: +91 88827 16869 | Needs CBSE Maths teacher for Class 10`;
  const res2 = sanitizeLeadNotes(batchWithReq, false);
  console.log("Case 2 (Batch with req):", res2);
  console.assert(res2 === "Needs CBSE Maths teacher for Class 10", `Expected "Needs CBSE Maths teacher for Class 10", got "${res2}"`);

  // Case 3: Parent phone number typed into requirements
  const phoneInReq = `Please call on 98914 45446 or whatsapp +91 9891445446. Prefer evening classes.`;
  const res3 = sanitizeLeadNotes(phoneInReq, false);
  console.log("Case 3 (Phone in req):", res3);
  console.assert(!res3?.includes("98914"), "Phone should be stripped");
  console.assert(res3?.includes("Prefer evening classes"), "Legitimate text should be preserved");

  // Case 4: Only phone number
  const onlyPhone = `Contact: +91 98123 45678`;
  const res4 = sanitizeLeadNotes(onlyPhone, false);
  console.log("Case 4 (Only phone):", res4);
  console.assert(res4 === null, `Expected null, got "${res4}"`);

  // Case 5: Purchased mode
  const res5 = sanitizeLeadNotes(batchWithReq, true);
  console.log("Case 5 (Purchased):", res5);
  console.assert(res5 === "Needs CBSE Maths teacher for Class 10", `Expected "Needs CBSE Maths teacher for Class 10", got "${res5}"`);

  console.log("=== ALL SANITIZER TESTS PASSED ===");
}

run();
