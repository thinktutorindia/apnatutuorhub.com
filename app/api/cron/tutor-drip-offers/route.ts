import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAquaWhatsAppMessage, normalizeIndiaWhatsApp } from "@/lib/aqua-whatsapp";
import { dispatchEmail } from "@/lib/aws-notification";
import { createNotification } from "@/lib/notification-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Tutors created between 6 and 8 days ago (Day 7 window)
    const minCreated = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const maxCreated = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const tutors = await prisma.tutorProfile.findMany({
      where: {
        createdAt: { gte: minCreated, lte: maxCreated },
        subscriptionPlan: "NONE",
        marketingNotifsEnabled: true,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
        wallet: {
          select: { balance: true },
        },
      },
      take: 100,
    });

    let sentWhatsApp = 0;
    let sentEmail = 0;
    let sentInApp = 0;

    for (const tutor of tutors) {
      // Skip if they already have coins or active subscription
      if ((tutor.wallet?.balance ?? 0) >= 50) continue;

      const tutorName = tutor.user.name || "Teacher";
      const locality = tutor.address || tutor.city || "your area";
      const offerLink = "https://apnatutorhub.com/tutor/plans?offer=starter99";

      const waMsg = `🎉 *Special 7-Day Welcome Offer for ${tutorName}!*

Sir/Ma'am, aapke area (*${locality}*) mein active home tuition requirements available hain.

Aapke liye *Special Starter Pass*:
👉 Sirf *₹99* mein 1 Guaranteed Student Lead unlock karein (Normal rate: ₹499)!
👉 0% Commission — 100% tuition fees aapki!

🔗 *Claim Offer Here:*
${offerLink}

⏰ _Yeh discount offer agle 24 ghante ke liye valid hai._
_ApnaTutorHub.com — Verified Home Tutoring Network_`;

      // 1. WhatsApp Delivery
      if (tutor.user.phone) {
        const normPhone = normalizeIndiaWhatsApp(tutor.user.phone);
        if (normPhone) {
          const res = await sendAquaWhatsAppMessage({
            to: normPhone,
            mode: "text",
            text: waMsg,
          });
          if (res.ok) sentWhatsApp++;
        }
      }

      // 2. Email Delivery
      if (tutor.user.email && !tutor.user.email.startsWith("wa_")) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #2D9E6B;">Special 7-Day Welcome Offer for ${tutorName}! 🎓</h2>
            <p>We noticed you haven't unlocked your first student lead yet. There are active student requirements in and around <strong>${locality}</strong>.</p>
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px 0; color: #065f46;">₹99 Starter Pass (Limited 24h Offer)</h3>
              <p style="margin: 0; color: #047857;">Unlock a verified student lead for just <strong>₹99</strong> (normally ₹499) with 0% platform commission!</p>
            </div>
            <a href="${offerLink}" style="display: inline-block; background-color: #2D9E6B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Claim ₹99 Starter Lead →</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 25px;">ApnaTutorHub.com · Empowering verified home and online tutors.</p>
          </div>
        `;

        try {
          const emailRes = await dispatchEmail(
            tutor.user.email,
            `Special ₹99 Student Lead Offer for ${tutorName} (Expires in 24h)`,
            emailHtml
          );
          if (emailRes.success) sentEmail++;
        } catch {}
      }

      // 3. In-App Notification
      await createNotification({
        userId: tutor.user.id,
        type: "SYSTEM",
        title: "🎉 Special ₹99 Starter Offer (24h Left)",
        message: `Unlock your first verified student requirement in ${locality} for just ₹99!`,
        actionUrl: offerLink,
      }).then(() => {
        sentInApp++;
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      tutorsEvaluated: tutors.length,
      sentWhatsApp,
      sentEmail,
      sentInApp,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/tutor-drip-offers] Failed:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
