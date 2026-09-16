import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';
import { normalizeSubject, parseClasses, doesClassMatch, doesSubjectMatch } from './strict_tutor_matching_engine';

async function main() {
  console.log('=== UPDATING TUTOR PROFILES PER USER INSTRUCTIONS ===\n');

  // 1. Update Lalit (8802111100)
  // Location: Punjabi Bagh, Uttam Nagar, Janakpuri area (West Delhi)
  // Central coordinate: 28.6450, 77.1000 (between Punjabi Bagh, Rajouri Garden, Janakpuri)
  const updatedLalit = await prisma.tutorProfile.update({
    where: { userId: 'cmtpfurfo001jjs04tza57vwc' },
    data: {
      city: 'Punjabi Bagh, Janakpuri, Uttam Nagar',
      address: 'Punjabi Bagh, Janakpuri, Uttam Nagar, West Delhi, Delhi - 110026',
      latitude: 28.6692,
      longitude: 77.1314,
      teachingRadius: 10,
      classLevels: ['Class 11', 'Class 12', 'Class XI', 'Class XII'],
      subjects: ['Geography', 'Political Science', 'Economics', 'Psychology', 'History'],
    },
  });
  console.log('✅ Updated Lalit (8802111100):', {
    city: updatedLalit.city,
    lat: updatedLalit.latitude,
    lng: updatedLalit.longitude,
    classes: updatedLalit.classLevels,
    subjects: updatedLalit.subjects,
  });

  // 2. Update Rihan (9599689139)
  // Location: Yamuna Vihar, Mustafabad, Karawal Nagar area (North East Delhi)
  // Coordinate: 28.7126, 77.2721
  const updatedRihan = await prisma.tutorProfile.update({
    where: { userId: 'cmu1mnuyw000ojs046zh4g7n1' },
    data: {
      city: 'Yamuna Vihar, Mustafabad, Karawal Nagar',
      address: 'Yamuna Vihar, Mustafabad, Karawal Nagar, North East Delhi, Delhi - 110094',
      latitude: 28.7126,
      longitude: 77.2721,
      teachingRadius: 10,
    },
  });
  console.log('✅ Updated Rihan (9599689139):', {
    city: updatedRihan.city,
    lat: updatedRihan.latitude,
    lng: updatedRihan.longitude,
    classes: updatedRihan.classLevels,
    subjects: updatedRihan.subjects,
  });

  // Now find matching leads for both
  const activeLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] },
    },
    select: {
      id: true,
      inquiryNumber: true,
      mode: true,
      classLevel: true,
      subjects: true,
      board: true,
      area: true,
      city: true,
      latitude: true,
      longitude: true,
      budgetMin: true,
      budgetMax: true,
      tutorGenderPref: true,
    },
  });

  console.log(`\nSearching across ${activeLeads.length} active leads...\n`);

  // Matches for Lalit
  console.log('================================================================');
  console.log('🎯 MATCHES FOR LALIT (8802111100) — Punjabi Bagh / Janakpuri / Uttam Nagar');
  console.log('Subjects: Geography, Political Science, Economics, Psychology | Classes: 11, 12');
  console.log('================================================================');
  
  const lalitMatches: any[] = [];
  for (const lead of activeLeads) {
    // Subject & class check
    const subjOk = doesSubjectMatch(updatedLalit.subjects, lead.subjects);
    const classOk = doesClassMatch(updatedLalit.classLevels, lead.classLevel);
    if (!subjOk || !classOk) continue;

    let d: number | null = null;
    if (lead.latitude && lead.longitude && updatedLalit.latitude && updatedLalit.longitude) {
      d = haversineDistanceKm(updatedLalit.latitude, updatedLalit.longitude, lead.latitude, lead.longitude);
    }

    if (lead.mode === 'ONLINE' || (d !== null && d <= 12)) {
      lalitMatches.push({
        inquiryNumber: lead.inquiryNumber,
        mode: lead.mode,
        classLevel: lead.classLevel,
        subjects: lead.subjects,
        area: lead.area || lead.city,
        distanceKm: d !== null ? Math.round(d * 10) / 10 : 'Online (Virtual)',
        budget: `₹${lead.budgetMin} - ₹${lead.budgetMax}`,
      });
    }
  }

  // Sort by distance (offline first)
  lalitMatches.sort((a, b) => {
    if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') return a.distanceKm - b.distanceKm;
    if (typeof a.distanceKm === 'number') return -1;
    return 1;
  });

  console.log(`Total Matches Found for Lalit: ${lalitMatches.length}`);
  console.log(JSON.stringify(lalitMatches.slice(0, 5), null, 2));

  // Matches for Rihan
  console.log('\n================================================================');
  console.log('🎯 MATCHES FOR RIHAN (9599689139) — Yamuna Vihar / Mustafabad / Karawal Nagar');
  console.log('================================================================');
  
  const rihanMatches: any[] = [];
  for (const lead of activeLeads) {
    const subjOk = doesSubjectMatch(updatedRihan.subjects, lead.subjects);
    const classOk = doesClassMatch(updatedRihan.classLevels, lead.classLevel);
    if (!subjOk || !classOk) continue;

    let d: number | null = null;
    if (lead.latitude && lead.longitude && updatedRihan.latitude && updatedRihan.longitude) {
      d = haversineDistanceKm(updatedRihan.latitude, updatedRihan.longitude, lead.latitude, lead.longitude);
    }

    if (lead.mode === 'ONLINE' || (d !== null && d <= 10)) {
      rihanMatches.push({
        inquiryNumber: lead.inquiryNumber,
        mode: lead.mode,
        classLevel: lead.classLevel,
        subjects: lead.subjects,
        area: lead.area || lead.city,
        distanceKm: d !== null ? Math.round(d * 10) / 10 : 'Online (Virtual)',
        budget: `₹${lead.budgetMin} - ₹${lead.budgetMax}`,
      });
    }
  }

  rihanMatches.sort((a, b) => {
    if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') return a.distanceKm - b.distanceKm;
    if (typeof a.distanceKm === 'number') return -1;
    return 1;
  });

  console.log(`Total Matches Found for Rihan: ${rihanMatches.length}`);
  console.log(JSON.stringify(rihanMatches.slice(0, 5), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
