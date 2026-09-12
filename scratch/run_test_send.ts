import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/resend-service';
import { sendAquaWhatsAppMessage, getAquaWhatsAppStatus } from '../lib/aqua-whatsapp';
import { renderNewMatchedLeadEmail } from '../emails/NewMatchedLeadEmail';
import {
  formatLeadNotifyTemplate,
  buildAquaTuitionEnquiryPlaceholders,
  type LeadTemplateData,
} from '../lib/lead-notify-template';

async function main() {
  console.log('=== Checking Tutors in DB ===');
  const tutors = await prisma.user.findMany({
    where: {
      email: {
        in: ['youhubteam@gmail.com', 'zhaniesupport@gmail.com'],
      },
    },
    include: { tutorProfile: true },
  });

  for (const t of tutors) {
    console.log(`- ${t.name} (${t.email}), Phone: ${t.phone}`);
    console.log(`  Location: ${t.tutorProfile?.area || t.tutorProfile?.city || t.tutorProfile?.address} [${t.tutorProfile?.latitude}, ${t.tutorProfile?.longitude}]`);
    console.log(`  Subjects: ${t.tutorProfile?.subjects?.join(', ')}`);
    console.log(`  Classes: ${t.tutorProfile?.classes?.join(', ')}`);
  }

  const aquaStatus = await getAquaWhatsAppStatus();
  console.log('\n=== Aqua WhatsApp Status ===');
  console.log({
    enabled: aquaStatus.enabled,
    hasToken: aquaStatus.hasSystemToken,
    from: aquaStatus.fromNumberMasked,
    dailyUsed: aquaStatus.dailyUsed,
    dailyRemaining: aquaStatus.dailyRemaining,
    readyForTemplateTest: aquaStatus.readyForTemplateTest,
  });

  // Sample leads for each
  const lead11 = await prisma.lead.findFirst({ where: { inquiryNumber: 32203 } });
  const lead8 = await prisma.lead.findFirst({ where: { inquiryNumber: 32202 } });

  const targets = [
    {
      user: tutors.find(u => u.email === 'youhubteam@gmail.com') || { name: 'Rohit Sharma', email: 'youhubteam@gmail.com', phone: '9311459543' },
      lead: lead11,
      targetSubject: 'Mathematics for Class XI/XII',
    },
    {
      user: tutors.find(u => u.email === 'zhaniesupport@gmail.com') || { name: 'Zhanie Support', email: 'zhaniesupport@gmail.com', phone: '6230789145' },
      lead: lead8,
      targetSubject: 'Class 8th All Core Subjects',
    },
  ];

  for (const target of targets) {
    if (!target.lead) {
      console.log(`Lead missing for ${target.user.email}`);
      continue;
    }

    const leadData: LeadTemplateData = {
      id: target.lead.id,
      inquiryNumber: target.lead.inquiryNumber,
      clientName: `Parent of ${target.lead.classLevel} Student`,
      subjects: target.lead.subjects,
      classLevel: target.lead.classLevel,
      board: target.lead.board,
      mode: target.lead.mode,
      area: target.lead.area,
      city: target.lead.city,
      pincode: target.lead.pincode,
      budgetMin: target.lead.budgetMin,
      budgetMax: target.lead.budgetMax,
      genderPreference: target.lead.tutorGenderPref,
      timingPreference: target.lead.timingPreference,
      notes: target.lead.notes,
    };

    const leadUrl = `https://apnatutorhub.com/tutor/leads`;
    const emailSubject = `🎯 New Tuition Lead Alert: ${target.lead.classLevel} ${target.lead.subjects.join(', ')} (#${target.lead.inquiryNumber}) - ${target.lead.area || target.lead.city}`;
    const emailHtml = renderNewMatchedLeadEmail({
      tutorName: target.user.name || 'Tutor',
      subjects: target.lead.subjects,
      classLevel: target.lead.classLevel,
      city: target.lead.area || target.lead.city || 'Delhi',
      teachingMode: target.lead.mode as any,
      coinCost: target.lead.coinCost,
      leadUrl,
    });

    console.log(`\n======================================================`);
    console.log(`SENDING TEST TO: ${target.user.name} <${target.user.email}> | Phone: ${target.user.phone}`);
    console.log(`Matched Lead: #${target.lead.inquiryNumber} (${target.lead.classLevel} - ${target.lead.subjects.join(', ')})`);
    console.log(`======================================================`);

    // 1. Send Email via Resend
    console.log(`1. Sending Email via Resend to ${target.user.email}...`);
    try {
      const emailRes = await sendEmail({
        to: target.user.email,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log('Resend Email Result:', emailRes);
    } catch (e: any) {
      console.error('Email failed:', e.message);
    }

    // 2. Send WhatsApp via Aqua
    if (target.user.phone) {
      const placeholders = buildAquaTuitionEnquiryPlaceholders(leadData);
      console.log(`2. Sending WhatsApp via Aqua to ${target.user.phone}...`);
      try {
        const waRes = await sendAquaWhatsAppMessage({
          to: target.user.phone,
          mode: 'template',
          placeholders,
        });
        console.log('Aqua WhatsApp Result:', waRes);
      } catch (e: any) {
        console.error('WhatsApp failed:', e.message);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
