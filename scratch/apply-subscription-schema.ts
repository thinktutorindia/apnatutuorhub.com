import { prisma } from "../lib/prisma";

async function applySubscriptionMigration() {
  console.log("Applying subscription schema migration to Supabase DB...");

  try {
    // 1. Create Enum
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
              CREATE TYPE "SubscriptionPlan" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
          END IF;
      END $$;
    `);
    console.log("✓ SubscriptionPlan enum checked/created.");

    // 2. Add columns to tutor_profiles
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "tutor_profiles" 
      ADD COLUMN IF NOT EXISTS "subscriptionPlan" "SubscriptionPlan" DEFAULT 'NONE',
      ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "leadsUsedThisMonth" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "leadsResetAt" TIMESTAMP(3);
    `);
    console.log("✓ Added subscription columns to tutor_profiles table.");

    // 3. Create tutor_subscriptions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "tutor_subscriptions" (
          "id" TEXT NOT NULL,
          "tutorProfileId" TEXT NOT NULL,
          "plan" "SubscriptionPlan" NOT NULL,
          "priceInr" INTEGER NOT NULL,
          "razorpayOrderId" TEXT,
          "razorpayPaymentId" TEXT,
          "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "endDate" TIMESTAMP(3) NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "tutor_subscriptions_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "tutor_subscriptions_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log("✓ Created tutor_subscriptions table.");

    // 4. Create index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "tutor_subscriptions_tutorProfileId_idx" ON "tutor_subscriptions"("tutorProfileId");
    `);
    console.log("✓ Created index on tutor_subscriptions.");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

applySubscriptionMigration();
