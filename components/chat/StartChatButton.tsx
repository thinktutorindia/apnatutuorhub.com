"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { startParentChatAction, startTutorChatAction } from "@/app/actions/chat.actions";

type StartChatButtonProps = {
  targetProfileId: string; // tutorProfileId (if parent) or parentProfileId (if tutor)
  leadId?: string;
  role: "PARENT" | "TUTOR";
  className?: string;
  buttonText?: string;
};

export function StartChatButton({
  targetProfileId,
  leadId,
  role,
  className = "neu-btn bg-[#8B5CF6] text-white px-4 py-2 text-xs",
  buttonText = "💬 In-App Chat",
}: StartChatButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStartChat() {
    startTransition(async () => {
      const res =
        role === "PARENT"
          ? await startParentChatAction(targetProfileId, leadId)
          : await startTutorChatAction(targetProfileId, leadId);

      if (res.success && res.data?.conversationId) {
        router.push(`/chat/${res.data.conversationId}`);
      } else {
        alert(res.error || "Could not start chat");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleStartChat}
      disabled={isPending}
      className={className}
    >
      <MessageSquare size={13} />
      <span>{isPending ? "Connecting..." : buttonText}</span>
    </button>
  );
}
