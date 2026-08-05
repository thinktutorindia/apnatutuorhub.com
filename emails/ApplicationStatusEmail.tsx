/**
 * emails/ApplicationStatusEmail.tsx
 * Sent to tutors when they are shortlisted, rejected, or hired for a lead.
 */

export type ApplicationStatusEmailProps = {
  tutorName: string;
  status: "SHORTLISTED" | "REJECTED" | "HIRED";
  subject: string;
  parentFirstName?: string | null;
  leadUrl: string;
};

const statusConfig = {
  SHORTLISTED: {
    emoji: "⭐",
    heading: "You've Been Shortlisted!",
    body: "Great news! The parent has shortlisted your application. They may reach out soon to discuss further details.",
    badgeColor: "#EAB308",
    badgeBg: "rgba(234,179,8,0.12)",
    ctaText: "View Lead Details",
    ctaColor: "#EAB308",
  },
  HIRED: {
    emoji: "🎉",
    heading: "Congratulations — You're Hired!",
    body: "The parent has chosen you as their tutor. Please check the booking details and get in touch to confirm your schedule.",
    badgeColor: "#22C55E",
    badgeBg: "rgba(34,197,94,0.12)",
    ctaText: "View Booking",
    ctaColor: "#22C55E",
  },
  REJECTED: {
    emoji: "😔",
    heading: "Application Not Selected",
    body: "The parent has moved forward with another tutor this time. Don't be discouraged — there are plenty of leads waiting for you!",
    badgeColor: "#EF4444",
    badgeBg: "rgba(239,68,68,0.12)",
    ctaText: "Browse More Leads",
    ctaColor: "#3B82F6",
  },
};

export function renderApplicationStatusEmail(props: ApplicationStatusEmailProps): string {
  const { tutorName, status, subject, leadUrl } = props;
  const cfg = statusConfig[status];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.heading} — ApnaTutorHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F1F5F9; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #22C55E, #16A34A); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 40px; text-align: center; }
    .status-icon { font-size: 52px; margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 6px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 12px; }
    .desc { font-size: 14px; color: #475569; line-height: 1.75; margin-bottom: 8px; }
    .subject-chip { display: inline-block; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 600; color: #0F172A; margin-top: 8px; margin-bottom: 28px; }
    .cta { display: inline-block; padding: 14px 32px; border-radius: 12px; color: #fff; text-decoration: none; font-weight: 800; font-size: 15px; }
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
      <div class="status-icon">${cfg.emoji}</div>
      <div class="status-badge" style="background:${cfg.badgeBg};color:${cfg.badgeColor};">${status}</div>
      <h2 class="title">${cfg.heading}</h2>
      <p class="desc">Hi <strong>${tutorName}</strong>,</p>
      <p class="desc">${cfg.body}</p>
      <div class="subject-chip">📚 ${subject}</div>
      <br />
      <a href="${leadUrl}" class="cta" style="background:${cfg.ctaColor};">${cfg.ctaText} →</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ApnaTutorHub. You received this because you applied to a lead on our platform.</p>
    </div>
  </div>
</body>
</html>`;
}
