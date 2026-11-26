/** COMPOSE — merge answer + at most one question into exactly ONE outbound message. */
export function compose(answer: string, question?: string | null): string {
  const parts = [answer?.trim(), question?.trim()].filter(Boolean) as string[];
  return parts.join("\n\n");
}

export function dedupeQuickReplies(replies: string[]): string[] {
  return [...new Set(replies.filter(Boolean))].slice(0, 4);
}
