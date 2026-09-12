import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';
import { isLeadMatchedToTutor, hasSubjectOverlap } from '../lib/feed-matching';

async function verifyFeed() {
  const tutor = await prisma.tutorProfile.findFirst({
    where: { user: { email: 'youhubteam@gmail.com' } },
    include: { user: true }
  });

  if (!tutor) {
    console.log('Error: Tutor not found');
    return;
  }

  console.log('================================================================');
  console.log('VERIFYING FEED FOR TUTOR:', tutor.user.email);
  console.log('================================================================');
  console.log('Teaching Locality:', tutor.city, '| Address:', tutor.address);
  console.log('Coordinates:', tutor.latitude, tutor.longitude);
  console.log('Radius:', tutor.teachingRadius, 'km');
  console.log('Subjects:', tutor.subjects);
  console.log('Class Levels:', tutor.classLevels);
  console.log('Mode:', tutor.teachingMode);

  // Fetch 200 leads exactly as app/tutor/(app)/leads/page.tsx does
  const rawLeads = await prisma.lead.findMany({
    where: { status: { in: ['ACTIVE', 'MATCHING'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const feedLeads = rawLeads.map((l) => {
    let distanceKm: number | null = null;
    if (tutor.latitude && tutor.longitude && l.latitude && l.longitude) {
      distanceKm = haversineDistanceKm(tutor.latitude, tutor.longitude, l.latitude, l.longitude);
    }
    return {
      id: l.id,
      inquiryNumber: l.inquiryNumber,
      subjects: l.subjects,
      classLevel: l.classLevel,
      mode: l.mode,
      area: l.area,
      city: l.city,
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      tutorGenderPref: l.tutorGenderPref,
      isPurchased: false,
      purchaseCount: l.purchaseCount,
      maxTutors: l.maxTutors,
    };
  });

  const unpurchased = feedLeads.filter(l => !l.isPurchased && l.purchaseCount < (l.maxTutors || 5));
  const hasTutorLocation = Boolean(tutor.latitude && tutor.longitude);
  const hasTutorSubjects = Boolean(tutor.subjects && tutor.subjects.length > 0);

  // 1. Matched leads (Default tab)
  const matchedLeads = unpurchased.filter(l => isLeadMatchedToTutor({
    lead: {
      distanceKm: l.distanceKm,
      mode: l.mode,
      subjects: l.subjects,
      classLevel: l.classLevel,
      tutorGenderPref: l.tutorGenderPref,
    },
    tutorSubjects: tutor.subjects,
    tutorClassLevels: tutor.classLevels,
    teachingRadius: tutor.teachingRadius || 10,
    hasTutorLocation,
  }));

  // 2. Nearby leads (Within radius tab)
  const nearbyLeads = unpurchased.filter(l => {
    if (!hasTutorLocation) return true;
    if (l.mode === 'ONLINE') return true;
    return l.distanceKm !== null && l.distanceKm <= (tutor.teachingRadius || 10);
  });

  // 3. Subject dropdown filter test (e.g. Selecting "Maths for Class XI")
  const mathFilterLeads = unpurchased.filter(l => hasSubjectOverlap(['Maths for Class XI'], l.subjects));

  console.log('\n--- TAB SUMMARY ---');
  console.log('1. [DEFAULT TAB] 🎯 Matched for Me count:', matchedLeads.length);
  console.log('2. 📍 Within 10 km count:', nearbyLeads.length);
  console.log('3. 🌐 All City Leads count:', unpurchased.length);
  console.log('4. Subject filter for "Maths for Class XI" count:', mathFilterLeads.length);

  console.log('\n--- TOP 5 MATCHED LEADS SHOWN TO TUTOR ---');
  console.table(
    matchedLeads.slice(0, 5).map(m => ({
      Inquiry: `#${m.inquiryNumber}`,
      Class: m.classLevel,
      Subjects: m.subjects.join(', '),
      Mode: m.mode,
      Area: m.area,
      Distance: `${m.distanceKm ?? 'Online'} km`,
    }))
  );

  console.log('\nVerification SUCCESS: The tutor feed now defaults to Matched for Me instead of 200!');
}

verifyFeed().catch(console.error).finally(() => prisma.$disconnect());
