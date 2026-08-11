"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { registerSchema, loginSchema } from "@/lib/validations";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

export type RegisterFormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  role?: string;
};

export type LoginFormState = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

// ────────────────────────────────────────────────
// Register Action
// ────────────────────────────────────────────────

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const rawPhone = String(formData.get("phone") || "").replace(/\D/g, "");

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: rawPhone,
    password: formData.get("password"),
    role: formData.get("role"),
    referralCode: formData.get("referralCode") || undefined,
  };

  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, phone, password, role, referralCode } = parsed.data;

  // Check if email or phone already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    return {
      success: false,
      error: "An account with this email already exists. Please log in instead.",
    };
  }

  const existingPhone = await prisma.user.findFirst({
    where: { phone },
  });

  if (existingPhone) {
    return {
      success: false,
      error: "An account with this mobile number already exists. Please log in instead.",
    };
  }

  // Validate referral code if provided
  let referrer: { id: string } | null = null;
  if (referralCode && referralCode.trim() !== "") {
    referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim().toUpperCase() },
      select: { id: true },
    });
    // Silently ignore invalid codes — don't block registration
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user with the correct role
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: role as "PARENT" | "TUTOR",
    },
  });

  // Create corresponding profile based on role
  if (role === "PARENT") {
    await prisma.parentProfile.create({
      data: { userId: user.id },
    });
  } else if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.create({
      data: { userId: user.id },
    });
    // Create wallet for tutor
    await prisma.wallet.create({
      data: { tutorProfileId: tutorProfile.id },
    });
  }

  // Record referral relationship so rewards can be granted on KYC approval
  if (referrer && referrer.id !== user.id) {
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: user.id,
        code: referralCode!.trim().toUpperCase(),
        status: "PENDING",
        rewardCoins: 50,
        refereeCoins: 25,
      },
    });
  }

  return { success: true, role };
}

// ────────────────────────────────────────────────
// Login Action
// ────────────────────────────────────────────────

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please enter a valid email and password.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    // Look up the user's role to redirect them to the correct dashboard
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { role: true },
    });

    const redirectMap: Record<string, string> = {
      TUTOR: "/tutor/dashboard",
      SUPER_ADMIN: "/admin/dashboard",
      SUB_ADMIN: "/admin/dashboard",
      PARENT: "/parent/dashboard",
    };

    const redirectTo = redirectMap[user?.role ?? "PARENT"] ?? "/parent/dashboard";

    return { success: true, redirectTo };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password. Please try again." };
        default:
          return { success: false, error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
}

// ────────────────────────────────────────────────
// Password Reset Actions
// ────────────────────────────────────────────────

export async function requestPasswordResetAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true, name: true, email: true },
  });

  // Always return success even if user not found to prevent email enumeration attacks
  if (!user) {
    return { success: true };
  }

  // Generate a cryptographically secure 32-byte random token
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.create({
    data: {
      identifier: cleanEmail,
      token,
      expires,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  // Send reset email via Resend
  const { sendEmail } = await import("@/lib/resend-service");
  await sendEmail({
    to: cleanEmail,
    subject: "🔑 Reset Your Password — ApnaTutorHub",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 14px;">Hi ${user.name || "there"},</p>
        <p style="color: #475569; font-size: 14px;">We received a request to reset your password on ApnaTutorHub. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #22c55e; color: #0f172a; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Reset Password →</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { success: true };
}

export async function resetPasswordWithTokenAction(
  token: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || !email || !newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const cleanEmail = email.toLowerCase().trim();

  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: cleanEmail,
      token,
      expires: { gte: new Date() },
    },
  });

  if (!record) {
    return { success: false, error: "This password reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: cleanEmail },
      data: { passwordHash },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    }),
  ]);

  return { success: true };
}

// ────────────────────────────────────────────────
// Role Selection Action (Google OAuth Onboarding)
// ────────────────────────────────────────────────

export async function selectUserRoleAction(
  targetRole: "PARENT" | "TUTOR"
): Promise<{ success: boolean; redirectTo?: string; error?: string }> {
  const { auth: getAuth } = await import("@/auth");
  const session = await getAuth();

  if (!session?.user?.id) {
    return { success: false, error: "Please log in first." };
  }

  const userId = session.user.id;

  if (targetRole === "TUTOR") {
    // Check if tutor profile exists or create it
    let tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile) {
      tutorProfile = await prisma.tutorProfile.create({
        data: { userId },
      });
    }

    // Ensure wallet exists
    const wallet = await prisma.wallet.findUnique({
      where: { tutorProfileId: tutorProfile.id },
    });
    if (!wallet) {
      await prisma.wallet.create({
        data: { tutorProfileId: tutorProfile.id },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: "TUTOR" },
    });

    return { success: true, redirectTo: "/tutor/dashboard" };
  } else {
    // Target role PARENT
    let parentProfile = await prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!parentProfile) {
      parentProfile = await prisma.parentProfile.create({
        data: { userId },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: "PARENT" },
    });

    return { success: true, redirectTo: "/parent/dashboard" };
  }
}
