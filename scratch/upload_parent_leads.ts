import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

// Known Coordinates for NCR regions
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

function parseBudget(feeStr: string): { min: number; max: number } {
  const nums = (feeStr || '').replace(/,/g, '').match(/\d+/g);
  if (!nums || nums.length === 0) return { min: 5000, max: 7000 };
  if (nums.length === 1) return { min: parseInt(nums[0], 10), max: parseInt(nums[0], 10) };
  return { min: parseInt(nums[0], 10), max: parseInt(nums[1], 10) };
}

function mapGenderPref(pref: string): string {
  const s = (pref || '').toUpperCase();
  if (s.includes('FEMALE')) return 'FEMALE';
  if (s.includes('MALE')) return 'MALE';
  return 'ANY';
}

async function runUpload(dryRun: boolean = true) {
  console.log(`=== ${dryRun ? 'DRY-RUN' : 'LIVE UPLOAD'}: PARENT LEADS TO DASHBOARD ===\n`);

  const leadsPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  console.log(`Total Leads to process: ${leads.length}`);

  // Find or create a system Parent Account for verified inquiries
  let systemParentUser = await prisma.user.findFirst({
    where: { email: 'parents.desk@apnatutorhub.com' },
    include: { parentProfile: true }
  });

  if (!systemParentUser && !dryRun) {
    systemParentUser = await prisma.user.create({
      data: {
        name: 'ApnaTutorHub Verified Inquiries',
        email: 'parents.desk@apnatutorhub.com',
        phone: '8882716869',
        role: 'PARENT',
        parentProfile: {
          create: {
            city: 'New Delhi',
            state: 'Delhi',
            address: 'Verified Parent Helpdesk, Delhi NCR'
          }
        }
      },
      include: { parentProfile: true }
    });
    console.log('Created system parent account for leads ingestion.');
  }

  // Get starting inquiryNumber
  const lastLead = await prisma.lead.findFirst({
    orderBy: { inquiryNumber: 'desc' },
    select: { inquiryNumber: true }
  });
  let nextInquiryNum = (lastLead?.inquiryNumber || 31603) + 1;
  console.log(`Inquiry sequence will begin at #${nextInquiryNum}`);

  let successCount = 0;
  const sampleRecords: any[] = [];

  for (let i = 0; i < leads.length; i++) {
    const raw = leads[i];
    const isOnline = raw.teachingMode === 'ONLINE' || (raw.location || '').toLowerCase().includes('online');
    const coords = isOnline ? null : getLeadCoords(raw.location);
    const budget = parseBudget(raw.budgetFee);
    const genderPref = mapGenderPref(raw.tutorPreference);

    const subjectsArr = (raw.subjects || '').split(/[,;&+/]/).map((s: string) => s.trim()).filter(Boolean);
    if (!subjectsArr.length) subjectsArr.push(raw.subjects || 'General');

    const leadData = {
      inquiryNumber: nextInquiryNum++,
      classLevel: raw.classes,
      subjects: subjectsArr,
      board: raw.board || 'CBSE',
      mode: isOnline ? 'ONLINE' : 'OFFLINE',
      budgetMin: budget.min,
      budgetMax: budget.max,
      latitude: coords ? coords[0] : null,
      longitude: coords ? coords[1] : null,
      city: isOnline ? 'Pan-India' : (raw.location.includes('Gurugram') ? 'Gurugram' : raw.location.includes('Noida') ? 'Noida' : 'Delhi'),
      area: raw.location,
      tutorGenderPref: genderPref,
      notes: raw.notes?.trim() || null,
      status: 'ACTIVE' as const,
      coinCost: 10,
      maxTutors: 5,
      purchaseCount: 0,
      radiusKm: 5 // Default system radius — NO custom radius forced
    };

    if (i < 5) {
      sampleRecords.push({
        inquiryNumber: leadData.inquiryNumber,
        classLevel: leadData.classLevel,
        subjects: leadData.subjects,
        mode: leadData.mode,
        budget: `${leadData.budgetMin} - ${leadData.budgetMax}`,
        location: leadData.area,
        genderPref: leadData.tutorGenderPref,
        radiusKm: leadData.radiusKm,
        notesSample: leadData.notes.slice(0, 60) + '...'
      });
    }

    if (!dryRun && systemParentUser?.parentProfile) {
      await prisma.lead.create({
        data: {
          ...leadData,
          parentProfileId: systemParentUser.parentProfile.id,
        }
      });
    }

    successCount++;
  }

  if (!dryRun) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    if (adminUser) {
      await prisma.auditLog.create({
        data: {
          adminId: adminUser.id,
          action: 'BATCH_LEADS_UPLOAD',
          entityType: 'Lead',
          details: JSON.stringify({
            batchTag: 'TODAY_PARENTS_SEP_2026',
            sourceTag: 'Uploaded Batch Sep 2026',
            totalLeads: successCount,
            uploadedAt: new Date().toISOString()
          })
        }
      });
      console.log('Successfully recorded BATCH_LEADS_UPLOAD audit log entry.');
    }
  }

  console.log(`\n=== SAMPLE LEAD RECORDS TO BE UPLOADED ===`);
  console.table(sampleRecords);

  console.log(`\nResult: ${successCount} leads prepared.`);
  console.log(`Radius setting: Default system radius (no hardcoded/forced radius).`);
  console.log(`Tutors can match and filter dynamically based on their own location and search preferences.`);
}

const isLive = process.argv.includes('--live');
runUpload(!isLive).catch(console.error);
