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
      error: "An account with this email already exists. Please log in instead.",
    };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user with the correct role
  const user = await prisma.user.create({
    data: {
      name,
      email,
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
