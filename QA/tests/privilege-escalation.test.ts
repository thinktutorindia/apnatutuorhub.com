import assert from "node:assert";

const PRIVILEGED_ROLES = new Set(["SUPER_ADMIN", "SUB_ADMIN"]);

function checkUserCreationPrivilege(
  sessionRole: string,
  targetRole: string
): { allowed: boolean; reason?: string } {
  if (PRIVILEGED_ROLES.has(targetRole) && sessionRole !== "SUPER_ADMIN") {
    return { allowed: false, reason: "Forbidden: only a Super Admin can create admin accounts." };
  }
  return { allowed: true };
}

function checkPasswordResetPrivilege(
  sessionRole: string,
  targetUserRole: string
): { allowed: boolean; reason?: string } {
  if (PRIVILEGED_ROLES.has(targetUserRole) && sessionRole !== "SUPER_ADMIN") {
    return { allowed: false, reason: "Forbidden: non-Super-Admin cannot reset admin passwords." };
  }
  return { allowed: true };
}

console.log("🧪 Running Admin Privilege Escalation Protection (B5) Unit Tests...");

// Test 1: SUPPORT sub-admin trying to create SUPER_ADMIN fails
const res1 = checkUserCreationPrivilege("SUB_ADMIN", "SUPER_ADMIN");
assert.strictEqual(res1.allowed, false, "Sub-admin creating SUPER_ADMIN must fail");
assert.strictEqual(res1.reason?.includes("only a Super Admin"), true);

// Test 2: SUPPORT sub-admin trying to create SUB_ADMIN fails
const res2 = checkUserCreationPrivilege("SUB_ADMIN", "SUB_ADMIN");
assert.strictEqual(res2.allowed, false, "Sub-admin creating SUB_ADMIN must fail");

// Test 3: SUPPORT sub-admin creating PARENT/TUTOR succeeds
const res3 = checkUserCreationPrivilege("SUB_ADMIN", "PARENT");
assert.strictEqual(res3.allowed, true, "Sub-admin creating PARENT must succeed");

// Test 4: SUPER_ADMIN creating SUB_ADMIN succeeds
const res4 = checkUserCreationPrivilege("SUPER_ADMIN", "SUB_ADMIN");
assert.strictEqual(res4.allowed, true, "SUPER_ADMIN creating SUB_ADMIN must succeed");

// Test 5: SUPPORT sub-admin resetting SUPER_ADMIN password fails
const res5 = checkPasswordResetPrivilege("SUB_ADMIN", "SUPER_ADMIN");
assert.strictEqual(res5.allowed, false, "Sub-admin resetting admin password must fail");

console.log("✅ Admin Privilege Escalation Protection (B5) Unit Tests PASSED (5/5)\n");
