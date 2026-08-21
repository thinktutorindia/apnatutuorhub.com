/**
 * emails/NewMatchedLeadEmail.tsx
 * Sent to tutors when a new matching lead is posted that fits their profile.
 *
 * This is a standalone HTML email template — NO React Email dependency required.
 * Use renderNewMatchedLeadEmail() to get the final HTML string, then pass to SES.
 */

export type NewMatchedLeadEmailProps = {
  tutorName: string;
  subjects: string[];
  classLevel: string;
  city: string | null;
  teachingMode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  coinCost: number;
  leadUrl: string;
};

const modeLabel: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "In-Person",
  COACHING: "Coaching / Institute",
  EITHER: "Online / In-Person",
};

export function renderNewMatchedLeadEmail(props: NewMatchedLeadEmailProps): string {
  const {
    tutorName,
    subjects,
    classLevel,
    city,
    teachingMode,
    coinCost,
    leadUrl,
  } = props;

  const subjectList = subjects.map((s) => `<span class="badge">${s}</span>`).join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Matched Lead — ApnaTutorHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F1F5F9; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #22C55E, #16A34A); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 17px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px; }
    .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .card-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
    .card-row:last-child { border-bottom: none; }
    .card-label { font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 14px; font-weight: 600; color: #0F172A; }
    .badge { display: inline-block; background: rgba(34,197,94,0.1); color: #16A34A; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 600; margin: 2px; }
    .cta { display: block; text-align: center; margin: 0 auto; max-width: 200px; padding: 14px 28px; background: linear-gradient(135deg, #22C55E, #16A34A); color: #fff; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; }
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
      <p class="greeting">Hi ${tutorName} 👋</p>
      <p class="desc">A new tuition lead that matches your profile is available. Act fast — leads are limited to a few tutors!</p>

      <div class="card">
        <div class="card-row">
          <span class="card-label">Subjects</span>
          <span class="card-value">${subjectList}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Class Level</span>
          <span class="card-value">${classLevel}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Location</span>
          <span class="card-value">${city ?? "Flexible"}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Mode</span>
          <span class="card-value">${modeLabel[teachingMode] ?? teachingMode}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Cost to Unlock</span>
          <span class="card-value" style="color:#22C55E;">🪙 ${coinCost} Coins</span>
        </div>
      </div>

      <a href="${leadUrl}" class="cta">View Lead →</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ApnaTutorHub. You received this because you're a registered tutor.</p>
    </div>
  </div>
</body>
</html>`;
}
