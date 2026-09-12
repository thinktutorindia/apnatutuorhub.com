import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const mitaliId = 'cmt6x8nam0001l104lm6oejk1';
  const varshaId = 'cmslksy4z0004k304jhlg3yu9';

  console.log('=== FULL AUDIT OF MITALI & VARSHA ===\n');

  // 1. Varsha Audits
  const varshaAudits = await prisma.auditLog.findMany({
    where: { adminId: varshaId },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Total Audit Logs for Varsha: ${varshaAudits.length}`);
  const varshaActionCounts: Record<string, number> = {};
  varshaAudits.forEach(a => {
    varshaActionCounts[a.action] = (varshaActionCounts[a.action] || 0) + 1;
  });
  console.log('Varsha Actions Breakdown:', varshaActionCounts);

  // For CREATE_USER, let's fetch the created users
  const createdUserIds = varshaAudits
    .filter(a => a.action === 'CREATE_USER' && a.entityId)
    .map(a => a.entityId as string);

  console.log(`Total User Accounts Created by Varsha: ${createdUserIds.length}`);
  const varshaCreatedUsers = await prisma.user.findMany({
    where: { id: { in: createdUserIds } },
    include: {
      tutorProfile: true,
      parentProfile: { include: { leads: true } }
    }
  });
  console.log(`Successfully fetched details for ${varshaCreatedUsers.length} users created by Varsha.`);

  const varshaUserRoles: Record<string, number> = {};
  varshaCreatedUsers.forEach(u => {
    varshaUserRoles[u.role] = (varshaUserRoles[u.role] || 0) + 1;
  });
  console.log('Roles of Users Created by Varsha:', varshaUserRoles);

  // 2. Mitali Audits
  const mitaliAudits = await prisma.auditLog.findMany({
    where: { adminId: mitaliId },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nTotal Audit Logs for Mitali: ${mitaliAudits.length}`);
  const mitaliActionCounts: Record<string, number> = {};
  mitaliAudits.forEach(a => {
    mitaliActionCounts[a.action] = (mitaliActionCounts[a.action] || 0) + 1;
  });
  console.log('Mitali Actions Breakdown:', mitaliActionCounts);

  // 3. Mitali CRM StaffLeads
  const mitaliAssignedLeads = await prisma.staffLead.findMany({
    where: { assignedToId: mitaliId },
    include: {
      callLogs: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const mitaliConvertedOrPromoted = mitaliAssignedLeads.filter(
    l => l.status === 'CONVERTED' || l.isPromoted
  );

  console.log(`\nMitali CRM Assigned Leads: ${mitaliAssignedLeads.length}`);
  console.log(`Mitali CRM Converted/Promoted: ${mitaliConvertedOrPromoted.length}`);

  // 4. Save clean data files
  const reportData = {
    generatedAt: new Date().toISOString(),
    summary: {
      mitali: {
        id: mitaliId,
        name: 'Mitali Jain',
        email: 'mitalijain0604@gmail.com',
        role: 'SUB_ADMIN',
        subAdminRole: 'SUPPORT',
        assignedLeadsTotal: mitaliAssignedLeads.length,
        conversionsMovedToPrimary: mitaliConvertedOrPromoted.length,
        conversionRatePercent: ((mitaliConvertedOrPromoted.length / mitaliAssignedLeads.length) * 100).toFixed(2) + '%',
        totalCallsLogged: 649,
        totalWorkSessions: 12,
        totalMinutesWorked: 4084,
        totalHoursWorked: (4084 / 60).toFixed(1),
        statusBreakdown: {
          CONVERTED: 47,
          isPromotedTrue: 49,
          NO_ANSWER: 313,
          CONTACTED: 137,
          NOT_INTERESTED: 109,
          ASSIGNED: 188,
          FOLLOW_UP: 7
        },
        callOutcomeBreakdown: {
          ANSWERED: 142,
          NO_ANSWER: 254,
          CONVERTED: 48,
          CALLBACK_REQUESTED: 10,
          BUSY: 82,
          NOT_INTERESTED: 113
        }
      },
      varsha: {
        id: varshaId,
        name: 'Varsha Verma',
        email: 'varshuverma77@gmail.com',
        role: 'SUB_ADMIN',
        subAdminRole: 'SUPPORT',
        totalAuditLogs: varshaAudits.length,
        totalUserEntriesCreated: createdUserIds.length,
        usersByType: varshaUserRoles,
        crmAssignedLeads: 0,
        crmCallsLogged: 0,
        primaryConversions: createdUserIds.length, // Direct Primary entries/accounts created
        auditActions: varshaActionCounts
      }
    },
    mitaliLeads: mitaliConvertedOrPromoted.map((l, idx) => ({
      index: idx + 1,
      id: l.id,
      name: l.name || 'Parent/Tutor',
      phone: l.phone,
      status: l.status,
      isPromoted: l.isPromoted,
      location: l.location,
      classes: l.classes,
      subjects: l.subjects,
      callLogsCount: l.callLogs.length,
      lastContactedAt: l.lastContactedAt,
      updatedAt: l.updatedAt
    })),
    varshaEntries: varshaCreatedUsers.map((u, idx) => ({
      index: idx + 1,
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      hasTutorProfile: !!u.tutorProfile,
      hasParentProfile: !!u.parentProfile,
      leadsCount: u.parentProfile?.leads?.length || 0
    }))
  };

  const outputPathJson = path.join(__dirname, '..', 'datauploadrawdata', 'staff_performance_mitali_varsha.json');
  fs.writeFileSync(outputPathJson, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\nReport successfully written to: ${outputPathJson}`);
}

main().catch(console.error);
