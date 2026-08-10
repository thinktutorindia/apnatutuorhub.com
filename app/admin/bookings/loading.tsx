import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminBookingsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Class Bookings..."
        subtext="Fetching trial class schedules, status updates, and session records..."
      />
    </div>
  );
}
