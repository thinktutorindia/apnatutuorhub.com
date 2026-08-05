/**
 * emails/NewApplicantEmail.tsx
 * Sent to parents when a tutor applies to their lead.
 */

export type NewApplicantEmailProps = {
  parentName: string;
  tutorName: string;
  tutorProfileUrl: string;
  subjects: string[];
  proposalNote?: string | null;
  feeQuote?: number | null;
};

export function renderNewApplicantEmail(props: NewApplicantEmailProps): string {
  const { parentName, tutorName, tutorProfileUrl, subjects, proposalNote, feeQuote } = props;

  const subjectStr = subjects.join(", ");
  const feeStr = feeQuote
    ? `₹${(feeQuote / 100).toLocaleString("en-IN")}/month`
    : "To be discussed";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Tutor Applied — ApnaTutorHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F1F5F9; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #22C55E, #16A34A); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 17px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px; }
    .tutor-card { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); border: 1px solid #BBF7D0; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .tutor-name { font-size: 18px; font-weight: 800; color: #14532D; }
    .tutor-sub { font-size: 13px; color: #166534; margin-top: 4px; }
    .info-row { display: flex; gap: 16px; margin-top: 16px; }
    .info-pill { flex: 1; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; }
    .info-pill-label { font-size: 10px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .info-pill-value { font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 2px; }
    .proposal { background: #F8FAFC; border-left: 3px solid #22C55E; border-radius: 0 12px 12px 0; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #475569; line-height: 1.7; font-style: italic; }
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
    <div class="body">
      <p class="greeting">Hi ${parentName} 👋</p>
      <p class="desc">A tutor has applied to your tuition requirement for <strong>${subjectStr}</strong>. Review their application and decide if they're the right fit!</p>

      <div class="tutor-card">
        <div class="tutor-name">👨‍🏫 ${tutorName}</div>
        <div class="tutor-sub">Applied for: ${subjectStr}</div>
        <div class="info-row">
          <div class="info-pill">
            <div class="info-pill-label">Quoted Fee</div>
            <div class="info-pill-value">${feeStr}</div>
          </div>
        </div>
      </div>

      ${proposalNote ? `<div class="proposal">"${proposalNote}"</div>` : ""}

      <a href="${tutorProfileUrl}" class="cta">View Application →</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ApnaTutorHub. You received this because a tutor applied to your posted requirement.</p>
    </div>
  </div>
</body>
</html>`;
}
