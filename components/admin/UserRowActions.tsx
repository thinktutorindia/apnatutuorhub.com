"use client";

import React from "react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  suspendUserAction,
  reactivateUserAction,
  adminResetUserPasswordAction,
  adminDeleteUserAction,
  adminToggleUserTopupAction,
} from "@/app/actions/admin.actions";
import { toggleTutorMarketingNotifsAction } from "@/app/actions/tutor.actions";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    tutorProfile?: { kycStatus: string; averageRating: number; marketingNotifsEnabled?: boolean; canTopup?: boolean } | null;
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

      {user.tutorProfile && (
        user.tutorProfile.marketingNotifsEnabled !== false ? (
          <ActionButton
            action={async () => {
              await toggleTutorMarketingNotifsAction(user.id, false);
            }}
            label="🚫 Opt Out"
            loadingLabel="Updating..."
            variant="warning"
            confirmTitle="Mark Tutor as Not Interested"
            confirmMessage={`Disable marketing and lead notification campaigns for ${user.name || user.email}?`}
          />
        ) : (
          <ActionButton
            action={async () => {
              await toggleTutorMarketingNotifsAction(user.id, true);
            }}
            label="🔔 Enable Notifs"
            loadingLabel="Updating..."
            variant="success"
            confirmTitle="Enable Marketing Notifications"
            confirmMessage={`Re-enable marketing and lead notifications for ${user.name || user.email}?`}
          />
        )
      )}

      {user.tutorProfile && (
        user.tutorProfile.canTopup !== false ? (
          <ActionButton
            action={async () => {
              await adminToggleUserTopupAction(user.id, false);
            }}
            label="🛑 Restrict TopUp"
            loadingLabel="Disabling..."
            variant="warning"
            confirmTitle="Disable Top-Up Access"
            confirmMessage={`Restrict coin top-up access for ${user.name || user.email}?`}
          />
        ) : (
          <ActionButton
            action={async () => {
              await adminToggleUserTopupAction(user.id, true);
            }}
            label="🪙 Allow TopUp"
            loadingLabel="Enabling..."
            variant="success"
            confirmTitle="Enable Top-Up Access"
            confirmMessage={`Enable coin top-up access for ${user.name || user.email}?`}
          />
        )
      )}

      <Link
        href={`/admin/users/${user.id}/edit`}
        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-800 rounded-xl bg-blue-100 text-blue-950 border border-blue-300 hover:bg-blue-200 transition-colors"
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
    </div>
  );
}
