import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminKycLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading KYC Verifications..."
        subtext="Fetching tutor government ID proofs, selfies, and verification queue..."
      />
    </div>
  );
}
