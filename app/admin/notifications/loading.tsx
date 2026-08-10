import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminNotificationsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Notification Center..."
        subtext="Fetching broadcast logs, VAPID push settings, and message history..."
      />
    </div>
  );
}
