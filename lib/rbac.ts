// Role-Based Access Control — see docs/Phases.md §11 (Permission Matrix).
// Phase 10 extends this with sub-admin management UI; Phase 2 only needs the
// permission lookup used by Server Actions.

export const PERMISSIONS = [
  "requirement:write",
  "lead:purchase",
  "kyc:upload",
  "kyc:review",
  "wallet:topup",
  "wallet:refund",
  "audit:read",
  "settings:manage",
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
  SUPPORT: [],
  VERIFICATION: ["kyc:review"],
  FINANCE: ["wallet:refund"],
  OPERATIONS: [],
  MARKETING: [],
  SUPER_ADMIN: PERMISSIONS,
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
  return PERMISSION_MATRIX[role].includes(permission);
}
