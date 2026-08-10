import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

/** Max upload size enforced both client-side and via storage conditions — 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/aac",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_EXTENSIONS: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
};

/** KYC document types stored in Supabase private storage ("kyc-documents"). */
export type KycDocType = "id-proof" | "address-proof" | "selfie";

// ── Supabase Storage Client ───────────────────────────────────────────────────

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

// ── Key builders ──────────────────────────────────────────────────────────────

export function kycObjectKey(
  tutorProfileId: string,
  docType: KycDocType,
  ext: string
): string {
  return `kyc/${tutorProfileId}/${docType}.${ext}`;
}

export function certObjectKey(tutorProfileId: string, filename: string): string {
  return `certificates/${tutorProfileId}/${filename}`;
}

// ── Signed Storage URLs ───────────────────────────────────────────────────────

export type PresignedUploadResult = {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

/**
 * Generates a 15-minute signed upload URL via Supabase Storage private bucket ("kyc-documents").
 */
export async function generatePresignedUploadUrl(
  objectKey: string,
  _contentType: AllowedMimeType
): Promise<PresignedUploadResult> {
  const expiresInSeconds = 15 * 60; // 15 minutes
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase Storage credentials are not configured.");
  }

  const { data, error } = await supabase.storage
    .from("kyc-documents")
    .createSignedUploadUrl(objectKey, {
      upsert: true, // Allow overwriting an existing file — prevents "resource already exists" error on re-uploads
    });

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase Storage signed upload URL error: ${error?.message ?? "Unknown error"}`);
  }

  return {
    uploadUrl: data.signedUrl,
    objectKey,
    expiresInSeconds,
  };
}

/**
 * Generates a 15-minute signed GET URL for private objects.
 * Used by Admin KYC review queue to view uploaded documents securely.
 */
export async function generatePresignedViewUrl(
  objectKey: string,
  expiresInSeconds = 15 * 60
): Promise<string> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase Storage credentials are not configured.");
  }

  const { data, error } = await supabase.storage
    .from("kyc-documents")
    .createSignedUrl(objectKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase Storage signed view URL error: ${error?.message ?? "Unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a private object from Supabase Storage.
 */
export async function deleteS3Object(objectKey: string): Promise<void> {
  if (!objectKey) return;

  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.storage.from("kyc-documents").remove([objectKey]);
    }
  } catch (error) {
    console.error("[storage] deleteObject failed", { objectKey, error });
  }
}

/** Returns true when AWS is configured (deprecated — kept for backwards compatibility). */
export function isS3Configured(): boolean {
  return false;
}

/** Returns true when Supabase Storage is configured. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
