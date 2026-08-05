// Role-Based Access Control — permission matrix for all roles including sub-admins.
// Phase 10 adds granular sub-admin permissions per department.

export const PERMISSIONS = [
  // Standard user permissions
  "requirement:write",
  "lead:purchase",
  "kyc:upload",
  // Admin permissions
  "kyc:review",
  "wallet:topup",
  "wallet:refund",
  "audit:read",
  "settings:manage",
  // Sub-admin department permissions
  "users:read",
  "users:suspend",
  "leads:manage",
  "leads:read",
  "wallets:manage",
  "wallets:read",
  "sub-admins:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** `UserRole`, with `SUB_ADMIN` resolved down to its `SubAdminRole`. */
export type RbacRole =
  | "PARENT"
  | "TUTOR"
  | "SUPPORT"
  | "VERIFICATION"
  | "FINANCE"
  | "OPERATIONS"
  | "MARKETING"
  | "SUPER_ADMIN";

const PERMISSION_MATRIX: Record<RbacRole, readonly Permission[]> = {
  PARENT: ["requirement:write"],
  TUTOR: ["lead:purchase", "kyc:upload", "wallet:topup"],

  // ── Sub-Admin Departments ──────────────────────────────────────────────────
  SUPPORT: [
    "users:read",         // View user search / contact details
    "users:suspend",      // Suspend/reactivate user accounts
    "leads:read",         // View active lead feed for support context
    "audit:read",         // Read audit logs (read-only)
  ],
  VERIFICATION: [
    "kyc:review",         // Approve / reject tutor KYC documents
    "users:read",
    "audit:read",
  ],
  FINANCE: [
    "wallet:refund",      // Credit / debit wallet coins
    "wallets:manage",     // Full wallet management panel
    "wallets:read",
    "audit:read",
  ],
  OPERATIONS: [
    "leads:manage",       // Close/expire/adjust leads
    "leads:read",
    "users:read",
    "audit:read",
  ],
  MARKETING: [
    "settings:manage",    // Platform settings / coin package pricing
    "leads:read",
    "audit:read",
  ],

  SUPER_ADMIN: PERMISSIONS, // All permissions
};

export type RbacSubject = {
  role?: string | null;
  subAdminRole?: string | null;
};

export function resolveRbacRole(subject: RbacSubject): RbacRole | null {
  const role = subject.role === "SUB_ADMIN" ? subject.subAdminRole : subject.role;
  if (!role) return null;
  return role in PERMISSION_MATRIX ? (role as RbacRole) : null;
}

export function can(subject: RbacSubject, permission: Permission): boolean {
  const role = resolveRbacRole(subject);
  if (!role) return false;
  return (PERMISSION_MATRIX[role] as readonly string[]).includes(permission);
}

// Helper: return all allowed permissions for a subject (used for sidebar rendering)
export function getAllowedPermissions(subject: RbacSubject): readonly Permission[] {
  const role = resolveRbacRole(subject);
  if (!role) return [];
  return PERMISSION_MATRIX[role];
}

// Helper: map sub-admin role to sidebar-visible modules
export const SUB_ADMIN_MODULE_MAP: Record<string, string[]> = {
  SUPPORT: ["/admin/dashboard", "/admin/users", "/admin/audit-logs"],
  VERIFICATION: ["/admin/dashboard", "/admin/kyc", "/admin/users", "/admin/audit-logs"],
  FINANCE: ["/admin/dashboard", "/admin/wallets", "/admin/audit-logs"],
  OPERATIONS: ["/admin/dashboard", "/admin/leads", "/admin/users", "/admin/audit-logs"],
  MARKETING: ["/admin/dashboard", "/admin/settings", "/admin/coupons", "/admin/notifications/broadcast", "/admin/audit-logs"],
  SUPER_ADMIN: [], // Empty means all routes are accessible
};
