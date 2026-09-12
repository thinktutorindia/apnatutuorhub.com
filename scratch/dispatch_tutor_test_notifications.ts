import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/resend-service';
import { sendAquaWhatsAppMessage, getAquaWhatsAppConfig } from '../lib/aqua-whatsapp';
import { renderNewMatchedLeadEmail } from '../emails/NewMatchedLeadEmail';
import { createNotification } from '../lib/notification-engine';
import {
  formatLeadNotifyTemplate,
  buildAquaTuitionEnquiryPlaceholders,
  type LeadTemplateData,
} from '../lib/lead-notify-template';

async function dispatchTestNotifications() {
  console.log('=== Dispatching Targeted Notifications to youhubteam & zhanie ===');

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['youhubteam@gmail.com', 'zhaniesupport@gmail.com'],
      },
    },
    include: { tutorProfile: true },
  });

  const lead11 = await prisma.lead.findFirst({ where: { inquiryNumber: 32203 } });
  const lead8 = await prisma.lead.findFirst({ where: { inquiryNumber: 32202 } });

  const targets = [
    {
      user: users.find(u => u.email === 'youhubteam@gmail.com')!,
      lead: lead11!,
    },
    {
      user: users.find(u => u.email === 'zhaniesupport@gmail.com')!,
      lead: lead8!,
    },
  ];

  const results: Array<{
    email: string;
    phone: string | null;
    inquiryNumber: number;
    emailResult: any;
    dashboardNotificationId: string | null;
    whatsAppResult: any;
  }> = [];

  for (const target of targets) {
    if (!target.user || !target.lead) {
      console.error('Target user or lead missing:', target);
      continue;
    }

    const { user, lead } = target;
    console.log(`\n-------------------------------------------------------------`);
    console.log(`Target: ${user.name} (${user.email}) | Phone: ${user.phone}`);
    console.log(`Lead: #${lead.inquiryNumber} (${lead.classLevel} - ${lead.subjects.join(', ')})`);
    console.log(`Location: ${lead.area || lead.city}`);

    const leadData: LeadTemplateData = {
      id: lead.id,
      inquiryNumber: lead.inquiryNumber,
      clientName: `Parent of ${lead.classLevel} Student`,
      subjects: lead.subjects,
      classLevel: lead.classLevel,
      board: lead.board,
      mode: lead.mode,
      area: lead.area,
      city: lead.city,
      pincode: lead.pincode,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      genderPreference: lead.tutorGenderPref,
      timingPreference: lead.timingPreference,
      notes: lead.notes,
    };

    const leadUrl = 'https://apnatutorhub.com/tutor/leads';
    const emailSubject = `🎯 New Tuition Lead Alert: ${lead.classLevel} ${lead.subjects.join(', ')} (#${lead.inquiryNumber}) - ${lead.area || lead.city}`;
    const emailHtml = renderNewMatchedLeadEmail({
      tutorName: user.name || 'Tutor',
      subjects: lead.subjects,
      classLevel: lead.classLevel,
      city: lead.area || lead.city || 'Delhi',
      teachingMode: lead.mode as any,
      coinCost: lead.coinCost,
      leadUrl,
    });

    // 1. Send Email via Resend
    console.log(`1. Sending Email to ${user.email}...`);
    let emailResult: any = null;
    try {
      emailResult = await sendEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log('Email delivery:', emailResult);
    } catch (err: any) {
      emailResult = { success: false, error: err.message };
      console.error('Email error:', err.message);
    }

    // 2. Create Dashboard In-App Notification
    console.log(`2. Creating In-App Dashboard Notification for User ID: ${user.id}...`);
    let notifId: string | null = null;
    try {
      notifId = await createNotification({
        userId: user.id,
        type: 'LEAD_MATCHED',
        priority: 'HIGH',
        channel: 'WEB',
        title: `🎯 New Matching Lead: ${lead.classLevel} ${lead.subjects.slice(0, 2).join(', ')}`,
        message: `A new student lead in ${lead.area || lead.city} matches your teaching subjects and location. Click to view and connect!`,
        actionUrl: '/tutor/leads',
        referenceId: `lead_${lead.id}_${Date.now()}`,
        forceSend: true,
      });
      console.log('In-App Notification ID:', notifId);
    } catch (err: any) {
      console.error('Dashboard notification error:', err.message);
    }

    // 3. Attempt WhatsApp via Aqua (Approved Template 3750880)
    let whatsAppResult: any = null;
    if (user.phone) {
      console.log(`3. Sending WhatsApp to ${user.phone} via Approved Template 3750880...`);
      try {
        const placeholders = buildAquaTuitionEnquiryPlaceholders(leadData);
        whatsAppResult = await sendAquaWhatsAppMessage({
          to: user.phone,
          mode: 'template',
          templateId: '3750880', // Approved information2 template
          placeholders,
        });
        console.log('WhatsApp delivery:', whatsAppResult);
      } catch (err: any) {
        whatsAppResult = { ok: false, error: err.message };
        console.error('WhatsApp error:', err.message);
      }
    }

    results.push({
      email: user.email,
      phone: user.phone,
      inquiryNumber: lead.inquiryNumber,
      emailResult,
      dashboardNotificationId: notifId,
      whatsAppResult,
    });
  }

  console.log('\n=============================================================');
  console.log('FINAL NOTIFICATION DISPATCH SUMMARY');
  console.log('=============================================================');
  console.log(JSON.stringify(results, null, 2));
}

dispatchTestNotifications().catch(console.error).finally(() => prisma.$disconnect());
