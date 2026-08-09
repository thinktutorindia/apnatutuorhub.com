import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function TutorDashboardLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Tutor Dashboard..."
        subtext="Fetching nearby leads, wallet balance, and active bookings"
      />
    </div>
  );
}
