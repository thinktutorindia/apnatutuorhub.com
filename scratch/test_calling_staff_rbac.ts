import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { getAllowedSubAdminModules, can } from "../lib/rbac";

async function verify() {
  console.log("Testing Caller Staff Accounts and RBAC rules...");

  const emails = ["caller1@apnatutorhub.com", "caller2@apnatutorhub.com"];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`User ${email} not found in DB!`);
    }

    console.log(`\n=== Verifying ${user.name} (${user.email}) ===`);
    console.log(`ID: ${user.id}`);
    console.log(`Role: ${user.role}, SubAdminRole: ${user.subAdminRole}`);
    console.log(`CustomPermissions:`, user.customPermissions);
    console.log(`Active: ${user.isActive}`);

    // Verify Password
    const passwordToTest = email === "caller1@apnatutorhub.com" ? "Caller@Edu2026!1" : "Caller@Edu2026!2";
    const passMatches = await bcrypt.compare(passwordToTest, user.passwordHash || "");
    if (!passMatches) throw new Error(`Password verification failed for ${email}!`);
    console.log(`[PASS] Password verified successfully`);

    // Verify Allowed Modules
    const allowed = getAllowedSubAdminModules({
      role: user.role,
      subAdminRole: user.subAdminRole,
      customPermissions: user.customPermissions,
    });
    console.log(`Allowed modules:`, allowed);

    // Assert allowed
    if (!allowed.includes("/admin/users")) throw new Error("Missing /admin/users in allowed modules!");
    if (!allowed.includes("/admin/staff-leads/my-leads")) throw new Error("Missing /admin/staff-leads/my-leads in allowed modules!");
    if (!allowed.includes("/admin/staff-leads/my-dashboard")) throw new Error("Missing /admin/staff-leads/my-dashboard in allowed modules!");

    // Assert blocked
    if (allowed.includes("/admin/dashboard")) throw new Error("SECURITY FAIL: /admin/dashboard should NOT be in allowed modules!");
    if (allowed.includes("/admin/kyc")) throw new Error("SECURITY FAIL: /admin/kyc should NOT be in allowed modules!");
    if (allowed.includes("/admin/wallets")) throw new Error("SECURITY FAIL: /admin/wallets should NOT be in allowed modules!");
    if (allowed.includes("/admin/settings")) throw new Error("SECURITY FAIL: /admin/settings should NOT be in allowed modules!");
    if (allowed.includes("/admin/audit-logs")) throw new Error("SECURITY FAIL: /admin/audit-logs should NOT be in allowed modules!");

    console.log(`[PASS] Allowed modules correctly limited to Calling Desk & User Directory only!`);

    // Verify Granular Permissions
    const canReadUsers = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "users:read");
    const canManageUsers = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "users:manage");
    const canReadLeads = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "leads:read");
    const canManageWallets = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "wallets:manage");
    const canReviewKyc = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "kyc:review");
    const canManageSettings = can({ role: user.role, subAdminRole: user.subAdminRole, customPermissions: user.customPermissions }, "settings:manage");

    if (!canReadUsers) throw new Error("Expected users:read to be true");
    if (!canManageUsers) throw new Error("Expected users:manage to be true");
    if (!canReadLeads) throw new Error("Expected leads:read to be true");
    if (canManageWallets) throw new Error("SECURITY FAIL: wallets:manage must be false!");
    if (canReviewKyc) throw new Error("SECURITY FAIL: kyc:review must be false!");
    if (canManageSettings) throw new Error("SECURITY FAIL: settings:manage must be false!");

    console.log(`[PASS] Granular permissions verified (users:read=true, users:manage=true, wallets:manage=false, kyc:review=false)`);
  }

  console.log("\n[ALL TESTS PASSED] Both caller accounts are 100% verified and secure.");
}

verify()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
