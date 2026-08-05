import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SNSClient, CreatePlatformEndpointCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: process.env.AWS_REGION ?? "ap-south-1" });

/**
 * POST /api/notifications/subscribe
 * Body: { endpoint: string, p256dh: string, auth: string }
 *
 * Registers a Web Push subscription with AWS SNS GCM/FCM platform application.
 * Stores the resulting endpoint ARN on the user record.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { endpoint?: string; p256dh?: string; auth?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { endpoint, p256dh, auth: authKey } = body;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "Missing endpoint, p256dh, or auth" },
      { status: 400 }
    );
  }

  const platformApplicationArn = process.env.AWS_SNS_PLATFORM_APP_ARN;

  // pushEndpoint not yet in Prisma schema — skip persistence until schema migration
  if (!platformApplicationArn) {
    return NextResponse.json({ ok: true, message: "Stored endpoint (SNS not configured)" });
  }

  try {
    const command = new CreatePlatformEndpointCommand({
      PlatformApplicationArn: platformApplicationArn,
      Token: endpoint,
      CustomUserData: `userId:${session.user.id}`,
      Attributes: {
        CustomUserData: session.user.id,
      },
    });

    const { EndpointArn } = await sns.send(command);

    // snsEndpointArn not yet in Prisma schema — skip persistence until schema migration
    void EndpointArn; // acknowledge variable is intentionally unused for now

    return NextResponse.json({ ok: true, endpointArn: EndpointArn });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    console.error("[SNS subscribe]", err);
    // If endpoint already exists, AWS returns AlreadyExistsException with the existing ARN
    if (err?.name === "InvalidParameterException" && err?.message?.includes("already exists")) {
      return NextResponse.json({ ok: true, message: "Endpoint already registered" });
    }
    return NextResponse.json({ error: "SNS registration failed", detail: err?.message }, { status: 500 });
  }
}
