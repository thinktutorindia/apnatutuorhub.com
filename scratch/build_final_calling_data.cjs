const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""').trim();
  return `"${str}"`;
}

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';

  // 1. Fetch Users created by Mitali
  const audits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId, action: 'CREATE_USER' },
    orderBy: { createdAt: 'desc' },
  });
  const uniqueUserIds = Array.from(new Set(audits.map(a => a.entityId).filter(Boolean)));

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    include: { tutorProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  // Cross reference missing phones with StaffLead table
  for (const u of users) {
    if (!u.phone || !u.phone.trim()) {
      const matchLead = await prisma.staffLead.findFirst({
        where: {
          OR: [
            { email: u.email },
            { name: { equals: u.name, mode: 'insensitive' } },
          ],
        },
      });
      if (matchLead && matchLead.phone) {
        u.phone = matchLead.phone;
        u.phoneSource = 'Matched from StaffLead';
      }
    }
  }

  // Generate User Directory CSV
  const userHeaders = [
    'S.No',
    'Name',
    'Phone',
    'Email',
    'Role',
    'City',
    'Area / Address',
    'Subjects',
    'Classes / Levels',
    'Teaching Mode',
    'Gender',
    'Experience (Years)',
    'Qualification',
    'Min Fee',
    'Max Fee',
    'Plan',
    'Verified',
    'Created At',
  ];

  const userRows = [userHeaders.map(escapeCsv).join(',')];

  users.forEach((u, idx) => {
    const tp = u.tutorProfile || {};
    const subjectsStr = Array.isArray(tp.subjects) ? tp.subjects.join(', ') : (tp.subjects || '');
    const classesStr = Array.isArray(tp.classLevels) ? tp.classLevels.join(', ') : (tp.classLevels || '');
    const createdAtStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '';

    userRows.push([
      idx + 1,
      u.name || '',
      u.phone || '',
      u.email || '',
      u.role || '',
      tp.city || '',
      tp.address || '',
      subjectsStr,
      classesStr,
      tp.teachingMode || '',
      tp.gender || '',
      tp.experience ?? '',
      tp.qualification || '',
      tp.feeMin ?? '',
      tp.feeMax ?? '',
      tp.subscriptionPlan || 'NONE',
      tp.isVerified ? 'Yes' : 'No',
      createdAtStr,
    ].map(escapeCsv).join(','));
  });

  const userCsvPath = path.join(process.cwd(), 'mitali_user_directory_for_varsha.csv');
  fs.writeFileSync(userCsvPath, userRows.join('\r\n'), 'utf8');

  // 2. Fetch Mitali Converted Staff Leads
  const staffLeads = await prisma.staffLead.findMany({
    where: { assignedToId: mitaliId, OR: [{ status: 'CONVERTED' }, { isPromoted: true }] },
    orderBy: { updatedAt: 'desc' },
  });

  const leadHeaders = [
    'S.No',
    'Name',
    'Phone',
    'Email',
    'Status',
    'Location',
    'Classes',
    'Subjects',
    'Mode',
    'Budget',
    'Notes / Remarks',
    'Updated At',
  ];

  const leadRows = [leadHeaders.map(escapeCsv).join(',')];

  staffLeads.forEach((l, idx) => {
    const subjectsStr = Array.isArray(l.subjects) ? l.subjects.join(', ') : (l.subjects || '');
    const classesStr = Array.isArray(l.classes) ? l.classes.join(', ') : (l.classes || '');
    const updatedAtStr = l.updatedAt ? new Date(l.updatedAt).toLocaleDateString('en-IN') : '';

    leadRows.push([
      idx + 1,
      l.name || '',
      l.phone || '',
      l.email || '',
      l.status || '',
      l.location || '',
      classesStr,
      subjectsStr,
      l.teachingMode || '',
      l.budget ? `₹${l.budget}` : '',
      l.remarks || l.leadNote || '',
      updatedAtStr,
    ].map(escapeCsv).join(','));
  });

  const leadCsvPath = path.join(process.cwd(), 'mitali_converted_leads_for_varsha.csv');
  fs.writeFileSync(leadCsvPath, leadRows.join('\r\n'), 'utf8');

  // 3. Combined calling sheet
  const combinedHeaders = [
    'S.No',
    'Source Type',
    'Name',
    'Phone',
    'Email',
    'Location / City',
    'Subjects / Specialization',
    'Classes',
    'Details / Notes',
  ];

  const combinedRows = [combinedHeaders.map(escapeCsv).join(',')];
  let cIdx = 1;

  users.forEach(u => {
    const tp = u.tutorProfile || {};
    const subjectsStr = Array.isArray(tp.subjects) ? tp.subjects.join(', ') : (tp.subjects || '');
    const classesStr = Array.isArray(tp.classLevels) ? tp.classLevels.join(', ') : (tp.classLevels || '');
    const loc = [tp.city, tp.address].filter(Boolean).join(' - ');

    combinedRows.push([
      cIdx++,
      'Database User (Tutor)',
      u.name || '',
      u.phone || '',
      u.email || '',
      loc,
      subjectsStr,
      classesStr,
      `Exp: ${tp.experience ?? 'N/A'} yrs | Qual: ${tp.qualification || 'N/A'} | Mode: ${tp.teachingMode || 'EITHER'}`,
    ].map(escapeCsv).join(','));
  });

  staffLeads.forEach(l => {
    const subjectsStr = Array.isArray(l.subjects) ? l.subjects.join(', ') : (l.subjects || '');
    const classesStr = Array.isArray(l.classes) ? l.classes.join(', ') : (l.classes || '');

    combinedRows.push([
      cIdx++,
      'CRM Staff Lead (Converted)',
      l.name || '',
      l.phone || '',
      l.email || '',
      l.location || '',
      subjectsStr,
      classesStr,
      `Status: ${l.status} | Budget: ${l.budget ? '₹' + l.budget : 'N/A'} | Notes: ${l.remarks || ''}`,
    ].map(escapeCsv).join(','));
  });

  const combinedCsvPath = path.join(process.cwd(), 'mitali_complete_calling_sheet_for_varsha.csv');
  fs.writeFileSync(combinedCsvPath, combinedRows.join('\r\n'), 'utf8');

  // Save JSON data file for rich representation
  const jsonPath = path.join(process.cwd(), 'mitali_users_for_varsha.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ users, staffLeads }, null, 2), 'utf8');

  console.log('Finished successfully!');
  console.log(`- User Directory CSV: ${userCsvPath} (${users.length} records)`);
  console.log(`- Converted Leads CSV: ${leadCsvPath} (${staffLeads.length} records)`);
  console.log(`- Complete Combined CSV: ${combinedCsvPath} (${users.length + staffLeads.length} records)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
