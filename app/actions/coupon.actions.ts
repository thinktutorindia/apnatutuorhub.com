"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────--

const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .toUpperCase()
    .transform((val) => val.trim()),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  discountAmount: z.number().positive("Discount amount must be positive"),
  maxDiscountInr: z.number().optional().nullable(),
  minOrderInr: z.number().optional().nullable(),
  usageLimit: z.number().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

// ── Admin: Create Coupon ───────────────────────────────────────────────────────

export async function createCouponAction(
  formData: FormData
): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    return actionError("Forbidden: Only Admin or Marketing can create coupons");
  }

  const rawDiscountAmount = Number(formData.get("discountAmount"));
  const discountType = formData.get("discountType") as "PERCENTAGE" | "FLAT";

  // For FLAT type, input is in Rupees -> convert to Paise
  // For PERCENTAGE type, input is percent number (e.g. 20 for 20%)
  const discountAmount =
    discountType === "FLAT" ? Math.round(rawDiscountAmount * 100) : rawDiscountAmount;

  const rawMaxDisc = formData.get("maxDiscountInr");
  const maxDiscountInr = rawMaxDisc ? Math.round(Number(rawMaxDisc) * 100) : null;

  const rawMinOrder = formData.get("minOrderInr");
  const minOrderInr = rawMinOrder ? Math.round(Number(rawMinOrder) * 100) : null;

  const rawUsageLimit = formData.get("usageLimit");
  const usageLimit = rawUsageLimit ? Number(rawUsageLimit) : null;

  const rawExpiresAt = formData.get("expiresAt");
  const expiresAt = rawExpiresAt ? new Date(String(rawExpiresAt)).toISOString() : null;

  const parsed = createCouponSchema.safeParse({
    code: formData.get("code"),
    discountType,
    discountAmount,
    maxDiscountInr,
    minOrderInr,
    usageLimit,
    expiresAt,
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid coupon parameters");
  }

  const existing = await prisma.coupon.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return actionError(`Coupon code "${parsed.data.code}" already exists`);
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      discountType: parsed.data.discountType,
      discountAmount: parsed.data.discountAmount,
      maxDiscountInr: parsed.data.maxDiscountInr ?? null,
      minOrderInr: parsed.data.minOrderInr ?? null,
      usageLimit: parsed.data.usageLimit ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: "CREATE_COUPON",
      entityType: "Coupon",
      entityId: coupon.id,
      details: `Created coupon ${coupon.code} (${coupon.discountType} - ${coupon.discountAmount})`,
    },
  });

  revalidatePath("/admin/coupons");
  return actionSuccess({ id: coupon.id, code: coupon.code });
}

// ── Admin: Toggle Active / Delete ──────────────────────────────────────────────

export async function toggleCouponActiveAction(
  couponId: string
): Promise<ActionResult<{ isActive: boolean }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    return actionError("Forbidden");
  }

  const current = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!current) return actionError("Coupon not found");

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive: !current.isActive },
  });

  revalidatePath("/admin/coupons");
  return actionSuccess({ isActive: updated.isActive });
}

export async function deleteCouponAction(
  couponId: string
): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    return actionError("Forbidden");
  }

  await prisma.coupon.delete({ where: { id: couponId } });

  revalidatePath("/admin/coupons");
  return actionSuccess({ deleted: true });
}

// ── User: Validate & Calculate Discount ────────────────────────────────────────

export type ValidateCouponResult = {
  valid: boolean;
  couponId: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;      // raw discount (e.g. 25 for 25% or 50 for ₹50)
  discountAmountInr: number; // calculated discount in Rupees
  finalAmountInr: number;    // order total after discount in Rupees
  message?: string;
};

export async function validateCouponAction(
  code: string,
  orderAmountInr: number // total in Rupees (e.g. 500)
): Promise<ActionResult<ValidateCouponResult>> {
  const session = await auth();
  if (!session?.user) return actionError("Unauthenticated");

  const cleanCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: cleanCode },
  });

  if (!coupon) {
    return actionError(`Coupon code "${cleanCode}" does not exist`);
  }

  if (!coupon.isActive) {
    return actionError(`Coupon "${cleanCode}" is currently disabled. Please click "Activate Coupon" in Admin > Coupons.`);
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return actionError("This coupon code has expired");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return actionError("Coupon usage limit reached");
  }

  const orderAmountPaise = Math.round(orderAmountInr * 100);

  if (coupon.minOrderInr && orderAmountPaise < coupon.minOrderInr) {
    const minRs = coupon.minOrderInr / 100;
    return actionError(`Minimum order amount of ₹${minRs} required for this coupon`);
  }

  // User usage limit check (max 1 per user)
  const previousUsage = await prisma.couponUsage.findFirst({
    where: { couponId: coupon.id, userId: session.user.id },
  });
  if (previousUsage) {
    return actionError("You have already used this coupon code");
  }

  let discountPaise = 0;
  if (coupon.discountType === "FLAT") {
    discountPaise = coupon.discountAmount; // stored in paise
  } else {
    // Percentage discount
    discountPaise = Math.round((orderAmountPaise * coupon.discountAmount) / 100);
    if (coupon.maxDiscountInr && discountPaise > coupon.maxDiscountInr) {
      discountPaise = coupon.maxDiscountInr;
    }
  }

  // Discount cannot exceed order total
  discountPaise = Math.min(discountPaise, orderAmountPaise);

  const discountAmountInr = discountPaise / 100;
  const finalAmountInr = Math.max(0, orderAmountInr - discountAmountInr);

  return actionSuccess({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountType === "FLAT" ? coupon.discountAmount / 100 : coupon.discountAmount,
    discountAmountInr,
    finalAmountInr,
  });
}

// ── Atomic Coupon Consumption (In Transaction) ─────────────────────────────────

import type { Prisma } from "@prisma/client";

export type ConsumeCouponInput = {
  couponId: string;
  userId: string;
  orderId?: string;
  discountPaise: number;
};

export async function consumeCouponInTx(
  tx: Prisma.TransactionClient,
  input: ConsumeCouponInput
): Promise<ActionResult<{ usageId: string }>> {
  const coupon = await tx.coupon.findUnique({
    where: { id: input.couponId },
  });

  if (!coupon || !coupon.isActive) {
    return actionError("Coupon is inactive or invalid");
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return actionError("Coupon code has expired");
  }

  const existingUserUsage = await tx.couponUsage.findFirst({
    where: { couponId: input.couponId, userId: input.userId },
  });
  if (existingUserUsage) {
    return actionError("You have already used this coupon code");
  }

  const updated = await tx.coupon.updateMany({
    where: {
      id: input.couponId,
      isActive: true,
      ...(coupon.usageLimit !== null
        ? { usedCount: { lt: coupon.usageLimit } }
        : {}),
    },
    data: {
      usedCount: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    return actionError("Coupon global usage limit reached");
  }

  try {
    const usage = await tx.couponUsage.create({
      data: {
        couponId: input.couponId,
        userId: input.userId,
        orderId: input.orderId ?? null,
        discount: input.discountPaise,
      },
    });

    return actionSuccess({ usageId: usage.id });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2002" || err?.message?.includes("Unique constraint")) {
      return actionError("You have already used this coupon code");
    }
    throw error;
  }
}
