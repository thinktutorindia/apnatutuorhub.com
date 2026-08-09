import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminDashboardLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Admin Console..."
        subtext="Fetching platform analytics, audit logs, and management controls"
      />
    </div>
  );
}
