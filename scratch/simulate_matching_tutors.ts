import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';

function subjectsMatch(tutorSubjects: string[], leadSubjects: string[]): boolean {
  if (!tutorSubjects?.length || !leadSubjects?.length) return true;
  const leadSubs = leadSubjects.map(s => s.toLowerCase().trim());
  if (leadSubs.some(s => s.includes('all') || s.includes('general') || s.includes('core'))) return true;
  
  return tutorSubjects.some(ts => {
    const tsClean = ts.toLowerCase().trim();
    return leadSubs.some(ls => ls.includes(tsClean) || tsClean.includes(ls));
  });
}

function genderMatches(pref: string | null, tutorGender: string | null): boolean {
  if (!pref || pref === 'ANY') return true;
  if (!tutorGender) return true;
  return pref.toUpperCase() === tutorGender.toUpperCase();
}

async function runDetailedSimulation() {
  console.log('=== DETAILED MATCHING SIMULATION: 10 KM RADIUS, MAX 1 LEAD PER TUTOR ===\n');

  // 1. Fetch tutors
  const tutors = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          pushSubscription: true,
          isActive: true
        }
      }
    }
  });

  // 2. Fetch the 602 batch leads
  const leads = await prisma.lead.findMany({
    where: { notes: { contains: 'TODAY_PARENTS_SEP_2026' } },
    select: {
      id: true,
      inquiryNumber: true,
      classLevel: true,
      subjects: true,
      mode: true,
      budgetMin: true,
      budgetMax: true,
      latitude: true,
      longitude: true,
      city: true,
      area: true,
      tutorGenderPref: true,
    }
  });

  const offlineLeads = leads.filter(l => l.mode === 'OFFLINE');
  const onlineLeads = leads.filter(l => l.mode === 'ONLINE');

  console.log(`Database Totals:`);
  console.log(`- Total Tutors: ${tutors.length}`);
  console.log(`- Total Leads: ${leads.length} (${offlineLeads.length} Offline Home Tuition, ${onlineLeads.length} Online Virtual)\n`);

  // Breakdown of Tutors
  const tutorsWithCoords = tutors.filter(t => t.latitude && t.longitude);
  const tutorsWithoutCoords = tutors.filter(t => !t.latitude || !t.longitude);
  console.log(`Tutors Geography:`);
  console.log(`- Tutors with GPS coordinates: ${tutorsWithCoords.length}`);
  console.log(`- Tutors without GPS (Online / City level): ${tutorsWithoutCoords.length}\n`);

  // SCENARIO 1: Strict Local Matching First (<= 10km radius)
  // Distribute leads so multiple leads get matched
  const leadUsage: Record<number, number> = {};
  const matchedList: any[] = [];

  for (const tutor of tutors) {
    if (!tutor.user?.isActive) continue;

    let bestLead: any = null;
    let bestDist: number | null = null;

    // First try: Find local OFFLINE lead within 10 km
    if (tutor.teachingMode !== 'ONLINE' && tutor.latitude && tutor.longitude) {
      for (const lead of offlineLeads) {
        if (!genderMatches(lead.tutorGenderPref, tutor.gender)) continue;
        if (!subjectsMatch(tutor.subjects, lead.subjects)) continue;
        if (!lead.latitude || !lead.longitude) continue;

        const dist = haversineDistanceKm(tutor.latitude, tutor.longitude, lead.latitude, lead.longitude);
        if (dist <= 10) {
          // Check if this lead hasn't been over-assigned (prefer leads with fewer assignments)
          const currentUsage = leadUsage[lead.inquiryNumber] || 0;
          if (bestLead === null || (currentUsage < (leadUsage[bestLead.inquiryNumber] || 0))) {
            bestDist = dist;
            bestLead = lead;
          }
        }
      }
    }

    // Second try: If no offline lead within 10 km, fallback to matching ONLINE lead
    if (!bestLead && (tutor.teachingMode === 'ONLINE' || tutor.teachingMode === 'EITHER')) {
      for (const lead of onlineLeads) {
        if (!genderMatches(lead.tutorGenderPref, tutor.gender)) continue;
        if (!subjectsMatch(tutor.subjects, lead.subjects)) continue;

        const currentUsage = leadUsage[lead.inquiryNumber] || 0;
        if (bestLead === null || (currentUsage < (leadUsage[bestLead.inquiryNumber] || 0))) {
          bestLead = lead;
          bestDist = null;
        }
      }
    }

    if (bestLead) {
      leadUsage[bestLead.inquiryNumber] = (leadUsage[bestLead.inquiryNumber] || 0) + 1;
      matchedList.push({
        tutorName: tutor.user.name || 'Tutor',
        tutorEmail: tutor.user.email,
        tutorPhone: tutor.user.phone,
        hasPush: !!tutor.user.pushSubscription,
        isGenuineEmail: !tutor.user.email.includes('@apnatutorhub.com') && !tutor.user.email.includes('@athmail.test'),
        leadInquiry: bestLead.inquiryNumber,
        leadClass: bestLead.classLevel,
        leadSubjects: bestLead.subjects,
        leadArea: bestLead.area,
        leadMode: bestLead.mode,
        distanceKm: bestDist !== null ? Math.round(bestDist * 10) / 10 : null,
      });
    }
  }

  const localOfflineMatches = matchedList.filter(m => m.leadMode === 'OFFLINE');
  const onlineMatches = matchedList.filter(m => m.leadMode === 'ONLINE');
  const genuineEmails = matchedList.filter(m => m.isGenuineEmail);
  const pushUsers = matchedList.filter(m => m.hasPush);
  const phoneUsers = matchedList.filter(m => m.tutorPhone);

  console.log('=== FINAL DISPATCH CALCULATIONS ===');
  console.log(`🎯 TOTAL TUTORS THAT WILL RECEIVE EXACTLY 1 LEAD: ${matchedList.length}`);
  console.log(`   ├─ 📍 Local Offline Home Tuition Matches (≤ 10 km): ${localOfflineMatches.length} tutors`);
  console.log(`   └─ 💻 Online Live 1-on-1 Matches: ${onlineMatches.length} tutors`);
  console.log(`\n📢 DELIVERY CHANNEL BREAKDOWN:`);
  console.log(`   ├─ ✉️ Email Notifications: ${genuineEmails.length} genuine tutor emails (${matchedList.length} total including internal aliases)`);
  console.log(`   ├─ 🔔 Web Push Notifications: ${pushUsers.length} tutors with active device push tokens`);
  console.log(`   └─ 📱 SMS / WhatsApp Notifications: ${phoneUsers.length} tutors with verified mobile numbers`);
  console.log(`\n📋 DISTINCT LEADS DISTRIBUTED: ${Object.keys(leadUsage).length} distinct leads matched\n`);

  console.log('=== LOCAL OFFLINE MATCHES SAMPLE (DISTANCE ≤ 10 KM) ===');
  console.table(localOfflineMatches.slice(0, 8).map(m => ({
    'Tutor': m.tutorName,
    'Phone': m.tutorPhone || 'N/A',
    'Lead #': '#' + m.leadInquiry,
    'Class': m.leadClass,
    'Locality': (m.leadArea || '').slice(0, 35) + '...',
    'Distance': `${m.distanceKm} km`,
    'WebPush': m.hasPush ? 'YES' : 'NO'
  })));
}

runDetailedSimulation().catch(console.error).finally(() => prisma.$disconnect());
