import assert from "node:assert";
import { can, resolveRbacRole, SUB_ADMIN_MODULE_MAP, type RbacSubject } from "../../lib/rbac";

console.log("🧪 Running RBAC Permission Matrix Unit Tests...");

// Test 1: PARENT role permissions
const parentSubject: RbacSubject = { role: "PARENT" };
assert.strictEqual(can(parentSubject, "requirement:write"), true, "PARENT must have requirement:write");
assert.strictEqual(can(parentSubject, "lead:purchase"), false, "PARENT must NOT have lead:purchase");
assert.strictEqual(can(parentSubject, "kyc:review"), false, "PARENT must NOT have kyc:review");

// Test 2: TUTOR role permissions
const tutorSubject: RbacSubject = { role: "TUTOR" };
assert.strictEqual(can(tutorSubject, "lead:purchase"), true, "TUTOR must have lead:purchase");
assert.strictEqual(can(tutorSubject, "kyc:upload"), true, "TUTOR must have kyc:upload");
assert.strictEqual(can(tutorSubject, "wallet:topup"), true, "TUTOR must have wallet:topup");
assert.strictEqual(can(tutorSubject, "requirement:write"), false, "TUTOR must NOT have requirement:write");

// Test 3: SUB_ADMIN department permissions
const verificationSubject: RbacSubject = { role: "SUB_ADMIN", subAdminRole: "VERIFICATION" };
assert.strictEqual(resolveRbacRole(verificationSubject), "VERIFICATION", "Resolves to VERIFICATION");
assert.strictEqual(can(verificationSubject, "kyc:review"), true, "VERIFICATION must have kyc:review");
assert.strictEqual(can(verificationSubject, "wallet:refund"), false, "VERIFICATION must NOT have wallet:refund");

const financeSubject: RbacSubject = { role: "SUB_ADMIN", subAdminRole: "FINANCE" };
assert.strictEqual(can(financeSubject, "wallet:refund"), true, "FINANCE must have wallet:refund");
assert.strictEqual(can(financeSubject, "kyc:review"), false, "FINANCE must NOT have kyc:review");

// Test 4: SUPER_ADMIN has all permissions
const superAdminSubject: RbacSubject = { role: "SUPER_ADMIN" };
assert.strictEqual(can(superAdminSubject, "sub-admins:manage"), true, "SUPER_ADMIN must have sub-admins:manage");
assert.strictEqual(can(superAdminSubject, "wallet:refund"), true, "SUPER_ADMIN must have wallet:refund");

// Test 5: Sub-Admin sidebar module map mapping
assert.deepStrictEqual(
  SUB_ADMIN_MODULE_MAP["VERIFICATION"],
  ["/admin/dashboard", "/admin/kyc", "/admin/users", "/admin/audit-logs"],
  "VERIFICATION modules mapping match"
);

console.log("✅ RBAC Permission Matrix Unit Tests PASSED (5/5)\n");
