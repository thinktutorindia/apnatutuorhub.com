import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[Media Proxy Error]:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
