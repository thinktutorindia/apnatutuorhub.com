/**
 * emails/BookingConfirmationEmail.tsx
 * Sent to both parent and tutor when a booking is confirmed.
 */

export type BookingConfirmationEmailProps = {
  recipientName: string;
  recipientRole: "PARENT" | "TUTOR";
  tutorName: string;
  parentName: string;
  subject: string;
  classLevel: string;
  mode: "ONLINE" | "OFFLINE" | "EITHER";
  agreedFee?: number | null;
  classFrequency?: string | null;
  meetLink?: string | null;
  venueAddress?: string | null;
  bookingUrl: string;
};

const modeLabel: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "In-Person",
  EITHER: "Online / In-Person",
};

export function renderBookingConfirmationEmail(props: BookingConfirmationEmailProps): string {
  const {
    recipientName,
    recipientRole,
    tutorName,
    parentName,
    subject,
    classLevel,
    mode,
    agreedFee,
    classFrequency,
    meetLink,
    venueAddress,
    bookingUrl,
  } = props;

  const isParent = recipientRole === "PARENT";
  const feeStr = agreedFee ? `₹${(agreedFee / 100).toLocaleString("en-IN")}/month` : "To be discussed";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmed — ApnaTutorHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F1F5F9; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #22C55E, #16A34A); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .banner { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); padding: 28px 40px; text-align: center; border-bottom: 1px solid #BBF7D0; }
    .banner-icon { font-size: 40px; }
    .banner-title { font-size: 20px; font-weight: 800; color: #14532D; margin-top: 8px; }
    .body { padding: 32px 40px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px; }
    .booking-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; margin-bottom: 24px; }
    .booking-card-header { background: #0F172A; padding: 14px 20px; }
    .booking-card-header p { color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .booking-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #E2E8F0; }
    .booking-row:last-child { border-bottom: none; }
    .booking-label { font-size: 12px; color: #94A3B8; font-weight: 600; }
    .booking-value { font-size: 13px; font-weight: 700; color: #0F172A; }
    .highlight { color: #22C55E; }
    .link-block { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.2); border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; }
    .link-block p { font-size: 12px; color: #16A34A; font-weight: 600; margin-bottom: 4px; }
    .link-block a { font-size: 13px; color: #0F172A; word-break: break-all; }
    .cta { display: block; text-align: center; max-width: 220px; margin: 0 auto; padding: 14px 28px; background: linear-gradient(135deg, #22C55E, #16A34A); color: #fff; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; }
    .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ApnaTutorHub</h1>
      <p>Smart Tutor Matching Platform</p>
    </div>

    <div class="banner">
      <div class="banner-icon">✅</div>
      <div class="banner-title">Booking Confirmed!</div>
    </div>

    <div class="body">
      <p class="desc">Hi <strong>${recipientName}</strong>,<br /><br />
        ${isParent
          ? `Your tuition booking with <strong>${tutorName}</strong> for <strong>${subject}</strong> is now confirmed. Here are the details:`
          : `Your tuition booking for <strong>${subject}</strong> with parent <strong>${parentName}</strong> is confirmed. Please review the details below:`
        }
      </p>

      <div class="booking-card">
        <div class="booking-card-header"><p>Booking Details</p></div>
        <div class="booking-row">
          <span class="booking-label">Subject</span>
          <span class="booking-value">${subject}</span>
        </div>
        <div class="booking-row">
          <span class="booking-label">Class Level</span>
          <span class="booking-value">${classLevel}</span>
        </div>
        <div class="booking-row">
          <span class="booking-label">Mode</span>
          <span class="booking-value">${modeLabel[mode] ?? mode}</span>
        </div>
        <div class="booking-row">
          <span class="booking-label">Tutor</span>
          <span class="booking-value">${tutorName}</span>
        </div>
        <div class="booking-row">
          <span class="booking-label">Agreed Fee</span>
          <span class="booking-value highlight">${feeStr}</span>
        </div>
        ${classFrequency ? `<div class="booking-row">
          <span class="booking-label">Frequency</span>
          <span class="booking-value">${classFrequency}</span>
        </div>` : ""}
        ${venueAddress ? `<div class="booking-row">
          <span class="booking-label">Venue</span>
          <span class="booking-value">${venueAddress}</span>
        </div>` : ""}
      </div>

      ${meetLink ? `<div class="link-block">
        <p>🎥 Online Meeting Link</p>
        <a href="${meetLink}">${meetLink}</a>
      </div>` : ""}

      <a href="${bookingUrl}" class="cta">View Booking →</a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ApnaTutorHub. You received this because of a confirmed booking on our platform.</p>
    </div>
  </div>
</body>
</html>`;
}
