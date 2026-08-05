"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveParentContext } from "@/lib/parent-context";
import { resolveTutorContext } from "@/lib/tutor-context";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import {
  getOrCreateConversation,
  sendMessage,
  markMessagesRead,
} from "@/lib/chat-service";
import { logActivity, ActivityEvent } from "@/lib/activity-logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatState = ActionResult<{ conversationId: string; messageId?: string }>;

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Starts or retrieves a chat thread for a Parent with a Tutor.
 */
export async function startParentChatAction(
  tutorProfileId: string,
  leadId?: string
): Promise<ChatState> {
  const auth = await resolveParentContext();
  if (!auth.ok) return auth.result;

  try {
    const conv = await getOrCreateConversation({
      parentProfileId: auth.context.parentProfileId,
      tutorProfileId,
      leadId,
    });

    return actionSuccess({ conversationId: conv.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Failed to start conversation."
    );
  }
}

/**
 * Starts or retrieves a chat thread for a Tutor with a Parent.
 */
export async function startTutorChatAction(
  parentProfileId: string,
  leadId?: string
): Promise<ChatState> {
  const auth = await resolveTutorContext();
  if (!auth.ok) return auth.result;

  try {
    const conv = await getOrCreateConversation({
      parentProfileId,
      tutorProfileId: auth.context.tutorProfileId,
      leadId,
    });

    return actionSuccess({ conversationId: conv.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Failed to start conversation."
    );
  }
}

/**
 * Sends a message in a conversation thread.
 * Dynamic role detection via parent / tutor auth context resolution.
 */
export async function postChatMessageAction(
  conversationId: string,
  content: string,
  attachmentUrl?: string
): Promise<ChatState> {
  // Determine user identity
  const parentAuth = await resolveParentContext();
  const tutorAuth = parentAuth.ok ? null : await resolveTutorContext();

  const userId = parentAuth.ok
    ? parentAuth.context.userId
    : tutorAuth?.ok
      ? tutorAuth.context.userId
      : null;

  if (!userId) {
    return actionError("Unauthorized. Please log in to send messages.");
  }

  try {
    const msg = await sendMessage({
      conversationId,
      senderUserId: userId,
      content,
      attachmentUrl,
    });

    revalidatePath(`/chat/${conversationId}`);

    return actionSuccess({ conversationId, messageId: msg.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Failed to send message."
    );
  }
}

/**
 * Marks messages in a conversation as read by the current user.
 */
export async function markChatReadAction(conversationId: string): Promise<ChatState> {
  const parentAuth = await resolveParentContext();
  const tutorAuth = parentAuth.ok ? null : await resolveTutorContext();

  const userId = parentAuth.ok
    ? parentAuth.context.userId
    : tutorAuth?.ok
      ? tutorAuth.context.userId
      : null;

  if (!userId) return actionError("Unauthorized.");

  await markMessagesRead(conversationId, userId);
  return actionSuccess({ conversationId });
}
