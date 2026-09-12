import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { haversineDistanceKm } from '../lib/haversine';
import { hasSubjectOverlap } from '../lib/matching-engine';
import { coversClassLevel, isGenderCompatible, isModeCompatible } from '../lib/matching-engine';

async function main() {
  console.log('=== SIMULATING 20KM RADIUS TUTOR MATCHING ===\n');

  // 1. Load the 602 Leads
  const leadsPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  console.log(`Loaded ${leads.length} leads from JSON.`);

  // 2. Load all tutors from DB
  const tutors = await prisma.tutorProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } }
    }
  });
  console.log(`Loaded ${tutors.length} total tutors from database.`);

  const tutorsWithCoords = tutors.filter(t => t.latitude != null && t.longitude != null);
  console.log(`Tutors with valid coordinates: ${tutorsWithCoords.length} / ${tutors.length}`);

  // Known Coordinates for NCR regions (for offline leads)
  const NCR_COORDS: Record<string, [number, number]> = {
    'North Delhi': [28.7041, 77.1025],
    'Model Town': [28.7032, 77.1936],
    'South Delhi': [28.5355, 77.2167],
    'Greater Kailash': [28.5482, 77.2343],
    'Vasant Kunj': [28.5204, 77.1567],
    'Saket': [28.5244, 77.2104],
    'Hauz Khas': [28.5494, 77.2001],
    'Defence Colony': [28.5724, 77.2325],
    'Green Park': [28.5589, 77.2028],
    'Panchsheel': [28.5433, 77.2185],
    'CR Park': [28.5386, 77.2492],
    'Alaknanda': [28.5312, 77.2483],
    'North West Delhi': [28.7234, 77.1215],
    'Rohini': [28.7383, 77.0822],
    'Pitampura': [28.6990, 77.1384],
    'West Delhi': [28.6667, 77.0833],
    'Punjabi Bagh': [28.6685, 77.1321],
    'Rajouri Garden': [28.6475, 77.1221],
    'Janakpuri': [28.6219, 77.0878],
    'Paschim Vihar': [28.6692, 77.0949],
    'South West Delhi': [28.5921, 77.0460],
    'Dwarka': [28.5921, 77.0460],
    'Central Delhi': [28.6448, 77.2167],
    'Civil Lines': [28.6814, 77.2227],
    'Ashok Vihar': [28.6946, 77.1762],
    'Karol Bagh': [28.6514, 77.1907],
    'Gurugram': [28.4595, 77.0266],
    'DLF': [28.4817, 77.0945],
    'Golf Course': [28.4411, 77.1025],
    'Noida': [28.5355, 77.3910],
    'Ghaziabad': [28.6692, 77.4538],
    'Faridabad': [28.4089, 77.3178],
  };

  function getLeadCoords(locationStr: string): [number, number] | null {
    const s = locationStr.toLowerCase();
    for (const [key, coords] of Object.entries(NCR_COORDS)) {
      if (s.includes(key.toLowerCase())) return coords;
    }
    return [28.6139, 77.2090]; // Default New Delhi center
  }

  // Simulation metrics
  let totalMatches = 0;
  const leadMatchCounts: number[] = [];
  const tutorNotificationCount: Record<string, { name: string; email: string; phone: string | null; matches: number }> = {};

  const sampleLeadMatches: any[] = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const isOnline = lead.teachingMode === 'ONLINE' || (lead.location || '').toLowerCase().includes('online');
    const leadCoords = isOnline ? null : getLeadCoords(lead.location);

    const leadSubjects = (lead.subjects || '').split(/[,;&+/]/).map((s: string) => s.trim()).filter(Boolean);
    if (!leadSubjects.length) leadSubjects.push(lead.subjects);

    let matchesForThisLead = 0;

    for (const tutor of tutors) {
      // 1. Gender check
      if (!isGenderCompatible(tutor.gender, lead.tutorPreference)) continue;

      // 2. Mode check
      const leadMode = isOnline ? 'ONLINE' : 'OFFLINE';
      if (!isModeCompatible(tutor.teachingMode, leadMode as any, lead.classes)) continue;

      // 3. Subject check
      if (!hasSubjectOverlap(tutor.subjects, leadSubjects)) continue;

      // 4. Class level check
      if (!coversClassLevel(tutor.classLevels, lead.classes)) continue;

      // 5. 20km Radius Check (if offline)
      if (!isOnline && leadCoords && tutor.latitude != null && tutor.longitude != null) {
        const distKm = haversineDistanceKm(leadCoords[0], leadCoords[1], tutor.latitude, tutor.longitude);
        if (distKm > 20.0) continue; // Must be within 20km radius
      }

      // Match found!
      matchesForThisLead++;
      totalMatches++;

      if (!tutorNotificationCount[tutor.id]) {
        tutorNotificationCount[tutor.id] = {
          name: tutor.user.name || 'Tutor',
          email: tutor.user.email,
          phone: tutor.user.phone,
          matches: 0
        };
      }
      tutorNotificationCount[tutor.id].matches++;
    }

    leadMatchCounts.push(matchesForThisLead);
    if (i < 10) {
      sampleLeadMatches.push({
        leadId: lead.leadId,
        classes: lead.classes,
        subjects: lead.subjects,
        location: lead.location,
        mode: isOnline ? 'ONLINE' : 'OFFLINE (20km radius)',
        matchedTutorsCount: matchesForThisLead
      });
    }
  }

  const uniqueTutorsMatched = Object.keys(tutorNotificationCount).length;
  const avgMatchesPerLead = (totalMatches / leads.length).toFixed(1);

  console.log('\n=== SIMULATION RESULTS (20 KM RADIUS) ===');
  console.log(`Total Leads Processed: ${leads.length}`);
  console.log(`Total Match Associations: ${totalMatches}`);
  console.log(`Average Matching Tutors per Lead: ${avgMatchesPerLead}`);
  console.log(`Unique Tutors Receiving Notifications: ${uniqueTutorsMatched} / ${tutors.length}`);

  console.log('\nSample Leads & Match Counts:');
  console.table(sampleLeadMatches);

  // Top 10 tutors who will receive notifications
  const sortedTutors = Object.values(tutorNotificationCount).sort((a, b) => b.matches - a.matches);
  console.log('\nTop 10 Tutors by Matches:');
  console.table(sortedTutors.slice(0, 10));

  // Check Resend / Email details
  console.log('\n=== EMAIL & WEB PUSH ESTIMATES ===');
  console.log(`Unique Tutors to Email: ${uniqueTutorsMatched}`);
  console.log(`Total Emails if batched daily digest: ${uniqueTutorsMatched} emails`);
  console.log(`Total Emails if sent per match: ${totalMatches} emails (HIGH VOLUME — Recommended to batch into digests or notify top matches per lead!)`);
}

main().catch(console.error);
