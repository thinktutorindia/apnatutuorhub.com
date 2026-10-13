import { getInterestedLeadsAction } from "../app/actions/interested-leads.actions";
import { editWhatsAppPitchWithAIAction } from "../app/actions/ai-message-edit.actions";

async function main() {
  console.log("=== 1. Testing AI Message Editor Business Rules ===");

  // Test 1: Class 1-8 price increase
  const res1 = await editWhatsAppPitchWithAIAction({
    currentTemplate: `Namaste {{name}} ji,
Class: Class 6 (All Subjects)
Fee: ₹4,800/month
Location: {{location}} ({{distance}})
Reply YES to claim.`,
    instruction: "Increase fee by 15%",
    categoryHint: "CLASS_1_8",
  });
  console.log("Test 1 (Class 1-8 Price Increase):", res1.success ? "PASSED" : "FAILED", res1.data?.revisedTemplate);
  console.log("Validation Report:", res1.data?.validationReport);

  // Test 2: Class 9-12 hourly requirement
  const res2 = await editWhatsAppPitchWithAIAction({
    currentTemplate: `Hello {{name}},
Class: Class 10 (Mathematics)
Fee: ₹500/hr
Location: {{location}} ({{distance}})
Reply YES to claim.`,
    instruction: "Make it urgent with demo tomorrow",
    categoryHint: "CLASS_9_12",
  });
  console.log("Test 2 (Class 9-12 Hourly):", res2.success ? "PASSED" : "FAILED", res2.data?.revisedTemplate);
  console.log("Validation Report:", res2.data?.validationReport);

  // Test 3: Attempting invalid Class 9-12 with 'All Subjects' and '/month'
  const res3 = await editWhatsAppPitchWithAIAction({
    currentTemplate: `Hello {{name}},
Class: Class 12 (All Subjects)
Fee: ₹6,000/month
Reply YES.`,
    instruction: "Update template",
    categoryHint: "CLASS_9_12",
  });
  console.log("Test 3 (Auto-Fix Invariants):", res3.success ? "PASSED" : "FAILED");
  console.log("Auto-corrected template:\n", res3.data?.revisedTemplate);
  console.log("Report:", res3.data?.validationReport);
}

main().catch(console.error);
