/**
 * Accounts that must never be deleted or included in user exports.
 * Add an ID here when an owner explicitly asks for permanent protection.
 */
export const PROTECTED_USER_IDS: readonly string[] = [
  // Anaisha Gupta — promoted to SUPPORT staff with WhatsApp Live Chats access.
  // Owner asked: no delete option, no database/user export for this account.
  "cmwpzx3y2000al607fle9xzps",
];

export function isProtectedUser(id?: string | null): boolean {
  return Boolean(id && PROTECTED_USER_IDS.includes(id));
}
