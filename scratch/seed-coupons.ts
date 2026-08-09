import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding pre-defined active coupons...");

  const preCoupons = [
    {
      code: "WELCOME50",
      discountType: "FLAT" as const,
      discountAmount: 5000, // ₹50 in paise
      maxDiscountInr: null,
      minOrderInr: 20000, // ₹200 in paise
      usageLimit: 1000,
      isActive: true,
    },
    {
      code: "SUPER100",
      discountType: "FLAT" as const,
      discountAmount: 10000, // ₹100 in paise
      maxDiscountInr: null,
      minOrderInr: 50000, // ₹500 in paise
      usageLimit: 500,
      isActive: true,
    },
    {
      code: "EARLYBIRD20",
      discountType: "PERCENTAGE" as const,
      discountAmount: 20, // 20%
      maxDiscountInr: 20000, // Max ₹200 cap in paise
      minOrderInr: 30000, // ₹300 in paise
      usageLimit: 500,
      isActive: true,
    },
    {
      code: "APNATUTOR25",
      discountType: "PERCENTAGE" as const,
      discountAmount: 25, // 25%
      maxDiscountInr: 50000, // Max ₹500 cap in paise
      minOrderInr: 50000, // ₹500 in paise
      usageLimit: 1000,
      isActive: true,
    },
    {
      code: "NEWJOINING",
      discountType: "FLAT" as const,
      discountAmount: 5000, // ₹50 in paise
      maxDiscountInr: null,
      minOrderInr: 10000, // ₹100 in paise
      usageLimit: 1000,
      isActive: true,
    },
  ];

  for (const c of preCoupons) {
    const coupon = await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        discountType: c.discountType,
        discountAmount: c.discountAmount,
        maxDiscountInr: c.maxDiscountInr,
        minOrderInr: c.minOrderInr,
        usageLimit: c.usageLimit,
        isActive: true,
      },
      create: c,
    });
    console.log(`✅ Pre-seeded Coupon Active: ${coupon.code} (${coupon.discountType})`);
  }

  console.log("All pre-defined coupons successfully seeded and activated!");
}

main()
  .catch((e) => {
    console.error("Error seeding coupons:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
