/**
 * lib/resend-service.ts
 * Comprehensive Resend Service for ApnaTutorHub
 * Features: Single email, Batch email broadcasting, Scheduled emails, Status retrieval, Cancel emails.
 */

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "ApnaTutorHub <noreply@mail.apnatutorhub.com>";

export type EmailAttachment = {
  filename: string;
  content?: string | Buffer;
  path?: string;
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  scheduledAt?: string;
  attachments?: EmailAttachment[];
};

export type BatchEmailItem = {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  scheduledAt?: string;
};

// ── 1. Send Single Email ───────────────────────────────────────────────────────

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not configured in .env" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: opts.from ?? DEFAULT_FROM_EMAIL,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
      ...(opts.attachments ? { attachments: opts.attachments } : {}),
    });

    if (error) {
      console.error("[Resend] Single email error:", error);
      return { success: false, error: error.message };
    }

    console.info(`[Resend] Email sent successfully (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Resend] Exception in sendEmail:", msg);
    return { success: false, error: msg };
  }
}

// ── 2. Send Batch Emails (Mass Announcement / Broadcast) ───────────────────────

export async function sendBatchEmails(
  items: BatchEmailItem[]
): Promise<{ success: boolean; sentCount: number; errors?: string[] }> {
  if (!resend) {
    return { success: false, sentCount: 0, errors: ["RESEND_API_KEY not configured"] };
  }

  if (items.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    // Resend batch endpoint accepts up to 100 emails per batch payload
    const CHUNK_SIZE = 100;
    let totalSent = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE).map((item) => ({
        from: item.from ?? DEFAULT_FROM_EMAIL,
        to: Array.isArray(item.to) ? item.to : [item.to],
        subject: item.subject,
        html: item.html,
        ...(item.text ? { text: item.text } : {}),
        ...(item.scheduledAt ? { scheduledAt: item.scheduledAt } : {}),
      }));

      const { data, error } = await resend.batch.send(chunk);

      if (error) {
        console.error(`[Resend] Batch error for chunk ${i / CHUNK_SIZE + 1}:`, error);
        errors.push(error.message);
      } else if (data?.data) {
        totalSent += data.data.length;
        console.info(`[Resend] Batch chunk sent (${data.data.length} emails)`);
      }
    }

    return {
      success: errors.length === 0,
      sentCount: totalSent,
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Resend] Exception in sendBatchEmails:", msg);
    return { success: false, sentCount: 0, errors: [msg] };
  }
}

// ── 3. Retrieve Email Status ───────────────────────────────────────────────────

export async function getEmailDetails(emailId: string) {
  if (!resend) return null;
  try {
    const { data, error } = await resend.emails.get(emailId);
    if (error) {
      console.error("[Resend] getEmailDetails error:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Resend] Exception in getEmailDetails:", err);
    return null;
  }
}

// ── 4. Reschedule / Update Email ──────────────────────────────────────────────

export async function rescheduleEmail(emailId: string, scheduledAtISO: string) {
  if (!resend) return { success: false, error: "RESEND_API_KEY not set" };
  try {
    const { data, error } = await resend.emails.update({
      id: emailId,
      scheduledAt: scheduledAtISO,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ── 5. Cancel Scheduled Email ──────────────────────────────────────────────────

export async function cancelScheduledEmail(emailId: string) {
  if (!resend) return { success: false, error: "RESEND_API_KEY not set" };
  try {
    const { data, error } = await resend.emails.cancel(emailId);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ── 6. List Recent Sent Emails ─────────────────────────────────────────────────

export async function listRecentEmails() {
  if (!resend) return [];
  try {
    const { data, error } = await resend.emails.list();
    if (error) {
      console.error("[Resend] listRecentEmails error:", error);
      return [];
    }
    return data?.data ?? [];
  } catch (err) {
    console.error("[Resend] Exception in listRecentEmails:", err);
    return [];
  }
}
