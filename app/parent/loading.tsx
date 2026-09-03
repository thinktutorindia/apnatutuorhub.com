import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function ParentDashboardLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Just a moment…"
        subtext="Opening your parent page"
      />
    </div>
  );
}
