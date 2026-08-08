import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security-audit";
import {
  generatePresignedUploadUrl,
  isStorageConfigured,
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

  // Rate limiting guard: max 10 presigned URL requests per minute
  const { allowed } = await checkRateLimit(`upload:${session.user.id}`, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { docType, contentType, filename, conversationId } = body as Record<string, string>;

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

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "File uploads are not configured on this server yet." },
      { status: 503 }
    );
  }

  const mimeType = contentType as AllowedMimeType;
  const ext = MIME_EXTENSIONS[mimeType];
  const safeName = (filename ?? "attachment")
    .replace(/[^a-z0-9._-]/gi, "_")
    .slice(0, 80);

  let objectKey: string;

  if (["id-proof", "address-proof", "selfie"].includes(docType)) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!tutorProfile) {
      return NextResponse.json({ error: "Tutor profile not found" }, { status: 403 });
    }
    objectKey = kycObjectKey(tutorProfile.id, docType as KycDocType, ext);
  } else if (docType === "cert") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!tutorProfile) {
      return NextResponse.json({ error: "Tutor profile not found" }, { status: 403 });
    }
    objectKey = certObjectKey(tutorProfile.id, `${safeName}.${ext}`);
  } else if (docType === "chat") {
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required for chat uploads" }, { status: 400 });
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        parentProfile: { select: { userId: true } },
        tutorProfile: { select: { userId: true } },
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (
      conversation.parentProfile.userId !== session.user.id &&
      conversation.tutorProfile.userId !== session.user.id
    ) {
      return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
    }
    objectKey = `chats/${conversationId}/${Date.now()}_${safeName}.${ext}`;
  } else {
    return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
  }

  try {
    const result = await generatePresignedUploadUrl(objectKey, mimeType);

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      objectKey: result.objectKey,
      fileUrl: result.objectKey,
      maxBytes: MAX_UPLOAD_BYTES,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    console.error("[presigned-url] error generating URL", error);
    return NextResponse.json(
      { error: "Could not generate upload URL. Check Supabase Storage configuration." },
      { status: 500 }
    );
  }
}
