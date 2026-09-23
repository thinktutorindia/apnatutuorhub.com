/**
 * scripts/barter_promo_broadcast.ts
 *
 * Broadcasts the Instagram / Video Review Barter Promotion to registered tutors.
 * Tutors receive 50 Free Coins in exchange for creating a 30-60s review video.
 *
 * Run manually via:
 * npx tsx scripts/barter_promo_broadcast.ts [--dry-run]
 */

import { prisma } from "../lib/prisma";
import { sendAquaWhatsAppMessage, normalizeIndiaWhatsApp } from "../lib/aqua-whatsapp";
import { dispatchEmail } from "../lib/aws-notification";
import { createNotification } from "../lib/notification-engine";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`[barter-promo] Starting broadcast (dryRun=${isDryRun})...`);

  // Target tutors with 0 or few coins and no active plan
  const tutors = await prisma.tutorProfile.findMany({
    where: {
      subscriptionPlan: "NONE",
      marketingNotifsEnabled: true,
      wallet: {
        balance: { lt: 20 },
      },
    },
    include: {
      user: {
        select: { id: true, name: true, phone: true, email: true },
      },
      wallet: {
        select: { balance: true },
      },
    },
    take: 200,
  });

  console.log(`[barter-promo] Found ${tutors.length} eligible tutors.`);

  let waSent = 0;
  let emailSent = 0;

  for (const tutor of tutors) {
    const name = tutor.user.name || "Teacher";
    const waText = `🎁 *Earn 50 FREE Coins on ApnaTutorHub (Worth ₹500)!*

Namaste ${name}! 🎓

Aap ApnaTutorHub par bina kisi payment ke free leads unlock kar sakte hain hamare *Creator Partner Program* ke through:

📹 *Kaise karein?*
1. Apne phone se ek chhota sa 30–60 second ka video banayein (Apna experience / introduction as an ApnaTutorHub tutor).
2. Use Instagram par post karein (@apnatutorhub ko tag karein) YA seedha is WhatsApp number par video bhej dein!
3. Video aate hi aapke wallet mein *50 Free Coins* credit ho jayenge!

👉 Direct Coordinator WhatsApp: +91 93191 93109
👉 Check Your Wallet: https://apnatutorhub.com/tutor/wallet

_Offer valid for this week only. Happy Teaching!_ 🙏`;

    if (isDryRun) {
      console.log(`[DRY RUN] Would send to: ${tutor.user.phone || tutor.user.email}`);
      continue;
    }

    // WhatsApp
    if (tutor.user.phone) {
      const p = normalizeIndiaWhatsApp(tutor.user.phone);
      if (p) {
        const res = await sendAquaWhatsAppMessage({ phone: p, message: waText });
        if (res.success) waSent++;
      }
    }

    // In-app Notification
    await createNotification({
      userId: tutor.user.id,
      type: "SYSTEM",
      title: "🎁 Get 50 Free Coins: Video Review Program",
      message: "Send us a 30s video review on WhatsApp to get 50 free coins credited instantly!",
      actionUrl: "/tutor/wallet",
    }).catch(() => {});

    // Sleep 150ms between sends to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`[barter-promo] Finished! WA sent: ${waSent}, Emails: ${emailSent}`);
}

main().catch((err) => {
  console.error("[barter-promo] Error:", err);
  process.exit(1);
});
