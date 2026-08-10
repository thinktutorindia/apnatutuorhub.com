import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminCouponsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Coupons & Commercials..."
        subtext="Fetching active promo codes, usage statistics, and coin packages..."
      />
    </div>
  );
}
