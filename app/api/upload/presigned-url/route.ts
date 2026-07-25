import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  generatePresignedUploadUrl,
  isS3Configured,
  kycObjectKey,
  certObjectKey,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MIME_EXTENSIONS,
  type AllowedMimeType,
  type KycDocType,
} from "@/lib/s3";
import { prisma } from "@/lib/prisma";

// POST /api/upload/presigned-url
// Body: { docType: "id-proof" | "address-proof" | "selfie" | "cert", contentType: string, filename?: string }
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { docType, contentType, filename } = body as Record<string, string>;

  if (!docType || !contentType) {
    return NextResponse.json(
      { error: "docType and contentType are required" },
      { status: 400 }
    );
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "File uploads are not configured on this server yet." },
      { status: 503 }
    );
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!tutorProfile) {
    return NextResponse.json(
      { error: "Tutor profile not found" },
      { status: 403 }
    );
  }

  const mimeType = contentType as AllowedMimeType;
  const ext = MIME_EXTENSIONS[mimeType];

  let objectKey: string;

  if (["id-proof", "address-proof", "selfie"].includes(docType)) {
    objectKey = kycObjectKey(tutorProfile.id, docType as KycDocType, ext);
  } else if (docType === "cert") {
    const safeName = (filename ?? "cert")
      .replace(/[^a-z0-9._-]/gi, "_")
      .slice(0, 80);
    objectKey = certObjectKey(tutorProfile.id, `${safeName}.${ext}`);
  } else {
    return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
  }

  try {
    const result = await generatePresignedUploadUrl(objectKey, mimeType);

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      objectKey: result.objectKey,
      maxBytes: MAX_UPLOAD_BYTES,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    console.error("[presigned-url] error generating URL", error);
    return NextResponse.json(
      { error: "Could not generate upload URL. Check AWS configuration." },
      { status: 500 }
    );
  }
}
