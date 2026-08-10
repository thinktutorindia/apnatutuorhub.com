import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminAnalyticsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Platform Analytics..."
        subtext="Generating revenue charts, user growth metrics, and conversion rates..."
      />
    </div>
  );
}
