import * as fs from 'fs';
import * as path from 'path';

export function renderUpgradedLeadEmail(props: {
  tutorName: string;
  inquiryNumber?: number | string;
  subjects: string[];
  classLevel: string;
  locality: string;
  monthlyFee?: string;
  teachingMode: string;
  helplineNumber?: string;
  leadUrl?: string;
}): string {
  const {
    tutorName,
    inquiryNumber = '32202',
    subjects,
    classLevel,
    locality,
    monthlyFee = '₹6,000 – ₹8,000 / month',
    teachingMode = 'Home Tuition (Offline)',
    helplineNumber = '08062180653',
    leadUrl = 'https://apnatutorhub.com/tutor/leads',
  } = props;

  const subjectBadges = subjects
    .map(
      s =>
        `<span style="display:inline-block; background:#DCFCE7; color:#166534; font-weight:700; font-size:12px; padding:3px 10px; border-radius:6px; margin:2px 4px 2px 0;">${s}</span>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Tuition Lead Alert — ApnaTutorHub</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <div style="max-width:600px; margin:24px auto; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); border:1px solid #E2E8F0;">
    
    <!-- Top Header -->
    <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding:28px 32px; text-align:center; border-bottom:4px solid #10B981;">
      <div style="display:inline-block; background:rgba(16,185,129,0.15); border:1px solid #10B981; color:#34D399; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; padding:4px 12px; border-radius:20px; margin-bottom:8px;">
        ⚡ NEW MATCHED TUITION ALERT
      </div>
      <h1 style="color:#FFFFFF; font-size:22px; font-weight:800; margin:0; letter-spacing:-0.5px;">
        ApnaTutorHub
      </h1>
      <p style="color:#94A3B8; font-size:13px; margin:4px 0 0 0;">
        Verified Student Inquiry Matching Your Teaching Profile
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding:32px 32px 24px 32px;">
      <p style="font-size:16px; font-weight:700; color:#0F172A; margin:0 0 6px 0;">
        Hello ${tutorName} 👋
      </p>
      <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 20px 0;">
        A new parent inquiry matching your preferred location and subjects has just arrived. Student inquiries are strictly limited to a <strong>maximum of 3 verified tutors</strong> to ensure the highest selection rate.
      </p>

      <!-- Student Lead Card -->
      <div style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:16px; padding:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:12px; margin-bottom:12px;">
          <span style="font-size:11px; font-weight:800; text-transform:uppercase; color:#64748B; letter-spacing:0.5px;">Enquiry Number</span>
          <span style="font-size:14px; font-weight:800; color:#0F172A; background:#E2E8F0; padding:2px 8px; border-radius:6px;">#${inquiryNumber}</span>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr>
            <td style="padding:7px 0; color:#64748B; font-weight:600; width:35%;">📚 Class & Subjects:</td>
            <td style="padding:7px 0; color:#0F172A; font-weight:700;">${classLevel} <div style="margin-top:4px;">${subjectBadges}</div></td>
          </tr>
          <tr>
            <td style="padding:7px 0; color:#64748B; font-weight:600;">📍 Preferred Locality:</td>
            <td style="padding:7px 0; color:#0F172A; font-weight:700;">${locality}</td>
          </tr>
          <tr>
            <td style="padding:7px 0; color:#64748B; font-weight:600;">🎒 Tuition Mode:</td>
            <td style="padding:7px 0; color:#0F172A; font-weight:700;">${teachingMode}</td>
          </tr>
          <tr>
            <td style="padding:7px 0; color:#64748B; font-weight:600;">💰 Monthly Fee Budget:</td>
            <td style="padding:7px 0; color:#059669; font-weight:800; font-size:15px;">${monthlyFee}</td>
          </tr>
          <tr>
            <td style="padding:7px 0; color:#64748B; font-weight:600;">👥 Allocation Status:</td>
            <td style="padding:7px 0; color:#DC2626; font-weight:700;">⚠️ 1 of 3 Slots Open (Act Fast)</td>
          </tr>
        </table>
      </div>

      <!-- High Conversion Call Box (HELPLINE 08062180653) -->
      <div style="background:linear-gradient(135deg, #064E3B 0%, #047857 100%); border-radius:16px; padding:22px 20px; text-align:center; color:#FFFFFF; margin-bottom:24px; box-shadow:0 8px 20px rgba(6,78,59,0.25);">
        <div style="font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#A7F3D0; margin-bottom:4px;">
          📞 Official Tutor Verification Helpline
        </div>
        <div style="font-size:28px; font-weight:900; letter-spacing:1.5px; margin:4px 0 10px 0;">
          <a href="tel:${helplineNumber}" style="color:#FFFFFF; text-decoration:none;">${helplineNumber}</a>
        </div>
        <p style="font-size:13px; color:#E6FFFA; line-height:1.5; margin:0 0 16px 0; max-width:440px; margin-left:auto; margin-right:auto;">
          Call our student coordinator right now to verify your locality and claim Enquiry <strong>#${inquiryNumber}</strong> before it is assigned.
        </p>
        <a href="tel:${helplineNumber}" style="display:inline-block; background:#FFFFFF; color:#064E3B; font-weight:800; font-size:14px; padding:12px 28px; border-radius:12px; text-decoration:none; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
          📲 Tap to Call Helpline (${helplineNumber})
        </a>
      </div>

      <!-- Growth Plan Box (₹999 - 0% Commission) -->
      <div style="background:#FFFBEB; border:2px dashed #F59E0B; border-radius:16px; padding:18px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:18px;">👑</span>
          <h3 style="font-size:14px; font-weight:800; color:#92400E; margin:0; text-transform:uppercase; letter-spacing:0.5px;">
            ₹999 Tutor Growth Membership (0% Commission)
          </h3>
        </div>
        <p style="font-size:12px; color:#78350F; line-height:1.6; margin:0 0 10px 0;">
          Unlock verified student leads in your locality with zero middleman deductions:
        </p>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#78350F; line-height:1.7;">
          <li><strong>0% Platform Commission</strong> — You keep 100% of student tuition fees month after month!</li>
          <li><strong>2 to 6 Guaranteed Inquiries</strong> — In your exact teaching radius.</li>
          <li><strong>Direct Parent Contact & Address</strong> — Direct calling without middleman delay.</li>
          <li><strong>Low Competition Guarantee</strong> — Maximum 3 verified teachers per student inquiry.</li>
        </ul>
        <div style="margin-top:12px; text-align:center;">
          <a href="${leadUrl}" style="display:inline-block; background:#D97706; color:#FFFFFF; font-weight:800; font-size:12px; padding:8px 18px; border-radius:8px; text-decoration:none;">
            Activate ₹999 Plan on Portal →
          </a>
        </div>
      </div>

      <!-- Direct Unlock Portal CTA -->
      <div style="text-align:center; margin-bottom:8px;">
        <a href="${leadUrl}" style="display:inline-block; background:#0F172A; color:#FFFFFF; font-weight:800; font-size:14px; padding:14px 32px; border-radius:12px; text-decoration:none; box-shadow:0 4px 12px rgba(15,23,42,0.2);">
          View &amp; Unlock Lead on Dashboard →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 32px; text-align:center;">
      <p style="font-size:12px; font-weight:700; color:#334155; margin:0 0 4px 0;">
        ApnaTutorHub — India's Premium Home &amp; Online Tutor Network
      </p>
      <p style="font-size:11px; color:#64748B; margin:0 0 6px 0;">
        Helpline: <strong>08062180653</strong> &nbsp;|&nbsp; WhatsApp: <strong>87997 07960</strong> &nbsp;|&nbsp; Web: <a href="https://apnatutorhub.com" style="color:#059669; text-decoration:none;">apnatutorhub.com</a>
      </p>
      <p style="font-size:10px; color:#94A3B8; margin:0;">
        You received this notification because you are a registered tutor on ApnaTutorHub.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// Generate the sample HTML file
const sampleHtml = renderUpgradedLeadEmail({
  tutorName: 'Rohit Sharma',
  inquiryNumber: 32202,
  subjects: ['Mathematics', 'Science', 'English'],
  classLevel: 'Class 8th',
  locality: 'Block C Bungalow Zone, Anand Niketan, South Delhi',
  monthlyFee: '₹6,000 – ₹8,000 / month',
  teachingMode: 'Home Tuition (Offline)',
  helplineNumber: '08062180653',
  leadUrl: 'https://apnatutorhub.com/tutor/leads',
});

const outputPath = path.join(__dirname, '../public/lead_email_preview.html');
fs.writeFileSync(outputPath, sampleHtml, 'utf-8');
console.log('Successfully written lead email preview to:', outputPath);
