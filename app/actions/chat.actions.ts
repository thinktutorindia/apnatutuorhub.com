"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
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
  getConversationMessages,
  sendMessage,
  markMessagesRead,
} from "@/lib/chat-service";
import { logActivity, ActivityEvent } from "@/lib/activity-logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatState = ActionResult<{ conversationId: string; messageId?: string }>;

export type ChatThreadPayload = {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  otherUserPhone: string | null;
  requirement: string | null;
  messages: Array<{
    id: string;
    content: string;
    senderUserId: string;
    senderName: string;
    createdAt: string;
    isRead: boolean;
    attachmentUrl?: string | null;
  }>;
};

/** Load a thread for the in-page chat drawer (no navigation away from the dashboard). */
export async function getChatThreadAction(
  conversationId: string
): Promise<ActionResult<ChatThreadPayload>> {
  const session = await auth();
  if (!session?.user?.id) return actionError("Please sign in to view messages.");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      parentProfile: {
        select: { userId: true, user: { select: { name: true, phone: true } } },
      },
      tutorProfile: {
        select: { userId: true, user: { select: { name: true, phone: true } } },
      },
      lead: { select: { classLevel: true, subjects: true } },
    },
  });
  if (!conversation) return actionError("Conversation not found.");

  const isTutor = conversation.tutorProfile.userId === session.user.id;
  const isParent = conversation.parentProfile.userId === session.user.id;
  if (!isTutor && !isParent) return actionError("You do not have access to this chat.");

  await markMessagesRead(conversationId, session.user.id);
  const { messages } = await getConversationMessages({ conversationId, limit: 100 });
  const otherUser = isTutor
    ? conversation.parentProfile.user
    : conversation.tutorProfile.user;

  return actionSuccess({
    conversationId,
    currentUserId: session.user.id,
    otherUserName: otherUser.name || "User",
    otherUserPhone: otherUser.phone || null,
    requirement: conversation.lead
      ? `${conversation.lead.classLevel} · ${conversation.lead.subjects.join(", ")}`
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderUserId: m.senderUserId,
      senderName: m.sender.name || "User",
      createdAt: m.createdAt.toISOString(),
      isRead: m.isRead,
      attachmentUrl: m.attachmentUrl,
    })),
  });
}

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
