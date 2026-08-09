"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  suspendUserAction,
  reactivateUserAction,
  adminResetUserPasswordAction,
  adminDeleteUserAction,
} from "@/app/actions/admin.actions";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    tutorProfile?: { kycStatus: string; averageRating: number } | null;
  };
}

export function UserRowActions({ user }: UserRowActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {user.isActive ? (
        <ActionButton
          action={async () => {
            await suspendUserAction(user.id);
          }}
          label="Suspend"
          loadingLabel="Suspending..."
          variant="warning"
          confirmTitle="Suspend Account"
          confirmMessage={`Are you sure you want to suspend ${user.name || user.email}? Their access will be disabled until reactivated.`}
        />
      ) : (
        <ActionButton
          action={async () => {
            await reactivateUserAction(user.id);
          }}
          label="Reactivate"
          loadingLabel="Reactivating..."
          variant="success"
          confirmTitle="Reactivate Account"
          confirmMessage={`Are you sure you want to reactivate ${user.name || user.email}? Their login access will be restored.`}
        />
      )}

      <Link
        href={`/admin/users/${user.id}/edit`}
        className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
      >
        Edit
      </Link>

      <ActionButton
        action={async () => {
          await adminResetUserPasswordAction(user.id);
        }}
        label="Reset Pwd"
        loadingLabel="Resetting..."
        variant="warning"
        confirmTitle="Reset Password"
        confirmMessage={`Are you sure you want to generate a new random password for ${user.email}?`}
      />

      <ActionButton
        action={async () => {
          await adminDeleteUserAction(user.id);
        }}
        label="Delete"
        loadingLabel="Deleting..."
        variant="danger"
        confirmTitle="PERMANENTLY Delete Account"
        confirmMessage={`Are you sure you want to PERMANENTLY DELETE user ${user.name || user.email}? All associated data will be removed. This cannot be undone.`}
      />

      {user.tutorProfile && (
        <Link
          href={`/tutor/${user.id}`}
          className="inline-flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
        >
          <span>Preview Profile</span>
          <ChevronRight size={10} />
        </Link>
      )}
    </div>
  );
}
