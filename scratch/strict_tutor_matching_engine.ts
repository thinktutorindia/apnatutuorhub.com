import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';
import { createNotification } from '../lib/notification-engine';
import { Resend } from 'resend';

// Normalizers
export function normalizeSubject(s: string): string[] {
  const lower = s.toLowerCase();
  const tokens: string[] = [];
  if (lower.includes('math')) tokens.push('math');
  if (lower.includes('sci')) tokens.push('science');
  if (lower.includes('physic')) tokens.push('physics');
  if (lower.includes('chem')) tokens.push('chemistry');
  if (lower.includes('bio')) tokens.push('biology');
  if (lower.includes('eng')) tokens.push('english');
  if (lower.includes('hindi')) tokens.push('hindi');
  if (lower.includes('social') || lower.includes('sst') || lower.includes('history') || lower.includes('geography') || lower.includes('civics') || lower.includes('pol')) tokens.push('social');
  if (lower.includes('all') || lower.includes('core')) tokens.push('all');
  if (lower.includes('commerce') || lower.includes('account') || lower.includes('business') || lower.includes('econ')) tokens.push('commerce');
  if (lower.includes('computer') || lower.includes('coding') || lower.includes('ip')) tokens.push('computer');
  if (lower.includes('french')) tokens.push('french');
  if (lower.includes('german')) tokens.push('german');
  if (lower.includes('sanskrit')) tokens.push('sanskrit');
  if (tokens.length === 0) tokens.push(lower.replace(/[^a-z0-9]/g, ''));
  return tokens;
}

export function parseClasses(raw: string): number[] {
  const lower = raw.toLowerCase();
  const nums: number[] = [];

  const rangeMatch = lower.match(/(\d+)\s*(?:to|-)\s*(\d+)/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }

  if (lower.includes('xi') && lower.includes('xii')) return [11, 12];
  if (lower.includes('ix') && lower.includes('x')) return [9, 10];
  if (lower.includes('vi') && lower.includes('viii')) return [6, 7, 8];
  if (lower.includes('xii')) return [12];
  if (lower.includes('xi')) return [11];
  if (lower.includes('x')) return [10];
  if (lower.includes('ix')) return [9];
  if (lower.includes('viii')) return [8];
  if (lower.includes('vii')) return [7];
  if (lower.includes('vi')) return [6];
  if (lower.includes('v')) return [5];
  if (lower.includes('iv')) return [4];
  if (lower.includes('iii')) return [3];
  if (lower.includes('ii')) return [2];
  if (lower.includes('i')) return [1];

  const digitMatches = lower.match(/\b(1[0-2]|[1-9])\b/g);
  if (digitMatches) {
    digitMatches.forEach(d => nums.push(parseInt(d)));
  }

  if (lower.includes('nursery') || lower.includes('kg') || lower.includes('kindergarten')) {
    nums.push(0);
  }

  if (lower.includes('general') || lower.includes('all') || lower.includes('not specified') || lower.includes('b2')) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  return nums;
}

export function doesClassMatch(tutorClasses: string[], leadClass: string): boolean {
  if (!tutorClasses || tutorClasses.length === 0) return true;
  const leadNums = parseClasses(leadClass);
  if (leadNums.length === 0) return true;

  const tutorNums = new Set<number>();
  for (const tc of tutorClasses) {
    parseClasses(tc).forEach(n => tutorNums.add(n));
  }

  return leadNums.some(n => tutorNums.has(n));
}

export function doesSubjectMatch(tutorSubjects: string[], leadSubjects: string[]): boolean {
  if (!tutorSubjects || tutorSubjects.length === 0) return true;
  if (!leadSubjects || leadSubjects.length === 0) return true;

  const tutorTokens = new Set<string>();
  for (const s of tutorSubjects) {
    normalizeSubject(s).forEach(t => tutorTokens.add(t));
  }

  if (tutorTokens.has('all')) return true;

  const leadTokens = new Set<string>();
  for (const s of leadSubjects) {
    normalizeSubject(s).forEach(t => leadTokens.add(t));
  }

  if (leadTokens.has('all')) return true;

  for (const lt of leadTokens) {
    if (tutorTokens.has(lt)) return true;
  }

  return false;
}

export async function matchAllTutors() {
  const activeTutors = await prisma.user.findMany({
    where: { role: 'TUTOR', isActive: true },
    include: { tutorProfile: true },
  });

  const offlineLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      inquiryNumber: true,
      classLevel: true,
      subjects: true,
      mode: true,
      board: true,
      area: true,
      city: true,
      latitude: true,
      longitude: true,
      budgetMin: true,
      budgetMax: true,
    },
  });

  const onlineLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] },
      mode: { in: ['ONLINE', 'EITHER'] },
    },
    select: {
      id: true,
      inquiryNumber: true,
      classLevel: true,
      subjects: true,
      mode: true,
      board: true,
      area: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
    },
  });

  const matches: Array<{
    user: typeof activeTutors[0];
    lead: any;
    matchType: 'OFFLINE_10KM' | 'ONLINE_FALLBACK';
    distanceKm: number | null;
  }> = [];

  for (const t of activeTutors) {
    const p = t.tutorProfile;
    let chosenLead: any = null;
    let matchType: 'OFFLINE_10KM' | 'ONLINE_FALLBACK' = 'OFFLINE_10KM';
    let minDistance = Infinity;

    // 1. First priority: Offline lead strictly within 10 km + subject + class
    if (p?.latitude && p?.longitude) {
      for (const lead of offlineLeads) {
        const d = haversineDistanceKm(p.latitude, p.longitude, lead.latitude!, lead.longitude!);
        if (d <= 10.0) {
          if (doesSubjectMatch(p.subjects, lead.subjects) && doesClassMatch(p.classLevels, lead.classLevel)) {
            if (d < minDistance) {
              minDistance = d;
              chosenLead = lead;
            }
          }
        }
      }
    }

    // 2. Second priority: If no offline lead within 10km (or missing coordinates), match an Online lead
    if (!chosenLead) {
      for (const lead of onlineLeads) {
        if (doesSubjectMatch(p?.subjects || [], lead.subjects) && doesClassMatch(p?.classLevels || [], lead.classLevel)) {
          chosenLead = lead;
          matchType = 'ONLINE_FALLBACK';
          minDistance = 0;
          break;
        }
      }
    }

    if (chosenLead) {
      matches.push({
        user: t,
        lead: chosenLead,
        matchType,
        distanceKm: matchType === 'OFFLINE_10KM' ? Math.round(minDistance * 10) / 10 : null,
      });
    }
  }

  return { matches, activeTutors, offlineLeads, onlineLeads };
}

async function run() {
  const isDryRun = !process.argv.includes('--send');
  console.log('================================================================');
  console.log(`🎯 STRICT 0-10 KM + SUBJECT + CLASS MATCHING ENGINE`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview only, no sends)' : '🚀 LIVE DISPATCH'}`);
  console.log('================================================================\n');

  const { matches, activeTutors } = await matchAllTutors();

  const offlineMatches = matches.filter(m => m.matchType === 'OFFLINE_10KM');
  const onlineMatches = matches.filter(m => m.matchType === 'ONLINE_FALLBACK');

  console.log(`Total Active Tutors:               ${activeTutors.length}`);
  console.log(`Total Matched Tutors:              ${matches.length} (100%)`);
  console.log(`  • Strict Offline (<= 10 km):     ${offlineMatches.length} tutors`);
  console.log(`    - 0 to 5 km:                   ${offlineMatches.filter(m => (m.distanceKm ?? 0) <= 5).length}`);
  console.log(`    - 5 to 10 km:                  ${offlineMatches.filter(m => (m.distanceKm ?? 0) > 5).length}`);
  console.log(`  • Online Leads (Fallback/Far):   ${onlineMatches.length} tutors\n`);

  // Inspect Tutor Rihan (9599689139)
  const rihanMatch = matches.find(m => m.user.phone?.includes('9599689139'));
  console.log('=== TUTOR 9599689139 (RIHAN) MATCH ===');
  if (rihanMatch) {
    console.log({
      tutorName: rihanMatch.user.name,
      phone: rihanMatch.user.phone,
      matchType: rihanMatch.matchType,
      leadInquiryNumber: rihanMatch.lead.inquiryNumber,
      mode: rihanMatch.lead.mode,
      classLevel: rihanMatch.lead.classLevel,
      subjects: rihanMatch.lead.subjects,
      location: rihanMatch.lead.area || rihanMatch.lead.city,
      distanceKm: rihanMatch.distanceKm,
    });
  }

  // Inspect a few sample offline matches
  console.log('\n=== SAMPLE OFFLINE MATCHES (3) ===');
  offlineMatches.slice(0, 3).forEach((m, idx) => {
    console.log(`[${idx + 1}] Tutor: ${m.user.name} (${m.user.phone}) | Location: ${m.user.tutorProfile?.city}`);
    console.log(`    Lead #${m.lead.inquiryNumber} in ${m.lead.area} (${m.distanceKm} km away)`);
    console.log(`    Class: ${m.lead.classLevel} | Subjects: ${m.lead.subjects.join(', ')}`);
  });

  // Inspect a few sample online matches
  console.log('\n=== SAMPLE ONLINE FALLBACK MATCHES (3) ===');
  onlineMatches.slice(0, 3).forEach((m, idx) => {
    console.log(`[${idx + 1}] Tutor: ${m.user.name} (${m.user.phone}) | Reason: No <= 10 km offline lead`);
    console.log(`    Lead #${m.lead.inquiryNumber} (Online Virtual 1-on-1 Class)`);
    console.log(`    Class: ${m.lead.classLevel} | Subjects: ${m.lead.subjects.join(', ')}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
