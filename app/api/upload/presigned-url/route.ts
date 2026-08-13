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

  const { docType, contentType, filename, conversationId, fileSize, targetUserId, tutorProfileId } = body as Record<string, unknown>;
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "SUB_ADMIN";

  async function resolveTargetTutorProfileId(): Promise<string> {
    const reqProfileId = typeof tutorProfileId === "string" && tutorProfileId.trim() ? tutorProfileId.trim() : null;
    const reqUserId = typeof targetUserId === "string" && targetUserId.trim() ? targetUserId.trim() : null;

    if (isAdmin && reqProfileId) {
      const tp = await prisma.tutorProfile.findUnique({
        where: { id: reqProfileId },
        select: { id: true },
      });
      if (tp) return tp.id;
    }

    const effectiveUserId = (isAdmin && reqUserId) ? reqUserId : session.user.id;

    const tp = await prisma.tutorProfile.upsert({
      where: { userId: effectiveUserId },
      create: { userId: effectiveUserId },
      update: {},
      select: { id: true },
    });

    return tp.id;
  }

  if (typeof fileSize === "number" && fileSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File size exceeds maximum allowed limit of ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  if (!docType || !contentType || typeof docType !== "string" || typeof contentType !== "string") {
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
  const rawFilename = typeof filename === "string" ? filename : "attachment";
  const safeName = rawFilename.replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);

  let objectKey: string;

  if (["id-proof", "address-proof", "selfie"].includes(docType)) {
    const profileId = await resolveTargetTutorProfileId();
    objectKey = kycObjectKey(profileId, docType as KycDocType, ext);
  } else if (docType === "cert") {
    const profileId = await resolveTargetTutorProfileId();
    objectKey = certObjectKey(profileId, `${safeName}.${ext}`);
  } else if (docType === "chat") {
    if (typeof conversationId !== "string" || !conversationId) {
      return NextResponse.json({ error: "conversationId is required for chat uploads" }, { status: 400 });
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
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
