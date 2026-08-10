import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminSettingsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Platform Settings..."
        subtext="Fetching system configurations, fee structures, and commercial rules..."
      />
    </div>
  );
}
