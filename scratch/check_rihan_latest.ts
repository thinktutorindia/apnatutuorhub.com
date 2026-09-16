import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../lib/prisma';
import { haversineDistanceKm } from '../lib/haversine';

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: '9599689139' },
        { phone: '919599689139' },
        { phone: { contains: '9599689139' } },
      ],
    },
    include: {
      tutorProfile: true,
      notifications: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log('User:', {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.tutorProfile?.city,
    address: user.tutorProfile?.address,
    lat: user.tutorProfile?.latitude,
    lng: user.tutorProfile?.longitude,
  });

  console.log('\nLatest Notifications received by this user:');
  user.notifications.forEach((n, idx) => {
    console.log(`\n[Notification ${idx + 1}]`);
    console.log('ID:', n.id);
    console.log('Created At:', n.createdAt);
    console.log('Title:', n.title);
    console.log('Message:', n.message);
    console.log('Channel:', n.channel);
    console.log('Action URL:', n.actionUrl);
  });

  // Calculate which lead was closest to his coordinates
  if (user.tutorProfile?.latitude != null && user.tutorProfile?.longitude != null) {
    const activeLeads = await prisma.lead.findMany({
      where: {
        status: { in: ['ACTIVE', 'MATCHING', 'APPLICATIONS_RECEIVED'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        inquiryNumber: true,
        city: true,
        area: true,
        classLevel: true,
        subjects: true,
        mode: true,
        budgetMin: true,
        budgetMax: true,
        latitude: true,
        longitude: true,
      },
    });

    let closestLead: any = null;
    let minDistance = Infinity;

    for (const lead of activeLeads) {
      const d = haversineDistanceKm(
        user.tutorProfile.latitude,
        user.tutorProfile.longitude,
        lead.latitude!,
        lead.longitude!
      );
      if (d < minDistance) {
        minDistance = d;
        closestLead = lead;
      }
    }

    console.log('\nClosest Matched Lead to his coordinates:');
    console.log({
      inquiryNumber: closestLead.inquiryNumber,
      locality: closestLead.area || closestLead.city,
      classLevel: closestLead.classLevel,
      subjects: closestLead.subjects,
      budget: `₹${closestLead.budgetMin} - ₹${closestLead.budgetMax}`,
      distanceKm: Math.round(minDistance * 10) / 10,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
