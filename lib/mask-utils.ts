/**
 * Utility functions for masking sensitive personal information (PII) for staff / sub-admin views.
 */

/**
 * Masks a phone number for non-super-admin staff views.
 * Examples:
 *   "+91 9876543210" -> "+91 98765*****"
 *   "9876543210"     -> "98765*****"
 *   "+919876543210"  -> "+9198765*****"
 */
export function maskPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "••••••••••";

  // If standard Indian number with prefix or 10 digits
  if (trimmed.length >= 10) {
    const visibleLength = Math.max(4, trimmed.length - 5);
    const visiblePart = trimmed.slice(0, visibleLength);
    return `${visiblePart}*****`;
  }

  return `${trimmed.slice(0, 2)}*****`;
}

/**
 * Checks if a user has full super admin privileges to view raw PII and perform irreversible actions.
 */
export function isSuperAdminRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}
