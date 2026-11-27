import crypto from "crypto";

/**
 * Utility functions for masking sensitive personal information (PII) for staff / sub-admin views.
 */

export const ENCRYPTED_PHONE_PREFIX = "ATH-REF-";

function getPiiCipherKey(): Buffer {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ENCRYPTION_SECRET ||
    "apnatutorhub-pii-mask-fallback";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a phone number into an opaque, tamper-proof token (`ATH-REF-...`)
 * that staff can copy from WhatsApp Chats and paste into the User Directory
 * without ever seeing or decoding the underlying mobile number.
 */
export function encryptPhoneToken(phone: string): string {
  const normalized = phone.replace(/\D/g, "") || phone.trim();
  const key = getPiiCipherKey();
  const iv = crypto.createHmac("sha256", key).update(normalized).digest().subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PHONE_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

/**
 * Decrypts an `ATH-REF-...` token back to the normalized phone digits on the server.
 * Returns `null` if the token is invalid or tampered with.
 */
export function decryptPhoneToken(token?: string | null): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed.startsWith(ENCRYPTED_PHONE_PREFIX)) return null;
  try {
    const raw = Buffer.from(trimmed.slice(ENCRYPTED_PHONE_PREFIX.length), "base64url");
    if (raw.length <= 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getPiiCipherKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return decrypted || null;
  } catch {
    return null;
  }
}

/**
 * Masks a phone number for non-super-admin staff views.
 * Examples:
 *   "+91 9000000000" -> "+91 98765*****"
 *   "9000000000"     -> "98765*****"
 *   "+919000000000"  -> "+9198765*****"
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
