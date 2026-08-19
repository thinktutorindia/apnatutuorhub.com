import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function TutorAppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <PageLoader
        message="Loading Tutor Portal..."
        subtext="Fetching the latest verified student leads, bookings, and wallet balance"
      />
    </div>
  );
}
