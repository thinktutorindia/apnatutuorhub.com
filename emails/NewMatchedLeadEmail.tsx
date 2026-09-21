/**
 * emails/NewMatchedLeadEmail.tsx
 * Sent to tutors when a new matching lead is posted that fits their profile.
 * Standalone HTML email template with modern font and mobile-responsive layout.
 */

export type NewMatchedLeadEmailProps = {
  tutorName: string;
  subjects: string[];
  classLevel: string;
  city: string | null;
  teachingMode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  coinCost?: number;
  leadUrl: string;
  inquiryCode?: string;
  board?: string | null;
  budgetFormatted?: string | null;
  timing?: string | null;
};

const modeLabel: Record<string, string> = {
  ONLINE: "Online Class",
  OFFLINE: "Home Tuition (In Person)",
  COACHING: "Coaching Center",
  EITHER: "Home Tuition (In Person)",
};

export function renderNewMatchedLeadEmail(props: NewMatchedLeadEmailProps): string {
  const {
    tutorName,
    subjects,
    classLevel,
    city,
    teachingMode,
    coinCost = 10,
    leadUrl,
    inquiryCode,
    board = "CBSE",
    budgetFormatted,
    timing = "Evening (5:00 PM to 7:00 PM)",
  } = props;

  const subjectBadges = subjects
    .map(
      (s) =>
        `<span style="display:inline-block;background:#DCFCE7;color:#166534;border:1px solid #BBF7D0;border-radius:16px;padding:3px 10px;font-size:12px;font-weight:700;margin:2px 3px;">${s}</span>`
    )
    .join(" ");

  const displayCode = inquiryCode ? `#${inquiryCode.replace(/^#/, "")}` : "#031842";
  const displayLocation = city || "Delhi NCR";
  const displayBudget = budgetFormatted || "₹7,500 – ₹10,000 / month";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Matched Lead • ApnaTutorHub</title>
</head>
<body style="margin:0;padding:0;background:#F0FDF4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <div style="max-width:580px;margin:28px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #E2E8F0;">
    
    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg,#0E5C32 0%,#15803D 50%,#16A34A 100%);padding:32px 28px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:14px;padding:8px 16px;margin-bottom:12px;">
        <span style="font-size:22px;">🎯</span>
      </div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.4px;margin:0 0 6px;">
        New Tuition Requirement Near You!
      </h1>
      <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:0;font-weight:500;">
        Requirement ${displayCode} in <strong>${displayLocation}</strong>
      </p>
    </div>

    <!-- Verified Badge -->
    <div style="background:#F0FDF4;border-bottom:1.5px dashed #86EFAC;padding:12px 24px;text-align:center;">
      <span style="font-size:12px;font-weight:800;color:#15803D;letter-spacing:0.6px;text-transform:uppercase;">
        ✅ Verified Parent Requirement · Within 10 km
      </span>
    </div>

    <!-- Body Container -->
    <div style="padding:28px 32px;">
      <p style="font-size:16px;font-weight:800;color:#0F172A;margin:0 0 8px;">
        Hello ${tutorName} 👋
      </p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">
        A parent near your location has posted an urgent tuition requirement that matches your teaching profile. Details are below:
      </p>

      <!-- Details Table (Bulletproof Table Alignment for all email clients) -->
      <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:16px;padding:18px 20px;margin-bottom:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          
          <!-- Enquiry ID -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">ENQUIRY CODE</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:14px;font-weight:800;color:#0F2540;">${displayCode}</span>
            </td>
          </tr>

          <!-- Class & Board -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">CLASS LEVEL</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">${classLevel}${board ? ` (${board})` : ""}</span>
            </td>
          </tr>

          <!-- Subjects -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">SUBJECTS</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              ${subjectBadges}
            </td>
          </tr>

          <!-- Mode -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">TEACHING MODE</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">${modeLabel[teachingMode] ?? teachingMode}</span>
            </td>
          </tr>

          <!-- Location -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">LOCATION</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">📍 ${displayLocation}</span>
            </td>
          </tr>

          <!-- Monthly Budget -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">BUDGET</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:16px;font-weight:800;color:#15803D;">${displayBudget}</span>
            </td>
          </tr>

          <!-- Timing / Schedule -->
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">SCHEDULE</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:13px;font-weight:700;color:#334155;">⏰ ${timing}</span>
            </td>
          </tr>

          <!-- Coins -->
          <tr>
            <td style="padding:10px 0;width:34%;vertical-align:top;">
              <span style="font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;">TO UNLOCK</span>
            </td>
            <td style="padding:10px 0;width:66%;text-align:right;vertical-align:top;">
              <span style="font-size:13px;font-weight:800;color:#D97706;">🪙 ${coinCost} Coins</span>
            </td>
          </tr>

        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${leadUrl}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#15803D,#16A34A);color:#ffffff;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 4px 16px rgba(22,163,74,0.35);letter-spacing:0.3px;">
          View Full Requirement &amp; Claim →
        </a>
      </div>

      <!-- Helpline Card -->
      <div style="background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);border:1.5px solid #86EFAC;border-radius:14px;padding:16px 20px;text-align:center;margin-top:24px;">
        <p style="margin:0 0 4px 0;font-size:11px;color:#166534;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;">
          Need Assistance? Call Tutor Support
        </p>
        <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:900;color:#14532D;">
          <a href="tel:08062180653" style="color:#14532D;text-decoration:none;">08062180653</a>
        </h2>
        <span style="font-size:12px;color:#166534;font-weight:600;">
          Direct Helpline • Monday to Saturday (10:00 AM – 7:00 PM)
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#94A3B8;line-height:1.6;margin:0;">
        ApnaTutorHub • Connecting Verified Tutors &amp; Students Across India<br />
        Bengaluru, Karnataka, India • <a href="https://apnatutorhub.com/tutor/profile" style="color:#16A34A;text-decoration:none;">Notification Settings</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}
