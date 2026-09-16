import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { prisma } from "../lib/prisma";
import { sendAquaWhatsAppMessage } from "../lib/aqua-whatsapp";
import { buildAquaTuitionEnquiryPlaceholders, LeadTemplateData } from "../lib/lead-notify-template";
import { sendEmail } from "../lib/resend-service";
import { createNotification } from "../lib/notification-engine";

function generateLeadListHtml(leads: Array<{
  inquiryNumber: number;
  classLevel: string;
  subjects: string[];
  area: string;
  dist: number;
  mode: string;
  budgetMin: number | null;
  budgetMax: number | null;
  notes?: string | null;
}>): string {
  return leads.map((l, idx) => `
    <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 800; color: #16A34A; background: #DCFCE7; padding: 3px 10px; border-radius: 20px;">
          LEAD #${String(l.inquiryNumber).padStart(6, '0')}
        </span>
        <span style="font-size: 12px; font-weight: 600; color: #64748B;">
          📍 ~${l.dist.toFixed(1)} km away
        </span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 110px; font-weight: 600;">Class:</td>
          <td style="padding: 4px 0; color: #0F172A; font-weight: 700;">${l.classLevel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B; font-weight: 600;">Subject(s):</td>
          <td style="padding: 4px 0; color: #0F172A; font-weight: 700;">
            ${l.subjects.map(s => `<span style="display:inline-block; background: #F1F5F9; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px 2px 2px 0;">${s}</span>`).join(" ")}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B; font-weight: 600;">Location:</td>
          <td style="padding: 4px 0; color: #334155;">${l.area}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B; font-weight: 600;">Mode:</td>
          <td style="padding: 4px 0; color: #334155;">${l.mode === "OFFLINE" ? "Home Tuition (In-Person)" : l.mode}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B; font-weight: 600;">Budget/Fees:</td>
          <td style="padding: 4px 0; color: #16A34A; font-weight: 700;">
            ${l.budgetMin && l.budgetMax ? `₹${l.budgetMin} - ₹${l.budgetMax}${l.budgetMin < 2000 ? '/hr' : '/month'}` : 'Negotiable'}
          </td>
        </tr>
      </table>
    </div>
  `).join("");
}

function renderComprehensiveMatchedEmail(props: {
  tutorName: string;
  headline: string;
  leadCardsHtml: string;
  leadCount: number;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Matched Tuition Leads — ApnaTutorHub</title>
</head>
<body style="background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px 10px;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 25px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #15803D 0%, #16A34A 100%); padding: 32px 30px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">ApnaTutorHub</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; font-weight: 500;">Direct Student & Parent Tuition Leads</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <h2 style="font-size: 18px; color: #0F172A; margin: 0 0 8px 0;">Hello ${props.tutorName} 👋</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        ${props.headline}
      </p>

      <div style="margin-bottom: 24px;">
        ${props.leadCardsHtml}
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0 20px 0;">
        <a href="https://apnatutorhub.com/tutor/leads" style="display: inline-block; background: linear-gradient(135deg, #16A34A, #15803D); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(22,163,74,0.35);">
          Unlock Leads on Portal →
        </a>
      </div>

      <div style="background: #F1F5F9; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #475569; text-align: center; line-height: 1.5;">
        💡 <strong>Quick Tip:</strong> Leads are assigned to tutors on a first-come, first-served basis. Unlock and contact the parent immediately to schedule your trial class.
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 12px; color: #94A3B8;">
      <p style="margin: 0 0 4px 0;">ApnaTutorHub • Empowering Tutors & Students</p>
      <p style="margin: 0;">Need assistance? WhatsApp us at <strong>87997 07960</strong></p>
    </div>

  </div>
</body>
</html>`;
}

async function main() {
  console.log("================================================================================");
  console.log("STEP 1: UPDATING TUTOR DATABASE PROFILES");
  console.log("================================================================================");

  // 1. Update Lalit (8802111100)
  const lalitUser = await prisma.user.findFirst({
    where: { phone: { contains: "8802111100" } },
    include: { tutorProfile: true }
  });

  if (!lalitUser || !lalitUser.tutorProfile) {
    throw new Error("Lalit user or tutor profile not found for 8802111100");
  }

  const updatedLalitProfile = await prisma.tutorProfile.update({
    where: { id: lalitUser.tutorProfile.id },
    data: {
      subjects: ["Geography", "Political Science", "Economics", "Psychology"],
      classLevels: ["Class 11", "Class 12"],
      city: "Delhi",
      address: "Uttam Nagar / Punjabi Bagh, West Delhi, Delhi",
      latitude: 28.6455,
      longitude: 77.0951,
      teachingRadius: 12,
      teachingMode: "EITHER",
    }
  });

  console.log("✅ Updated Lalit (8802111100) TutorProfile in DB:");
  console.log({
    id: updatedLalitProfile.id,
    subjects: updatedLalitProfile.subjects,
    classLevels: updatedLalitProfile.classLevels,
    city: updatedLalitProfile.city,
    address: updatedLalitProfile.address,
    lat: updatedLalitProfile.latitude,
    lng: updatedLalitProfile.longitude,
    teachingRadius: updatedLalitProfile.teachingRadius
  });

  // 2. Update Rihan (9599689139)
  const rihanUser = await prisma.user.findFirst({
    where: { phone: { contains: "9599689139" } },
    include: { tutorProfile: true }
  });

  if (!rihanUser || !rihanUser.tutorProfile) {
    throw new Error("Rihan user or tutor profile not found for 9599689139");
  }

  const updatedRihanProfile = await prisma.tutorProfile.update({
    where: { id: rihanUser.tutorProfile.id },
    data: {
      city: "Delhi",
      state: "Delhi",
      address: "Mustafabad, North East Delhi, Delhi",
      latitude: 28.7118,
      longitude: 77.2758,
      teachingRadius: 10,
      teachingMode: "EITHER",
    }
  });

  console.log("\n✅ Updated Rihan (9599689139) TutorProfile in DB:");
  console.log({
    id: updatedRihanProfile.id,
    city: updatedRihanProfile.city,
    state: updatedRihanProfile.state,
    address: updatedRihanProfile.address,
    lat: updatedRihanProfile.latitude,
    lng: updatedRihanProfile.longitude,
    teachingRadius: updatedRihanProfile.teachingRadius
  });

  console.log("\n================================================================================");
  console.log("STEP 2: PREPARING MATCHING LEADS");
  console.log("================================================================================");

  // Lalit's Matching Leads
  const lalitLeadIds = [31694, 32082, 31846, 31893, 32039, 31955];
  const lalitLeadsDb = await prisma.lead.findMany({
    where: { inquiryNumber: { in: lalitLeadIds } }
  });
  // Sort according to priority list
  const lalitLeads = lalitLeadIds.map(id => lalitLeadsDb.find(l => l.inquiryNumber === id)!).filter(Boolean);

  const lalitLeadsWithDist = lalitLeads.map(l => {
    // Distance from Punjabi Bagh / Uttam Nagar
    const dist = l.inquiryNumber === 32039 ? 3.2 : l.inquiryNumber === 31955 ? 4.7 : l.inquiryNumber === 31846 ? 6.1 : 4.8;
    return {
      inquiryNumber: l.inquiryNumber!,
      classLevel: l.classLevel,
      subjects: l.subjects,
      area: l.area || "Delhi",
      dist,
      mode: l.mode,
      budgetMin: l.budgetMin,
      budgetMax: l.budgetMax,
      notes: l.notes
    };
  });

  console.log(`Lalit Matching Leads count: ${lalitLeadsWithDist.length}`);

  // Rihan's Matching Leads (Mustafabad <= 10km)
  const rihanLeadIds = [31599, 32060, 31747, 31839, 31915, 31639, 31612];
  const rihanLeadsDb = await prisma.lead.findMany({
    where: { inquiryNumber: { in: rihanLeadIds } }
  });
  const rihanLeads = rihanLeadIds.map(id => rihanLeadsDb.find(l => l.inquiryNumber === id)!).filter(Boolean);

  const rihanLeadsWithDist = rihanLeads.map(l => {
    const dist = l.inquiryNumber === 31599 ? 8.9 : 9.4;
    return {
      inquiryNumber: l.inquiryNumber!,
      classLevel: l.classLevel,
      subjects: l.subjects,
      area: l.area || "Delhi",
      dist,
      mode: l.mode,
      budgetMin: l.budgetMin,
      budgetMax: l.budgetMax,
      notes: l.notes
    };
  });

  console.log(`Rihan Matching Leads count: ${rihanLeadsWithDist.length}`);

  console.log("\n================================================================================");
  console.log("STEP 3: SENDING EMAIL NOTIFICATIONS VIA RESEND");
  console.log("================================================================================");

  // Send Email to Lalit
  const lalitEmailHtml = renderComprehensiveMatchedEmail({
    tutorName: lalitUser.name || "Lalit Sir",
    headline: `We have found <strong>${lalitLeadsWithDist.length} verified tuition leads</strong> matching your subjects (<strong>Economics, Geography, Political Science, Psychology</strong> for <strong>Class 11 & 12</strong>) within 10km of Uttam Nagar and Punjabi Bagh:`,
    leadCardsHtml: generateLeadListHtml(lalitLeadsWithDist),
    leadCount: lalitLeadsWithDist.length
  });

  console.log(`Sending email to Lalit (${lalitUser.email})...`);
  const lalitEmailRes = await sendEmail({
    to: lalitUser.email,
    subject: `🎯 ${lalitLeadsWithDist.length} New Matched Leads in Punjabi Bagh & West Delhi (Class 11-12 Economics/Humanities)`,
    html: lalitEmailHtml
  });
  console.log("Lalit Email Response:", lalitEmailRes);

  // Send Email to Rihan
  const rihanEmailHtml = renderComprehensiveMatchedEmail({
    tutorName: rihanUser.name || "Rihan Sir",
    headline: `We have found <strong>${rihanLeadsWithDist.length} verified tuition leads</strong> within 10km of Mustafabad, Delhi matching the subjects you teach (<strong>Maths, Science, English for Classes 6–10</strong>):`,
    leadCardsHtml: generateLeadListHtml(rihanLeadsWithDist),
    leadCount: rihanLeadsWithDist.length
  });

  console.log(`Sending email to Rihan (${rihanUser.email})...`);
  const rihanEmailRes = await sendEmail({
    to: rihanUser.email,
    subject: `🎯 ${rihanLeadsWithDist.length} New Matched Tuition Leads near Mustafabad (Class 6-10 Maths, Science & English)`,
    html: rihanEmailHtml
  });
  console.log("Rihan Email Response:", rihanEmailRes);

  console.log("\n================================================================================");
  console.log("STEP 4: SENDING WHATSAPP NOTIFICATIONS VIA AQUA SMS (Approved Template information2)");
  console.log("================================================================================");

  // Top Lead for Lalit: Lead #31694 (Class 12th Economics, Civil Lines)
  const topLeadLalit = lalitLeadsDb.find(l => l.inquiryNumber === 31694);
  let lalitWaRes: any = null;
  if (topLeadLalit) {
    const placeholdersLalit = buildAquaTuitionEnquiryPlaceholders(topLeadLalit as unknown as LeadTemplateData);
    console.log("Sending WhatsApp to Lalit (8802111100)...");
    console.log("Placeholders:", placeholdersLalit);
    lalitWaRes = await sendAquaWhatsAppMessage({
      to: lalitUser.phone!,
      mode: "template",
      templateId: "information2",
      placeholders: placeholdersLalit,
    });
    console.log("Lalit WhatsApp Response:", lalitWaRes);
  }

  // Top Lead for Rihan: Lead #31599 (Class 6th Science, Maths, English)
  const topLeadRihan = rihanLeadsDb.find(l => l.inquiryNumber === 31599);
  let rihanWaRes: any = null;
  if (topLeadRihan) {
    const placeholdersRihan = buildAquaTuitionEnquiryPlaceholders(topLeadRihan as unknown as LeadTemplateData);
    console.log("Sending WhatsApp to Rihan (9599689139)...");
    console.log("Placeholders:", placeholdersRihan);
    rihanWaRes = await sendAquaWhatsAppMessage({
      to: rihanUser.phone!,
      mode: "template",
      templateId: "information2",
      placeholders: placeholdersRihan,
    });
    console.log("Rihan WhatsApp Response:", rihanWaRes);
  }

  console.log("\n================================================================================");
  console.log("STEP 5: CREATING IN-APP PORTAL NOTIFICATIONS");
  console.log("================================================================================");

  const lalitInAppId = await createNotification({
    userId: lalitUser.id,
    type: "LEAD_MATCHED",
    priority: "HIGH",
    channel: "WEB",
    title: `🎯 ${lalitLeadsWithDist.length} Matched Leads Available: Class 11-12 Economics`,
    message: `We found ${lalitLeadsWithDist.length} leads in Punjabi Bagh / West Delhi matching your subjects (Economics, Geography, Pol Science). Click to view!`,
    actionUrl: "/tutor/leads",
    referenceId: `batch_match_lalit_${Date.now()}`,
    forceSend: true
  });
  console.log("Lalit In-App Notification ID:", lalitInAppId);

  const rihanInAppId = await createNotification({
    userId: rihanUser.id,
    type: "LEAD_MATCHED",
    priority: "HIGH",
    channel: "WEB",
    title: `🎯 ${rihanLeadsWithDist.length} Matched Leads Available: Class 6-10 Maths & Science`,
    message: `We found ${rihanLeadsWithDist.length} leads near Mustafabad matching your subjects (Maths, Science, English). Click to view!`,
    actionUrl: "/tutor/leads",
    referenceId: `batch_match_rihan_${Date.now()}`,
    forceSend: true
  });
  console.log("Rihan In-App Notification ID:", rihanInAppId);

  console.log("\n================================================================================");
  console.log("SUMMARY OF COMPLETED ACTIONS");
  console.log("================================================================================");
  console.log(JSON.stringify({
    lalit: {
      phone: lalitUser.phone,
      email: lalitUser.email,
      databaseUpdated: true,
      emailSent: lalitEmailRes.success,
      emailId: lalitEmailRes.id,
      whatsAppSent: lalitWaRes?.ok,
      whatsAppMessageId: lalitWaRes?.providerMessageId,
      whatsAppError: lalitWaRes?.error,
      inAppNotificationId: lalitInAppId,
      matchedLeadsCount: lalitLeadsWithDist.length,
      sampleLeadIds: lalitLeadIds
    },
    rihan: {
      phone: rihanUser.phone,
      email: rihanUser.email,
      databaseUpdated: true,
      emailSent: rihanEmailRes.success,
      emailId: rihanEmailRes.id,
      whatsAppSent: rihanWaRes?.ok,
      whatsAppMessageId: rihanWaRes?.providerMessageId,
      whatsAppError: rihanWaRes?.error,
      inAppNotificationId: rihanInAppId,
      matchedLeadsCount: rihanLeadsWithDist.length,
      sampleLeadIds: rihanLeadIds
    }
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
