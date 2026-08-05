/**
 * GET  /api/push/vapid-public-key  — Returns VAPID public key for browser subscribe call
 * POST /api/push/subscribe         — Saves browser push subscription to User record
 * DELETE /api/push/subscribe       — Removes subscription (user unsubscribes)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWebPushConfigured } from "@/lib/web-push";

// ── GET: return VAPID public key ──────────────────────────────────────────────

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey || !isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web push is not configured on this server" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}

// ── POST: save subscription ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web push is not configured on this server" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate the subscription shape
  const sub = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: "Invalid push subscription object" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSubscription: sub as object },
  });

  return NextResponse.json({ subscribed: true });
}

// ── DELETE: remove subscription ───────────────────────────────────────────────

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSubscription: undefined },
  });

  return NextResponse.json({ unsubscribed: true });
}
