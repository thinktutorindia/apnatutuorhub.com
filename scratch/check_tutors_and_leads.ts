import { prisma } from '../lib/prisma';

async function main() {
  const tutorCount = await prisma.tutorProfile.count();
  const parentCount = await prisma.parentProfile.count();
  const leadCount = await prisma.lead.count();
  const userCount = await prisma.user.count();

  console.log('=== DATABASE INVENTORY ===');
  console.log('Total Users:', userCount);
  console.log('Tutor Profiles:', tutorCount);
  console.log('Parent Profiles:', parentCount);
  console.log('Primary Leads in DB:', leadCount);

  // Active / Verified Tutors
  const approvedKycTutors = await prisma.tutorProfile.count({ where: { kycStatus: 'APPROVED' } });
  const verifiedTutors = await prisma.tutorProfile.count({ where: { isVerified: true } });
  const tutorsWithCoords = await prisma.tutorProfile.count({
    where: { latitude: { not: null }, longitude: { not: null } }
  });
  console.log('Approved KYC Tutors:', approvedKycTutors);
  console.log('Verified Tutors:', verifiedTutors);
  console.log('Tutors with GPS Coordinates:', tutorsWithCoords);

  // Check Web Push subscriptions or notification deliveries
  console.log('\n=== NOTIFICATION INFRASTRUCTURE ===');
  const webPushEnv = {
    VAPID_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'Not Set',
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'Not Set'
  };
  console.log('Environment configuration:', webPushEnv);

  // Check how many users have push subscriptions
  // Let's check user table or notification table
  const notifCount = await prisma.notification.count();
  const notifDeliveryCount = await prisma.notificationDelivery.count();
  console.log('Total in-app notifications created so far:', notifCount);
  console.log('Total notification delivery attempts so far:', notifDeliveryCount);

  // Check how many tutors are in Delhi NCR
  const delhiNcrTutors = await prisma.tutorProfile.findMany({
    select: {
      id: true,
      userId: true,
      city: true,
      locality: true,
      subjects: true,
      classLevels: true,
      teachingMode: true,
      teachingRadius: true,
      latitude: true,
      longitude: true,
      kycStatus: true,
      isVerified: true,
      user: { select: { name: true, email: true, phone: true } }
    }
  });
  console.log(`\nLoaded ${delhiNcrTutors.length} Total Tutors in Database.`);

  // Sample tutor locations
  console.log('\nSample Tutor Profiles (first 10):');
  delhiNcrTutors.slice(0, 10).forEach((t, i) => {
    console.log(`  ${i+1}. ${t.user.name} (${t.user.email}) | City: ${t.city} | Locality: ${t.locality} | Coords: [${t.latitude}, ${t.longitude}] | Radius: ${t.teachingRadius}km | Mode: ${t.teachingMode} | KYC: ${t.kycStatus}`);
  });
}

main().catch(console.error);
