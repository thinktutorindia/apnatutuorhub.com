import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminWalletsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Financial Ledger..."
        subtext="Fetching coin balances, Razorpay orders, and refund logs..."
      />
    </div>
  );
}
