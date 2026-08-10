import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminLeadsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Requirement Leads..."
        subtext="Fetching parent requirements, location coordinates, and tutor unlocks..."
      />
    </div>
  );
}
