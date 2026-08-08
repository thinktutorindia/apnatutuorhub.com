/**
 * lib/chat-service.ts
 * Enterprise Upgrade — Phase 2: Real-time Chat & Messaging Engine
 *
 * Core service for instant messaging between Parents and Tutors.
 *
 * Features:
 * - Conversation initialization (scoped to parent + tutor + optional lead)
 * - Message creation with content sanitization
 * - Read receipt tracking (isRead, readAt)
 * - Real-time notification dispatch on new message
 * - Pagination for chat history (cursor-based)
 */

import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security-audit";
import { moderateText } from "@/lib/ai-moderator";
import { createNotification } from "@/lib/notification-engine";

// ── Conversation Management ───────────────────────────────────────────────────

/**
 * Retrieves an existing conversation thread or creates a new one.
 * Uniquely constrained by `[parentProfileId, tutorProfileId, leadId]`.
 */
export async function getOrCreateConversation(params: {
  parentProfileId: string;
  tutorProfileId: string;
  leadId?: string | null;
}) {
  const { parentProfileId, tutorProfileId, leadId = null } = params;

  // Try finding existing conversation
  const existing = await prisma.conversation.findFirst({
    where: {
      parentProfileId,
      tutorProfileId,
      ...(leadId ? { leadId } : {}),
    },
    include: {
      parentProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tutorProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (existing) return existing;

  // Create new conversation
  return prisma.conversation.create({
    data: {
      parentProfileId,
      tutorProfileId,
      leadId,
    },
    include: {
      parentProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tutorProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

// ── Sending Messages ──────────────────────────────────────────────────────────

export type SendMessageInput = {
  conversationId: string;
  senderUserId: string;
  content: string;
  attachmentUrl?: string | null;
};

/**
 * Sends a message within a conversation thread.
 * Sanitizes input text, updates `lastMessageAt`, and notifies recipient.
 */
export async function sendMessage(input: SendMessageInput) {
  const { conversationId, senderUserId, content, attachmentUrl = null } = input;

  const sanitizedContent = sanitizeInput(content);
  if (!sanitizedContent && !attachmentUrl) {
    throw new Error("Message content cannot be empty.");
  }

  // AI moderation: redact contact leaks and block profanity
  const moderation = moderateText(sanitizedContent);
  if (!moderation.isAllowed) {
    throw new Error(
      "Your message contains prohibited content and could not be sent. Please keep conversations professional."
    );
  }
  // Use redacted content if contact info was detected
  const finalContent = moderation.sanitizedContent || sanitizedContent;

  // Verify sender is participant in conversation
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      parentProfile: { select: { userId: true, user: { select: { name: true } } } },
      tutorProfile: { select: { userId: true, user: { select: { name: true } } } },
    },
  });

  if (!conv) throw new Error("Conversation not found.");

  const isParent = conv.parentProfile.userId === senderUserId;
  const isTutor = conv.tutorProfile.userId === senderUserId;

  if (!isParent && !isTutor) {
    throw new Error("Unauthorized to post in this conversation.");
  }

  const recipientUserId = isParent
    ? conv.tutorProfile.userId
    : conv.parentProfile.userId;
  const senderName = isParent
    ? conv.parentProfile.user.name ?? "Parent"
    : conv.tutorProfile.user.name ?? "Tutor";

  // Create message and touch lastMessageAt in single transaction
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderUserId,
        content: finalContent,
        attachmentUrl,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  // Dispatch notification to recipient (non-blocking)
  void createNotification({
    userId: recipientUserId,
    type: "NEW_CHAT_MESSAGE",
    title: `💬 New Message from ${senderName}`,
    message:
      sanitizedContent.length > 80
        ? sanitizedContent.slice(0, 80) + "..."
        : sanitizedContent,
    actionUrl: `/chat/${conversationId}`,
    metadata: { messageId: message.id },
  });

  return message;
}

// ── Query Messages ────────────────────────────────────────────────────────────

/**
 * Gets paginated message history for a conversation thread.
 */
export async function getConversationMessages(params: {
  conversationId: string;
  limit?: number;
  cursor?: string;
}) {
  const { conversationId, limit = 50, cursor } = params;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  let nextCursor: string | undefined = undefined;
  if (messages.length > limit) {
    const nextItem = messages.pop();
    nextCursor = nextItem?.id;
  }

  return {
    messages: messages.reverse(),
    nextCursor,
  };
}

// ── Query User Conversations ──────────────────────────────────────────────────

/**
 * Fetches all conversation threads for a user profile (parent or tutor).
 */
export async function getUserConversations(profileId: string, role: "PARENT" | "TUTOR") {
  const filter =
    role === "PARENT"
      ? { parentProfileId: profileId }
      : { tutorProfileId: profileId };

  return prisma.conversation.findMany({
    where: filter,
    orderBy: { lastMessageAt: "desc" },
    include: {
      parentProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true } },
        },
      },
      tutorProfile: {
        select: {
          id: true,
          user: { select: { id: true, name: true } },
        },
      },
      lead: { select: { id: true, classLevel: true, subjects: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, isRead: true, senderUserId: true },
      },
    },
  });
}

// ── Mark Messages Read ────────────────────────────────────────────────────────

/**
 * Marks unread messages in a conversation as read by recipient.
 */
export async function markMessagesRead(conversationId: string, readerUserId: string) {
  const now = new Date();

  return prisma.message.updateMany({
    where: {
      conversationId,
      senderUserId: { not: readerUserId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: now,
    },
  });
}
