import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── Config ────────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION ?? "ap-south-1";
const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

/** Max upload size enforced both client-side and via S3 conditions — 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_EXTENSIONS: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** KYC document types stored in S3. */
export type KycDocType = "id-proof" | "address-proof" | "selfie";

// ── Client ────────────────────────────────────────────────────────────────────

function getS3Client(): S3Client {
  return new S3Client({
    region: REGION,
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
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

// ── Pre-signed URLs ───────────────────────────────────────────────────────────

export type PresignedUploadResult = {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

/**
 * Generates a 15-minute pre-signed PUT URL.
 * The browser uploads directly to S3 — the file never passes through Next.js.
 */
export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType: AllowedMimeType
): Promise<PresignedUploadResult> {
  if (!BUCKET) {
    throw new Error(
      "AWS_S3_BUCKET_NAME is not configured. Set it in your .env file."
    );
  }

  const s3 = getS3Client();
  const expiresInSeconds = 15 * 60; // 15 minutes

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
    // Enforce max size via S3 conditions (belt-and-suspenders alongside client validation)
    Metadata: {
      "max-size": String(MAX_UPLOAD_BYTES),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return { uploadUrl, objectKey, expiresInSeconds };
}

/**
 * Generates a 15-minute pre-signed GET URL for private objects.
 * Used by the Admin KYC review queue (Phase 9) to view uploaded documents.
 */
export async function generatePresignedViewUrl(
  objectKey: string,
  expiresInSeconds = 15 * 60
): Promise<string> {
  if (!BUCKET) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured.");
  }

  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an S3 object. Used when tutor re-uploads a KYC document.
 * Errors are swallowed so a missing object never blocks the user.
 */
export async function deleteS3Object(objectKey: string): Promise<void> {
  if (!BUCKET || !objectKey) return;

  try {
    const s3 = getS3Client();
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey }));
  } catch (error) {
    console.error("[s3] deleteS3Object failed", { objectKey, error });
  }
}

/** Returns true when AWS credentials and bucket name are all present. */
export function isS3Configured(): boolean {
  return Boolean(
    BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      REGION
  );
}
