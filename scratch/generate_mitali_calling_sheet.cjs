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

  const allAudits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId },
  });

  const createdUserIds = allAudits.filter(a => a.action === 'CREATE_USER').map(a => a.entityId).filter(Boolean);
  const uniqueIds = Array.from(new Set(createdUserIds));

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      tutorProfile: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Exporting ${users.length} users created by Mitali...`);

  const headers = [
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
    'Subscription Plan',
    'Verified',
    'Created At',
  ];

  const rows = [headers.map(escapeCsv).join(',')];

  users.forEach((u, idx) => {
    const tp = u.tutorProfile || {};
    const subjectsStr = Array.isArray(tp.subjects) ? tp.subjects.join(', ') : (tp.subjects || '');
    const classesStr = Array.isArray(tp.classLevels) ? tp.classLevels.join(', ') : (tp.classLevels || '');
    const createdAtStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '';

    rows.push([
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

  const csvContent = rows.join('\r\n');
  const csvPath = path.join(process.cwd(), 'mitali_users_for_varsha.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`Saved CSV to: ${csvPath}`);

  // Summary statistics
  const withPhone = users.filter(u => u.phone && u.phone.trim().length > 0);
  console.log(`Total users: ${users.length}`);
  console.log(`Users with valid phone: ${withPhone.length}`);

  // Output first 5 for preview
  console.log('\n--- Preview of First 5 Users ---');
  users.slice(0, 5).forEach((u, i) => {
    const tp = u.tutorProfile || {};
    console.log(`${i+1}. ${u.name} | Phone: ${u.phone} | City: ${tp.city || 'N/A'} | Sub: ${(tp.subjects || []).slice(0, 3).join(', ')}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
