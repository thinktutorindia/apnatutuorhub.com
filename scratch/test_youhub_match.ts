import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';
import { isLeadMatchedToTutor } from '../lib/feed-matching';

async function testYouHub() {
  const tutor = await prisma.tutorProfile.findFirst({
    where: { user: { email: 'youhubteam@gmail.com' } },
    include: { user: true }
  });
  if (!tutor) return console.log('Tutor not found');

  console.log('Tutor Profile:');
  console.log('Location:', tutor.city, tutor.address, tutor.latitude, tutor.longitude);
  console.log('Radius:', tutor.teachingRadius, 'km');
  console.log('Subjects:', tutor.subjects);
  console.log('Mode:', tutor.teachingMode);

  const leads = await prisma.lead.findMany({
    where: { status: { in: ['ACTIVE', 'MATCHING'] } },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const matched = [];
  let nearbyCount = 0;
  for (const lead of leads) {
    let distanceKm = null;
    if (tutor.latitude && tutor.longitude && lead.latitude && lead.longitude) {
      distanceKm = haversineDistanceKm(tutor.latitude, tutor.longitude, lead.latitude, lead.longitude);
    }

    const isDist = lead.mode === 'ONLINE' || (distanceKm !== null && distanceKm <= (tutor.teachingRadius || 10));
    if (isDist) nearbyCount++;

    const isMatched = isLeadMatchedToTutor({
      lead: {
        distanceKm,
        mode: lead.mode,
        subjects: lead.subjects,
        classLevel: lead.classLevel,
        tutorGenderPref: lead.tutorGenderPref
      },
      tutorSubjects: tutor.subjects,
      tutorClassLevels: tutor.classLevels,
      teachingRadius: tutor.teachingRadius || 10,
      hasTutorLocation: Boolean(tutor.latitude && tutor.longitude)
    });

    if (isMatched) {
      matched.push({
        inquiryNumber: lead.inquiryNumber,
        classLevel: lead.classLevel,
        subjects: lead.subjects,
        mode: lead.mode,
        area: lead.area,
        distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : 'Online',
        genderPref: lead.tutorGenderPref
      });
    }
  }

  console.log('\n--- RESULTS ---');
  console.log('Total Leads In Feed:', leads.length);
  console.log('Nearby in Radius (<= 10km or Online):', nearbyCount);
  console.log('Matched for YouHub (<= 10km + Subjects/Grade):', matched.length);
  console.table(matched);
}

testYouHub().catch(console.error).finally(() => prisma.$disconnect());
