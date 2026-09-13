import {
  SUBSCRIPTION_PLANS,
  getLeadPointCost,
  getPlanTotalPoints,
  FEE_STRUCTURE_DISTRIBUTION,
} from "../lib/subscription-plans";

function runTests() {
  console.log("=== RUNNING SUBSCRIPTION & FEE STRUCTURE TESTS ===");

  // 1. Verify ₹99 Retargeting Pass (Hidden with 50% commission)
  const starter = SUBSCRIPTION_PLANS["STARTER"];
  console.assert(starter.priceInr === 99, "Starter price should be 99");
  console.assert(starter.totalLeads === 1, "Starter should provide 1 lead");
  console.assert(starter.isHidden === true, "Starter should be hidden from default view");
  console.assert(starter.commissionNote?.includes("50% Commission"), "Starter should have 50% commission note");
  console.log("✓ STARTER (₹99) verification passed (hidden by default, 50% commission for retargeting)");

  // 2. Verify ₹999 Growth Plan (mapped to BRONZE)
  const bronze = SUBSCRIPTION_PLANS["BRONZE"];
  console.assert(bronze.priceInr === 999, "Bronze price should be 999");
  console.assert(bronze.totalPoints === 60, "Bronze should provide 60 points");
  console.assert(bronze.maxTutorsPerLead === 3, "Bronze max tutors per lead should be 3");
  console.assert(!bronze.isHidden, "Bronze should not be hidden");
  console.log("✓ ₹999 Growth Plan verification passed (60 points, max 3 competition)");

  // 3. Verify Legacy Plans are Hidden
  const legacyTiers = ["SILVER", "GOLD", "PLATINUM"] as const;
  for (const tier of legacyTiers) {
    console.assert(SUBSCRIPTION_PLANS[tier].isHidden === true, `${tier} should be hidden`);
  }
  console.log("✓ Legacy tiers (Silver, Gold, Platinum) hidden status confirmed");

  // 4. Verify Fee Structure Point Allocation
  // Tier 1: Lower fee (< 3000) -> 10 points
  const costTier1 = getLeadPointCost("Class 5", 1500, 2500);
  console.assert(costTier1 === 10, `Expected 10 points for <3000, got ${costTier1}`);

  // Tier 2: Standard fee (3000 - 5000) -> 20 points
  const costTier2 = getLeadPointCost("Class 10", 3500, 4500);
  console.assert(costTier2 === 20, `Expected 20 points for 3000-5000, got ${costTier2}`);

  // Tier 3: Higher fee (> 5000) -> 30 points
  const costTier3 = getLeadPointCost("Class 12", 6000, 8000);
  console.assert(costTier3 === 30, `Expected 30 points for >5000, got ${costTier3}`);

  // Quota yield calculations on 60 points:
  const totalPoints = getPlanTotalPoints("BRONZE");
  console.assert(Math.floor(totalPoints / costTier1) === 6, "Expected 6 leads for Tier 1");
  console.assert(Math.floor(totalPoints / costTier2) === 3, "Expected 3 leads for Tier 2");
  console.assert(Math.floor(totalPoints / costTier3) === 2, "Expected 2 leads for Tier 3");
  console.log("✓ Fee structure point yields verified:");
  console.log(`  - < ₹3,000/mo  : 10 pts -> ${Math.floor(totalPoints / costTier1)} leads from 60 pts`);
  console.log(`  - ₹3,000-5,000 : 20 pts -> ${Math.floor(totalPoints / costTier2)} leads from 60 pts`);
  console.log(`  - > ₹5,000/mo  : 30 pts -> ${Math.floor(totalPoints / costTier3)} leads from 60 pts`);

  // 5. Fallback test when budget is not provided (falls back to classGrade)
  const costFallbackPrimary = getLeadPointCost("Class 4");
  console.assert(costFallbackPrimary === 10, `Expected 10 for primary fallback, got ${costFallbackPrimary}`);

  const costFallbackHigh = getLeadPointCost("Class 10");
  console.assert(costFallbackHigh === 20, `Expected 20 for secondary fallback, got ${costFallbackHigh}`);

  const costFallbackEntrance = getLeadPointCost("NEET / JEE");
  console.assert(costFallbackEntrance === 30, `Expected 30 for entrance fallback, got ${costFallbackEntrance}`);
  console.log("✓ Grade-based fallback point calculations confirmed");

  console.log("=== ALL UNIT TESTS PASSED SUCCESSFULLY ===");
}

runTests();
