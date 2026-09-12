import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';
import { isLeadMatchedToTutor } from '../lib/feed-matching';

async function testZhanie() {
  const tutor = await prisma.tutorProfile.findFirst({
    where: { user: { email: 'zhaniesupport@gmail.com' } },
    include: { user: true }
  });

  if (!tutor) return console.log('Tutor not found');

  console.log('Tutor Profile:');
  console.log('Email:', tutor.user.email);
  console.log('Address:', tutor.address);
  console.log('Coords:', tutor.latitude, tutor.longitude);
  console.log('Radius:', tutor.teachingRadius, 'km');
  console.log('Subjects count:', tutor.subjects.length);
  console.log('ClassLevels:', tutor.classLevels);

  const leads = await prisma.lead.findMany({
    where: { status: { in: ['ACTIVE', 'MATCHING'] } },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  let nearbyCount = 0;
  const matched = [];

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

  console.log('\n--- RESULTS FOR ZHANIEL SUPPORT ---');
  console.log('Total Leads In Feed:', leads.length);
  console.log('Nearby in Radius (<= 10km or Online):', nearbyCount);
  console.log('Matched for Zhanie (<= 10km + Class 1-8 All Subjects):', matched.length);
  console.table(matched.slice(0, 10));
}

testZhanie().catch(console.error).finally(() => prisma.$disconnect());
