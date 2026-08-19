import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function TutorLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <PageLoader
        message="Loading Tutor Portal..."
        subtext="Fetching the latest verified student leads, bookings, and profile details"
      />
    </div>
  );
}
