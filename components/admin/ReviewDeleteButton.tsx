"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { adminDeleteReviewAction } from "@/app/actions/admin.actions";

interface ReviewDeleteButtonProps {
  reviewId: string;
}

export function ReviewDeleteButton({ reviewId }: ReviewDeleteButtonProps) {
  return (
    <ActionButton
      action={async () => {
        await adminDeleteReviewAction(reviewId);
      }}
      label="Delete Review"
      loadingLabel="Deleting Review..."
      variant="danger"
      confirmTitle="Delete Review"
      confirmMessage="Are you sure you want to delete this review? This action cannot be undone."
      icon={<Trash2 size={13} />}
    />
  );
}
