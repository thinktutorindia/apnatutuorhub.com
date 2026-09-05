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
  "users:manage",
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
    "users:manage",       // Create/edit parent and tutor accounts
    "leads:read",         // View active lead feed for support context
    "leads:manage",       // Assist parents and tutors with leads
    "audit:read",         // Read audit logs (read-only)
  ],
  VERIFICATION: [
    "kyc:review",         // Approve / reject tutor KYC documents
    "users:read",         // View tutor accounts
    "users:manage",       // Register/verify tutor and parent accounts
    "users:suspend",      // Suspend fraudulent tutors
    "audit:read",
  ],
  FINANCE: [
    "wallet:refund",      // Credit / debit wallet coins
    "wallets:manage",     // Full wallet management panel
    "wallets:read",
    "users:read",
    "audit:read",
  ],
  OPERATIONS: [
    "leads:manage",       // Close/expire/adjust leads
    "leads:read",
    "users:manage",       // Register parents and tutors
    "users:read",
    "users:suspend",
    "audit:read",
  ],
  MARKETING: [
    "settings:manage",    // Platform settings / coin package pricing
    "leads:read",
    "users:read",
    "audit:read",
  ],

  SUPER_ADMIN: PERMISSIONS, // All permissions
};

export type RbacSubject = {
  role?: string | null;
  subAdminRole?: string | null;
  customPermissions?: string[] | null;
};

export const FEATURE_PERMISSION_MAP: Record<AdminFeatureKey, readonly Permission[]> = {
  dashboard: ["audit:read"],
  analytics: ["audit:read"],
  users: ["users:read", "users:manage", "users:suspend"],
  kyc: ["kyc:review", "users:read", "users:manage"],
  leads: ["leads:read", "leads:manage", "users:read"],
  "staff-leads": ["leads:read", "leads:manage", "users:read"],
  bookings: ["leads:read", "leads:manage", "users:read"],
  chat: ["users:read", "users:manage"],
  reviews: ["users:read"],
  // Granting the Wallets sidebar module is view-only. Coin credit/debit stays
  // on SUPER_ADMIN / FINANCE via PERMISSION_MATRIX (`wallets:manage`).
  wallets: ["wallets:read", "users:read"],
  notifications: ["settings:manage", "audit:read"],
  broadcast: ["settings:manage"],
  coupons: ["settings:manage"],
  settings: ["settings:manage"],
  "audit-logs": ["audit:read"],
};

export function resolveRbacRole(subject: RbacSubject): RbacRole | null {
  const role = subject.role === "SUB_ADMIN" ? subject.subAdminRole : subject.role;
  if (!role) return null;
  return role in PERMISSION_MATRIX ? (role as RbacRole) : null;
}

export function can(subject: RbacSubject, permission: Permission): boolean {
  if (subject.role === "SUPER_ADMIN") return true;

  // Check custom granted feature permissions first
  if (subject.customPermissions && subject.customPermissions.length > 0) {
    for (const featKey of subject.customPermissions) {
      const perms = FEATURE_PERMISSION_MAP[featKey as AdminFeatureKey];
      if (perms && perms.includes(permission)) {
        return true;
      }
    }
  }

  const role = resolveRbacRole(subject);
  if (!role) return false;
  return (PERMISSION_MATRIX[role] as readonly string[]).includes(permission);
}

// Helper: return all allowed permissions for a subject (used for sidebar rendering)
export function getAllowedPermissions(subject: RbacSubject): readonly Permission[] {
  if (subject.role === "SUPER_ADMIN") return PERMISSIONS;
  const set = new Set<Permission>();

  if (subject.customPermissions && subject.customPermissions.length > 0) {
    for (const featKey of subject.customPermissions) {
      const perms = FEATURE_PERMISSION_MAP[featKey as AdminFeatureKey];
      if (perms) {
        perms.forEach((p) => set.add(p));
      }
    }
  }

  const role = resolveRbacRole(subject);
  if (role && PERMISSION_MATRIX[role]) {
    PERMISSION_MATRIX[role].forEach((p) => set.add(p));
  }

  return Array.from(set);
}

// ── Granular Admin Features Definition ───────────────────────────────────────

export type AdminFeatureKey =
  | "dashboard"
  | "analytics"
  | "users"
  | "kyc"
  | "leads"
  | "staff-leads"
  | "bookings"
  | "chat"
  | "reviews"
  | "wallets"
  | "notifications"
  | "broadcast"
  | "coupons"
  | "settings"
  | "audit-logs";

export interface AdminFeatureDef {
  key: AdminFeatureKey;
  label: string;
  category: "Overview" | "User Management" | "Operations" | "Growth & Finance" | "Governance";
  description: string;
  route: string;
}

export const ALL_ADMIN_FEATURES: AdminFeatureDef[] = [
  { key: "dashboard", label: "Dashboard Overview", category: "Overview", description: "View top-level KPIs and activity overview", route: "/admin/dashboard" },
  { key: "analytics", label: "Analytics & Metrics", category: "Overview", description: "View performance charts and platform metrics", route: "/admin/analytics" },
  { key: "users", label: "User Directory & Staff", category: "User Management", description: "Manage parent and tutor user accounts", route: "/admin/users" },
  { key: "kyc", label: "Tutor KYC Queue", category: "User Management", description: "Review and approve tutor verification documents", route: "/admin/kyc" },
  { key: "leads", label: "Student Leads Feed", category: "Operations", description: "Manage student requirements and lead postings", route: "/admin/leads" },
  { key: "staff-leads", label: "Staff Leads CRM", category: "Operations", description: "Staging, daily follow-up and promotion of raw tutor leads", route: "/admin/staff-leads" },
  { key: "bookings", label: "Tuition Bookings", category: "Operations", description: "Oversee trial classes and booking schedules", route: "/admin/bookings" },
  { key: "chat", label: "Support Chat", category: "Operations", description: "Access live support chat and user messages", route: "/admin/chat" },
  { key: "reviews", label: "Reviews Moderation", category: "Operations", description: "Moderate tutor reviews and parent ratings", route: "/admin/reviews" },
  { key: "wallets", label: "Wallets & Coin Revenue", category: "Growth & Finance", description: "Manage tutor coin balances, refunds & credits", route: "/admin/wallets" },
  { key: "notifications", label: "Notification Hub & Schedule", category: "Growth & Finance", description: "Inspect all past, present & scheduled notifications and delivery logs", route: "/admin/notifications" },
  { key: "broadcast", label: "Broadcast Notifications", category: "Growth & Finance", description: "Send web push broadcasts to tutors/parents", route: "/admin/notifications/broadcast" },
  { key: "coupons", label: "Promo Coupons", category: "Growth & Finance", description: "Create and distribute discount coupon codes", route: "/admin/coupons" },
  { key: "settings", label: "Platform Settings", category: "Governance", description: "Configure system pricing, coin packages & policies", route: "/admin/settings" },
  { key: "audit-logs", label: "Audit Logs", category: "Governance", description: "Inspect system audit trails and security logs", route: "/admin/audit-logs" },
];

export const DEFAULT_ROLE_FEATURES: Record<string, AdminFeatureKey[]> = {
  SUPPORT: ["dashboard", "users", "bookings", "chat", "reviews", "leads", "staff-leads", "audit-logs"],
  VERIFICATION: ["dashboard", "kyc", "users", "staff-leads", "audit-logs"],
  FINANCE: ["dashboard", "wallets", "staff-leads", "audit-logs"],
  OPERATIONS: ["dashboard", "leads", "staff-leads", "bookings", "chat", "users", "audit-logs"],
  MARKETING: ["dashboard", "settings", "coupons", "notifications", "broadcast", "staff-leads", "audit-logs"],
};

// Helper: map sub-admin role to sidebar-visible modules (legacy static map fallback)
export const SUB_ADMIN_MODULE_MAP: Record<string, string[]> = {
  SUPPORT: [
    "/admin/dashboard",
    "/admin/users",
    "/admin/bookings",
    "/admin/chat",
    "/admin/reviews",
    "/admin/leads",
    "/admin/staff-leads",
    "/admin/staff-leads/my-leads",
    "/admin/staff-leads/my-dashboard",
    "/admin/audit-logs",
  ],
  VERIFICATION: ["/admin/dashboard", "/admin/kyc", "/admin/users", "/admin/staff-leads/my-leads", "/admin/staff-leads/my-dashboard", "/admin/audit-logs"],
  FINANCE: ["/admin/dashboard", "/admin/wallets", "/admin/staff-leads/my-leads", "/admin/staff-leads/my-dashboard", "/admin/audit-logs"],
  OPERATIONS: [
    "/admin/dashboard",
    "/admin/leads",
    "/admin/staff-leads",
    "/admin/staff-leads/manage",
    "/admin/staff-leads/upload",
    "/admin/staff-leads/my-leads",
    "/admin/staff-leads/my-dashboard",
    "/admin/staff-leads/assign",
    "/admin/bookings",
    "/admin/chat",
    "/admin/users",
    "/admin/audit-logs",
  ],
  MARKETING: ["/admin/dashboard", "/admin/settings", "/admin/coupons", "/admin/notifications", "/admin/notifications/broadcast", "/admin/audit-logs"],
  SUPER_ADMIN: [], // Empty means all routes are accessible
};

/**
 * Resolves full list of allowed module routes for a sub-admin, prioritizing customPermissions.
 */
export function getAllowedSubAdminModules(subject: RbacSubject): string[] {
  if (subject.role === "SUPER_ADMIN") {
    return []; // Empty means unrestricted super admin
  }
  if (subject.role !== "SUB_ADMIN") {
    return [];
  }

  // If sub-admin has custom permissions explicitly saved
  if (subject.customPermissions && subject.customPermissions.length > 0) {
    const routes = new Set<string>(["/admin/dashboard", "/admin/staff-leads/my-leads", "/admin/staff-leads/my-dashboard"]);
    for (const key of subject.customPermissions) {
      const feat = ALL_ADMIN_FEATURES.find((f) => f.key === key);
      if (key === "staff-leads") {
        routes.add("/admin/staff-leads/my-leads");
        routes.add("/admin/staff-leads/my-dashboard");
        if (subject.subAdminRole === "OPERATIONS") {
          routes.add("/admin/staff-leads");
          routes.add("/admin/staff-leads/reports");
          routes.add("/admin/staff-leads/upload");
          routes.add("/admin/staff-leads/manage");
          routes.add("/admin/staff-leads/assign");
        }
      } else if (feat) {
        routes.add(feat.route);
      }
    }
    return Array.from(routes);
  }

  // Fallback to department role defaults
  const role = subject.subAdminRole ?? "SUPPORT";
  const defaultKeys = DEFAULT_ROLE_FEATURES[role] ?? DEFAULT_ROLE_FEATURES["SUPPORT"];
  const routes = new Set<string>(["/admin/dashboard", "/admin/staff-leads/my-leads", "/admin/staff-leads/my-dashboard"]);
  for (const key of defaultKeys) {
    const feat = ALL_ADMIN_FEATURES.find((f) => f.key === key);
    if (key === "staff-leads") {
      routes.add("/admin/staff-leads/my-leads");
      routes.add("/admin/staff-leads/my-dashboard");
      if (role === "OPERATIONS") {
        routes.add("/admin/staff-leads");
        routes.add("/admin/staff-leads/reports");
        routes.add("/admin/staff-leads/upload");
        routes.add("/admin/staff-leads/manage");
        routes.add("/admin/staff-leads/assign");
      }
    } else if (feat) {
      routes.add(feat.route);
    }
  }
  return Array.from(routes);
}
