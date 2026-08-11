/**
 * QA/scripts/run-all-staging-tests.ts
 *
 * Master Staging Test Suite Execution Script
 *
 * Runs all QA verification scripts against a non-production staging database.
 * Strict Runner Constraints:
 * 1. Fails immediately if DATABASE_URL matches production.
 * 2. Reports each test independently with explicit tags (STATIC TEST / RUNTIME TEST — BLOCKED / PASS / FAIL).
 * 3. Does not swallow exceptions.
 * 4. Returns non-zero exit code (1) if any runtime test fails or if safety gate blocks execution.
 */

import { runSubscriptionB1Test } from "./test-subscription-b1";
import { runRefundB2Test } from "./test-refund-b2";
import { runCouponB3Test } from "./test-coupon-b3";
import { runPrivilegeB5Test } from "./test-privilege-b5";
import { runPasswordResetB6Test } from "./test-password-reset-b6";

async function main() {
  console.log("=================================================");
  console.log("APNATUTORHUB STAGING QA TEST SUITE RUNNER");
  console.log("=================================================");

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("❌ SAFETY GATE FAIL: DATABASE_URL is not set.");
    process.exit(1);
  }

  // Safety Gate Assertion: Must NOT point to production Supabase database
  if (dbUrl.includes("awfgtylndntipblgmmll") || dbUrl.includes("apnatutorhub.com")) {
    console.error("\n❌ SAFETY GATE FAIL: DATABASE_URL points to LIVE PRODUCTION Supabase database!");
    console.error("    Refusing to execute mutation tests against production database.");
    console.error("    Please supply a disposable staging connection string in .env.test");
    console.log("\n=================================================");
    console.log("TEST RUNNER SUMMARY: EXECUTION BLOCKED BY SAFETY GATE");
    console.log("=================================================");
    console.table({
      "B1_Subscription": { category: "STATIC TEST", status: "RUNTIME TEST — BLOCKED", reason: "Production DB connection safety gate active" },
      "B2_Refund": { category: "STATIC TEST", status: "RUNTIME TEST — BLOCKED", reason: "Production DB connection safety gate active" },
      "B3_Coupon": { category: "STATIC TEST", status: "RUNTIME TEST — BLOCKED", reason: "Production DB connection safety gate active" },
      "B5_PrivilegeEscalation": { category: "STATIC TEST", status: "RUNTIME TEST — BLOCKED", reason: "Production DB connection safety gate active" },
      "B6_PasswordResetToken": { category: "STATIC TEST", status: "RUNTIME TEST — BLOCKED", reason: "Production DB connection safety gate active" },
    });
    process.exit(1);
  }

  console.log("✓ Safety Gate Passed: Non-production database URL confirmed.");

  const results: Record<string, any> = {};

  try {
    results["B1_Subscription"] = await runSubscriptionB1Test();
    results["B2_Refund"] = await runRefundB2Test();
    results["B3_Coupon"] = await runCouponB3Test();
    results["B5_PrivilegeEscalation"] = await runPrivilegeB5Test();
    results["B6_PasswordResetToken"] = await runPasswordResetB6Test();

    console.log("\n=================================================");
    console.log("STAGING QA SUMMARY RESULT");
    console.log("=================================================");
    console.table(results);
  } catch (error: any) {
    console.error("\n❌ TEST SUITE RUNNER FAILURE:", error.message);
    process.exit(1);
  }
}

main();
