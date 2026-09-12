import { prisma } from '../lib/prisma';

async function verify() {
  const count = await prisma.lead.count({
    where: { notes: { contains: 'TODAY_PARENTS_SEP_2026' } }
  });
  console.log('Total Leads with TODAY_PARENTS_SEP_2026:', count);

  const totalAllLeads = await prisma.lead.count();
  console.log('Total Leads in Database:', totalAllLeads);

  const parents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      parentProfile: { select: { id: true, _count: { select: { leads: true } } } }
    }
  });
  console.log('\n=== PARENT ACCOUNTS IN DB ===');
  console.table(parents.map(p => ({
    userId: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    profileId: p.parentProfile?.id,
    leadsCount: p.parentProfile?._count.leads || 0
  })));

  const recentSessions = await prisma.session.findMany({
    take: 5,
    orderBy: { expires: 'desc' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  console.log('\n=== RECENT ACTIVE SESSIONS (WHO IS LOGGED IN) ===');
  console.table(recentSessions.map(s => ({
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    role: s.user.role,
    expires: s.expires
  })));
}

verify().catch(console.error);

