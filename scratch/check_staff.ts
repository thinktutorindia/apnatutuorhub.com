import { prisma } from '../lib/prisma';

async function main() {
  console.log('=== SYSTEM-WIDE STAFF AUDIT ===\n');

  // 1. All Staff/SubAdmins in User table
  const allStaff = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'SUPER_ADMIN' },
        { role: 'SUB_ADMIN' },
        { subAdminRole: { not: null } }
      ]
    },
    select: { id: true, name: true, email: true, role: true, subAdminRole: true, createdAt: true }
  });
  console.log('All Admin / Sub-Admin Staff Users:');
  console.table(allStaff);

  // 2. Staff Lead Batches
  const batches = await prisma.staffLeadBatch.findMany({
    include: { progress: true, _count: { select: { leads: true } } }
  });
  console.log('\nAll Staff Lead Batches:');
  for (const b of batches) {
    const creator = await prisma.user.findUnique({ where: { id: b.createdById }, select: { name: true, email: true } });
    console.log(`- Batch ID: ${b.id}, Name: "${b.name}", LeadsCount: ${b._count.leads}, TotalParsed: ${b.totalParsed}, TotalJunk: ${b.totalJunk}, Creator: ${creator?.name || 'Unknown'} (${creator?.email || b.createdById})`);
  }

  // 3. Group by assignedToId in StaffLead
  const assignedGrouping = await prisma.staffLead.groupBy({
    by: ['assignedToId'],
    _count: { id: true }
  });
  console.log('\nStaff Leads Grouped by Assignee:');
  for (const g of assignedGrouping) {
    if (g.assignedToId) {
      const u = await prisma.user.findUnique({ where: { id: g.assignedToId }, select: { name: true, email: true } });
      console.log(`  Assignee: ${u?.name} (${u?.email}) [${g.assignedToId}] -> ${g._count.id} leads`);
    } else {
      console.log(`  Unassigned -> ${g._count.id} leads`);
    }
  }

  // 4. Group by createdById in StaffLead
  const createdGrouping = await prisma.staffLead.groupBy({
    by: ['createdById'],
    _count: { id: true }
  });
  console.log('\nStaff Leads Grouped by Creator:');
  for (const g of createdGrouping) {
    const u = await prisma.user.findUnique({ where: { id: g.createdById }, select: { name: true, email: true } });
    console.log(`  Creator: ${u?.name || 'Unknown'} (${u?.email || 'N/A'}) [${g.createdById}] -> ${g._count.id} leads`);
  }

  // 5. Staff Lead Call Logs
  const callerGrouping = await prisma.staffLeadCallLog.groupBy({
    by: ['calledById'],
    _count: { id: true }
  });
  console.log('\nCall Logs Grouped by Caller:');
  for (const g of callerGrouping) {
    const u = await prisma.user.findUnique({ where: { id: g.calledById }, select: { name: true, email: true } });
    console.log(`  Caller: ${u?.name} (${u?.email}) [${g.calledById}] -> ${g._count.id} calls`);
  }

  // 6. Promoted / Converted leads in StaffLead
  const promotedLeads = await prisma.staffLead.findMany({
    where: {
      OR: [
        { isPromoted: true },
        { status: 'CONVERTED' },
        { promotedTutorProfileId: { not: null } }
      ]
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      callLogs: { include: { calledBy: { select: { id: true, name: true, email: true } } } }
    }
  });
  console.log(`\nTotal Promoted / Converted Staff Leads: ${promotedLeads.length}`);
  promotedLeads.forEach(l => {
    console.log(`  Lead: ${l.name} (${l.phone}) - Status: ${l.status}, isPromoted: ${l.isPromoted}, Assignee: ${l.assignedTo?.name || 'None'}, Callers: ${l.callLogs.map(c => c.calledBy.name).join(', ') || 'None'}`);
  });

  // 7. Work Sessions
  const workSessions = await prisma.staffWorkSession.findMany({
    include: { staff: { select: { name: true, email: true } } }
  });
  console.log(`\nTotal Staff Work Sessions: ${workSessions.length}`);
  workSessions.forEach(ws => {
    console.log(`  Staff: ${ws.staff.name} (${ws.staff.email}), Date: ${ws.clockIn}, Mins: ${ws.totalMinutes}, Calls: ${ws.callsMade}, Converted: ${ws.leadsConverted}`);
  });

  // 8. Staff Activity Events
  const activityCount = await prisma.staffActivityEvent.count();
  console.log(`\nTotal Staff Activity Events: ${activityCount}`);
  if (activityCount > 0) {
    const activityGroup = await prisma.staffActivityEvent.groupBy({
      by: ['staffId', 'eventType'],
      _count: { id: true }
    });
    for (const ag of activityGroup) {
      const u = await prisma.user.findUnique({ where: { id: ag.staffId }, select: { name: true, email: true } });
      console.log(`  Staff: ${u?.name} (${u?.email}) - Event: ${ag.eventType} -> ${ag._count.id}`);
    }
  }

  // 9. Target Staff Audit: Mitali & Varsha
  const targetStaff = allStaff.filter(s => s.name?.toLowerCase().includes('mitali') || s.name?.toLowerCase().includes('varsha'));
  console.log('\n=========================================');
  console.log('TARGET AUDIT: MITALI & VARSHA');
  console.log('=========================================');

  for (const staff of targetStaff) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Staff Member: ${staff.name} (${staff.email})`);
    console.log(`User ID: ${staff.id}`);
    console.log(`Role: ${staff.role} | SubAdminRole: ${staff.subAdminRole}`);
    console.log(`Account Created: ${staff.createdAt.toISOString()}`);

    // Call Logs
    const staffCalls = await prisma.staffLeadCallLog.findMany({
      where: { calledById: staff.id },
      include: { lead: true },
      orderBy: { calledAt: 'asc' }
    });
    console.log(`\n[CALL LOGS] Total Calls Logged: ${staffCalls.length}`);
    const outcomeCounts: Record<string, number> = {};
    staffCalls.forEach((c, idx) => {
      outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] || 0) + 1;
      console.log(`  #${idx + 1}: ${c.calledAt.toISOString()} | Lead: ${c.lead?.name || 'N/A'} (${c.lead?.phone}) | Outcome: ${c.outcome} | Notes: "${c.notes || ''}" | Lead Status: ${c.lead?.status} | isPromoted: ${c.lead?.isPromoted}`);
    });
    console.log(`  Outcome Breakdown:`, outcomeCounts);

    // Leads Assigned
    const assigned = await prisma.staffLead.findMany({
      where: { assignedToId: staff.id }
    });
    console.log(`\n[ASSIGNED LEADS] Total: ${assigned.length}`);
    const assignedStatus: Record<string, number> = {};
    let assignedPromoted = 0;
    assigned.forEach(l => {
      assignedStatus[l.status] = (assignedStatus[l.status] || 0) + 1;
      if (l.isPromoted) assignedPromoted++;
    });
    console.log(`  Status Breakdown:`, assignedStatus);
    console.log(`  Promoted to Primary: ${assignedPromoted}`);

    // Leads Created / Entered
    const created = await prisma.staffLead.findMany({
      where: { createdById: staff.id }
    });
    console.log(`\n[CREATED / ENTERED LEADS] Total: ${created.length}`);
    const createdStatus: Record<string, number> = {};
    let createdPromoted = 0;
    created.forEach(l => {
      createdStatus[l.status] = (createdStatus[l.status] || 0) + 1;
      if (l.isPromoted) createdPromoted++;
      console.log(`  Created Lead: ${l.name} (${l.phone}) | Status: ${l.status} | isPromoted: ${l.isPromoted} | Subjects: ${l.subjects} | Classes: ${l.classes}`);
    });
    console.log(`  Status Breakdown:`, createdStatus);
    console.log(`  Promoted to Primary: ${createdPromoted}`);

    // Activity Events
    const events = await prisma.staffActivityEvent.findMany({
      where: { staffId: staff.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    console.log(`\n[ACTIVITY EVENTS] Recent: ${events.length}`);
    events.forEach(e => {
      console.log(`  ${e.createdAt.toISOString()} | Event: ${e.eventType} | Path: ${e.path} | Duration: ${e.durationSeconds}s`);
    });

    // Work Sessions
    const sessions = await prisma.staffWorkSession.findMany({
      where: { staffId: staff.id },
      orderBy: { clockIn: 'desc' }
    });
    console.log(`\n[WORK SESSIONS] Total: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`  ClockIn: ${s.clockIn.toISOString()} | Status: ${s.status} | TotalMins: ${s.totalMinutes} | Calls: ${s.callsMade} | Converted: ${s.leadsConverted}`);
    });
  }
}

main().catch(console.error);
