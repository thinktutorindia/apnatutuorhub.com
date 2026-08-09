"use client";

import React from "react";
import { Power, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { toggleCouponActiveAction, deleteCouponAction } from "@/app/actions/coupon.actions";

interface CouponActionsProps {
  couponId: string;
  code: string;
  isActive: boolean;
}

export function CouponActions({ couponId, code, isActive }: CouponActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <ActionButton
        action={async () => {
          await toggleCouponActiveAction(couponId);
        }}
        label={isActive ? "Active" : "Disabled"}
        loadingLabel="Toggling..."
        variant={isActive ? "success" : "secondary"}
        icon={<Power size={13} />}
      />

      <ActionButton
        action={async () => {
          await deleteCouponAction(couponId);
        }}
        label="Delete"
        loadingLabel="Deleting..."
        variant="danger"
        confirmTitle="Delete Coupon"
        confirmMessage={`Are you sure you want to delete coupon code "${code}"?`}
        icon={<Trash2 size={13} />}
      />
    </div>
  );
}
