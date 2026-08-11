import assert from "node:assert";
import crypto from "node:crypto";

/**
 * Isolated unit test for Password Reset Token CSPRNG generation & entropy.
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

console.log("🧪 Running Password Reset Token Entropy Unit Tests...");

// Test 1: Token length is 64 hex characters (256 bits)
const token1 = generateResetToken();
assert.strictEqual(token1.length, 64, "Token length must be 64 hex characters");

// Test 2: Hex encoding validity
assert.strictEqual(/^[0-9a-f]{64}$/.test(token1), true, "Token must be a valid hex string");

// Test 3: Uniqueness across 1,000 generated tokens (Collision check)
const tokenSet = new Set<string>();
for (let i = 0; i < 1000; i++) {
  tokenSet.add(generateResetToken());
}
assert.strictEqual(tokenSet.size, 1000, "All 1,000 tokens must be unique (zero collisions)");

console.log("✅ Password Reset Token Entropy Unit Tests PASSED (3/3)\n");
