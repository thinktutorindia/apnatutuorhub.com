"use client";

import React from "react";
import { XCircle } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { closeRequirementAction } from "@/app/actions/leads.actions";

export function CloseLeadButton({ leadId }: { leadId: string }) {
  return (
    <ActionButton
      action={async () => {
        const formData = new FormData();
        formData.append("leadId", leadId);
        await closeRequirementAction({ success: false }, formData);
      }}
      label="Close Requirement"
      loadingLabel="Closing Requirement..."
      variant="danger"
      confirmTitle="Close Requirement"
      confirmMessage="Are you sure you want to close this requirement? Tutors will no longer be able to apply and this action cannot be undone."
      icon={<XCircle size={13} />}
    />
  );
}
