"use client";

import { useActionState } from "react";
import { XCircle } from "lucide-react";
import {
  closeRequirementAction,
  type RequirementState,
} from "@/app/actions/leads.actions";
import { FieldError } from "@/components/ui/FieldError";

const initialState: RequirementState = { success: false };

export function CloseLeadButton({ leadId }: { leadId: string }) {
  const [state, formAction, isPending] = useActionState(
    closeRequirementAction,
    initialState
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Close this requirement? Tutors will stop receiving it and you cannot reopen it."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={isPending}
        className="neu-btn bg-[#FCE7F3] px-4 py-2 text-[11px]"
      >
        <XCircle size={13} />
        <span>{isPending ? "Closing..." : "Close"}</span>
      </button>
      <FieldError messages={state.error ? [state.error] : undefined} />
    </form>
  );
}
