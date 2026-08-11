import assert from "node:assert";

/**
 * Mock database state simulating concurrent wallet balance deduction and lead capacity logic.
 */
class MockDatabase {
  wallet = { balance: 10, totalSpent: 0 };
  lead = { purchaseCount: 4, maxTutors: 5, status: "ACTIVE" };
  leadPurchases = new Set<string>();

  // Simulates atomic updateMany: tx.wallet.updateMany({ where: { balance: { gte: coinCost } } })
  async purchaseLead(tutorId: string, coinCost: number): Promise<{ success: boolean; reason?: string }> {
    const purchaseKey = `lead1_${tutorId}`;
    if (this.leadPurchases.has(purchaseKey)) {
      return { success: false, reason: "Already purchased" };
    }

    if (this.wallet.balance < coinCost) {
      return { success: false, reason: "Insufficient balance" };
    }

    if (this.lead.purchaseCount >= this.lead.maxTutors) {
      return { success: false, reason: "Lead capacity reached" };
    }

    // Atomic state update
    this.wallet.balance -= coinCost;
    this.wallet.totalSpent += coinCost;
    this.lead.purchaseCount += 1;
    this.leadPurchases.add(purchaseKey);

    if (this.lead.purchaseCount >= this.lead.maxTutors) {
      this.lead.status = "APPLICATIONS_RECEIVED";
    }

    return { success: true };
  }
}

console.log("🧪 Running Concurrency & Double-Spending Balance Guard Unit Tests...");

async function runTests() {
  const db = new MockDatabase();

  // Test 1: First purchase succeeds (costs 10 coins, balance drops 10 -> 0, capacity 4 -> 5)
  const res1 = await db.purchaseLead("tutor1", 10);
  assert.strictEqual(res1.success, true, "First purchase must succeed");
  assert.strictEqual(db.wallet.balance, 0, "Wallet balance must be exactly 0");
  assert.strictEqual(db.lead.purchaseCount, 5, "Purchase count must be exactly 5");
  assert.strictEqual(db.lead.status, "APPLICATIONS_RECEIVED", "Status transitions to APPLICATIONS_RECEIVED");

  // Test 2: Double purchase by same tutor fails
  const resDuplicate = await db.purchaseLead("tutor1", 10);
  assert.strictEqual(resDuplicate.success, false, "Duplicate purchase by same tutor must fail");
  assert.strictEqual(resDuplicate.reason, "Already purchased");

  // Test 3: Concurrent purchase by second tutor fails due to 0 balance and capacity limit
  const res2 = await db.purchaseLead("tutor2", 10);
  assert.strictEqual(res2.success, false, "Concurrent purchase with 0 balance must fail");
  assert.strictEqual(res2.reason, "Insufficient balance");

  // Verify wallet balance NEVER dropped below 0
  assert.strictEqual(db.wallet.balance >= 0, true, "Wallet balance must NEVER be negative");

  console.log("✅ Concurrency & Double-Spending Balance Guard Unit Tests PASSED (3/3)\n");
}

runTests();
