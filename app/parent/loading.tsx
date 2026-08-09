import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function ParentDashboardLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Parent Dashboard..."
        subtext="Fetching your requirements, applicants, and booking updates"
      />
    </div>
  );
}
