import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { renderNewMatchedLeadEmail } from '../emails/NewMatchedLeadEmail';
import {
  formatLeadNotifyTemplate,
  buildAquaTuitionEnquiryPlaceholders,
  type LeadTemplateData,
} from '../lib/lead-notify-template';

async function previewNotifications() {
  // 1. Fetch sample leads
  const lead11 = await prisma.lead.findFirst({
    where: { inquiryNumber: 32203 },
  });
  const lead8 = await prisma.lead.findFirst({
    where: { inquiryNumber: 32202 },
  });

  console.log('================================================================');
  console.log('TEST TARGET 1: youhubteam@gmail.com (Rohit Sharma - 9311459543)');
  console.log('Sample Lead: #32203 (Class 11th Mathematics, Kalkaji)');
  console.log('================================================================');

  if (lead11) {
    const lead11Data: LeadTemplateData = {
      id: lead11.id,
      inquiryNumber: lead11.inquiryNumber,
      clientName: 'Parent of Class 11th Student',
      subjects: lead11.subjects,
      classLevel: lead11.classLevel,
      board: lead11.board,
      mode: lead11.mode,
      area: lead11.area,
      city: lead11.city,
      pincode: lead11.pincode,
      budgetMin: lead11.budgetMin,
      budgetMax: lead11.budgetMax,
      genderPreference: lead11.tutorGenderPref,
      timingPreference: lead11.timingPreference,
      notes: lead11.notes,
    };

    console.log('\n--- WHATSAPP MESSAGE PREVIEW ---');
    console.log(formatLeadNotifyTemplate(lead11Data));

    console.log('\n--- AQUA TEMPLATE PLACEHOLDERS (8 vars) ---');
    const placeholders = buildAquaTuitionEnquiryPlaceholders(lead11Data);
    console.log(JSON.stringify(placeholders, null, 2));

    console.log('\n--- EMAIL PREVIEW ---');
    console.log('Subject: 🎯 New Tuition Lead Alert: Class 11th Mathematics (#32203) - Kalkaji, South Delhi');
    const emailHtml = renderNewMatchedLeadEmail({
      tutorName: 'Rohit Sharma',
      subjects: lead11.subjects,
      classLevel: lead11.classLevel,
      city: lead11.area || lead11.city || 'Kalkaji, South Delhi',
      teachingMode: lead11.mode as any,
      coinCost: lead11.coinCost,
      leadUrl: 'https://apnatutorhub.com/tutor/leads',
    });
    console.log(`Email HTML generated (${emailHtml.length} bytes)`);
  }

  console.log('\n================================================================');
  console.log('TEST TARGET 2: zhaniesupport@gmail.com (Zhanie Support - 6230789145)');
  console.log('Sample Lead: #32202 (Class 8th All Core Subjects, Anand Niketan)');
  console.log('================================================================');

  if (lead8) {
    const lead8Data: LeadTemplateData = {
      id: lead8.id,
      inquiryNumber: lead8.inquiryNumber,
      clientName: 'Parent of Class 8th Student',
      subjects: lead8.subjects,
      classLevel: lead8.classLevel,
      board: lead8.board,
      mode: lead8.mode,
      area: lead8.area,
      city: lead8.city,
      pincode: lead8.pincode,
      budgetMin: lead8.budgetMin,
      budgetMax: lead8.budgetMax,
      genderPreference: lead8.tutorGenderPref,
      timingPreference: lead8.timingPreference,
      notes: lead8.notes,
    };

    console.log('\n--- WHATSAPP MESSAGE PREVIEW ---');
    console.log(formatLeadNotifyTemplate(lead8Data));

    console.log('\n--- AQUA TEMPLATE PLACEHOLDERS (8 vars) ---');
    const placeholders = buildAquaTuitionEnquiryPlaceholders(lead8Data);
    console.log(JSON.stringify(placeholders, null, 2));

    console.log('\n--- EMAIL PREVIEW ---');
    console.log('Subject: 🎯 New Tuition Lead Alert: Class 8th All Core Subjects (#32202) - Anand Niketan, South Delhi');
    const emailHtml = renderNewMatchedLeadEmail({
      tutorName: 'Zhanie Support',
      subjects: lead8.subjects,
      classLevel: lead8.classLevel,
      city: lead8.area || lead8.city || 'Anand Niketan, South Delhi',
      teachingMode: lead8.mode as any,
      coinCost: lead8.coinCost,
      leadUrl: 'https://apnatutorhub.com/tutor/leads',
    });
    console.log(`Email HTML generated (${emailHtml.length} bytes)`);
  }
}

previewNotifications().catch(console.error).finally(() => prisma.$disconnect());
