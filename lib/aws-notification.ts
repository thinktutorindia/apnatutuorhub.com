/**
 * lib/aws-notification.ts (100% Resend & VAPID Service Driver)
 * Unified Email & Notification Helper
 * Primary Email Driver: Resend API (via RESEND_API_KEY)
 * Primary Push Driver: VAPID Web Push (via VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
 */

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { renderNewMatchedLeadEmail } from "@/emails/NewMatchedLeadEmail";
import { renderApplicationStatusEmail } from "@/emails/ApplicationStatusEmail";
import { renderNewApplicantEmail } from "@/emails/NewApplicantEmail";
import { renderBookingConfirmationEmail } from "@/emails/BookingConfirmationEmail";
import { broadcastWebPush, sendWebPush } from "@/lib/web-push";
import { isTill5thClass } from "@/lib/lead-utils";

// ── Email Client Setup (100% Resend) ──────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "ApnaTutorHub <noreply@mail.apnatutorhub.com>";

/**
 * Universal email dispatcher: 100% Resend API.
 */
export async function dispatchEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.info("[Email/Resend] RESEND_API_KEY is not configured in .env — skipping live email send to", to);
    return { success: false, error: "RESEND_API_KEY is not configured in .env" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [to],
      subject,
      html: htmlBody,
      ...(textBody ? { text: textBody } : {}),
    });

    if (error) {
      console.error("[Email/Resend] Error sending email:", error);
      return { success: false, error: error.message };
    }

    console.info(`[Email/Resend] Sent successfully to ${to} (ID: ${data?.id})`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/Resend] Exception in dispatchEmail:", msg);
    return { success: false, error: msg };
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationPayload = {
  userId: string;
  email?: string | null;
  title: string;
  message: string;
  actionUrl?: string;
  skipEmail?: boolean;
  skipPush?: boolean;
};

// ── Core Dispatcher ────────────────────────────────────────────────────────────

export async function sendNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const { userId, email, title, message, actionUrl, skipEmail, skipPush } = payload;

  // 1. Save in-app notification to DB (always)
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      actionUrl: actionUrl ?? null,
      channel: "WEB",
      isRead: false,
    },
  });

  // 2. Dispatch VAPID Web Push
  if (!skipPush) {
    try {
      await sendWebPush(userId, {
        title,
        body: message,
        url: actionUrl,
      });
    } catch (err) {
      console.warn("[sendNotification] VAPID push failed:", err);
    }
  }

  // 3. Send email via 100% Resend
  if (!skipEmail && email) {
    const htmlBody = buildEmailHtml(title, message, actionUrl);
    return await dispatchEmail(email, title, htmlBody, message);
  }

  return { success: true };
}

// ── Bulk Broadcast ─────────────────────────────────────────────────────────────

export type BroadcastTarget = "ALL" | "TUTORS" | "PARENTS";
export type BroadcastEmailFilter = "GENUINE_ONLY" | "ALL" | "AUTO_GENERATED_ONLY" | "SKIP_EMAIL";

export async function broadcastNotification(opts: {
  target: BroadcastTarget;
  title: string;
  message: string;
  actionUrl?: string;
  emailFilter?: BroadcastEmailFilter;
}) {
  const { target, title, message, actionUrl, emailFilter = "GENUINE_ONLY" } = opts;

  const roleFilter =
    target === "TUTORS"
      ? { role: "TUTOR" as const }
      : target === "PARENTS"
        ? { role: "PARENT" as const }
        : {};

  const users = await prisma.user.findMany({
    where: { isActive: true, ...roleFilter },
    select: { id: true, email: true },
  });

  // 1. Create in-app notifications (always for all targeted accounts)
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      actionUrl: actionUrl ?? null,
      channel: "WEB" as const,
      isRead: false,
    })),
  });

  // 2. Dispatch VAPID Web Push to all devices
  try {
    await broadcastWebPush(
      { title, body: message, url: actionUrl },
      target === "TUTORS" ? "TUTOR" : target === "PARENTS" ? "PARENT" : undefined
    );
  } catch (err) {
    console.error("[broadcastNotification] VAPID push broadcast error:", err);
  }

  // 3. Dispatch batch email with Quota Guard Filter (protects against exhausting Resend on placeholder accounts)
  if (emailFilter !== "SKIP_EMAIL") {
    const htmlBody = buildEmailHtml(title, message, actionUrl);
    const emailTargets = users
      .filter((u) => {
        if (!u.email) return false;
        const isPlaceholder = u.email.toLowerCase().includes("apnatutorhub.com");
        if (emailFilter === "GENUINE_ONLY") {
          return !isPlaceholder; // Genuine real personal emails only
        }
        if (emailFilter === "AUTO_GENERATED_ONLY") {
          return isPlaceholder; // Auto-assigned test accounts only
        }
        return true; // ALL
      })
      .map((u) => ({
        to: u.email!,
        subject: title,
        html: htmlBody,
        text: message,
      }));

    if (emailTargets.length > 0) {
      const { sendBatchEmails } = await import("@/lib/resend-service");
      try {
        await sendBatchEmails(emailTargets);
      } catch (err) {
        console.error("[broadcastNotification] Resend batch email error:", err);
      }
    }
  }

  return { sent: users.length };
}

// ── Named Event Senders ────────────────────────────────────────────────────────

export async function notifyTutorNewLead(opts: {
  tutorUserId: string;
  tutorEmail: string | null;
  tutorName: string;
  leadId: string;
  subjects: string[];
  classLevel: string;
  city: string | null;
  teachingMode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  coinCost: number;
}) {
  // Guard: Strictly do NOT send notifications for online classes for classes up to 5th grade
  if (opts.teachingMode === "ONLINE" && isTill5thClass(opts.classLevel)) {
    console.info(
      `[notifyTutorNewLead] Suppressed notification for tutor ${opts.tutorUserId}: Online classes disabled for ${opts.classLevel}.`
    );
    return;
  }

  const subjectStr = opts.subjects.slice(0, 2).join(", ");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";

  const htmlBody = renderNewMatchedLeadEmail({
    tutorName: opts.tutorName,
    subjects: opts.subjects,
    classLevel: opts.classLevel,
    city: opts.city,
    teachingMode: opts.teachingMode,
    coinCost: opts.coinCost,
    leadUrl: `${appUrl}/tutor/leads`,
  });

  await prisma.notification.create({
    data: {
      userId: opts.tutorUserId,
      title: "🎯 New Matched Lead Available",
      message: `A new tuition lead for ${subjectStr} in ${opts.city ?? "your area"} matches your profile. Unlock it now!`,
      actionUrl: `/tutor/leads`,
      channel: "WEB",
      isRead: false,
    },
  });

  try {
    await sendWebPush(opts.tutorUserId, {
      title: "🎯 New Matched Lead Available",
      body: `A new tuition lead for ${subjectStr} in ${opts.city ?? "your area"} matches your profile.`,
      url: "/tutor/leads",
    });
  } catch {}

  if (opts.tutorEmail) {
    await dispatchEmail(opts.tutorEmail, "🎯 New Matched Lead Available — ApnaTutorHub", htmlBody);
  }
}

export async function notifyParentNewApplicant(opts: {
  parentUserId: string;
  parentEmail: string | null;
  parentName: string;
  leadId: string;
  tutorName: string | null;
  subjects: string[];
  proposalNote?: string | null;
  feeQuote?: number | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  const htmlBody = renderNewApplicantEmail({
    parentName: opts.parentName,
    tutorName: opts.tutorName ?? "A Tutor",
    tutorProfileUrl: `${appUrl}/parent/my-leads/${opts.leadId}/applicants`,
    subjects: opts.subjects,
    proposalNote: opts.proposalNote,
    feeQuote: opts.feeQuote,
  });

  await prisma.notification.create({
    data: {
      userId: opts.parentUserId,
      title: "👋 New Tutor Applied",
      message: `${opts.tutorName ?? "A tutor"} has applied to your tuition requirement. Review their profile.`,
      actionUrl: `/parent/my-leads/${opts.leadId}/applicants`,
      channel: "WEB",
      isRead: false,
    },
  });

  try {
    await sendWebPush(opts.parentUserId, {
      title: "👋 New Tutor Applied",
      body: `${opts.tutorName ?? "A tutor"} applied to your tuition requirement.`,
      url: `/parent/my-leads/${opts.leadId}/applicants`,
    });
  } catch {}

  if (opts.parentEmail) {
    await dispatchEmail(opts.parentEmail, "👋 New Tutor Applied to Your Requirement — ApnaTutorHub", htmlBody);
  }
}

export async function notifyTutorApplicationStatus(opts: {
  tutorUserId: string;
  tutorEmail: string | null;
  tutorName: string;
  status: "SHORTLISTED" | "REJECTED" | "HIRED";
  subject: string;
  leadId: string;
}) {
  const statusMap = {
    SHORTLISTED: { emoji: "⭐", label: "Shortlisted", msg: "You have been shortlisted by the parent!" },
    REJECTED: { emoji: "❌", label: "Not Selected", msg: "The parent has passed on your application this time." },
    HIRED: { emoji: "🎉", label: "Hired!", msg: "Congratulations! The parent has chosen you for this tuition." },
  };
  const s = statusMap[opts.status];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  const htmlBody = renderApplicationStatusEmail({
    tutorName: opts.tutorName,
    status: opts.status,
    subject: opts.subject,
    leadUrl: `${appUrl}/tutor/leads`,
  });

  await prisma.notification.create({
    data: {
      userId: opts.tutorUserId,
      title: `${s.emoji} Application ${s.label}`,
      message: s.msg,
      actionUrl: `/tutor/leads`,
      channel: "WEB",
      isRead: false,
    },
  });

  try {
    await sendWebPush(opts.tutorUserId, {
      title: `${s.emoji} Application ${s.label}`,
      body: s.msg,
      url: "/tutor/leads",
    });
  } catch {}

  if (opts.tutorEmail) {
    await dispatchEmail(opts.tutorEmail, `${s.emoji} Application ${s.label} — ApnaTutorHub`, htmlBody);
  }
}

export async function notifyBookingConfirmation(opts: {
  parentUserId: string;
  parentEmail: string | null;
  parentName: string;
  tutorUserId: string;
  tutorEmail: string | null;
  tutorName: string;
  bookingId: string;
  subject: string;
  classLevel: string;
  mode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  agreedFee?: number | null;
  classFrequency?: string | null;
  meetLink?: string | null;
  venueAddress?: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  const title = `✅ Booking Confirmed — ${opts.subject}`;
  const parentMsg = `Your booking for ${opts.subject} has been confirmed. Check your schedule.`;
  const tutorMsg = `Your booking for ${opts.subject} has been confirmed. Good luck!`;

  const commonEmailProps = {
    subject: opts.subject,
    classLevel: opts.classLevel,
    mode: opts.mode,
    agreedFee: opts.agreedFee,
    classFrequency: opts.classFrequency,
    meetLink: opts.meetLink,
    venueAddress: opts.venueAddress,
    tutorName: opts.tutorName,
    parentName: opts.parentName,
  };

  const parentHtml = renderBookingConfirmationEmail({ ...commonEmailProps, recipientName: opts.parentName, recipientRole: "PARENT", bookingUrl: `${appUrl}/parent/bookings` });
  const tutorHtml = renderBookingConfirmationEmail({ ...commonEmailProps, recipientName: opts.tutorName, recipientRole: "TUTOR", bookingUrl: `${appUrl}/tutor/bookings` });

  await Promise.all([
    prisma.notification.create({ data: { userId: opts.parentUserId, title, message: parentMsg, actionUrl: `/parent/bookings`, channel: "WEB", isRead: false } }),
    prisma.notification.create({ data: { userId: opts.tutorUserId, title, message: tutorMsg, actionUrl: `/tutor/bookings`, channel: "WEB", isRead: false } }),
  ]);

  try {
    await Promise.allSettled([
      sendWebPush(opts.parentUserId, { title, body: parentMsg, url: "/parent/bookings" }),
      sendWebPush(opts.tutorUserId, { title, body: tutorMsg, url: "/tutor/bookings" }),
    ]);
  } catch {}

  if (opts.parentEmail) {
    await dispatchEmail(opts.parentEmail, title, parentHtml);
  }
  if (opts.tutorEmail) {
    await dispatchEmail(opts.tutorEmail, title, tutorHtml);
  }
}

export async function notifyKycStatus(opts: {
  tutorUserId: string;
  tutorEmail: string | null;
  approved: boolean;
  rejectionNote?: string | null;
}) {
  if (opts.approved) {
    await sendNotification({
      userId: opts.tutorUserId,
      email: opts.tutorEmail,
      title: "✅ KYC Verified — You're Good to Go!",
      message: "Your identity has been verified. You can now unlock leads and start earning!",
      actionUrl: `/tutor/leads`,
    });
  } else {
    await sendNotification({
      userId: opts.tutorUserId,
      email: opts.tutorEmail,
      title: "⚠️ KYC Rejected — Action Required",
      message: `Your KYC was rejected: ${opts.rejectionNote ?? "Please re-submit your documents."}`,
      actionUrl: `/tutor/profile`,
    });
  }
}

export async function notifyWalletCredited(opts: {
  tutorUserId: string;
  tutorEmail: string | null;
  coins: number;
  reason?: "purchase" | "milestone" | "bonus";
}) {
  const isMilestone = opts.reason === "milestone";
  await sendNotification({
    userId: opts.tutorUserId,
    email: opts.tutorEmail,
    title: isMilestone
      ? `🎁 ${opts.coins} Milestone Bonus Coins`
      : `🪙 ${opts.coins} Coins Added to Wallet`,
    message: isMilestone
      ? `You earned ${opts.coins} bonus coins for hitting a teaching milestone. Use them to unlock more student enquiries.`
      : `Your coin purchase was successful. You now have more coins to unlock leads.`,
    actionUrl: `/tutor/wallet`,
    skipPush: false,
    skipEmail: false,
  });
}

export async function notifyLowWalletBalance(opts: {
  tutorUserId: string;
  tutorEmail: string | null;
  balance: number;
}) {
  await sendNotification({
    userId: opts.tutorUserId,
    email: opts.tutorEmail,
    title: `⚠️ Low Coin Balance — ${opts.balance} coins left`,
    message: `Your coin balance is running low. Top up now to keep unlocking leads.`,
    actionUrl: `/tutor/wallet`,
  });
}

// ── Email Template Builder ─────────────────────────────────────────────────────

function formatEmailBody(message: string): string {
  // Convert URLs into clickable HTML links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let formatted = message.replace(urlRegex, (url) => {
    return `<a href="${url}" style="color:#16A34A;font-weight:700;text-decoration:underline;" target="_blank">${url}</a>`;
  });

  // Convert markdown bold *text* to <strong>text</strong>
  formatted = formatted.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // Convert linebreaks to <br/>
  formatted = formatted.replace(/\n/g, "<br/>");

  return formatted;
}

function buildEmailHtml(title: string, message: string, actionUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apnatutorhub.com";
  const fullUrl = actionUrl
    ? actionUrl.startsWith("http")
      ? actionUrl
      : `${appUrl}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`
    : appUrl;
  const cta = actionUrl
    ? `<a href="${fullUrl}"
        style="display:inline-block;margin-top:24px;padding:12px 28px;background:#22C55E;color:#fff;
               border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        View & Unlock Lead Now →
       </a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">ApnaTutorHub</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Smart Tutor Matching Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 16px;color:#0F172A;font-size:20px;font-weight:700;">${title}</h2>
            <div style="margin:0;color:#334155;font-size:14px;line-height:1.8;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;font-family:Arial,sans-serif;">
              ${formatEmailBody(message)}
            </div>
            ${cta}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
            <p style="margin:0;color:#94A3B8;font-size:12px;">© ${new Date().getFullYear()} ApnaTutorHub. You're receiving this because you have an account on our platform.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
