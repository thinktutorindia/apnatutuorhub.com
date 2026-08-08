import "dotenv/config";
import { prisma } from "../lib/prisma";

async function cleanupUsersExceptMain() {
  const targetEmail = "coderrohit2927@gmail.com";

  console.log("==================================================");
  console.log(` CLEANING ALL USERS EXCEPT: ${targetEmail}`);
  console.log("==================================================");

  const mainUser = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true, role: true },
  });

  if (!mainUser) {
    console.log(`User ${targetEmail} not found in database. Searching for all users...`);
  } else {
    console.log(`Found main user: ${mainUser.email} (ID: ${mainUser.id}, Role: ${mainUser.role})`);
  }

  // Delete all users except targetEmail
  console.log(`Deleting all users except ${targetEmail}...`);

  const result = await prisma.user.deleteMany({
    where: {
      email: {
        not: targetEmail,
      },
    },
  });

  console.log(`\nSUCCESSFULLY DELETED ${result.count} USER(S)!`);

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });

  console.log("\nRemaining Users in Database:");
  console.table(remainingUsers);
  console.log("\n==================================================");
  console.log("             CLEANUP COMPLETE");
  console.log("==================================================");
}

cleanupUsersExceptMain().catch(console.error);
