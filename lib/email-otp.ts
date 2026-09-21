/**
 * lib/email-otp.ts
 *
 * Secure 6-digit Email OTP Verification Service.
 * Uses PostgreSQL `verification_tokens` table and Resend Email Service.
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend-service";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generate6DigitOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Send an OTP to the given email address for account verification.
 */
export async function sendEmailOtp(
  email: string,
  name?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return { success: false, error: "Invalid email address." };
    }

    // Check rate limit / cooldown: prevent spamming OTPs within 60 seconds
    const existing = await prisma.verificationToken.findFirst({
      where: { identifier: cleanEmail },
      orderBy: { expires: "desc" },
    });

    if (existing) {
      // existing.expires was set to now + 10 mins.
      // If remaining time is greater than 9 mins, it means it was sent less than 60 seconds ago.
      const timeRemainingMs = existing.expires.getTime() - Date.now();
      const minimumAllowedRemainingMs = (OTP_EXPIRY_MINUTES * 60 - RESEND_COOLDOWN_SECONDS) * 1000;
      if (timeRemainingMs > minimumAllowedRemainingMs) {
        const waitSec = Math.ceil((timeRemainingMs - minimumAllowedRemainingMs) / 1000);
        return {
          success: false,
          error: `Please wait ${waitSec} seconds before requesting another code.`,
        };
      }
    }

    // Clean up old tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    const otp = generate6DigitOtp();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to DB
    await prisma.verificationToken.create({
      data: {
        identifier: cleanEmail,
        token: otp,
        expires,
      },
    });

    const greeting = name ? `Hello ${name},` : "Hello Teacher,";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — ApnaTutorHub</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <div style="background: linear-gradient(135deg, #0F2540 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ApnaTutorHub</h1>
      <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Teacher Account Email Verification</p>
    </div>

    <div style="padding: 32px 28px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">${greeting}</p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #475569;">
        Thank you for joining <strong>ApnaTutorHub</strong> as a teacher. To activate your tutor profile and receive verified student lead alerts, please enter the following 6-digit verification code:
      </p>

      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 16px; padding: 18px 36px;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">
          ⏱️ This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
        </p>
      </div>

      <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
          <strong>Security Note:</strong> Never share this OTP with anyone, including ApnaTutorHub representatives. If you did not request this verification, you can safely ignore this email.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        Warm regards,<br>
        <strong>The ApnaTutorHub Team</strong><br>
        <a href="https://apnatutorhub.com" style="color: #2563eb; text-decoration: none;">apnatutorhub.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Resend
    const result = await sendEmail({
      to: cleanEmail,
      subject: `${otp} is your ApnaTutorHub email verification code`,
      html: emailHtml,
      text: `${greeting}\n\nYour 6-digit ApnaTutorHub email verification code is: ${otp}\n\nThis code is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.`,
    });

    if (!result.success) {
      console.error("[Email OTP] Failed to dispatch email:", result.error);
      return {
        success: false,
        error: result.error || "Failed to send verification email. Please try again.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Email OTP] Exception in sendEmailOtp:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while sending the OTP.",
    };
  }
}

/**
 * Verify an OTP entered by the user against PostgreSQL.
 */
export async function verifyEmailOtp(
  email: string,
  enteredOtp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = enteredOtp.trim().replace(/\D/g, "");

    if (!cleanEmail || !cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit code." };
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: cleanEmail,
        token: cleanOtp,
      },
    });

    if (!record) {
      return { success: false, error: "Invalid code. Please check and try again." };
    }

    // Check expiry
    if (record.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: cleanEmail },
      });
      return {
        success: false,
        error: "This verification code has expired. Please request a new code.",
      };
    }

    // Successfully verified! Delete the consumed token
    await prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    // Mark user email as verified in database
    await prisma.user.updateMany({
      where: { email: cleanEmail },
      data: { emailVerified: new Date() },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[Email OTP] Exception in verifyEmailOtp:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while verifying the code.",
    };
  }
}
