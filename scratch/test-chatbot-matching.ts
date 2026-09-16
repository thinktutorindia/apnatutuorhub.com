import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { coversClassLevel, hasSubjectOverlap } from '../lib/matching-engine';
import { expandTutorSubjectsAndClasses } from '../lib/whatsapp-bot/auto-register';

async function main() {
  const expanded = expandTutorSubjectsAndClasses({
    rawSubjects: ['math'],
    rawClassLevel: '11 th and 12 th',
  });

  console.log('Expanded Tutor Profile:');
  console.log('Classes:', expanded.classLevels);
  console.log('Subjects:', expanded.subjects);

  // Fetch leads
  const leads = await prisma.lead.findMany({
    where: { status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] } },
    select: { inquiryNumber: true, classLevel: true, subjects: true, area: true, city: true }
  });

  console.log('\nTotal active leads in DB:', leads.length);

  const matched = leads.filter(l => {
    const classOk = coversClassLevel(expanded.classLevels, l.classLevel);
    const subOk = hasSubjectOverlap(expanded.subjects, l.subjects);
    return classOk && subOk;
  });

  console.log('Matching leads count for Class 11-12 Math:', matched.length);
  for (const m of matched.slice(0, 5)) {
    console.log(` - Lead #${m.inquiryNumber}: ${m.classLevel} (${m.subjects.join(', ')}) at ${m.area}`);
  }
}

main().catch(console.error);
