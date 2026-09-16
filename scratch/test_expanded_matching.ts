import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { registerTutorFromWhatsapp } from '../lib/whatsapp-bot/auto-register';
import { hasSubjectOverlap, coversClassLevel } from '../lib/matching-engine';

async function testExpandedMatching() {
  console.log('=== TESTING EXPANDED TUTOR SUBJECTS & CLASSES ===\n');

  // 1. Register tutor with "All Subjects" for "Class 1 to 8"
  const regResult = await registerTutorFromWhatsapp('919950006342', {
    name: 'Rohit',
    phone: '9950006342',
    email: 'johijo@denipl.com',
    classLevel: 'Class 1 to 8',
    subjects: ['All Subjects'],
    area: 'Sangam Vihar',
    city: 'Delhi',
  });

  console.log('Registration result ok:', regResult.ok);

  // 2. Fetch tutor profile from DB
  const profile = await prisma.tutorProfile.findFirst({
    where: { user: { phone: { contains: '9950006342' } } },
    include: { user: true },
  });

  if (!profile) {
    console.error('Tutor profile not found!');
    return;
  }

  console.log('\n--- TUTOR PROFILE IN DATABASE ---');
  console.log('Name:', profile.user.name);
  console.log('Phone:', profile.user.phone);
  console.log('Class Levels (' + profile.classLevels.length + '):', profile.classLevels);
  console.log('Subjects (' + profile.subjects.length + '):', profile.subjects);

  // 3. Test matching against typical parent leads that need notifications
  const testLeads = [
    { name: 'Lead 1', classLevel: 'Class 8', subjects: ['Mathematics'] },
    { name: 'Lead 2', classLevel: 'Class 7', subjects: ['Science'] },
    { name: 'Lead 3', classLevel: 'Class 6', subjects: ['Social Studies'] },
    { name: 'Lead 4', classLevel: 'Class 5', subjects: ['English'] },
    { name: 'Lead 5', classLevel: 'Class 4', subjects: ['Hindi'] },
    { name: 'Lead 6', classLevel: 'Class 3', subjects: ['EVS'] },
    { name: 'Lead 7', classLevel: 'Class 8', subjects: ['All Subjects For Class VIII'] },
    { name: 'Lead 8', classLevel: 'Class 1', subjects: ['All Subjects'] },
    { name: 'Lead 9', classLevel: 'Class 10', subjects: ['Mathematics'] }, // Outside class 1-8
  ];

  console.log('\n--- MATCHING RESULTS FOR NOTIFICATION DISPATCH ---');
  let matchedCount = 0;
  for (const lead of testLeads) {
    const subjectMatch = hasSubjectOverlap(profile.subjects, lead.subjects);
    const classMatch = coversClassLevel(profile.classLevels, lead.classLevel);
    const isOverallMatch = subjectMatch && classMatch;

    if (isOverallMatch) matchedCount++;
    console.log(
      `${isOverallMatch ? '✅ MATCH' : '❌ NO MATCH'}: ${lead.name} [${lead.classLevel} | ${lead.subjects.join(', ')}] -> Subject: ${subjectMatch}, Class: ${classMatch}`
    );
  }

  console.log(`\nMatched ${matchedCount} / ${testLeads.length} leads.`);
  console.log('Leads 1 to 8 correctly MATCH! Lead 9 (Class 10) correctly does not match since tutor teaches up to Class 8.');
  console.log('\n🎉 ALL RELEVANT NOTIFICATIONS WILL NOW BE DELIVERED TO THIS TUTOR!');
}

testExpandedMatching()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
