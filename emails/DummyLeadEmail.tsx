/**
 * emails/DummyLeadEmail.tsx
 * Beautiful HTML email for dummy lead notifications to tutors.
 */

export type DummyLeadEmailProps = {
  tutorName: string;
  locality: string;
  city: string;
  subjects: string[];
  classLevel: string;
  board: string;
  mode: string;
  budgetMin: number;
  budgetMax: number;
  rateType?: "HOURLY" | "MONTHLY";
  days: string;
  timing: string;
  studentName: string;
  leadUrl: string;
};

export function renderDummyLeadEmail(props: DummyLeadEmailProps): string {
  const { tutorName, locality, city, subjects, classLevel, board, mode, budgetMin, budgetMax, rateType = "MONTHLY", days, timing, leadUrl } = props;

  const subjectBadges = subjects
    .map((s) => `<span style="display:inline-block;background:#DCFCE7;color:#166534;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;margin:2px 3px;">${s}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Student Requirement Near You — ApnaTutorHub</title>
</head>
<body style="margin:0;padding:0;background:#F0FDF4;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16A34A 0%,#0D9488 100%);padding:36px 40px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:16px;padding:10px 18px;margin-bottom:14px;">
        <span style="font-size:26px;">📍</span>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">
        New Student Requirement Near You!
      </h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">
        A student in <strong>${locality}, ${city}</strong> is looking for a tutor
      </p>
    </div>

    <!-- Locality Badge -->
    <div style="background:#F0FDF4;border-bottom:2px dashed #BBF7D0;padding:14px 40px;text-align:center;">
      <span style="font-size:13px;font-weight:800;color:#16A34A;letter-spacing:0.5px;">
        📍 REQUIREMENT FROM YOUR AREA
      </span>
    </div>

    <!-- Main Content -->
    <div style="padding:32px 40px;">
      <p style="color:#374151;font-size:15px;margin:0 0 24px;">
        Hi <strong>${tutorName}</strong>, we found a student requirement that matches your teaching profile! Here are the details:
      </p>

      <!-- Lead Details Card -->
      <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:16px;padding:24px;margin-bottom:24px;">
        
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:140px;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Location</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">📍 ${locality}, ${city}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Subjects</span>
            </td>
            <td style="padding:8px 0;">
              ${subjectBadges}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Class</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">${classLevel} · ${board}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Mode</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:14px;font-weight:700;color:#0F172A;">${mode}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Budget</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:16px;font-weight:800;color:#16A34A;">₹${budgetMin.toLocaleString("en-IN")} – ₹${budgetMax.toLocaleString("en-IN")}${rateType === "HOURLY" ? " / hr" : " / mo"}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:11px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Schedule</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:14px;font-weight:600;color:#0F172A;">${days} · ${timing}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Urgency Message -->
      <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⚡</span>
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:700;">
          Tutors in your area are already applying. Be among the first to respond!
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${leadUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#16A34A,#0D9488);color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(22,163,74,0.35);">
          View Full Requirement →
        </a>
      </div>

      <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">
        Log in to ApnaTutorHub to see full contact details and apply for this requirement.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#0F2540;">ApnaTutorHub</p>
      <p style="margin:0;font-size:11px;color:#94A3B8;">
        You're receiving this because you're a registered tutor on our platform.<br/>
        <a href="${leadUrl}/settings" style="color:#16A34A;text-decoration:none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
