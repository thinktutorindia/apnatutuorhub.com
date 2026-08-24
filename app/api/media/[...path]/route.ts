import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const objectPath = (resolvedParams.path || []).join("/");

  if (!objectPath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── Access Control for Private KYC Documents ──────────────────────────────
  const isKycDoc = objectPath.startsWith("kyc/");
  if (isKycDoc) {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const canReviewKyc = can(session.user, "kyc:review");

    if (!isSuperAdmin && !canReviewKyc) {
      // Check if this KYC document belongs to the requesting tutor
      const pathParts = objectPath.split("/");
      const targetTutorProfileId = pathParts[1];

      const tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!tutorProfile || tutorProfile.id !== targetTutorProfileId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return new NextResponse("Storage configuration error", { status: 500 });
  }

  try {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .download(objectPath);

    if (error || !data) {
      // Fallback: try generating a signed URL and redirect
      const { data: signedData } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(objectPath, 3600);

      if (signedData?.signedUrl) {
        return NextResponse.redirect(signedData.signedUrl);
      }
      return new NextResponse("Media not found", { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = data.type || "image/jpeg";

    const cacheControl = isKycDoc
      ? "private, no-cache, no-store, must-revalidate"
      : "public, max-age=86400, stale-while-revalidate=604800";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch (err) {
    console.error("[Media Proxy Error]:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
