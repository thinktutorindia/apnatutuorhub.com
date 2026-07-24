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
};

export type LoginFormState = {
  success: boolean;
  error?: string;
};

// ────────────────────────────────────────────────
// Register Action
// ────────────────────────────────────────────────

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  };

  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, role } = parsed.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists",
    };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as "PARENT" | "TUTOR",
    },
  });

  // Create corresponding profile
  if (role === "PARENT") {
    await prisma.parentProfile.create({
      data: { userId: user.id },
    });
  } else if (role === "TUTOR") {
    await prisma.tutorProfile.create({
      data: { userId: user.id },
    });
    // Create wallet for tutor
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id },
    });
    if (tutorProfile) {
      await prisma.wallet.create({
        data: { tutorProfileId: tutorProfile.id },
      });
    }
  }

  return { success: true };
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
      error: "Please check your email and password",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password" };
        default:
          return { success: false, error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
}
