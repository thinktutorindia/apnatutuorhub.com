import { prisma } from '../lib/prisma';

async function check() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'youhub' } },
        { email: { contains: 'zhanie' } },
        { phone: { contains: '87997' } },
        { phone: { contains: '623078' } },
      ],
    },
    include: {
      tutorProfile: {
        include: {
          wallet: true,
        },
      },
    },
  });

  console.log(`Found ${users.length} users matching query:`);
  for (const u of users) {
    console.log('\n=======================================');
    console.log('ID:', u.id);
    console.log('Email:', u.email);
    console.log('Name:', u.name);
    console.log('Phone:', u.phone);
    console.log('Role:', u.role);
    if (u.tutorProfile) {
      console.log('Tutor Profile ID:', u.tutorProfile.id);
      console.log('City:', u.tutorProfile.city);
      console.log('State:', u.tutorProfile.state);
      console.log('Address:', u.tutorProfile.address);
      console.log('Pincode:', u.tutorProfile.pincode);
      console.log('Latitude:', u.tutorProfile.latitude);
      console.log('Longitude:', u.tutorProfile.longitude);
      console.log('Teaching Radius:', u.tutorProfile.teachingRadius);
      console.log('Subjects:', u.tutorProfile.subjects);
      console.log('Class Levels:', u.tutorProfile.classLevels);
      console.log('Teaching Mode:', u.tutorProfile.teachingMode);
      console.log('Wallet Balance:', u.tutorProfile.wallet?.balance);
    } else {
      console.log('NO TUTOR PROFILE');
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
